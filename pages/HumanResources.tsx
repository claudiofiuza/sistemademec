
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

const HumanResources: React.FC<HRProps> = ({ sessions, onUpdateSessions, users, settings }) => {
  const [now, setNow] = useState(Date.now());
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

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center uppercase tracking-tighter">
            <i className="fa-solid fa-user-check mr-4 text-primary"></i>
            Gestão Operacional de RH
          </h2>
          <p className="text-slate-400">Auditoria de horas e controle de ponto da equipe.</p>
        </div>
        <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex gap-1">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button 
              key={p} 
              onClick={() => setFilterPeriod(p as any)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterPeriod === p ? 'bg-primary text-slate-950 shadow-lg shadow-primary/20' : 'text-slate-500 hover:text-white'}`}
            >
              {p === 'daily' ? 'Hoje' : p === 'weekly' ? 'Semanal' : 'Mensal'}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mechanicStats.map(m => (
          <div key={m.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] shadow-xl relative transition-all hover:border-primary/30">
            <div className="flex items-center gap-4 mb-6">
              <img src={m.avatar} className="w-12 h-12 rounded-full border-2 border-slate-800 bg-slate-800" alt="avatar" />
              <div>
                <h4 className="font-bold text-white">{m.name}</h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{m.username}</p>
              </div>
              {m.activeSession && <span className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary-color)]"></span>}
            </div>
            <div className="flex justify-between border-t border-slate-800/50 pt-4">
              <span className="text-[10px] font-black text-slate-500 uppercase">Tempo Total</span>
              <span className="text-sm font-mono text-white font-bold">{formatDuration(m.totalTime)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6 pt-10">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Auditoria de Ponto</h3>
            {selectedIds.length > 0 && (
              <button onClick={() => performDelete(selectedIds)} className="bg-red-500 hover:bg-red-400 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all animate-in zoom-in-95">
                <i className="fa-solid fa-trash-can"></i> Excluir ({selectedIds.length})
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-black bg-slate-900 px-3 py-1 rounded-full border border-slate-800">Total: {sortedAuditSessions.length} registros</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          {isDeleting && <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-20 flex items-center justify-center text-white text-xs font-black uppercase tracking-widest"><i className="fa-solid fa-spinner animate-spin mr-3"></i> Sincronizando...</div>}
          <table className="w-full text-left">
            <thead className="bg-slate-800/40 border-b border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-500">
              <tr>
                <th className="px-6 py-5 w-10">
                  <button onClick={() => setSelectedIds(selectedIds.length === sortedAuditSessions.length ? [] : sortedAuditSessions.map(s => s.id))} className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${selectedIds.length === sortedAuditSessions.length && sortedAuditSessions.length > 0 ? 'bg-primary border-primary text-slate-950' : 'border-slate-700 bg-slate-800'}`}>
                    {selectedIds.length === sortedAuditSessions.length && sortedAuditSessions.length > 0 && <i className="fa-solid fa-check text-[10px]"></i>}
                  </button>
                </th>
                <th className="px-6 py-5">Mecânico</th>
                <th className="px-6 py-5">Entrada</th>
                <th className="px-6 py-5">Duração</th>
                <th className="px-6 py-5 text-right">Ações</th>
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
                  <td className="px-6 py-5 font-bold text-slate-200">{s.mechanicName}</td>
                  <td className="px-6 py-5 text-slate-400 text-xs font-mono">{new Date(s.startTime).toLocaleString()}</td>
                  <td className="px-6 py-5 text-slate-300 font-mono text-sm">{formatDuration(calculateSessionTime(s, now))}</td>
                  <td className="px-6 py-5 text-right" onClick={e => e.stopPropagation()}>
                    <button onClick={() => performDelete([s.id])} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><i className="fa-solid fa-trash-can"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HumanResources;
