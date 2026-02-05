
import React, { useState } from 'react';
import { User, AppSettings, Workshop } from '../types';

interface LoginProps {
  users: User[];
  workshops: Workshop[];
  onLogin: (u: User, workshopId?: string) => void;
  onOpenCloudConfig: () => void;
}

const LoginPage: React.FC<LoginProps> = ({ users, workshops, onLogin, onOpenCloudConfig }) => {
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
      setError('Usuário ou senha inválidos. Verifique as configurações de nuvem ou importe um backup.');
    }
  };

  const handleSelectWorkshop = (wsId?: string) => {
    if (tempUser) onLogin(tempUser, wsId);
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
          alert("Backup importado com sucesso!");
          window.location.reload();
        }
      } catch (err) { alert("Erro ao ler o JSON."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary text-white text-4xl mb-6 shadow-2xl shadow-primary/40"><i className="fa-solid fa-car-on"></i></div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">{step === 'credentials' ? "LSC PRO" : `OLÁ, ${tempUser?.name.split(' ')[0]}`}</h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Workshop Management System</p>
        </div>

        <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 shadow-2xl relative">
          {step === 'credentials' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuário</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 px-6 text-white font-bold outline-none focus:ring-2 ring-primary/20" placeholder="Seu usuário" required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave de Acesso</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-5 px-6 text-white font-mono outline-none focus:ring-2 ring-primary/20" placeholder="••••••••" required />
              </div>
              {error && <div className="text-red-400 text-[10px] font-bold text-center bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{error}</div>}
              <button type="submit" className="w-full bg-primary hover:opacity-90 text-slate-950 font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-all">ENTRAR NO SISTEMA</button>
              
              <div className="pt-6 border-t border-slate-800/50 flex flex-col items-center gap-4">
                <button type="button" onClick={onOpenCloudConfig} className="text-[9px] text-primary font-black uppercase tracking-widest hover:opacity-80 flex items-center gap-2"><i className="fa-solid fa-cloud"></i> Configurar Conexão de Nuvem</button>
                <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest cursor-pointer hover:text-white flex items-center gap-2"><i className="fa-solid fa-file-import"></i> Importar Backup (.JSON)<input type="file" accept=".json" onChange={handleImportData} className="hidden" /></label>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                {workshops.map(ws => (
                  <button key={ws.id} onClick={() => handleSelectWorkshop(ws.id)} className="w-full bg-slate-950/40 hover:bg-slate-800 border border-slate-800 p-6 rounded-3xl text-left flex items-center justify-between group transition-all">
                    <div><p className="font-black text-white text-lg italic uppercase">{ws.name}</p><p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mt-1">Unidade Operacional</p></div>
                    <i className="fa-solid fa-arrow-right text-slate-700 group-hover:text-primary"></i>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('credentials')} className="w-full text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-widest py-2"><i className="fa-solid fa-chevron-left mr-2"></i> Alterar Credenciais</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
