
import React, { useState } from 'react';
import { Workshop, User, Role, AppSettings } from '../types';
import { DEFAULT_SETTINGS, INITIAL_ROLES } from '../constants';
import { useNavigate } from 'react-router-dom';

interface CentralControlProps {
  workshops: Workshop[];
  setWorkshops: React.Dispatch<React.SetStateAction<Workshop[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  onEnterWorkshop: (id: string) => void;
}

const CentralControl: React.FC<CentralControlProps> = ({ workshops, setWorkshops, users, setUsers, onEnterWorkshop }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWorkshopName, setNewWorkshopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');

  const handleCreateWorkshop = (e: React.FormEvent) => {
    e.preventDefault();
    const workshopId = 'w_' + Math.random().toString(36).substr(2, 5);
    const ownerId = 'u_' + Math.random().toString(36).substr(2, 5);

    // Fixed: Added missing 'workSessions' property to comply with Workshop type definition
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
    
    // Limpar campos
    setNewWorkshopName('');
    setOwnerName('');
    setOwnerUsername('');
    setOwnerPassword('');
  };

  const handleEnter = (id: string) => {
    onEnterWorkshop(id);
    navigate('/');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">CONTROLE CENTRAL</h2>
          <p className="text-slate-500 font-medium">Gerencie o ecossistema de oficinas mecânicas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 flex items-center"
        >
          <i className="fa-solid fa-plus mr-2"></i> CRIAR NOVA OFICINA
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {workshops.map(ws => {
          const wsUsers = users.filter(u => u.workshopId === ws.id);
          const totalRevenue = ws.history.reduce((sum, r) => sum + r.finalPrice, 0);
          
          return (
            <div key={ws.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <i className="fa-solid fa-building-shield text-6xl text-emerald-500"></i>
              </div>
              
              <h3 className="text-2xl font-black text-white mb-2 truncate pr-10">{ws.name}</h3>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">ID: {ws.id}</p>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Faturamento</span>
                  <span className="text-emerald-500 font-mono font-bold">R$ {totalRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Mecânicos</span>
                  <span className="text-slate-300 font-bold">{wsUsers.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Catálogo</span>
                  <span className="text-slate-300 font-bold">{ws.parts.length} Peças</span>
                </div>
              </div>

              <button 
                onClick={() => handleEnter(ws.id)}
                className="w-full bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center"
              >
                GERENCIAR UNIDADE <i className="fa-solid fa-arrow-right ml-2 text-[10px]"></i>
              </button>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-white mb-8">NOVA MECÂNICA</h3>
            
            <form onSubmit={handleCreateWorkshop} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Oficina</label>
                <input type="text" value={newWorkshopName} onChange={e => setNewWorkshopName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Ex: Benny's Original Works" required />
              </div>

              <div className="border-t border-slate-800 pt-6">
                 <h4 className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Dados do Proprietário</h4>
                 <div className="space-y-4">
                    <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none" placeholder="Nome do Dono" required />
                    <div className="grid grid-cols-2 gap-4">
                       <input type="text" value={ownerUsername} onChange={e => setOwnerUsername(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none" placeholder="Usuário" required />
                       <input type="password" value={ownerPassword} onChange={e => setOwnerPassword(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none" placeholder="Senha" required />
                    </div>
                 </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-5 rounded-2xl transition-all shadow-xl">CRIAR AGORA</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 bg-slate-800 text-slate-400 font-bold rounded-2xl hover:text-white">CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CentralControl;
