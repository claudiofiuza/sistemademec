
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
  
  const [newPart, setNewPart] = useState<Partial<Part>>({ category: settings.categories[0] || 'Outro', name: '', price: 0 });
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
      setUsers(users.map(u => u.id === editingUserId ? { ...u, ...userForm } as User : u));
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
      setUsers([...users, u]);
    }
    setUserForm({ username: '', name: '', roleId: roles[0]?.id || '', password: '123' });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim() && !localCategories.includes(newCategoryName.trim())) {
      setLocalCategories([...localCategories, newCategoryName.trim()]);
      setLocalGroups(prev => ({ ...prev, [newCategoryName.trim()]: newCategoryGroup }));
      setNewCategoryName('');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    if (window.confirm(`Excluir a categoria "${cat}"? As peças vinculadas serão movidas para "Outro".`)) {
      setLocalCategories(localCategories.filter(c => c !== cat));
      const newGroups = { ...localGroups };
      delete newGroups[cat];
      setLocalGroups(newGroups);
      setLocalParts(localParts.map(p => p.category === cat ? { ...p, category: 'Outro' } : p));
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
    setLocalCategories(localCategories.map(c => c === oldName ? newName : c));
    setLocalGroups(prev => {
      const updated = { ...prev };
      updated[newName] = updated[oldName];
      delete updated[oldName];
      return updated;
    });
    setLocalParts(localParts.map(p => p.category === oldName ? { ...p, category: newName } : p));
    setEditingCategory(null);
  };

  const handlePartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingPart && editingPartId) {
      setLocalParts(localParts.map(p => p.id === editingPartId ? { ...p, name: newPart.name!, price: Number(newPart.price), category: newPart.category! } : p));
      setIsEditingPart(false);
      setEditingPartId(null);
    } else if (newPart.name && newPart.price) {
      setLocalParts([...localParts, { id: Math.random().toString(36).substr(2, 9), name: newPart.name!, category: newPart.category!, price: Number(newPart.price) }]);
    }
    setNewPart({ category: localCategories[0] || 'Outro', name: '', price: 0 });
  };

  const handleSaveInventory = () => {
    setParts(localParts);
    setSettings({ ...settings, categories: localCategories, categoryGroups: localGroups });
    alert('Inventário atualizado!');
  };

  const handleRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingRole && editingRoleId) {
      setLocalRoles(localRoles.map(r => r.id === editingRoleId ? { ...r, name: roleForm.name!, permissions: roleForm.permissions! } : r));
      setIsEditingRole(false);
      setEditingRoleId(null);
    } else if (roleForm.name) {
      setLocalRoles([...localRoles, { id: 'r_' + Math.random().toString(36).substr(2, 5), name: roleForm.name!, permissions: roleForm.permissions || [] }]);
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
    alert('Ajustes salvos!');
  };

  const partsByCategory = localCategories.reduce((acc, cat) => { acc[cat] = localParts.filter(p => p.category === cat); return acc; }, {} as Record<string, Part[]>);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold flex items-center text-white">
          <i className="fa-solid fa-screwdriver-wrench mr-4 text-primary"></i>
          Painel de Gerenciamento
        </h2>
        <p className="text-slate-400">Administração técnica e operacional da oficina.</p>
      </header>

      <div className="flex space-x-2 mb-8 bg-slate-900 p-1.5 rounded-2xl w-fit border border-slate-800">
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
                <input type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-1 ring-primary outline-none" placeholder="Usuário" required />
                <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-1 ring-primary outline-none" placeholder="Nome Exibição" required />
                <select value={userForm.roleId} onChange={e => setUserForm({...userForm, roleId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none">
                  {localRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <input type="text" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-1 ring-primary outline-none font-mono" placeholder="Senha" required />
              </div>
              <div className="mt-6 flex gap-3">
                <button type="submit" className="bg-primary text-slate-950 font-bold px-8 py-3 rounded-xl transition-all">{isEditingUser ? 'Salvar' : 'Cadastrar'}</button>
                {isEditingUser && <button type="button" onClick={() => { setIsEditingUser(false); setEditingUserId(null); setUserForm({ username: '', name: '', roleId: roles[0]?.id || '', password: '123' }); }} className="bg-slate-700 px-6 rounded-xl text-white">Cancelar</button>}
              </div>
            </form>
            <div className="overflow-hidden border border-slate-800 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <tr><th className="py-4 px-6">Funcionário</th><th className="py-4 px-6">Cargo</th><th className="py-4 px-6">Acesso</th><th className="py-4 px-6 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-200">{u.name}</td>
                      <td className="py-4 px-6 text-sm text-slate-400">{localRoles.find(r => r.id === u.roleId)?.name}</td>
                      <td className="py-4 px-6 font-mono text-xs text-slate-500">{u.password}</td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button onClick={() => { setIsEditingUser(true); setEditingUserId(u.id); setUserForm({ ...u }); }} className="text-slate-500 hover:text-primary"><i className="fa-solid fa-pen"></i></button>
                        <button onClick={() => setUsers(users.filter(usr => usr.id !== u.id))} className="text-slate-500 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form onSubmit={handleAddCategory} className="bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 space-y-4">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Categorias</h3>
                <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none" placeholder="Nome Categoria" />
                <select value={newCategoryGroup} onChange={e => setNewCategoryGroup(e.target.value as CategoryGroup)} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none">
                  <option value="Estetica">Estetica</option>
                  <option value="Performance">Performance</option>
                </select>
                <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl">Criar</button>
                <div className="pt-4 space-y-2 max-h-64 overflow-y-auto">
                   {localCategories.map(cat => (
                     <div key={cat} className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs group">
                       {editingCategory?.oldName === cat ? (
                         <div className="flex gap-1 w-full">
                           <input value={editingCategory.newName} onChange={e => setEditingCategory({...editingCategory, newName: e.target.value})} className="bg-slate-800 border-none p-1 text-xs w-full" />
                           <button type="button" onClick={handleSaveCategoryEdit}><i className="fa-solid fa-check text-primary"></i></button>
                         </div>
                       ) : (
                         <>
                           <span>{cat} <span className="text-[10px] text-primary/50 ml-1">({localGroups[cat] || 'Estetica'})</span></span>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button type="button" onClick={() => handleStartEditCategory(cat)}><i className="fa-solid fa-pen-to-square text-slate-500"></i></button>
                             <button type="button" onClick={() => handleDeleteCategory(cat)}><i className="fa-solid fa-trash text-slate-500"></i></button>
                           </div>
                         </>
                       )}
                     </div>
                   ))}
                </div>
              </form>

              <form onSubmit={handlePartSubmit} className="lg:col-span-2 bg-slate-800/30 p-6 rounded-3xl border border-slate-700/50 space-y-6">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">{isEditingPart ? 'Editar Peça' : 'Nova Peça'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none" placeholder="Nome da Peça" />
                  <input type="number" value={newPart.price} onChange={e => setNewPart({...newPart, price: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none" placeholder="Preço" />
                  <select value={newPart.category} onChange={e => setNewPart({...newPart, category: e.target.value})} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white outline-none">
                    {localCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="bg-primary text-slate-950 font-bold px-8 py-3 rounded-xl">Salvar Peça</button>
                  {isEditingPart && <button type="button" onClick={() => { setIsEditingPart(false); setNewPart({ category: localCategories[0], name: '', price: 0 }); }} className="px-6 rounded-xl text-slate-400">Cancelar</button>}
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {localCategories.map(cat => (
                <div key={cat} className="bg-slate-800/10 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-3 bg-slate-800/40 border-b border-slate-800 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>{cat}</span>
                    <span className="text-primary">{localGroups[cat] || 'Estetica'}</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {partsByCategory[cat]?.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded hover:bg-slate-800 group">
                        <span className="text-slate-200">{p.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-slate-500">{settings.currencySymbol} {p.price.toLocaleString()}</span>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setIsEditingPart(true); setEditingPartId(p.id); setNewPart({ ...p }); }} className="text-slate-600 hover:text-primary"><i className="fa-solid fa-pen"></i></button>
                            <button onClick={() => setLocalParts(localParts.filter(part => part.id !== p.id))} className="text-slate-600 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 border-t border-slate-800 pt-8">
              <button onClick={handleSaveInventory} className="bg-primary text-slate-950 font-black px-10 py-4 rounded-2xl shadow-lg shadow-primary/20">SALVAR INVENTÁRIO</button>
              <button onClick={() => { setLocalParts([...parts]); setLocalCategories([...settings.categories]); setLocalGroups({...settings.categoryGroups}); }} className="px-8 text-slate-500 hover:text-white">DESCARTAR</button>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <form onSubmit={handleRoleSubmit} className="bg-slate-800/40 p-8 rounded-3xl border border-slate-700 space-y-8">
              <h3 className="text-lg font-bold text-white">{isEditingRole ? 'Editar Cargo' : 'Novo Cargo'}</h3>
              <div className="flex flex-col md:flex-row gap-4">
                <input type="text" value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 text-white font-bold outline-none" placeholder="Ex: Master Mecânico" required />
                <button type="submit" className="bg-primary text-slate-950 font-black px-10 py-4 rounded-xl">{isEditingRole ? 'Atualizar' : 'Criar'}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.values(Permission).map(perm => (
                  <button key={perm} type="button" onClick={() => toggleRolePermission(perm)} className={`p-4 rounded-xl border text-xs font-bold transition-all ${roleForm.permissions?.includes(perm) ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                    {perm.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {localRoles.map(r => (
                <div key={r.id} className="bg-slate-800/20 border border-slate-800 p-6 rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-white">{r.name}</h4>
                    <div className="flex gap-2">
                       <button onClick={() => { setIsEditingRole(true); setEditingRoleId(r.id); setRoleForm({ ...r }); }} className="text-slate-600 hover:text-primary"><i className="fa-solid fa-pen"></i></button>
                       <button onClick={() => setLocalRoles(localRoles.filter(role => role.id !== r.id))} className="text-slate-600 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {r.permissions.map(p => <span key={p} className="text-[8px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500 uppercase">{p.split('_').pop()}</span>)}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleSaveRoles} className="bg-primary text-slate-950 font-black px-12 py-4 rounded-2xl shadow-lg">SALVAR CARGOS</button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-800/20 p-8 rounded-3xl border border-slate-800 space-y-6">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Identidade</h3>
                <input type="text" value={localSettings.workshopName} onChange={e => setLocalSettings({...localSettings, workshopName: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" placeholder="Nome Oficina" />
                <input type="text" value={localSettings.logoUrl || ''} onChange={e => setLocalSettings({...localSettings, logoUrl: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" placeholder="URL Logo" />
                <div className="flex gap-2">
                   <input type="color" value={localSettings.primaryColor} onChange={e => setLocalSettings({...localSettings, primaryColor: e.target.value})} className="w-16 h-14 bg-slate-900 border border-slate-800 rounded-xl p-1" />
                   <input type="text" value={localSettings.primaryColor} onChange={e => setLocalSettings({...localSettings, primaryColor: e.target.value})} className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 text-white font-mono uppercase" />
                </div>
              </div>

              <div className="bg-slate-800/20 p-8 rounded-3xl border border-slate-800 space-y-6">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Finanças</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" step="0.01" value={localSettings.taxRate * 100} onChange={e => setLocalSettings({...localSettings, taxRate: Number(e.target.value) / 100})} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" placeholder="Imposto (%)" />
                  <input type="number" step="0.1" value={localSettings.freelanceMultiplier} onChange={e => setLocalSettings({...localSettings, freelanceMultiplier: Number(e.target.value)})} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" placeholder="Mult. Freelance" />
                </div>
                <input type="text" value={localSettings.currencySymbol} onChange={e => setLocalSettings({...localSettings, currencySymbol: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-white" placeholder="Símbolo Moeda" />
              </div>

              <div className="bg-slate-800/20 p-8 rounded-3xl border border-slate-800 space-y-6 lg:col-span-2">
                <h3 className="text-sm font-black text-primary uppercase tracking-widest">Webhooks (Discord)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-pink-400 ml-1">Webhook Estetica</label>
                    <input type="text" value={localSettings.esteticaWebhook} onChange={e => setLocalSettings({...localSettings, esteticaWebhook: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white" placeholder="URL Webhook" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-blue-400 ml-1">Webhook Performance</label>
                    <input type="text" value={localSettings.performanceWebhook} onChange={e => setLocalSettings({...localSettings, performanceWebhook: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white" placeholder="URL Webhook" />
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleSaveSettings} className="bg-primary text-slate-950 font-black px-12 py-5 rounded-2xl shadow-xl shadow-primary/20">SALVAR AJUSTES GLOBAIS</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
