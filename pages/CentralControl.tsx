
import React, { useState, useMemo } from 'react';
import { Workshop, User, Role, AppSettings } from '../types';
import { DEFAULT_SETTINGS, INITIAL_ROLES } from '../constants';
import { CLOUD_CONFIG } from '../githubSync';
import { useNavigate } from 'react-router-dom';

interface CentralControlProps {
  workshops: Workshop[];
  setWorkshops: React.Dispatch<React.SetStateAction<Workshop[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User | null;
  onEnterWorkshop: (id: string) => void;
  triggerSync: () => void;
}

const CentralControl: React.FC<CentralControlProps> = ({ 
  workshops, setWorkshops, users, setUsers, currentUser, onEnterWorkshop, triggerSync 
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'workshops' | 'security' | 'data' | 'cloud'>('workshops');
  
  // Workshop Creation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkshopName, setNewWorkshopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  // Security State
  const [newAdminForm, setNewAdminForm] = useState({ name: '', username: '', password: '' });
  const [myPasswordForm, setMyPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [securityMessage, setSecurityMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleCreateWorkshop = (e: React.FormEvent) => {
    e.preventDefault();
    const workshopId = 'w_' + Math.random().toString(36).substr(2, 5);
    const ownerId = 'u_' + Math.random().toString(36).substr(2, 5);

    const newWorkshop: Workshop = {
      id: workshopId,
      name: newWorkshopName,
      ownerId: ownerId,
      settings: { ...DEFAULT_SETTINGS, workshopName: newWorkshopName },
      parts: [],
      roles: [...INITIAL_ROLES],
      history: [],
      announcements: [],
      workSessions: []
    };

    const newOwner: User = {
      id: ownerId,
      username: ownerUsername,
      name: ownerName,
      roleId: 'r_admin',
      workshopId: workshopId,
      password: ownerPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${ownerUsername}`
    };

    const updatedWorkshops = [...workshops, newWorkshop];
    const updatedUsers = [...users, newOwner];
    
    setWorkshops(updatedWorkshops);
    setUsers(updatedUsers);
    setIsModalOpen(false);
    setNewWorkshopName(''); setOwnerName(''); setOwnerUsername(''); setOwnerPassword('');
  };

  const handleCreateSystemAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.username || !newAdminForm.password || !newAdminForm.name) return;
    
    const exists = users.find(u => u.username.toLowerCase() === newAdminForm.username.toLowerCase());
    if (exists) {
      setSecurityMessage({ text: 'Nome de usuário já existe!', type: 'error' });
      return;
    }

    const newAdmin: User = {
      id: 'admin_' + Math.random().toString(36).substr(2, 9),
      username: newAdminForm.username,
      name: newAdminForm.name,
      roleId: 'r_admin',
      workshopId: 'system',
      password: newAdminForm.password,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${newAdminForm.username}`
    };

    setUsers([...users, newAdmin]);
    setNewAdminForm({ name: '', username: '', password: '' });
    setSecurityMessage({ text: 'Novo Super Admin criado!', type: 'success' });
    setTimeout(() => setSecurityMessage(null), 3000);
  };

  const handleChangeMyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (myPasswordForm.new !== myPasswordForm.confirm) {
      setSecurityMessage({ text: 'As novas senhas não coincidem!', type: 'error' });
      return;
    }
    if (currentUser.password !== myPasswordForm.current) {
      setSecurityMessage({ text: 'Senha atual incorreta!', type: 'error' });
      return;
    }

    setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, password: myPasswordForm.new } : u));
    setMyPasswordForm({ current: '', new: '', confirm: '' });
    setSecurityMessage({ text: 'Sua senha foi alterada com sucesso!', type: 'success' });
    setTimeout(() => setSecurityMessage(null), 3000);
  };

  const handleEnter = (id: string) => {
    onEnterWorkshop(id);
    navigate('/');
  };

