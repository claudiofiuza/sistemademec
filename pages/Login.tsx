
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
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
         <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full blur-[150px]"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[150px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-emerald-500 text-slate-950 text-4xl mb-6 shadow-2xl shadow-emerald-500/20">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">LSC PRO V5</h1>
          <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.4em] mt-3">Advanced Management Terminal</p>
        </div>

        <div className="bg-slate-900/60 p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl backdrop-blur-2xl">
          {step === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">Terminal User</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 px-6 focus:outline-none focus:ring-2 ring-emerald-500/30 transition-all text-white placeholder-slate-800 font-black text-sm uppercase tracking-widest"
                  placeholder="USUÁRIO"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">Access Key</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 px-6 focus:outline-none focus:ring-2 ring-emerald-500/30 transition-all text-white placeholder-slate-800 font-mono text-lg"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-[10px] font-black uppercase text-center tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">{error}</p>}

              <button type="submit" className="w-full bg-emerald-500 hover:opacity-90 text-slate-950 font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-xs italic">
                AUTENTICAR SISTEMA
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6 text-center">Selecione o Workshop Alvo</p>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {workshops.map(ws => (
                  <button key={ws.id} onClick={() => onLogin(tempUser!, ws.id)} className="w-full bg-slate-950/50 border border-slate-800 p-5 rounded-2xl text-left hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-between group">
                    <span className="font-black text-white text-sm uppercase tracking-tight italic">{ws.name}</span>
                    <i className="fa-solid fa-chevron-right text-slate-800 group-hover:text-emerald-500 text-[10px] group-hover:translate-x-1 transition-all"></i>
                  </button>
                ))}
                <button onClick={() => onLogin(tempUser!, undefined)} className="w-full bg-slate-800 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] shadow-lg mt-4">MODO SUPER ADMIN</button>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-[9px] text-slate-800 font-black uppercase tracking-[0.5em] mt-12 opacity-30 italic">LSC PRO • ESTABLISHED 2025 • SECURE</p>
      </div>
    </div>
  );
};

export default LoginPage;
