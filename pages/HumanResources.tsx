
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { WorkSession, User, AppSettings, SettlementRecord, Workshop } from '../types';

interface HRProps {
  sessions: WorkSession[];
  onUpdateSessions: (sessions: WorkSession[]) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  settings: AppSettings;
  workshop?: Workshop | null;
  onUpdateWorkshop?: (updated: Partial<Workshop>) => void;
  currentUser?: User | null;
}

const formatDuration = (ms: number) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${hours}h ${minutes}m ${seconds}s`;
};

const calculateSessionTime = (session: WorkSession, currentNow: number) => {
  let total = 0;
  if (session.status === 'completed') {
    total = session.endTime! - session.startTime;
  } else if (session.status === 'active') {
    total = currentNow - session.startTime;
  } else if (session.status === 'paused') {
    const lastPause = session.pauses[session.pauses.length - 1];
    total = lastPause.start - session.startTime;
  }
  session.pauses.forEach(p => { if (p.end) total -= (p.end - p.start); });
  return Math.max(0, total);
};

const HumanResources: React.FC<HRProps> = ({ 
  sessions, onUpdateSessions, users, setUsers, settings, workshop, onUpdateWorkshop, currentUser 
}) => {
  const [now, setNow] = useState(Date.now());
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'finance' | 'settlement_history'>('audit');
  const [filterPeriod, setFilterPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sortedAuditSessions = useMemo(() => {
    return [...(sessions || [])].sort((a, b) => b.startTime - a.startTime);
  }, [sessions]);

  const mechanicStats = useMemo(() => {
    return users.map(u => {
      const userSessions = (sessions || []).filter(s => s.mechanicId === u.id);
      const today = new Date(); today.setHours(0,0,0,0);
      const filtered = userSessions.filter(s => {
        if (filterPeriod === 'daily') return s.startTime >= today.getTime();
        if (filterPeriod === 'weekly') return s.startTime >= (today.getTime() - 7 * 86400000);
        return s.startTime >= (today.getTime() - 30 * 86400000);
      });
      return {
        ...u,
        totalTime: filtered.reduce((acc, s) => acc + calculateSessionTime(s, now), 0),
        sessionCount: filtered.length,
        activeSession: userSessions.find(s => s.status !== 'completed')
      };
    }).sort((a, b) => b.totalTime - a.totalTime);
  }, [users, sessions, now, filterPeriod]);

  const performDelete = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    if (window.confirm(ids.length === 1 ? "Excluir este registro?" : `Excluir ${ids.length} registros?`)) {
      setIsDeleting(true);
      onUpdateSessions(sessions.filter(s => !ids.includes(s.id)));
      setSelectedIds([]);
      setTimeout(() => setIsDeleting(false), 300);
    }
  }, [sessions, onUpdateSessions]);

  const handleRemotePause = (session: WorkSession) => {
    const updated = {
      ...session,
      status: 'paused' as const,
      pauses: [...session.pauses, { start: Date.now() }]
    };
    onUpdateSessions(sessions.map(s => s.id === session.id ? updated : s));
  };

  const handleRemoteResume = (session: WorkSession) => {
    const updatedPauses = [...session.pauses];
    const lastPause = updatedPauses[updatedPauses.length - 1];
    if (lastPause) lastPause.end = Date.now();
    const updated = {
      ...session,
      status: 'active' as const,
      pauses: updatedPauses
    };
    onUpdateSessions(sessions.map(s => s.id === session.id ? updated : s));
  };

  const handleRemoteFinalize = (session: WorkSession) => {
    if (!window.confirm(`Deseja forçar o encerramento do turno de ${session.mechanicName}?`)) return;
    const updatedPauses = [...session.pauses];
    if (session.status === 'paused') {
      const lastPause = updatedPauses[updatedPauses.length - 1];
      if (lastPause) lastPause.end = Date.now();
    }
    const updated = {
      ...session,
      status: 'completed' as const,
      endTime: Date.now(),
      pauses: updatedPauses
    };
    onUpdateSessions(sessions.map(s => s.id === session.id ? updated : s));
  };

  const handleSettleTax = (userToSettle: User) => {
    const amount = userToSettle.pendingTax || 0;
    if (amount <= 0) return;

    if (window.confirm(`Confirmar recebimento de ${settings.currencySymbol} ${amount.toLocaleString()} de ${userToSettle.name}?`)) {
      const settlement: SettlementRecord = {
        id: 'set_' + Math.random().toString(36).substr(2, 9),
        mechanicId: userToSettle.id,
        mechanicName: userToSettle.name,
        amount: amount,
        settledById: currentUser?.id || 'sys',
        settledByName: currentUser?.name || 'Administrador',
        timestamp: Date.now()
      };

      // 1. Update user to zero tax
      setUsers(prev => prev.map(u => u.id === userToSettle.id ? { ...u, pendingTax: 0 } : u));
      
      // 2. Add to settlement history
      if (onUpdateWorkshop && workshop) {
        onUpdateWorkshop({ 
          settlements: [settlement, ...(workshop.settlements || [])] 
        });
      }
    }
  };

  const settlementHistory = useMemo(() => {
    return [...(workshop?.settlements || [])].sort((a, b) => b.timestamp - a.timestamp);
  }, [workshop?.settlements]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center uppercase tracking-tighter">
            <i className="fa-solid fa-user-check mr-4 text-primary"></i>
            Gestão Operacional de RH
          </h2>
          <p className="text-slate-400">Controle de ponto e gestão financeira da equipe.</p>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
          <button 
            onClick={() => setActiveSubTab('audit')}
            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'audit' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Auditoria de Ponto
          </button>
          <button 
            onClick={() => setActiveSubTab('finance')}
            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'finance' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Gestão Financeira
          </button>
          <button 
            onClick={() => setActiveSubTab('settlement_history')}
            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeSubTab === 'settlement_history' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Histórico de Pagos
          </button>
        </div>
      </header>

      {activeSubTab === 'audit' && (
        <div className="space-y-10 animate-in fade-in duration-300">
          <div className="bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 flex gap-1 w-fit ml-auto">
            {['daily', 'weekly', 'monthly'].map(p => (
              <button 
                key={p} 
                onClick={() => setFilterPeriod(p as any)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterPeriod === p ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                {p === 'daily' ? 'Hoje' : p === 'weekly' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mechanicStats.map(m => (
              <div key={m.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl relative transition-all hover:border-primary/30">
                <div className="flex items-center gap-4 mb-6">
                  <img src={m.avatar} className="w-12 h-12 rounded-full border-2 border-slate-800 bg-slate-800" alt="avatar" />
                  <div>
                    <h4 className="font-bold text-white">{m.name}</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{m.username}</p>
                  </div>
                  {m.activeSession && <span className={`ml-auto w-2 h-2 rounded-full ${m.activeSession.status === 'active' ? 'bg-primary animate-pulse shadow-[0_0_8px_var(--primary-color)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'}`}></span>}
                </div>
                <div className="flex justify-between border-t border-slate-800/50 pt-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Tempo Total ({filterPeriod})</span>
                  <span className="text-sm font-mono text-white font-bold">{formatDuration(m.totalTime)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6 pt-10">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Registros de Turno</h3>
                {selectedIds.length > 0 && (
                  <button onClick={() => performDelete(selectedIds)} className="bg-red-500 hover:bg-red-400 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all animate-in zoom-in-95">
                    <i className="fa-solid fa-trash-can"></i> Excluir ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
              {isDeleting && <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-20 flex items-center justify-center text-white text-xs font-black uppercase tracking-widest"><i className="fa-solid fa-spinner animate-spin mr-3"></i> Sincronizando...</div>}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/40 border-b border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-500">
                    <tr>
                      <th className="px-6 py-5 w-10">
                        <button onClick={() => setSelectedIds(selectedIds.length === sortedAuditSessions.length ? [] : sortedAuditSessions.map(s => s.id))} className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.length === sortedAuditSessions.length && sortedAuditSessions.length > 0 ? 'bg-primary border-primary text-slate-950' : 'border-slate-700 bg-slate-800'}`}>
                          {selectedIds.length === sortedAuditSessions.length && sortedAuditSessions.length > 0 && <i className="fa-solid fa-check text-[10px]"></i>}
                        </button>
                      </th>
                      <th className="px-6 py-5">Mecânico</th>
                      <th className="px-6 py-5">Entrada / Status</th>
                      <th className="px-6 py-5">Duração</th>
                      <th className="px-6 py-5 text-right">Controle Administrativo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {sortedAuditSessions.map(s => (
                      <tr key={s.id} onClick={() => setSelectedIds(prev => prev.includes(s.id) ? prev.filter(i => i !== s.id) : [...prev, s.id])} className={`cursor-pointer transition-colors ${selectedIds.includes(s.id) ? 'bg-primary/5' : 'hover:bg-slate-800/10'}`}>
                        <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setSelectedIds(prev => prev.includes(s.id) ? prev.filter(i => i !== s.id) : [...prev, s.id])} className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedIds.includes(s.id) ? 'bg-primary border-primary text-slate-950' : 'border-slate-700 bg-slate-800'}`}>
                            {selectedIds.includes(s.id) && <i className="fa-solid fa-check text-[10px]"></i>}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-bold text-slate-200 block">{s.mechanicName}</span>
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{s.id}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-slate-400 text-xs font-mono block mb-1">{new Date(s.startTime).toLocaleString()}</span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${s.status === 'active' ? 'bg-primary/10 text-primary border border-primary/20' : s.status === 'paused' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-slate-800 text-slate-500'}`}>
                            {s.status === 'active' ? 'Em Serviço' : s.status === 'paused' ? 'Pausado' : 'Finalizado'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-slate-300 font-mono text-sm">{formatDuration(calculateSessionTime(s, now))}</td>
                        <td className="px-6 py-5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                             {s.status !== 'completed' && (
                               <>
                                 {s.status === 'active' ? (
                                   <button 
                                     onClick={() => handleRemotePause(s)}
                                     title="Pausar Turno Remotamente"
                                     className="w-10 h-10 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-slate-950 rounded-xl transition-all flex items-center justify-center"
                                   >
                                     <i className="fa-solid fa-pause"></i>
                                   </button>
                                 ) : (
                                   <button 
                                     onClick={() => handleRemoteResume(s)}
                                     title="Retomar Turno Remotamente"
                                     className="w-10 h-10 bg-primary/10 text-primary hover:bg-primary hover:text-slate-950 rounded-xl transition-all flex items-center justify-center"
                                   >
                                     <i className="fa-solid fa-play"></i>
                                   </button>
                                 )}
                                 <button 
                                   onClick={() => handleRemoteFinalize(s)}
                                   title="Encerrar Turno (Clock Out)"
                                   className="w-10 h-10 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center"
                                 >
                                   <i className="fa-solid fa-stop"></i>
                                 </button>
                               </>
                             )}
                             <button 
                               onClick={() => performDelete([s.id])} 
                               title="Excluir Registro"
                               className="w-10 h-10 bg-slate-800 text-slate-500 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center justify-center"
                             >
                               <i className="fa-solid fa-trash-can text-xs"></i>
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sortedAuditSessions.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-500 italic">Sem registros de ponto.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'finance' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-400">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Cobrança de Impostos (RP)</h3>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                Ciclo Atual de Pagamento
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/40 text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-8 py-6">Colaborador</th>
                    <th className="px-8 py-6">Username</th>
                    <th className="px-8 py-6">Imposto Acumulado</th>
                    <th className="px-8 py-6 text-right">Ações de Tesouraria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => {
                    const tax = u.pendingTax || 0;
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img src={u.avatar} className="w-10 h-10 rounded-full border-2 border-slate-800" alt="av" />
                            <span className="font-bold text-white text-lg">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <span className="text-slate-500 font-mono text-xs">@{u.username}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <span className={`text-xl font-black font-mono ${tax > 0 ? 'text-primary' : 'text-slate-600'}`}>
                              {settings.currencySymbol} {tax.toLocaleString()}
                            </span>
                            {tax > 0 && <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button 
                            onClick={() => handleSettleTax(u)}
                            disabled={tax === 0}
                            className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${
                              tax > 0 
                                ? 'bg-primary text-slate-950 shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:scale-95' 
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            <i className="fa-solid fa-hand-holding-dollar mr-2"></i> Liquidar Dívida
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-600 italic">Nenhum mecânico cadastrado nesta unidade.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-primary/5 border-t border-slate-800 text-[10px] font-bold text-slate-500 text-center uppercase tracking-widest">
              Dica: O imposto é acumulado automaticamente a cada atendimento finalizado na calculadora.
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'settlement_history' && (
        <div className="space-y-8 animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter">Histórico de Liquidações</h3>
              <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                Registros de Tesouraria
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-800/40 text-[10px] uppercase font-black tracking-widest text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-8 py-6">Mecânico</th>
                    <th className="px-8 py-6">Data/Hora</th>
                    <th className="px-8 py-6">Valor Pago</th>
                    <th className="px-8 py-6 text-right">Processado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {settlementHistory.map(record => (
                    <tr key={record.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="px-8 py-6">
                         <span className="font-bold text-white">{record.mechanicName}</span>
                         <span className="text-[9px] text-slate-600 block uppercase font-black">{record.mechanicId}</span>
                      </td>
                      <td className="px-8 py-6 text-slate-400 font-mono text-xs">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td className="px-8 py-6 font-black text-primary font-mono text-lg">
                        {settings.currencySymbol} {record.amount.toLocaleString()}
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex flex-col items-end">
                            <span className="text-slate-300 font-bold text-xs">{record.settledByName}</span>
                            <span className="text-[9px] text-slate-600 font-black uppercase italic">ID: {record.settledById}</span>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {settlementHistory.length === 0 && (
                    <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-600 italic">Nenhum histórico de pagamento registrado ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HumanResources;