  const handleExportData = () => {
    const data = { workshops, users, version: 'v4', exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lsc_pro_backup_${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.workshops && data.users) {
          if (confirm("Isso irá substituir todos os dados atuais. Deseja continuar?")) {
            setWorkshops(data.workshops);
            setUsers(data.users);
            alert("Dados importados com sucesso!");
          }
        }
      } catch (err) { alert("Erro ao ler o arquivo."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Controle Central</h2>
          <p className="text-slate-500 font-medium">Gestão Global da Rede LSC Pro.</p>
        </div>
        
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-1 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('workshops')}
            className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'workshops' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Unidades
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'security' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Segurança
          </button>
          <button 
            onClick={() => setActiveTab('cloud')}
            className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'cloud' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Sincronização Cloud
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'data' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            Backup
          </button>
        </div>
      </div>

      {activeTab === 'workshops' && (
        <div className="animate-in fade-in duration-300 space-y-8">
          <div className="flex justify-end">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:opacity-90 text-slate-950 font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center uppercase tracking-widest text-xs"
            >
              <i className="fa-solid fa-plus mr-2"></i> Abrir Nova Unidade
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {workshops.map(ws => {
              const wsUsers = users.filter(u => u.workshopId === ws.id);
              const totalRevenue = ws.history.reduce((sum, r) => sum + r.finalPrice, 0);
              
              return (
                <div key={ws.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 hover:border-primary/30 transition-all group relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <i className="fa-solid fa-building-shield text-8xl text-primary"></i>
                  </div>
                  
                  <h3 className="text-2xl font-black text-white mb-2 truncate pr-10 tracking-tight italic uppercase">{ws.name}</h3>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-8">Unidade Ativa • {ws.id}</p>
                  
                  <div className="space-y-4 mb-10 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-widest">Faturamento</span>
                      <span className="text-primary font-mono font-black">{ws.settings.currencySymbol} {totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-widest">Equipe</span>
                      <span className="text-slate-300 font-black">{wsUsers.length} Membros</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleEnter(ws.id)}
                    className="w-full bg-slate-800 hover:bg-primary hover:text-slate-950 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center uppercase tracking-widest text-xs"
                  >
                    Gerenciar Workshop <i className="fa-solid fa-arrow-right-long ml-3"></i>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'cloud' && (
        <div className="animate-in fade-in duration-300 space-y-10">
           <section className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-xl">
              <div className="flex items-center gap-6 mb-10">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center text-3xl">
                  <i className="fa-solid fa-cloud-bolt"></i>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Sincronização Automatizada</h3>
                  <p className="text-slate-500 font-medium">O banco de dados está sendo espelhado no GitHub de forma transparente.</p>
                </div>
              </div>

              <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800">
                      <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Repositório Alvo</p>
                      <p className="text-sm font-bold text-white font-mono">{CLOUD_CONFIG.owner}/{CLOUD_CONFIG.repo}</p>
                   </div>
                   <div className="p-5 bg-slate-900 rounded-2xl border border-slate-800">
                      <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Status da Chave</p>
                      <p className="text-sm font-bold text-emerald-500 flex items-center gap-2">
                        <i className="fa-solid fa-check-double"></i> Token Embutido Ativo
                      </p>
                   </div>
                </div>

                <div className="flex gap-4">
                    <button 
                      onClick={() => triggerSync()}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/10 transition-all flex items-center justify-center gap-3"
                    >
                      <i className="fa-solid fa-cloud-arrow-up"></i>
                      Forçar Atualização na Nuvem
                    </button>
                </div>
              </div>

              <div className="mt-12 bg-slate-950 p-6 rounded-[2rem] border border-slate-800">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                  <i className="fa-solid fa-circle-info mr-2 text-emerald-500"></i> Notas de Operação
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  A sincronização acontece automaticamente a cada alteração importante no sistema. 
                  Todos os membros da equipe que acessarem este link agora estarão conectados ao mesmo banco de dados 
                  global, permitindo que mecânicos de diferentes computadores vejam as mesmas ordens de serviço e tabelas de preços.
                </p>
              </div>
           </section>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-10">
          {securityMessage && (
            <div className={`p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-bounce shadow-xl ${securityMessage.type === 'success' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-red-500/20 text-red-500 border border-red-500/20'}`}>
              <i className={`fa-solid ${securityMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
              {securityMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <section className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8 flex items-center italic">
                <i className="fa-solid fa-key mr-3 text-primary"></i> Alterar Minha Senha
              </h3>
              <form onSubmit={handleChangeMyPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha Atual</label>
                  <input type="password" value={myPasswordForm.current} onChange={e => setMyPasswordForm({...myPasswordForm, current: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-mono outline-none focus:ring-1 ring-primary" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nova Senha</label>
                  <input type="password" value={myPasswordForm.new} onChange={e => setMyPasswordForm({...myPasswordForm, new: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-mono outline-none focus:ring-1 ring-primary" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                  <input type="password" value={myPasswordForm.confirm} onChange={e => setMyPasswordForm({...myPasswordForm, confirm: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-mono outline-none focus:ring-1 ring-primary" required />
                </div>
                <button type="submit" className="w-full bg-primary text-slate-950 font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95">Atualizar Credenciais</button>
              </form>
            </section>

            <section className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8 flex items-center italic">
                <i className="fa-solid fa-user-shield mr-3 text-primary"></i> Criar Super Admin
              </h3>
              <form onSubmit={handleCreateSystemAdmin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input type="text" value={newAdminForm.name} onChange={e => setNewAdminForm({...newAdminForm, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary" placeholder="Administrador do Sistema" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuário</label>
                  <input type="text" value={newAdminForm.username} onChange={e => setNewAdminForm({...newAdminForm, username: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary" placeholder="admin_global" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
                  <input type="password" value={newAdminForm.password} onChange={e => setNewAdminForm({...newAdminForm, password: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white font-mono outline-none focus:ring-1 ring-primary" required />
                </div>
                <button type="submit" className="w-full bg-white text-slate-950 font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg transition-all hover:-translate-y-1 active:scale-95">Outorgar Acesso Global</button>
              </form>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="animate-in fade-in duration-300">
           <section className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-xl text-center">
              <i className="fa-solid fa-download text-4xl text-primary mb-6"></i>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 italic">Segurança de Dados Local</h3>
              <p className="text-slate-500 mb-8 max-w-xl mx-auto">Mesmo usando a nuvem, é recomendável manter backups manuais semanais.</p>
              
              <div className="flex gap-4 max-w-lg mx-auto">
                 <button onClick={handleExportData} className="flex-1 bg-primary text-slate-950 font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-primary/10">Exportar .JSON</button>
                 <label className="flex-1 bg-slate-800 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs cursor-pointer hover:bg-slate-700 transition-all">
                    Importar .JSON
                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                 </label>
              </div>
           </section>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl">
            <h3 className="text-3xl font-black text-white mb-8 tracking-tighter uppercase italic">Nova Unidade Workshop</h3>
            <form onSubmit={handleCreateWorkshop} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Fantasia</label>
                <input type="text" value={newWorkshopName} onChange={e => setNewWorkshopName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Benny's Works" required />
              </div>
              <div className="border-t border-slate-800 pt-6">
                 <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Dados do Proprietário</h4>
                 <div className="space-y-4">
                    <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-primary" placeholder="Nome do Dono" required />
                    <div className="grid grid-cols-2 gap-4">
                       <input type="text" value={ownerUsername} onChange={e => setOwnerUsername(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-primary" placeholder="Usuário" required />
                       <input type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-primary" placeholder="Senha" required />
                    </div>
                 </div>
              </div>
              <div className="flex gap-4 pt-6">
                <button type="submit" className="flex-1 bg-primary text-slate-950 font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-xs">Estabelecer Unidade</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 bg-slate-800 text-slate-400 font-bold rounded-2xl uppercase tracking-widest text-xs">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralControl;
