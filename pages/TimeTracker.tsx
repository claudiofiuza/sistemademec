
import React, { useState, useEffect, useMemo } from 'react';
import { User, WorkSession } from '../types';

interface TimeTrackerProps {
  user: User;
  sessions: WorkSession[];
  onUpdateSessions: (sessions: WorkSession[]) => void;
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const TimeTracker: React.FC<TimeTrackerProps> = ({ user, sessions, onUpdateSessions }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeSession = useMemo(() => {
    return sessions.find(s => s.mechanicId === user.id && s.status !== 'completed');
  }, [sessions, user.id]);

  const userHistory = useMemo(() => {
    return sessions.filter(s => s.mechanicId === user.id && s.status === 'completed')
      .sort((a, b) => b.startTime - a.startTime);
  }, [sessions, user.id]);

  const calculateTotalTime = (session: WorkSession, currentNow: number) => {
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

    // Deduct pause durations
    session.pauses.forEach(p => {
      if (p.end) {
        total -= (p.end - p.start);
      }
    });

    return Math.max(0, total);
  };

  const handleStart = () => {
    const newSession: WorkSession = {
      id: Math.random().toString(36).substr(2, 9),
      mechanicId: user.id,
      mechanicName: user.name,
      startTime: Date.now(),
      pauses: [],
      status: 'active'
    };
    onUpdateSessions([...sessions, newSession]);
  };

  const handlePause = () => {
    if (!activeSession) return;
    const updatedSession: WorkSession = {
      ...activeSession,
      status: 'paused',
      pauses: [...activeSession.pauses, { start: Date.now() }]
    };
    onUpdateSessions(sessions.map(s => s.id === activeSession.id ? updatedSession : s));
  };

  const handleResume = () => {
    if (!activeSession) return;
    const updatedPauses = [...activeSession.pauses];
    const lastPause = updatedPauses[updatedPauses.length - 1];
    lastPause.end = Date.now();

    const updatedSession: WorkSession = {
      ...activeSession,
      status: 'active',
      pauses: updatedPauses
    };
    onUpdateSessions(sessions.map(s => s.id === activeSession.id ? updatedSession : s));
  };

  const handleStop = () => {
    if (!activeSession) return;
    const updatedPauses = [...activeSession.pauses];
    if (activeSession.status === 'paused') {
      const lastPause = updatedPauses[updatedPauses.length - 1];
      lastPause.end = Date.now();
    }

    const updatedSession: WorkSession = {
      ...activeSession,
      status: 'completed',
      endTime: Date.now(),
      pauses: updatedPauses
    };
    onUpdateSessions(sessions.map(s => s.id === activeSession.id ? updatedSession : s));
  };

  const currentDuration = activeSession ? calculateTotalTime(activeSession, now) : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10">
      <header>
        <h2 className="text-3xl font-black text-white flex items-center">
          <i className="fa-solid fa-stopwatch mr-4 text-primary"></i>
          Ponto Eletrônico
        </h2>
        <p className="text-slate-400">Registre sua jornada de trabalho diária na oficina.</p>
      </header>

      {/* Active Punch Widget */}
      <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
        {activeSession ? (
          <>
            <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse"></div>
            <div className="mb-6">
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${activeSession.status === 'active' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-500'}`}>
                Sessão {activeSession.status === 'active' ? 'Em Andamento' : 'Pausada'}
              </span>
            </div>
            <div className="text-6xl font-black font-mono text-white mb-8 tracking-tighter">
              {formatDuration(currentDuration)}
            </div>
            <div className="flex gap-4 w-full max-w-md">
              {activeSession.status === 'active' ? (
                <button onClick={handlePause} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-yellow-500/10 transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-pause"></i> PAUSAR
                </button>
              ) : (
                <button onClick={handleResume} className="flex-1 bg-primary hover:opacity-90 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-primary/10 transition-all flex items-center justify-center gap-2">
                  <i className="fa-solid fa-play"></i> CONTINUAR
                </button>
              )}
              <button onClick={handleStop} className="flex-1 bg-red-500 hover:bg-red-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-500/10 transition-all flex items-center justify-center gap-2">
                <i className="fa-solid fa-stop"></i> ENCERRAR
              </button>
            </div>
          </>
        ) : (
          <>
             <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 text-slate-500 text-3xl">
               <i className="fa-solid fa-clock-rotate-left"></i>
             </div>
             <h3 className="text-2xl font-black text-white mb-2">Fora de Serviço</h3>
             <p className="text-slate-500 mb-8 max-w-sm">Você não possui uma sessão ativa. Inicie seu turno para começar a contabilizar suas horas.</p>
             <button onClick={handleStart} className="bg-primary hover:opacity-90 text-slate-950 font-black px-12 py-5 rounded-2xl shadow-xl shadow-primary/20 transition-all uppercase tracking-widest">
               INICIAR TURNO
             </button>
          </>
        )}
      </div>

      {/* Personal History */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white px-2">Meu Histórico Recente</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-slate-800/40 border-b border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-500">
              <tr>
                <th className="px-6 py-5">Data</th>
                <th className="px-6 py-5">Início</th>
                <th className="px-6 py-5">Término</th>
                <th className="px-6 py-5">Pausas</th>
                <th className="px-6 py-5 text-right">Duração Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {userHistory.map(s => {
                const duration = calculateTotalTime(s, s.endTime!);
                return (
                  <tr key={s.id} className="hover:bg-slate-800/20 transition-all group">
                    <td className="px-6 py-5 text-slate-200 font-bold">{new Date(s.startTime).toLocaleDateString()}</td>
                    <td className="px-6 py-5 text-slate-400 font-mono text-xs">{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-5 text-slate-400 font-mono text-xs">{new Date(s.endTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-5 text-slate-600 text-xs">{s.pauses.length} pausas</td>
                    <td className="px-6 py-5 text-right text-primary font-black font-mono">{formatDuration(duration)}</td>
                  </tr>
                );
              })}
              {userHistory.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-600 italic">Nenhuma sessão finalizada encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimeTracker;
