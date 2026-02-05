
import React, { useState, useMemo } from 'react';
import { Workshop, User, Role, AppSettings } from '../types';
import { DEFAULT_SETTINGS, INITIAL_ROLES } from '../constants';
import { useNavigate } from 'react-router-dom';

interface CentralControlProps {
  workshops: Workshop[];
  setWorkshops: React.Dispatch<React.SetStateAction<Workshop[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  currentUser: User | null;
  onEnterWorkshop: (id: string) => void;
}

const CentralControl: React.FC<CentralControlProps> = ({ workshops, setWorkshops, users, setUsers, currentUser, onEnterWorkshop }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'workshops' | 'security'>('workshops');
  
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

  const systemAdmins = useMemo(() => users.filter(u => u.workshopId === 'system'), [users]);

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

    setWorkshops([...workshops, newWorkshop]);
    setUsers([...users, newOwner]);
    setIsModalOpen(false);
    setNewWorkshopName(''); setOwnerName(''); setOwnerUsername(''); setOwnerPassword('');
  };

  const handleCreateSystemAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.username || !newAdminForm.password || !newAdminForm.name) return;
    
    const exists = users.find(u => u.username === newAdminForm.username);
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

  return (
    <div className="p-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Controle Central</h2>
          <p className="text-slate-500 font-medium">Ecossistema de Workshop LSC Pro.</p>
        </div>
        
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 gap-2">
          <button 
            onClick={() => setActiveTab('workshops')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'workshops' ? 'bg-primary text-slate-950' : 'text-slate-500 hover:text-white'}`}
          >
            Oficinas
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-primary text-slate-950' : 'text-slate-500 hover:text-white'}`}
          >
            Segurança & Admins
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
              <i className="fa-solid fa-plus mr-2"></i> Adicionar Unidade
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
                  
                  <h3 className="text-2xl font-black text-white mb-2 truncate pr-10 tracking-tight">{ws.name}</h3>
                  <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-8">Unidade Ativa • {ws.id}</p>
                  
                  <div className="space-y-4 mb-10 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/50">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-widest">Faturamento Total</span>
                      <span className="text-primary font-mono font-black">{ws.settings.currencySymbol} {totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-bold uppercase tracking-widest">Quadro de Pessoal</span>
                      <span className="text-slate-300 font-black">{wsUsers.length} Colaboradores</span>
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

      {activeTab === 'security' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-10">
          {securityMessage && (
            <div className={`p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-bounce shadow-xl ${securityMessage.type === 'success' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-red-500/20 text-red-500 border border-red-500/20'}`}>
              <i className={`fa-solid ${securityMessage.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
              {securityMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* My Password */}
            <section className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8 flex items-center">
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

            {/* Create Admin */}
            <section className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
              <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8 flex items-center">
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

          {/* Admins List */}
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl">
             <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8 flex items-center">
                <i className="fa-solid fa-list-check mr-3 text-primary"></i> Administradores do Sistema
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {systemAdmins.map(admin => (
                 <div key={admin.id} className="bg-slate-800/40 border border-slate-700 p-6 rounded-[2rem] flex items-center gap-4 relative group">
                    <img src={admin.avatar} className="w-12 h-12 rounded-full border-2 border-primary/20 bg-slate-900" alt="avatar" />
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-black text-white truncate tracking-tight">{admin.name}</p>
                      <p className="text-[9px] text-primary font-black uppercase tracking-widest">@{admin.username}</p>
                    </div>
                    {admin.id !== currentUser?.id && (
                      <button 
                        onClick={() => { if(confirm(`Revogar acesso de ${admin.name}?`)) setUsers(users.filter(u => u.id !== admin.id)); }}
                        className="absolute top-2 right-2 p-2 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    )}
                    {admin.id === currentUser?.id && (
                      <span className="text-[8px] bg-primary text-slate-950 font-black px-2 py-0.5 rounded-full absolute -top-2 -right-2 border border-primary/50">VOCÊ</span>
                    )}
                 </div>
               ))}
             </div>
          </section>
        </div>
      )}

      {/* Workshop Creation Modal */}
      {isModalOpen && (activeTab === 'workshops') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-white mb-8 tracking-tighter uppercase">Nova Unidade Workshop</h3>
            
            <form onSubmit={handleCreateWorkshop} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Fantasia</label>
                <input type="text" value={newWorkshopName} onChange={e => setNewWorkshopName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-primary" placeholder="Ex: Benny's Original Works" required />
              </div>

              <div className="border-t border-slate-800 pt-6">
                 <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-4">Dados do Proprietário (Admin Unidade)</h4>
                 <div className="space-y-4">
                    <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-primary" placeholder="Nome do Dono" required />
                    <div className="grid grid-cols-2 gap-4">
                       <input type="text" value={ownerUsername} onChange={e => setOwnerUsername(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-primary" placeholder="Usuário" required />
                       <input type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-primary" placeholder="Senha" required />
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="submit" className="flex-1 bg-primary hover:opacity-90 text-slate-950 font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-xs">Estabelecer Unidade</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 bg-slate-800 text-slate-400 font-bold rounded-2xl hover:text-white uppercase tracking-widest text-xs">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralControl;
