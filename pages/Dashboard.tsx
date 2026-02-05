
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ServiceRecord, Part, AppSettings, Permission, Announcement, WorkSession } from '../types';

interface DashboardProps {
  user: User;
  history: ServiceRecord[];
  parts: Part[];
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

  // dashboard now exclusively shows user's own data
  const displayHistory = useMemo(() => {
    return history.filter(r => r.mechanicId === user.id);
  }, [history, user.id]);

  const totalRevenue = displayHistory.reduce((sum, r) => sum + r.finalPrice, 0);
  const totalTax = displayHistory.reduce((sum, r) => sum + r.tax, 0);
  const totalServices = displayHistory.length;
  
  const recentActivity = displayHistory.slice(0, 5);

  const calculateTotalTime = (session: WorkSession, currentNow: number) => {
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

  const currentDuration = activeSession ? calculateTotalTime(activeSession, now) : 0;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white uppercase">{settings.workshopName}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-400 font-medium">Bem-vindo, <span className="text-primary font-bold">{user.name}</span></span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-500 uppercase tracking-widest font-black border border-slate-800 italic">Resumo Individual</span>
          </div>
        </div>
        
        {activeSession && (
          <Link to="/timetracker" className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-6 shadow-xl hover:border-primary transition-all group">
             <div>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tempo de Turno</p>
               <p className="text-xl font-mono font-black text-white group-hover:text-primary">{formatDuration(currentDuration)}</p>
             </div>
             <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
               <i className="fa-solid fa-stopwatch animate-spin-slow"></i>
             </div>
          </Link>
        )}
      </header>

      {relevantAnnouncements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-1">
             <i className="fa-solid fa-bullhorn text-primary text-sm"></i>
             <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Comunicados da Gerência</h3>
             <div className="h-px bg-slate-800 flex-1"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relevantAnnouncements.map(ann => (
              <div 
                key={ann.id} 
                className={`p-6 rounded-[2.5rem] border-2 relative overflow-hidden transition-all hover:scale-[1.02] shadow-xl ${
                  ann.type === 'urgent' ? 'bg-red-500/10 border-red-500/20 shadow-red-500/5' : 
                  ann.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 shadow-yellow-500/5' : 
                  'bg-primary/5 border-primary/20 shadow-primary/5'
                }`}
              >
                <div className={`absolute -top-4 -right-4 text-7xl opacity-5 rotate-12 ${
                   ann.type === 'urgent' ? 'text-red-500' : ann.type === 'warning' ? 'text-yellow-500' : 'text-primary'
                }`}>
                  <i className={`fa-solid ${ann.type === 'urgent' ? 'fa-triangle-exclamation' : 'fa-info-circle'}`}></i>
                </div>
                <div className="relative z-10 flex flex-col h-full">
                  <h4 className={`text-xl font-black uppercase tracking-tight mb-3 ${
                    ann.type === 'urgent' ? 'text-red-400' : ann.type === 'warning' ? 'text-yellow-400' : 'text-primary'
                  }`}>
                    {ann.title}
                  </h4>
                  <p className="text-slate-200 text-sm leading-relaxed mb-6 flex-1 font-medium">{ann.content}</p>
                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                        <i className="fa-solid fa-user-tie"></i>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{ann.authorName}</span>
                    </div>
                    <span className="text-[9px] text-slate-600 font-mono">{new Date(ann.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Minha Receita" value={`${settings.currencySymbol} ${totalRevenue.toLocaleString()}`} icon="fa-money-bill-trend-up" color="bg-primary" />
        <StatCard title="Meus Atendimentos" value={totalServices.toString()} icon="fa-wrench" color="bg-blue-500" />
        <StatCard title="Ticket Médio" value={`${settings.currencySymbol} ${totalServices > 0 ? (totalRevenue / totalServices).toLocaleString(undefined, {maximumFractionDigits: 0}) : 0}`} icon="fa-chart-line" color="bg-purple-500" />
        <StatCard title="Imposto Gerado" value={`${settings.currencySymbol} ${totalTax.toLocaleString()}`} icon="fa-receipt" color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-bold flex items-center px-1 text-slate-100">
            <i className="fa-solid fa-clock-rotate-left mr-3 text-slate-600"></i>
            Minha Atividade Recente
          </h3>
          <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                <tr>
                  <th className="px-6 py-5">Cliente</th>
                  <th className="px-6 py-5">Autorizador</th>
                  <th className="px-6 py-5">Valor Final</th>
                  <th className="px-6 py-5 text-right">Horário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {recentActivity.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/20 transition-all group">
                    <td className="px-6 py-5 font-bold text-slate-200 group-hover:text-white">{record.customerName}</td>
                    <td className="px-6 py-5 text-slate-400 text-sm italic">{record.authorizedBy}</td>
                    <td className="px-6 py-5 text-primary font-black">{settings.currencySymbol} {record.finalPrice.toLocaleString()}</td>
                    <td className="px-6 py-5 text-right text-slate-600 font-mono text-xs">
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {recentActivity.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-600 italic">Nenhum atendimento pessoal registrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold px-1 text-slate-100">Atalhos Operacionais</h3>
          <div className="grid grid-cols-1 gap-4">
            <ActionCard to="/calculator" label="Calculadora" desc="Iniciar novo atendimento" icon="fa-calculator" color="primary" />
            <ActionCard to="/timetracker" label="Ponto Eletrônico" desc="Gerenciar seu turno" icon="fa-stopwatch" color="slate" />
            <div className="p-8 bg-gradient-to-br from-primary to-emerald-600 rounded-[2.5rem] text-slate-950 relative overflow-hidden group shadow-2xl">
              <div className="relative z-10">
                <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">Minha Performance</h4>
                <p className="text-slate-950/70 text-sm mt-3 font-bold leading-tight">Mantenha o padrão LSC Pro em cada atendimento.</p>
              </div>
              <i className="fa-solid fa-gauge-high absolute -right-6 -bottom-6 text-9xl text-slate-950/10 rotate-12 transition-transform group-hover:scale-110"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: string, icon: string, color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] flex items-center justify-between shadow-xl hover:border-primary/20 transition-all group">
    <div>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{title}</p>
      <h4 className="text-3xl font-black mt-2 text-white tracking-tighter">{value}</h4>
    </div>
    <div className={`w-14 h-14 ${color === 'bg-primary' ? 'bg-primary text-slate-950' : color + ' text-white'} rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:rotate-12`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
  </div>
);

const ActionCard: React.FC<{ to: string, label: string, desc: string, icon: string, color: string }> = ({ to, label, desc, icon, color }) => (
  <Link to={to} className="flex items-center p-6 bg-slate-900 border border-slate-800 rounded-[2rem] hover:border-primary/50 hover:bg-slate-800 transition-all group shadow-lg">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mr-5 transition-transform group-hover:scale-110 ${color === 'primary' ? 'bg-primary text-slate-950 shadow-primary/20' : 'bg-slate-700 text-white'}`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <div className="flex-1">
      <h4 className="font-black text-slate-100 uppercase text-xs tracking-widest">{label}</h4>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">{desc}</p>
    </div>
    <i className="fa-solid fa-chevron-right text-slate-700 group-hover:text-primary transition-colors"></i>
  </Link>
);

export default Dashboard;
