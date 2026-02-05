
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { WorkSession, User, AppSettings } from '../types';

interface HRProps {
  sessions: WorkSession[];
  onUpdateSessions: (sessions: WorkSession[]) => void;
  users: User[];
  settings: AppSettings;
}

const formatDuration = (ms: number) => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  return `${hours}h ${minutes}m`;
};

const calculateSessionTime = (session: WorkSession, currentNow: number) => {
  let total = 0;
  const end = session.endTime || currentNow;
  
  if (session.status === 'completed') {
    total = session.endTime! - session.startTime;
  } else if (session.status === 'active') {
    total = currentNow - session.startTime;
  } else if (session.status === 'paused') {
    const lastPause = session.pauses[session.pauses.length - 1];
    total = lastPause.start - session.startTime;
  }

  session.pauses.forEach(p => {
    if (p.end) {
      total -= (p.end - p.start);
    }
  });

  return Math.max(0, total);
};

const HumanResources: React.FC<HRProps> = ({ sessions, onUpdateSessions, users, settings }) => {
  const [now, setNow] = useState(Date.now());
  const [filterPeriod, setFilterPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getFilteredSessions = (userSessions: WorkSession[]) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (filterPeriod === 'daily') {
      return userSessions.filter(s => s.startTime >= today.getTime());
    } else if (filterPeriod === 'weekly') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return userSessions.filter(s => s.startTime >= lastWeek.getTime());
    } else {
      const lastMonth = new Date();
      lastMonth.setDate(lastMonth.getDate() - 30);
      return userSessions.filter(s => s.startTime >= lastMonth.getTime());
    }
  };

  const sortedAuditSessions = useMemo(() => {
    return [...(sessions || [])].sort((a, b) => b.startTime - a.startTime);
  }, [sessions]);

  const mechanicStats = useMemo(() => {
    return users.map(u => {
      const userSessions = (sessions || []).filter(s => s.mechanicId === u.id);
      const filtered = getFilteredSessions(userSessions);
      const totalTime = filtered.reduce((acc, s) => acc + calculateSessionTime(s, now), 0);
      const activeSession = userSessions.find(s => s.status !== 'completed');
      
      return {
        ...u,
        totalTime,
        sessionCount: filtered.length,
        activeSession
      };
    }).sort((a, b) => b.totalTime - a.totalTime);
  }, [users, sessions, now, filterPeriod]);

  const handleManagerStop = (sessionId: string) => {
    const session = (sessions || []).find(s => s.id === sessionId);
    if (!session) return;
    const updatedPauses = [...session.pauses];
    if (session.status === 'paused') {
      const lastPause = updatedPauses[updatedPauses.length - 1];
      lastPause.end = Date.now();
    }
    const updated: WorkSession = { ...session, status: 'completed', endTime: Date.now(), pauses: updatedPauses };
    onUpdateSessions((sessions || []).map(s => s.id === sessionId ? updated : s));
  };

  const handleManagerPause = (sessionId: string) => {
    const session = (sessions || []).find(s => s.id === sessionId);
    if (!session || session.status !== 'active') return;
    const updated: WorkSession = { ...session, status: 'paused', pauses: [...session.pauses, { start: Date.now() }] };
    onUpdateSessions((sessions || []).map(s => s.id === sessionId ? updated : s));
  };

  // IMMEDIATE DELETE FUNCTION
  const performDelete = useCallback((idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    
    const count = idsToDelete.length;
    const message = count === 1 
      ? "Deseja realmente excluir permanentemente este registro de ponto?" 
      : `Deseja realmente excluir estes ${count} registros selecionados?`;

    if (window.confirm(message)) {
      setIsDeleting(true);
      const remaining = (sessions || []).filter(s => !idsToDelete.includes(s.id));
      onUpdateSessions(remaining);
      setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
      setTimeout(() => setIsDeleting(false), 300);
    }
  }, [sessions, onUpdateSessions]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedAuditSessions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedAuditSessions.map(s => s.id));
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center">
            <i className="fa-solid fa-user-check mr-4 text-primary"></i>
            Gestão de RH & Contabilidade
          </h2>
          <p className="text-slate-400">Auditoria e controle de horas da equipe mecânica.</p>
        </div>
        <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex gap-1">
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <button 
              key={p}
              onClick={() => setFilterPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterPeriod === p ? 'bg-primary text-slate-950 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
            >
              {p === 'daily' ? 'Diário' : p === 'weekly' ? 'Semanal' : 'Mensal'}
            </button>
          ))}
        </div>
      </header>

      {/* Mechanics Hour Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mechanicStats.map(m => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative group transition-all hover:border-primary/20">
            <div className="flex items-center gap-4 mb-6">
              <img src={m.avatar} className="w-12 h-12 rounded-full border-2 border-slate-800" alt="avatar" />
              <div>
                <h4 className="font-bold text-white text-lg">{m.name}</h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{m.username}</p>
              </div>
              {m.activeSession && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary-color)]"></span>
                  <span className="text-[8px] font-black text-primary uppercase">Online</span>
                </div>
              )}
            </div>

            <div className="space-y-4 mb-8">
               <div className="flex justify-between text-xs font-bold">
                 <span className="text-slate-500 uppercase tracking-widest">Total no Período</span>
                 <span className="text-white font-mono">{formatDuration(m.totalTime)}</span>
               </div>
               <div className="flex justify-between text-xs font-bold">
                 <span className="text-slate-500 uppercase tracking-widest">Sessões</span>
                 <span className="text-slate-300">{m.sessionCount} turnos</span>
               </div>
            </div>

            {m.activeSession ? (
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 mb-2">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Sessão Atual ({m.activeSession.status})</p>
                 <div className="flex justify-between items-center">
                    <span className="font-mono text-primary font-bold">{formatDuration(calculateSessionTime(m.activeSession, now))}</span>
                    <div className="flex gap-2">
                      {m.activeSession.status === 'active' && (
                        <button onClick={() => handleManagerPause(m.activeSession!.id)} className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-slate-950 transition-all text-[10px]" title="Pausar Sessão"><i className="fa-solid fa-pause"></i></button>
                      )}
                      <button onClick={() => handleManagerStop(m.activeSession!.id)} className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-[10px]" title="Encerrar Sessão"><i className="fa-solid fa-stop"></i></button>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="py-4 border-t border-slate-800 text-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
                Sem atividade no momento
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full Detailed History Table */}
      <div className="space-y-6 pt-10">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Auditoria de Registros</h3>
              {selectedIds.length > 0 && (
                <button 
                  onClick={() => performDelete(selectedIds)}
                  disabled={isDeleting}
                  className="bg-red-500 hover:bg-red-400 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all animate-in zoom-in-90"
                >
                  {isDeleting ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-trash-can"></i>}
                  Excluir Selecionados ({selectedIds.length})
                </button>
              )}
           </div>
           <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">Total: {sortedAuditSessions.length} registros</span>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
           {isDeleting && (
             <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl flex items-center gap-4">
                   <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                   <span className="text-xs font-black text-white uppercase tracking-widest">Atualizando Registros...</span>
                </div>
             </div>
           )}
           <table className="w-full text-left">
             <thead className="bg-slate-800/40 border-b border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-500">
               <tr>
                 <th className="px-6 py-5 w-10">
                    <button 
                      onClick={toggleSelectAll}
                      className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.length === sortedAuditSessions.length && sortedAuditSessions.length > 0 ? 'bg-primary border-primary text-slate-950' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}
                    >
                      {selectedIds.length === sortedAuditSessions.length && sortedAuditSessions.length > 0 && <i className="fa-solid fa-check text-[10px]"></i>}
                    </button>
                 </th>
                 <th className="px-6 py-5">Mecânico</th>
                 <th className="px-6 py-5">Data</th>
                 <th className="px-6 py-5">Status</th>
                 <th className="px-6 py-5">Duração</th>
                 <th className="px-6 py-5 text-right">Ações</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800">
               {sortedAuditSessions.map(s => {
                 const duration = calculateSessionTime(s, now);
                 const isSelected = selectedIds.includes(s.id);
                 return (
                    <tr 
                      key={s.id} 
                      className={`transition-colors cursor-pointer group ${isSelected ? 'bg-primary/5' : 'hover:bg-slate-800/10'}`}
                      onClick={() => toggleSelection(s.id)}
                    >
                      <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => toggleSelection(s.id)}
                          className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-slate-950' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'}`}
                        >
                          {isSelected && <i className="fa-solid fa-check text-[10px]"></i>}
                        </button>
                      </td>
                      <td className="px-6 py-5 font-bold text-slate-200">{s.mechanicName}</td>
                      <td className="px-6 py-5 text-slate-400 text-xs">{new Date(s.startTime).toLocaleDateString()} {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-6 py-5">
                         <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${s.status === 'completed' ? 'bg-slate-800 text-slate-500' : s.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-500'}`}>
                           {s.status}
                         </span>
                      </td>
                      <td className="px-6 py-5 font-mono text-sm text-slate-300">{formatDuration(duration)}</td>
                      <td className="px-6 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                         <button 
                           type="button"
                           onClick={(e) => {
                             e.preventDefault();
                             performDelete([s.id]);
                           }} 
                           className="p-2.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center border border-transparent hover:border-red-500/20"
                           title="Excluir Permanentemente"
                         >
                           <i className="fa-solid fa-trash-can"></i>
                         </button>
                      </td>
                    </tr>
                 );
               })}
               {sortedAuditSessions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-600 italic">Nenhum registro de ponto encontrado.</td>
                  </tr>
               )}
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default HumanResources;
