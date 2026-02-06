
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ServiceRecord, AppSettings, Announcement, WorkSession } from '../types';

interface DashboardProps {
  user: User;
  history: ServiceRecord[];
  settings: AppSettings;
  announcements?: Announcement[];
  workSessions?: WorkSession[];
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const Dashboard: React.FC<DashboardProps> = ({ user, history, settings, announcements = [], workSessions = [] }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const relevantAnnouncements = useMemo(() => {
    return announcements.filter(ann => ann.targetUserId === 'all' || ann.targetUserId === user.id);
  }, [announcements, user]);

  const activeSession = useMemo(() => {
    return workSessions.find(s => s.mechanicId === user.id && s.status !== 'completed');
  }, [workSessions, user.id]);

  const displayHistory = useMemo(() => {
    return history.filter(r => r.mechanicId === user.id).slice(0, 10);
  }, [history, user.id]);

  const totalRevenue = history.filter(r => r.mechanicId === user.id).reduce((sum, r) => sum + r.finalPrice, 0);
  const totalServices = history.filter(r => r.mechanicId === user.id).length;

  const calculateTotalTime = (session: WorkSession, currentNow: number) => {
    let total = 0;
    if (session.status === 'completed') total = session.endTime! - session.startTime;
    else if (session.status === 'active') total = currentNow - session.startTime;
    else if (session.status === 'paused') {
      const lastPause = session.pauses[session.pauses.length - 1];
      total = lastPause.start - session.startTime;
    }
    session.pauses.forEach(p => { if (p.end) total -= (p.end - p.start); });
    return Math.max(0, total);
  };

  const currentDuration = activeSession ? calculateTotalTime(activeSession, now) : 0;

  return (
    <div className="p-12 space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-800/60 pb-12 gap-8">
        <div>
          <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">{settings.workshopName}</h2>
          <p className="text-slate-500 text-lg mt-3 font-medium">Terminal de Acesso: <span className="text-emerald-500 font-black uppercase tracking-widest">{user.name}</span></p>
        </div>
        
        {activeSession && (
          <div className="bg-emerald-500 text-slate-950 px-10 py-5 rounded-[2.5rem] flex items-center gap-8 shadow-2xl shadow-emerald-500/25 transition-all hover:scale-[1.03]">
             <div className="text-right border-r border-slate-950/20 pr-8">
               <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-70">Sessão em Curso</p>
               <p className="text-3xl font-mono font-black leading-none mt-1">{formatDuration(currentDuration)}</p>
             </div>
             <i className="fa-solid fa-stopwatch text-4xl animate-pulse"></i>
          </div>
        )}
      </header>

      {relevantAnnouncements.length > 0 && (
        <div className="space-y-8">
          <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.5em] px-2 flex items-center">
             <span className="w-8 h-px bg-slate-800 mr-4"></span> Mural de Comunicados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {relevantAnnouncements.map(ann => (
              <div key={ann.id} className={`p-10 rounded-[3rem] border ${ann.type === 'urgent' ? 'bg-red-500/5 border-red-500/30' : 'bg-slate-900/60 border-slate-800/80'} relative overflow-hidden backdrop-blur-md group hover:translate-y-[-5px] transition-all duration-300 shadow-xl`}>
                <h4 className={`font-black uppercase italic mb-4 tracking-tighter text-xl ${ann.type === 'urgent' ? 'text-red-400' : 'text-emerald-500'}`}>{ann.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed mb-8 font-medium italic opacity-90">{ann.content}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-black uppercase tracking-widest border-t border-slate-800/60 pt-6">
                  <span className="flex items-center gap-2"><i className="fa-solid fa-user-pen"></i> {ann.authorName}</span>
                  <span>{new Date(ann.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Faturamento Total" value={`${settings.currencySymbol} ${totalRevenue.toLocaleString()}`} icon="fa-wallet" color="text-emerald-500" />
        <StatCard title="Ordens Criadas" value={totalServices.toString()} icon="fa-screwdriver-wrench" color="text-blue-500" />
        <StatCard title="Status Atual" value={activeSession ? 'EM SERVIÇO' : 'FOLGA'} icon="fa-clock" color={activeSession ? 'text-emerald-400' : 'text-slate-600'} />
        <StatCard title="Database V5" value="CONECTADO" icon="fa-database" color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-8">
        <div className="lg:col-span-2 space-y-8">
          <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.5em] px-2">Meus Últimos Registros</h3>
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-[3.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
            <table className="w-full text-left">
              <thead className="bg-slate-800/40 text-[11px] uppercase font-black tracking-widest text-slate-500">
                <tr>
                  <th className="px-10 py-8">Identificação Cliente</th>
                  <th className="px-10 py-8">Valor Final</th>
                  <th className="px-10 py-8 text-right">Horário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 font-medium">
                {displayHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/20 transition-all duration-300">
                    <td className="px-10 py-8">
                      <p className="font-black text-slate-100 uppercase italic tracking-tighter text-lg">{record.customerName}</p>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] mt-1">Passaporte: {record.customerId}</p>
                    </td>
                    <td className="px-10 py-8 text-emerald-500 font-black font-mono text-2xl">{settings.currencySymbol} {record.finalPrice.toLocaleString()}</td>
                    <td className="px-10 py-8 text-right text-slate-600 font-mono text-xs font-black uppercase">
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {displayHistory.length === 0 && (
                  <tr><td colSpan={3} className="px-10 py-24 text-center text-slate-700 font-black uppercase tracking-[0.5em] italic">Inicie sua jornada hoje</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-10">
          <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.5em] px-2">Terminal de Operações</h3>
          <div className="flex flex-col gap-5">
            <Link to="/calculator" className="bg-emerald-500 hover:scale-[1.02] text-slate-950 font-black p-10 rounded-[3rem] transition-all flex items-center justify-between group shadow-2xl shadow-emerald-500/15">
              <div className="flex flex-col">
                <span className="uppercase tracking-[0.3em] text-[10px] opacity-70 mb-2 font-bold">Gerar Ordem</span>
                <span className="text-2xl italic uppercase tracking-tighter">Calculadora</span>
              </div>
              <i className="fa-solid fa-plus-circle text-4xl group-hover:rotate-90 transition-all duration-500"></i>
            </Link>
            <Link to="/timetracker" className="bg-slate-800/80 hover:bg-slate-800 text-white font-black p-10 rounded-[3rem] transition-all flex items-center justify-between group shadow-xl backdrop-blur-md border border-slate-700/50">
               <div className="flex flex-col">
                <span className="uppercase tracking-[0.3em] text-[10px] opacity-40 mb-2">Relógio de Ponto</span>
                <span className="text-2xl italic uppercase tracking-tighter">Meu Turno</span>
              </div>
              <i className="fa-solid fa-clock text-4xl opacity-30 group-hover:opacity-100 transition-all"></i>
            </Link>
            <div className="p-10 bg-slate-900/50 border border-slate-800/60 rounded-[3rem] text-slate-700 text-[10px] uppercase font-black tracking-[0.4em] text-center leading-loose italic opacity-50 select-none">
               Los Santos Customs PRO<br/>
               Premium RP Management System
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: string, color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-slate-900/40 border border-slate-800/60 p-10 rounded-[3.5rem] shadow-2xl backdrop-blur-xl group hover:border-slate-700 transition-all duration-300">
    <div className="flex items-center justify-between mb-6">
      <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-80">{title}</span>
      <div className={`w-14 h-14 rounded-2xl bg-slate-800/40 flex items-center justify-center ${color} shadow-lg transition-all group-hover:scale-110`}>
        <i className={`fa-solid ${icon} text-2xl`}></i>
      </div>
    </div>
    <h4 className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none">{value}</h4>
  </div>
);

export default Dashboard;
