
import React, { useState, useEffect } from 'react';
import { User, Permission, Role, Part, AppSettings, CategoryGroup } from '../types';

interface AdminPanelProps {
  user: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  workshopId: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  user, users, setUsers, roles, setRoles, parts, setParts, 
  settings, setSettings, workshopId 
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'inventory' | 'roles' | 'settings'>('users');
  
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userForm, setUserForm] = useState<Partial<User>>({ username: '', name: '', roleId: roles[0]?.id || '', password: '123' });
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [localSettings, setLocalSettings] = useState<AppSettings>({ ...settings });
  const [localParts, setLocalParts] = useState<Part[]>([...parts]);
  const [localCategories, setLocalCategories] = useState<string[]>([...settings.categories]);
  const [localGroups, setLocalGroups] = useState<Record<string, CategoryGroup>>({ ...settings.categoryGroups });
  
  const [newPart, setNewPart] = useState<Partial<Part>>({ category: settings.categories[0] || 'Outros', name: '', price: 0 });
  const [isEditingPart, setIsEditingPart] = useState(false);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryGroup, setNewCategoryGroup] = useState<CategoryGroup>('Estetica');
  const [editingCategory, setEditingCategory] = useState<{oldName: string, newName: string} | null>(null);

  const [localRoles, setLocalRoles] = useState<Role[]>([...roles]);
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState<Partial<Role>>({ name: '', permissions: [] });

  useEffect(() => {
    setLocalSettings({ ...settings });
    setLocalParts([...parts]);
    setLocalCategories([...settings.categories]);
    setLocalGroups({ ...settings.categoryGroups });
    setLocalRoles([...roles]);
  }, [settings, parts, roles, activeTab]);

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingUser && editingUserId) {
      setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...userForm } as User : u));
      setIsEditingUser(false);
      setEditingUserId(null);
    } else if (userForm.username && userForm.name) {
      const u: User = { 
        id: Math.random().toString(36).substr(2, 9), 
        username: userForm.username!, 
        name: userForm.name!, 
        roleId: userForm.roleId || roles[0]?.id || '', 
        workshopId: workshopId,
        password: userForm.password || '123', 
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userForm.username}` 
      };
      setUsers(prev => [...prev, u]);
    }
    setUserForm({ username: '', name: '', roleId: roles[0]?.id || '', password: '123' });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() && !localCategories.includes(newCategoryName.trim())) {
      setLocalCategories(prev => [...prev, newCategoryName.trim()]);
      setLocalGroups(prev => ({ ...prev, [newCategoryName.trim()]: newCategoryGroup }));
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if (window.confirm(`Excluir a categoria "${cat}"? Peças vinculadas serão movidas para "Outros".`)) {
      const updatedCategories = localCategories.filter(c => c !== cat);
      if (!updatedCategories.includes('Outros')) {
        updatedCategories.push('Outros');
      }
      setLocalCategories(updatedCategories);
      
      const newGroups = { ...localGroups };
      delete newGroups[cat];
      if (!newGroups['Outros']) newGroups['Outros'] = 'Estetica';
      setLocalGroups(newGroups);
      
      setLocalParts(prev => prev.map(p => p.category === cat ? { ...p, category: 'Outros' } : p));
    }
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategory({ oldName: cat, newName: cat });
  };

  const handleSaveCategoryEdit = () => {
    if (!editingCategory || !editingCategory.newName.trim()) return;
    const { oldName, newName } = editingCategory;
    if (localCategories.includes(newName) && oldName !== newName) {
      alert("Nome já existente.");
      return;
    }
    setLocalCategories(prev => prev.map(c => c === oldName ? newName : c));
    setLocalGroups(prev => {
      const updated = { ...prev };
      updated[newName] = updated[oldName];
      delete updated[oldName];
      return updated;
    });
    setLocalParts(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
    setEditingCategory(null);
  };

  const handlePartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingPart && editingPartId) {
      setLocalParts(prev => prev.map(p => p.id === editingPartId ? { ...p, name: newPart.name!, price: Number(newPart.price), category: newPart.category! } : p));
      setIsEditingPart(false);
      setEditingPartId(null);
    } else if (newPart.name && newPart.price) {
      setLocalParts(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name: newPart.name!, category: newPart.category!, price: Number(newPart.price) }]);
    }
    setNewPart({ category: localCategories[0] || 'Outros', name: '', price: 0 });
  };

  const handleDeletePart = (id: string) => {
    if (window.confirm("Remover esta peça do catálogo?")) {
      setLocalParts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSaveInventory = () => {
    setParts(localParts);
    setSettings({ ...settings, categories: localCategories, categoryGroups: localGroups });
    alert('Inventário atualizado com sucesso!');
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingRole && editingRoleId) {
      setLocalRoles(prev => prev.map(r => r.id === editingRoleId ? { ...r, name: roleForm.name!, permissions: roleForm.permissions! } : r));
      setIsEditingRole(false);
      setEditingRoleId(null);
    } else if (roleForm.name) {
      setLocalRoles(prev => [...prev, { id: 'r_' + Math.random().toString(36).substr(2, 5), name: roleForm.name!, permissions: roleForm.permissions || [] }]);
    }
    setRoleForm({ name: '', permissions: [] });
  };

  const toggleRolePermission = (perm: Permission) => {
    const current = roleForm.permissions || [];
    const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
    setRoleForm({ ...roleForm, permissions: updated });
  };

  const handleSaveRoles = () => {
    setRoles(localRoles);
    alert('Hierarquia salva!');
  };

  const handleSaveSettings = () => {
    setSettings(localSettings);
    alert('Ajustes do Workshop salvos!');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold flex items-center text-white">
          <i className="fa-solid fa-screwdriver-wrench mr-4 text-primary"></i>
          Painel de Gerenciamento
        </h2>
        <p className="text-slate-400">Administração técnica e operacional da oficina.</p>
      </header>

      <div className="flex space-x-2 mb-8 bg-slate-900 p-1.5 rounded-2xl w-fit border border-slate-800 overflow-x-auto">
        {[
          { id: 'users', label: 'Funcionários', icon: 'fa-users' },
          { id: 'inventory', label: 'Catálogo', icon: 'fa-boxes-stacked' },
          { id: 'roles', label: 'Cargos', icon: 'fa-user-lock' },
          { id: 'settings', label: 'Ajustes', icon: 'fa-gears' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-slate-950 shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
          >
            <i className={`fa-solid ${tab.icon} mr-2`}></i> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-sm min-h-[600px]">
        {activeTab === 'users' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <form onSubmit={handleUserSubmit} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-lg font-bold mb-6 text-white">{isEditingUser ? 'Editar Usuário' : 'Novo Funcionário'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Usuário</label>
                  <input type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-1 ring-primary outline-none" placeholder="PandaMecanico" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome Exibição</label>
                  <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-1 ring-primary outline-none" placeholder="João Silva" required />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Cargo</label>
                  <select value={userForm.roleId} onChange={e => setUserForm({...userForm, roleId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none">
                    {localRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Chave de Acesso</label>
                  <input type="text" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-1 ring-primary outline-none font-mono" placeholder="123" required />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button type="submit" className="bg-primary text-slate-950 font-black px-8 py-3 rounded-xl transition-all shadow-lg shadow-primary/20">{isEditingUser ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR FUNCIONÁRIO'}</button>
                {isEditingUser && <button type="button" onClick={() => { setIsEditingUser(false); setEditingUserId(null); setUserForm({ username: '', name: '', roleId: roles[0]?.id || '', password: '123' }); }} className="bg-slate-700 px-6 rounded-xl text-white font-bold">Cancelar</button>}
              </div>
            </form>
            <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-950/30">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                  <tr><th className="py-5 px-6">Funcionário</th><th className="py-5 px-6">Cargo</th><th className="py-5 px-6">Senha</th><th className="py-5 px-6 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img src={u.avatar} className="w-8 h-8 rounded-full border border-slate-700" alt="av" />
                          <span className="font-bold text-slate-200">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-400">{localRoles.find(r => r.id === u.roleId)?.name}</td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-600">{u.password}</td>
                      <td className="py-4 px-6 text-right space-x-3">
                        <button onClick={() => { setIsEditingUser(true); setEditingUserId(u.id); setUserForm({ ...u }); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="text-slate-500 hover:text-primary transition-colors"><i className="fa-solid fa-pen"></i></button>
                        <button onClick={() => { if(confirm("Remover funcionário?")) setUsers(prev => prev.filter(usr => usr.id !== u.id)); }} className="text-slate-500 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <form onSubmit={handleAddCategory} className="bg-slate-800/30 p-8 rounded-[2rem] border border-slate-700/50 space-y-6">
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center">
                  <i className="fa-solid fa-tags mr-3"></i> Categorias
                </h3>
                <div className="space-y-4">
                  <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white outline-none focus:ring-1 ring-primary transition-all" placeholder="Nome Categoria" />
                  <select value={newCategoryGroup} onChange={e => setNewCategoryGroup(e.target.value as CategoryGroup)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white outline-none">
                    <option value="Estetica">Estética (Visual)</option>
                    <option value="Performance">Performance (Motor)</option>
                  </select>
                  <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all">Criar Categoria</button>
                </div>
                <div className="pt-6 space-y-2 max-h-[400px] overflow-y-auto pr-1">
                   {localCategories.map(cat => (
                     <div key={cat} className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50 flex items-center justify-between text-xs group transition-all hover:border-primary/20">
                       {editingCategory?.oldName === cat ? (
                         <div className="flex gap-2 w-full">
                           <input value={editingCategory.newName} onChange={e => setEditingCategory({...editingCategory, newName: e.target.value})} className="bg-slate-800 border-none px-2 py-1 text-xs w-full rounded outline-none" />
                           <button type="button" onClick={handleSaveCategoryEdit}><i className="fa-solid fa-check text-primary"></i></button>
                           <button type="button" onClick={() => setEditingCategory(null)}><i className="fa-solid fa-xmark text-slate-500"></i></button>
                         </div>
                       ) : (
                         <>
                           <span className="font-bold text-slate-300 uppercase tracking-tight">{cat} <span className="text-[9px] text-primary/40 ml-2">({localGroups[cat] || 'Estetica'})</span></span>
                           <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button type="button" onClick={() => handleStartEditCategory(cat)} className="text-slate-500 hover:text-primary"><i className="fa-solid fa-pen text-[10px]"></i></button>
                             <button type="button" onClick={() => handleDeleteCategory(cat)} className="text-slate-500 hover:text-red-500"><i className="fa-solid fa-trash text-[10px]"></i></button>
                           </div>
                         </>
                       )}
                     </div>
                   ))}
                </div>
              </form>

              <div className="lg:col-span-2 space-y-8">
                <form onSubmit={handlePartSubmit} className="bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-700/50">
                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center">
                    <i className="fa-solid fa-plus-circle mr-3"></i> {isEditingPart ? 'Editar Peça' : 'Nova Peça no Catálogo'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome da Peça</label>
                      <input type="text" value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white outline-none focus:ring-1 ring-primary" placeholder="Ex: Motor Nível 4" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Categoria</label>
                      <select value={newPart.category} onChange={e => setNewPart({...newPart, category: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white outline-none">
                        {localCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Preço ({settings.currencySymbol})</label>
                      <input type="number" value={newPart.price || ''} onChange={e => setNewPart({...newPart, price: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-white outline-none font-mono focus:ring-1 ring-primary" placeholder="0" required />
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button type="submit" className="bg-primary text-slate-950 font-black px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20">
                      {isEditingPart ? 'ATUALIZAR ITEM' : 'CADASTRAR ITEM'}
                    </button>
                    {isEditingPart && <button type="button" onClick={() => { setIsEditingPart(false); setEditingPartId(null); setNewPart({ category: localCategories[0] || 'Outros', name: '', price: 0 }); }} className="bg-slate-700 text-white font-bold px-6 rounded-xl">Cancelar</button>}
                  </div>
                </form>

                <div className="space-y-6">
                  {localCategories.map(cat => (
                    <div key={cat} className="space-y-3">
                      <div className="flex items-center gap-3 px-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{cat}</span>
                        <div className="h-px bg-slate-800 flex-1"></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {localParts.filter(p => p.category === cat).map(part => (
                          <div key={part.id} className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group transition-all hover:border-slate-700">
                             <div>
                               <p className="text-white font-bold text-sm tracking-tight">{part.name}</p>
                               <p className="text-[10px] font-mono text-primary/70">{settings.currencySymbol} {part.price.toLocaleString()}</p>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => { setIsEditingPart(true); setEditingPartId(part.id); setNewPart(part); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="p-2 text-slate-600 hover:text-white transition-colors"><i className="fa-solid fa-pen text-xs"></i></button>
                                <button onClick={() => handleDeletePart(part.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><i className="fa-solid fa-trash text-xs"></i></button>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-10 flex justify-end">
                  <button onClick={handleSaveInventory} className="bg-primary text-slate-950 font-black px-12 py-5 rounded-2xl shadow-2xl shadow-primary/20 transition-all hover:-translate-y-1">
                    SALVAR TODO O CATÁLOGO
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <form onSubmit={handleRoleSubmit} className="bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-700">
              <h3 className="text-lg font-bold mb-6 text-white">{isEditingRole ? 'Editar Cargo' : 'Criar Novo Cargo'}</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome do Cargo</label>
                  <input type="text" value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white outline-none focus:ring-1 ring-primary" placeholder="Ex: Supervisor" required />
                </div>
                
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Permissões de Acesso</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.values(Permission).map(perm => {
                      const isActive = roleForm.permissions?.includes(perm);
                      return (
                        <button 
                          key={perm}
                          type="button"
                          onClick={() => toggleRolePermission(perm)}
                          className={`p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                            isActive ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isActive ? 'bg-primary border-primary text-slate-950' : 'border-slate-700'}`}>
                            {isActive && <i className="fa-solid fa-check text-[10px]"></i>}
                          </div>
                          <span className="text-[11px] font-bold uppercase tracking-tight">{perm.replace(/_/g, ' ')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button type="submit" className="bg-primary text-slate-950 font-black px-12 py-4 rounded-2xl shadow-xl shadow-primary/20">
                  {isEditingRole ? 'SALVAR CARGO' : 'ADICIONAR CARGO'}
                </button>
                {isEditingRole && <button type="button" onClick={() => { setIsEditingRole(false); setEditingRoleId(null); setRoleForm({ name: '', permissions: [] }); }} className="bg-slate-700 text-white font-bold px-8 rounded-2xl">Cancelar</button>}
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {localRoles.map(role => (
                <div key={role.id} className="bg-slate-800/30 p-6 rounded-[2rem] border border-slate-700 flex flex-col justify-between group relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setIsEditingRole(true); setEditingRoleId(role.id); setRoleForm(role); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center hover:bg-primary hover:text-slate-950 transition-all"><i className="fa-solid fa-pen text-xs"></i></button>
                      <button onClick={() => { if(confirm("Excluir cargo?")) setLocalRoles(prev => prev.filter(r => r.id !== role.id)); }} className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash text-xs"></i></button>
                   </div>
                   <div>
                     <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-4">{role.name}</h4>
                     <div className="flex flex-wrap gap-1.5">
                       {role.permissions.map(p => (
                         <span key={p} className="bg-slate-900 text-slate-400 text-[8px] font-black uppercase px-2 py-1 rounded border border-slate-800">{p.split('_').pop()}</span>
                       ))}
                     </div>
                   </div>
                </div>
              ))}
            </div>

            <div className="pt-10 flex justify-center">
               <button onClick={handleSaveRoles} className="bg-slate-800 hover:bg-slate-700 text-white font-black px-12 py-5 rounded-2xl transition-all shadow-xl">
                 SINCRONIZAR HIERARQUIA
               </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in fade-in duration-300">
             <div className="bg-slate-800/40 p-10 rounded-[3rem] border border-slate-700 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center">
                        <i className="fa-solid fa-id-card mr-3"></i> Identidade Visual
                      </h4>
                      <div className="space-y-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Nome Fantasia do Workshop</label>
                           <input type="text" value={localSettings.workshopName} onChange={e => setLocalSettings({...localSettings, workshopName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary" />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Logo URL (Icone Superior)</label>
                           <input type="text" value={localSettings.logoUrl} onChange={e => setLocalSettings({...localSettings, logoUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary" placeholder="https://..." />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Cor Primária do Sistema</label>
                           <div className="flex gap-4 items-center">
                             <input type="color" value={localSettings.primaryColor} onChange={e => setLocalSettings({...localSettings, primaryColor: e.target.value})} className="w-20 h-14 bg-slate-900 border border-slate-700 rounded-2xl p-1 cursor-pointer" />
                             <span className="font-mono text-sm text-slate-400 uppercase">{localSettings.primaryColor}</span>
                           </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center">
                        <i className="fa-solid fa-coins mr-3"></i> Parâmetros Financeiros
                      </h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Moeda (RP)</label>
                             <input type="text" value={localSettings.currencySymbol} onChange={e => setLocalSettings({...localSettings, currencySymbol: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary font-bold" />
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Taxa Imposto %</label>
                             <input type="number" step="0.01" value={localSettings.taxRate} onChange={e => setLocalSettings({...localSettings, taxRate: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary font-mono" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Multiplicador Mão de Obra (X)</label>
                           <input type="number" step="0.1" value={localSettings.freelanceMultiplier} onChange={e => setLocalSettings({...localSettings, freelanceMultiplier: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary font-mono" />
                           <p className="text-[9px] text-slate-600 font-bold leading-tight">Define o custo de serviço baseado no valor gasto in-game. Ex: se gastou 10k e o mult é 1.5, o cliente paga 15k de mão de obra.</p>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="border-t border-slate-800 pt-10 space-y-6">
                   <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center">
                      <i className="fa-brands fa-discord mr-3"></i> Integração Discord (Webhooks)
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-pink-500 uppercase ml-1">Webhook Estética</label>
                         <input type="text" value={localSettings.esteticaWebhook} onChange={e => setLocalSettings({...localSettings, esteticaWebhook: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-pink-500/50" placeholder="https://discord.com/api/webhooks/..." />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-blue-500 uppercase ml-1">Webhook Performance</label>
                         <input type="text" value={localSettings.performanceWebhook} onChange={e => setLocalSettings({...localSettings, performanceWebhook: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-blue-500/50" placeholder="https://discord.com/api/webhooks/..." />
                      </div>
                   </div>
                </div>

                <div className="flex justify-center pt-10">
                   <button onClick={handleSaveSettings} className="bg-primary text-slate-950 font-black px-16 py-6 rounded-3xl shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                      SALVAR TODAS AS CONFIGURAÇÕES
                   </button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
