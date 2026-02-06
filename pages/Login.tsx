
import React, { useState } from 'react';
import { User, AppSettings, Workshop } from '../types';

interface LoginProps {
  users: User[];
  workshops: Workshop[];
  onLogin: (u: User, workshopId?: string) => void;
  settings: AppSettings;
}

const LoginPage: React.FC<LoginProps> = ({ users, workshops, onLogin, settings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'credentials' | 'select-workshop'>('credentials');
  const [tempUser, setTempUser] = useState<User | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedInput = username.trim().toLowerCase();
    const user = users.find(u => u.username.toLowerCase() === normalizedInput && u.password === password);
    if (user) {
      if (user.workshopId === 'system') {
        setTempUser(user);
        setStep('select-workshop');
      } else {
        onLogin(user);
      }
    } else {
      setError('Credenciais inválidas.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-10 bg-slate-950 relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
         <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500 rounded-full blur-[180px]"></div>
         <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[180px]"></div>
      </div>

      <div className="max-w-lg w-full relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2.5rem] bg-emerald-500 text-slate-950 text-5xl mb-8 shadow-2xl shadow-emerald-500/30">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">LSC PRO V5</h1>
          <p className="text-slate-600 font-black text-[11px] uppercase tracking-[0.6em] mt-5 opacity-80">Security Terminal Node</p>
        </div>

        <div className="bg-slate-900/60 p-14 rounded-[4.5rem] border border-slate-800 shadow-2xl backdrop-blur-3xl">
          {step === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">Authorized User</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-[1.8rem] py-6 px-8 focus:outline-none focus:ring-4 ring-emerald-500/20 transition-all text-white placeholder-slate-800 font-black text-sm uppercase tracking-widest"
                  placeholder="USERNAME"
                  required
                />
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] ml-4">Security Key</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-[1.8rem] py-6 px-8 focus:outline-none focus:ring-4 ring-emerald-500/20 transition-all text-white placeholder-slate-800 font-mono text-xl"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-[11px] font-black uppercase text-center tracking-widest bg-red-500/10 py-4 rounded-2xl border border-red-500/30 animate-pulse">{error}</p>}

              <button type="submit" className="w-full bg-emerald-500 hover:scale-[1.02] text-slate-950 font-black py-6 rounded-[1.8rem] transition-all shadow-2xl shadow-emerald-500/30 uppercase tracking-[0.2em] text-xs italic">
                ESTABELECER CONEXÃO
              </button>
            </form>
          ) : (
            <div className="space-y-8">
              <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8 text-center">Selecionar Unidade de Operação</p>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar">
                {workshops.map(ws => (
                  <button key={ws.id} onClick={() => onLogin(tempUser!, ws.id)} className="w-full bg-slate-950/60 border border-slate-800 p-7 rounded-[2rem] text-left hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all flex items-center justify-between group">
                    <span className="font-black text-white text-lg uppercase tracking-tight italic group-hover:text-emerald-400">{ws.name}</span>
                    <i className="fa-solid fa-chevron-right text-slate-800 group-hover:text-emerald-500 text-[11px] group-hover:translate-x-2 transition-all"></i>
                  </button>
                ))}
                <button onClick={() => onLogin(tempUser!, undefined)} className="w-full bg-slate-800 text-white font-black py-6 rounded-[2rem] uppercase tracking-widest text-[11px] shadow-xl mt-6 border border-slate-700/50">MODO ADMINISTRADOR GLOBAL</button>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-slate-800 font-black uppercase tracking-[0.6em] mt-16 opacity-40 italic">LSC PRO • ESTABLISHED 2025 • END-TO-END SECURE</p>
      </div>
    </div>
  );
};

export default LoginPage;
