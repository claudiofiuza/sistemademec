
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
    const user = (users || []).find(u => u.username.toLowerCase() === normalizedInput && u.password === password);
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0c10] relative overflow-hidden fade-in">
      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-slate-950 text-3xl mb-4 shadow-primary-glow">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none">LSC PRO V6</h1>
          <p className="text-slate-600 font-bold text-[10px] uppercase tracking-[0.4em] mt-3">SISTEMA INTEGRADO DE GESTÃO</p>
        </div>

        <div className="bg-[#11141a] p-8 rounded-3xl border border-slate-800 shadow-2xl">
          {step === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Terminal ID</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-slate-800 rounded-xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all text-white placeholder-slate-800 font-bold uppercase tracking-widest"
                  placeholder="USERNAME"
                  required
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Acesso Seguro</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-slate-800 rounded-xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-all text-white placeholder-slate-800 font-mono"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && <p className="text-red-500 text-[10px] font-black uppercase text-center tracking-widest bg-red-500/10 py-3 rounded-xl border border-red-500/20">{error}</p>}

              <button type="submit" className="w-full bg-primary hover:opacity-90 text-slate-950 font-black py-4 rounded-xl transition-all shadow-primary-glow uppercase tracking-widest text-xs italic">
                ESTABELECER CONEXÃO
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 text-center">Selecionar Terminal Unidade</p>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {workshops.map(ws => (
                  <button key={ws.id} onClick={() => onLogin(tempUser!, ws.id)} className="w-full bg-[#0a0c10] border border-slate-800 p-4 rounded-xl text-left hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-between group">
                    <span className="font-bold text-white uppercase italic text-sm">{ws.name}</span>
                    <i className="fa-solid fa-chevron-right text-slate-800 group-hover:text-primary text-xs transition-all"></i>
                  </button>
                ))}
                <button onClick={() => onLogin(tempUser!, undefined)} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg mt-4">CONTROLE GLOBAL ADMIN</button>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-[9px] text-slate-800 font-black uppercase tracking-[0.6em] mt-10 opacity-30 italic">LSC PRO • SECURE SUPABASE LINK ESTABLISHED</p>
      </div>
    </div>
  );
};

export default LoginPage;
