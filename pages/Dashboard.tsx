
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
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="text-left">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{settings.workshopName}</h2>
          <p className="text-slate-500 text-sm mt-1">Olá, <span className="text-emerald-500 font-bold">{user.name}</span></p>
        </div>
        
        {activeSession && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-2 rounded-xl flex items-center gap-4">
             <div className="text-right">
               <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Ponto Ativo</p>
               <p className="text-lg font-mono font-black leading-none mt-1">{formatDuration(currentDuration)}</p>
             </div>
             <i className="fa-solid fa-stopwatch text-xl animate-pulse"></i>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Faturamento Total" value={`${settings.currencySymbol} ${totalRevenue.toLocaleString()}`} icon="fa-wallet" color="text-emerald-500" />
        <StatCard title="Ordens de Serviços" value={totalServices.toString()} icon="fa-wrench" color="text-blue-500" />
        <StatCard title="Status do Ponto" value={activeSession ? 'TRABALHANDO' : 'FOLGA'} icon="fa-clock" color={activeSession ? 'text-emerald-400' : 'text-slate-600'} />
        <StatCard title="Conexão Cloud" value="SUPABASE" icon="fa-database" color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 text-left">Meus Últimos Atendimentos</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4 text-right">Horário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {displayHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="px-6 py-4 text-left">
                      <p className="font-bold text-slate-200">{record.customerName}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">ID: {record.customerId}</p>
                    </td>
                    <td className="px-6 py-4 text-emerald-500 font-black font-mono text-left">{settings.currencySymbol} {record.finalPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs font-bold">
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {displayHistory.length === 0 && (
                  <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-600 italic">Inicie sua jornada hoje.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 text-left">Ações Rápidas</h3>
          <div className="flex flex-col gap-3">
            <Link to="/calculator" className="bg-emerald-500 hover:opacity-90 text-slate-900 font-black p-6 rounded-2xl transition-all flex items-center justify-between group">
              <span className="uppercase tracking-widest text-xs italic">Nova O.S.</span>
              <i className="fa-solid fa-plus-circle text-2xl group-hover:rotate-90 transition-all"></i>
            </Link>
            <Link to="/timetracker" className="bg-slate-800 hover:bg-slate-700 text-white font-black p-6 rounded-2xl transition-all flex items-center justify-between">
              <span className="uppercase tracking-widest text-xs italic">Gerenciar Ponto</span>
              <i className="fa-solid fa-clock text-2xl opacity-50"></i>
            </Link>
          </div>

          {relevantAnnouncements.length > 0 && (
             <div className="space-y-4 pt-4 text-left">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Comunicados</h3>
                <div className="space-y-3">
                   {relevantAnnouncements.map(ann => (
                     <div key={ann.id} className={`p-4 rounded-xl border ${ann.type === 'urgent' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1">{ann.title}</p>
                        <p className="text-xs font-medium leading-relaxed">{ann.content}</p>
                     </div>
                   ))}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: string, color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm hover:border-slate-700 transition-all text-left">
    <div className="flex items-center justify-between mb-4">
      <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{title}</span>
      <div className={`w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center ${color}`}>
        <i className={`fa-solid ${icon} text-lg`}></i>
      </div>
    </div>
    <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">{value}</h4>
  </div>
);

export default Dashboard;
