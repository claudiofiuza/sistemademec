
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Permission, Role, Part, ServiceRecord, AppSettings, Workshop, Announcement, WorkSession } from './types';
import { INITIAL_USERS, INITIAL_WORKSHOPS, SUPER_ADMIN_ID, DEFAULT_SETTINGS } from './constants';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import ServiceCalculator from './pages/ServiceCalculator';
import History from './pages/History';
import AdminPanel from './pages/AdminPanel';
import CentralControl from './pages/CentralControl';
import AnnouncementsManager from './pages/AnnouncementsManager';
import TimeTracker from './pages/TimeTracker';
import HumanResources from './pages/HumanResources';

const usePersistedState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState];
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [globalUsers, setGlobalUsers] = usePersistedState<User[]>('lsc_global_users_v4', INITIAL_USERS);
  const [workshops, setWorkshops] = usePersistedState<Workshop[]>('lsc_workshops_v4', INITIAL_WORKSHOPS);
  
  const [activeWorkshopId, setActiveWorkshopId] = usePersistedState<string | null>('lsc_active_workshop_id_v4', null);

  const currentWorkshopId = useMemo(() => {
    if (currentUser?.id === SUPER_ADMIN_ID) return activeWorkshopId;
    return currentUser?.workshopId || null;
  }, [currentUser, activeWorkshopId]);

  const workshop = useMemo(() => 
    workshops.find(w => w.id === currentWorkshopId) || null
  , [workshops, currentWorkshopId]);

  const workshopUsers = useMemo(() => 
    globalUsers.filter(u => u.workshopId === currentWorkshopId && u.id !== SUPER_ADMIN_ID)
  , [globalUsers, currentWorkshopId]);

  useEffect(() => {
    const color = workshop?.settings.primaryColor || DEFAULT_SETTINGS.primaryColor;
    document.documentElement.style.setProperty('--primary-color', color);
    
    let styleTag = document.getElementById('dynamic-theme');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-theme';
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      .bg-primary { background-color: var(--primary-color); }
      .text-primary { color: var(--primary-color); }
      .border-primary { border-color: var(--primary-color); }
      .ring-primary { --tw-ring-color: var(--primary-color); }
      .shadow-primary { --tw-shadow-color: var(--primary-color); }
    `;
  }, [workshop?.settings.primaryColor]);

  // RELIABLE WORKSHOP UPDATER
  const updateWorkshop = useCallback((updated: Partial<Workshop>) => {
    setWorkshops(prevWorkshops => {
      // Find current workshop ID using the most recent state context to avoid closure issues
      const wsId = currentUser?.id === SUPER_ADMIN_ID ? activeWorkshopId : currentUser?.workshopId;
      if (!wsId) return prevWorkshops;
      
      const exists = prevWorkshops.some(w => w.id === wsId);
      if (!exists) return prevWorkshops;

      return prevWorkshops.map(w => 
        w.id === wsId ? { ...w, ...updated } : w
      );
    });
  }, [currentUser, activeWorkshopId, setWorkshops]);

  const handleLogin = (u: User, selectedWorkshopId?: string) => {
    setCurrentUser(u);
    if (selectedWorkshopId) {
      setActiveWorkshopId(selectedWorkshopId);
    } else if (u.workshopId !== 'system') {
      setActiveWorkshopId(u.workshopId);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveWorkshopId(null);
  };

  const handleUpdateProfile = (avatar: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, avatar };
    setGlobalUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
  };

  const userPermissions = useMemo(() => {
    if (currentUser?.id === SUPER_ADMIN_ID) return Object.values(Permission);
    const role = workshop?.roles.find(r => r.id === currentUser?.roleId);
    return role?.permissions || [];
  }, [currentUser, workshop]);

  const ProtectedRoute = ({ children, requiredPermission }: { children: React.ReactNode, requiredPermission?: Permission }) => {
    if (!currentUser) return <Navigate to="/login" replace />;
    if (currentUser.id !== SUPER_ADMIN_ID && requiredPermission && !userPermissions.includes(requiredPermission)) {
      return <Navigate to="/" replace />;
    }
    if (currentUser.id === SUPER_ADMIN_ID && !activeWorkshopId && window.location.hash !== '#/central') {
       return <Navigate to="/central" replace />;
    }
    return <>{children}</>;
  };

  return (
    <HashRouter>
      <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
        {currentUser && (
          <Sidebar 
            user={currentUser} 
            workshop={workshop} 
            activeWorkshopId={activeWorkshopId}
            onLogout={handleLogout}
            onResetContext={() => setActiveWorkshopId(null)}
            onUpdateAvatar={handleUpdateProfile}
          />
        )}
        <main className="flex-1 overflow-auto relative">
          <Routes>
            <Route path="/login" element={
              currentUser ? <Navigate to="/" /> : <LoginPage users={globalUsers} workshops={workshops} onLogin={handleLogin} settings={workshops[0]?.settings || DEFAULT_SETTINGS} />
            } />
            
            <Route path="/central" element={
              <ProtectedRoute>
                {currentUser?.id === SUPER_ADMIN_ID ? (
                  <CentralControl 
                    workshops={workshops} 
                    setWorkshops={setWorkshops} 
                    users={globalUsers}
                    setUsers={setGlobalUsers}
                    onEnterWorkshop={(id) => setActiveWorkshopId(id)} 
                  />
                ) : <Navigate to="/" />}
              </ProtectedRoute>
            } />

            <Route path="/" element={
              <ProtectedRoute>
                {workshop ? (
                   <Dashboard 
                    user={currentUser!} 
                    history={workshop.history} 
                    parts={workshop.parts} 
                    settings={workshop.settings} 
                    announcements={workshop.announcements}
                    workSessions={workshop.workSessions}
                   />
                ) : <Navigate to="/central" />}
              </ProtectedRoute>
            } />

            <Route path="/calculator" element={
              <ProtectedRoute requiredPermission={Permission.USE_CALCULATOR}>
                <ServiceCalculator 
                  user={currentUser!} 
                  parts={workshop?.parts || []} 
                  settings={workshop?.settings || DEFAULT_SETTINGS} 
                  onSave={(record) => updateWorkshop({ history: [record, ...(workshop?.history || [])] })} 
                />
              </ProtectedRoute>
            } />

            <Route path="/history" element={
              <ProtectedRoute requiredPermission={Permission.VIEW_HISTORY}>
                <History user={currentUser!} history={workshop?.history || []} settings={workshop?.settings || DEFAULT_SETTINGS} />
              </ProtectedRoute>
            } />

            <Route path="/timetracker" element={
              <ProtectedRoute requiredPermission={Permission.VIEW_TIME_TRACKER}>
                <TimeTracker 
                  user={currentUser!} 
                  sessions={workshop?.workSessions || []} 
                  onUpdateSessions={(s) => updateWorkshop({ workSessions: s })}
                />
              </ProtectedRoute>
            } />

            <Route path="/hr" element={
              <ProtectedRoute requiredPermission={Permission.MANAGE_TIME_TRACKER}>
                <HumanResources 
                  sessions={workshop?.workSessions || []} 
                  onUpdateSessions={(s) => updateWorkshop({ workSessions: s })}
                  users={workshopUsers}
                  settings={workshop?.settings || DEFAULT_SETTINGS}
                />
              </ProtectedRoute>
            } />

            <Route path="/announcements" element={
              <ProtectedRoute requiredPermission={Permission.MANAGE_ANNOUNCEMENTS}>
                <AnnouncementsManager 
                  user={currentUser!} 
                  announcements={workshop?.announcements || []} 
                  setAnnouncements={(a) => updateWorkshop({ announcements: a })}
                  users={workshopUsers}
                />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminPanel 
                  user={currentUser!}
                  users={workshopUsers} 
                  setUsers={(newUsers) => {
                    const updater = typeof newUsers === 'function' ? newUsers : () => newUsers;
                    const result = updater(workshopUsers);
                    setGlobalUsers(prev => [
                      ...prev.filter(u => u.workshopId !== currentWorkshopId || u.id === SUPER_ADMIN_ID),
                      ...result
                    ]);
                  }} 
                  roles={workshop?.roles || []}
                  setRoles={(r) => updateWorkshop({ roles: typeof r === 'function' ? r(workshop!.roles) : r })}
                  parts={workshop?.parts || []} 
                  setParts={(p) => updateWorkshop({ parts: typeof p === 'function' ? p(workshop!.parts) : p })} 
                  settings={workshop?.settings || DEFAULT_SETTINGS}
                  setSettings={(s) => updateWorkshop({ settings: typeof s === 'function' ? s(workshop!.settings) : s })}
                  workshopId={currentWorkshopId!}
                />
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

const Sidebar: React.FC<{ 
  user: User, 
  workshop: Workshop | null, 
  activeWorkshopId: string | null, 
  onLogout: () => void,
  onResetContext: () => void,
  onUpdateAvatar: (url: string) => void
}> = ({ user, workshop, activeWorkshopId, onLogout, onResetContext, onUpdateAvatar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
  
  const isPanda = user.id === SUPER_ADMIN_ID;
  const perms = isPanda ? Object.values(Permission) : workshop?.roles.find(r => r.id === user.roleId)?.permissions || [];

  const navItems = [
    { path: '/', label: 'Painel', icon: 'fa-gauge', perm: Permission.VIEW_DASHBOARD },
    { path: '/calculator', label: 'Calculadora', icon: 'fa-calculator', perm: Permission.USE_CALCULATOR },
    { path: '/history', label: 'Histórico', icon: 'fa-clock-rotate-left', perm: Permission.VIEW_HISTORY },
    { path: '/timetracker', label: 'Ponto Eletrônico', icon: 'fa-stopwatch', perm: Permission.VIEW_TIME_TRACKER },
  ];

  const hasAdminAccess = isPanda || [Permission.MANAGE_STAFF, Permission.MANAGE_PARTS, Permission.MANAGE_ROLES, Permission.MANAGE_SETTINGS].some(p => perms.includes(p));
  const canManageAnnouncements = isPanda || perms.includes(Permission.MANAGE_ANNOUNCEMENTS);
  const canManageHR = isPanda || perms.includes(Permission.MANAGE_TIME_TRACKER);

  const handleAvatarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAvatar(avatarUrl);
    setShowProfileEdit(false);
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
      <div className="p-6 flex flex-col space-y-4">
        <div className="flex items-center space-x-3">
          {workshop?.settings.logoUrl ? (
            <img src={workshop.settings.logoUrl} className="w-10 h-10 rounded-lg object-contain" alt="Logo" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white text-xl">
              <i className="fa-solid fa-car"></i>
            </div>
          )}
          <h1 className="font-bold text-lg leading-tight tracking-tight uppercase truncate">
            {workshop?.name || 'Sistema Central'}
          </h1>
        </div>
        
        {isPanda && activeWorkshopId && (
          <button 
            onClick={() => { onResetContext(); navigate('/central'); }}
            className="text-[10px] font-black text-primary hover:opacity-80 bg-primary/10 py-1.5 px-3 rounded-lg flex items-center justify-center transition-all border border-primary/20"
          >
            <i className="fa-solid fa-arrow-left-long mr-2"></i> VOLTAR AO CONTROLE CENTRAL
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-2">
        {isPanda && (
          <Link
            to="/central"
            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              location.pathname === '/central' 
                ? 'bg-primary text-slate-950 font-bold shadow-lg shadow-primary/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-microchip w-5"></i>
            <span>Controle Central</span>
          </Link>
        )}

        {(workshop || isPanda) && activeWorkshopId && (
          <div className="pt-4 space-y-1">
            <div className="px-4 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Oficina Atual</div>
            {navItems.filter(item => isPanda || perms.includes(item.perm)).map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === item.path 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className={`fa-solid ${item.icon} w-5`}></i>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {canManageHR && (
              <Link
                to="/hr"
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === '/hr' 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-user-check w-5"></i>
                <span className="font-medium">Gestão de RH</span>
              </Link>
            )}

            {canManageAnnouncements && (
              <Link
                to="/announcements"
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === '/announcements' 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-bullhorn w-5"></i>
                <span className="font-medium">Comunicados</span>
              </Link>
            )}

            {hasAdminAccess && (
              <Link
                to="/admin"
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === '/admin' 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-screwdriver-wrench w-5"></i>
                <span className="font-medium">Gerenciar</span>
              </Link>
            )}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 relative">
        <div className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-2xl border border-slate-800/50">
          <button onClick={() => setShowProfileEdit(true)} className="group relative">
            <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700 shadow-inner group-hover:opacity-50 transition-all" alt="avatar" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <i className="fa-solid fa-pen text-[10px] text-white"></i>
            </div>
          </button>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-slate-200">{user.name}</p>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest truncate">
              {isPanda ? 'Super Admin' : (workshop?.roles.find(r => r.id === user.roleId)?.name || 'Mecânico')}
            </p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
          >
            <i className="fa-solid fa-power-off"></i>
          </button>
        </div>

        {showProfileEdit && (
          <div className="absolute bottom-full left-4 right-4 mb-2 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-2">
            <form onSubmit={handleAvatarSubmit} className="space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Alterar Foto de Perfil</p>
              <input 
                type="text" 
                value={avatarUrl} 
                onChange={e => setAvatarUrl(e.target.value)} 
                placeholder="URL da Imagem..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-white outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-primary text-slate-950 font-bold py-2 rounded-lg text-xs">Salvar</button>
                <button type="button" onClick={() => setShowProfileEdit(false)} className="flex-1 bg-slate-700 text-white font-bold py-2 rounded-lg text-xs">Sair</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
