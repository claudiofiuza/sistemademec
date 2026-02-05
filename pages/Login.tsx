
import React, { useState } from 'react';
import { User, AppSettings, Workshop } from '../types';
import { SUPER_ADMIN_ID } from '../constants';

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
  
  // Novo estado para controlar o fluxo do Super Admin
  const [step, setStep] = useState<'credentials' | 'select-workshop'>('credentials');
  const [tempUser, setTempUser] = useState<User | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      if (user.id === SUPER_ADMIN_ID) {
        // Se for o Panda, mostra a seleção de oficinas
        setTempUser(user);
        setStep('select-workshop');
      } else {
        // Login normal
        onLogin(user);
      }
    } else {
      setError('Usuário ou senha inválidos');
    }
  };

  const handleSelectWorkshop = (wsId?: string) => {
    if (tempUser) {
      onLogin(tempUser, wsId);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500 text-white text-4xl mb-4 shadow-xl shadow-emerald-500/20">
            <i className="fa-solid fa-car-on"></i>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            {step === 'credentials' ? settings.workshopName : 'Olá, Panda'}
          </h1>
          <p className="text-slate-400 mt-2">
            {step === 'credentials' ? 'Sistema de Gerenciamento da Oficina' : 'Selecione a oficina que deseja gerenciar'}
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl transition-all">
          {step === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Usuário</label>
                <div className="relative group">
                  <i className="fa-solid fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors"></i>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-800/40 border border-slate-700 rounded-2xl py-4 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-white placeholder-slate-600 font-bold"
                    placeholder="Nome de usuário"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Chave de Acesso</label>
                <div className="relative group">
                  <i className="fa-solid fa-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors"></i>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800/40 border border-slate-700 rounded-2xl py-4 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-white placeholder-slate-600 font-mono tracking-widest"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-bold flex items-center space-x-3 animate-pulse">
                  <i className="fa-solid fa-triangle-exclamation text-lg"></i>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 uppercase tracking-widest"
              >
                Entrar no Sistema
              </button>
            </form>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {workshops.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => handleSelectWorkshop(ws.id)}
                    className="w-full bg-slate-800/50 hover:bg-slate-700 border border-slate-700 p-5 rounded-2xl text-left flex items-center justify-between group transition-all"
                  >
                    <div>
                      <p className="font-black text-white text-lg tracking-tight">{ws.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{ws.history.length} Atendimentos</p>
                    </div>
                    <i className="fa-solid fa-arrow-right text-slate-600 group-hover:text-emerald-500 transition-colors"></i>
                  </button>
                ))}
              </div>
              
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <button
                  onClick={() => handleSelectWorkshop(undefined)}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 border border-emerald-500/20 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group"
                >
                  <i className="fa-solid fa-microchip text-lg"></i>
                  <span>ACESSAR CONTROLE CENTRAL</span>
                </button>
                <button 
                  onClick={() => setStep('credentials')}
                  className="w-full text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest py-2 transition-colors"
                >
                  <i className="fa-solid fa-chevron-left mr-2"></i> Voltar ao Login
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em]">
          <p>&copy; 2024 OFICINA CENTRAL PRO. TODOS OS DIREITOS RESERVADOS.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
