
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
    // Normaliza o input para evitar erros de espaço ou maiúsculas
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
      setError('Usuário ou senha inválidos. Verifique os dados ou importe o backup da oficina.');
    }
  };

  const handleSelectWorkshop = (wsId?: string) => {
    if (tempUser) {
      onLogin(tempUser, wsId);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.workshops && data.users) {
          localStorage.setItem('lsc_workshops_v4', JSON.stringify(data.workshops));
          localStorage.setItem('lsc_global_users_v4', JSON.stringify(data.users));
          alert("Backup da oficina importado com sucesso! O sistema será reiniciado.");
          window.location.reload();
        } else {
          alert("Arquivo de backup inválido.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-md w-full">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-500 text-white text-4xl mb-6 shadow-2xl shadow-emerald-500/40 border border-emerald-400/50">
            <i className="fa-solid fa-car-on"></i>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            {step === 'credentials' ? "LSC PRO" : `Olá, ${tempUser?.name.split(' ')[0]}`}
          </h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">
            {step === 'credentials' ? 'Workshop Management System' : 'Selecione a Unidade de Operação'}
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-slate-800 shadow-2xl transition-all relative">
          {step === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Usuário</label>
                <div className="relative group">
                  <i className="fa-solid fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors"></i>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-white placeholder-slate-700 font-bold"
                    placeholder="Seu usuário"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Chave de Acesso</label>
                <div className="relative group">
                  <i className="fa-solid fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors"></i>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 pl-14 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all text-white placeholder-slate-700 font-mono"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-[11px] font-bold animate-in shake-1 duration-300">
                  <div className="flex items-center gap-3">
                    <i className="fa-solid fa-circle-exclamation text-lg"></i>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 uppercase tracking-widest text-sm"
              >
                ENTRAR NO SISTEMA
              </button>

              <div className="pt-6 border-t border-slate-800/50 flex flex-col items-center gap-4">
                 <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest cursor-pointer hover:text-emerald-500 transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-file-import text-sm"></i>
                    CONFIGURAR VIA BACKUP (.JSON)
                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                 </label>
              </div>
            </form>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {workshops.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => handleSelectWorkshop(ws.id)}
                    className="w-full bg-slate-950/40 hover:bg-slate-800 border border-slate-800 p-6 rounded-3xl text-left flex items-center justify-between group transition-all"
                  >
                    <div className="flex-1 pr-4">
                      <p className="font-black text-white text-lg tracking-tight truncate uppercase italic">{ws.name}</p>
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mt-1">Unidade Operacional</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-700 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-all">
                       <i className="fa-solid fa-arrow-right"></i>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="pt-6 border-t border-slate-800 space-y-4">
                <button
                  onClick={() => handleSelectWorkshop(undefined)}
                  className="w-full bg-emerald-500/5 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 border border-emerald-500/20 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 group uppercase tracking-widest text-xs"
                >
                  <i className="fa-solid fa-microchip text-lg"></i>
                  <span>ACESSAR CONTROLE CENTRAL</span>
                </button>
                <button 
                  onClick={() => setStep('credentials')}
                  className="w-full text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-widest py-2 transition-colors"
                >
                  <i className="fa-solid fa-chevron-left mr-2"></i> Alterar Credenciais
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 text-center">
           <p className="text-slate-700 text-[9px] font-black uppercase tracking-[0.4em] mb-2">&copy; 2024 OFICINA CENTRAL PRO</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
