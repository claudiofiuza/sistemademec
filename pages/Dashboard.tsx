
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
    <div className="p-10 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-800 pb-10 gap-6">
        <div>
          <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">{settings.workshopName}</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Logado como <span className="text-emerald-500 font-black">{user.name}</span></p>
        </div>
        
        {activeSession && (
          <div className="bg-emerald-500 text-slate-950 px-8 py-4 rounded-[2rem] flex items-center gap-6 shadow-2xl shadow-emerald-500/20">
             <div className="text-right border-r border-slate-950/20 pr-6">
               <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Turno Ativo</p>
               <p className="text-2xl font-mono font-black leading-none mt-1">{formatDuration(currentDuration)}</p>
             </div>
             <i className="fa-solid fa-stopwatch text-3xl animate-pulse"></i>
          </div>
        )}
      </header>

      {relevantAnnouncements.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Comunicados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relevantAnnouncements.map(ann => (
              <div key={ann.id} className={`p-8 rounded-[2.5rem] border ${ann.type === 'urgent' ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-800'} relative overflow-hidden backdrop-blur-sm group hover:scale-[1.02] transition-all`}>
                <h4 className={`font-black uppercase italic mb-3 tracking-tight ${ann.type === 'urgent' ? 'text-red-400' : 'text-emerald-500'}`}>{ann.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">{ann.content}</p>
                <div className="flex items-center justify-between text-[9px] text-slate-600 font-black uppercase tracking-widest border-t border-slate-800 pt-4">
                  <span>Autor: {ann.authorName}</span>
                  <span>{new Date(ann.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Faturamento Total" value={`${settings.currencySymbol} ${totalRevenue.toLocaleString()}`} icon="fa-wallet" color="text-emerald-500" />
        <StatCard title="Ordem de Serviços" value={totalServices.toString()} icon="fa-wrench" color="text-blue-500" />
        <StatCard title="Status do Ponto" value={activeSession ? 'TRABALHANDO' : 'FOLGA'} icon="fa-clock" color={activeSession ? 'text-emerald-400' : 'text-slate-600'} />
        <StatCard title="Versão Terminal" value="V5.3 PRO" icon="fa-code-branch" color="text-slate-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Meus Últimos Atendimentos</h3>
          <div className="bg-slate-900/40 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl backdrop-blur-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 text-[10px] uppercase font-black tracking-widest text-slate-600">
                <tr>
                  <th className="px-8 py-6">Cliente</th>
                  <th className="px-8 py-6">Valor</th>
                  <th className="px-8 py-6 text-right">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {displayHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/20 transition-all">
                    <td className="px-8 py-6">
                      <p className="font-black text-slate-200 uppercase italic tracking-tight">{record.customerName}</p>
                      <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-0.5">ID: {record.customerId}</p>
                    </td>
                    <td className="px-8 py-6 text-emerald-500 font-black font-mono text-lg">{settings.currencySymbol} {record.finalPrice.toLocaleString()}</td>
                    <td className="px-8 py-6 text-right text-slate-600 font-mono text-xs font-bold uppercase">
                      {new Date(record.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {displayHistory.length === 0 && (
                  <tr><td colSpan={3} className="px-8 py-20 text-center text-slate-700 italic text-sm font-medium uppercase tracking-widest">Aguardando seu primeiro registro...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Terminal de Ações</h3>
          <div className="flex flex-col gap-4">
            <Link to="/calculator" className="bg-emerald-500 hover:opacity-90 text-slate-950 font-black p-8 rounded-[2.5rem] transition-all flex items-center justify-between group shadow-xl shadow-emerald-500/10">
              <div className="flex flex-col">
                <span className="uppercase tracking-[0.2em] text-[10px] opacity-70 mb-1">Operacional</span>
                <span className="text-xl italic uppercase tracking-tighter">Nova O.S.</span>
              </div>
              <i className="fa-solid fa-plus-circle text-3xl group-hover:rotate-90 transition-all"></i>
            </Link>
            <Link to="/timetracker" className="bg-slate-800 hover:bg-slate-700 text-white font-black p-8 rounded-[2.5rem] transition-all flex items-center justify-between group shadow-xl">
               <div className="flex flex-col">
                <span className="uppercase tracking-[0.2em] text-[10px] opacity-30 mb-1">Jornada</span>
                <span className="text-xl italic uppercase tracking-tighter">Gerenciar Ponto</span>
              </div>
              <i className="fa-solid fa-clock text-3xl opacity-20"></i>
            </Link>
            <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] text-slate-600 text-[10px] uppercase font-black tracking-[0.2em] text-center leading-relaxed italic opacity-40">
               LSC PRO Management<br/>
               The standard of excellence.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: string, color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-sm group hover:border-slate-700 transition-all">
    <div className="flex items-center justify-between mb-4">
      <span className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">{title}</span>
      <div className={`w-10 h-10 rounded-2xl bg-slate-800/50 flex items-center justify-center ${color} shadow-lg`}>
        <i className={`fa-solid ${icon} text-lg`}></i>
      </div>
    </div>
    <h4 className="text-3xl font-black text-white tracking-tighter italic uppercase">{value}</h4>
  </div>
);

export default Dashboard;
