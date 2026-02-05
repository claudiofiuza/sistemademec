
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Permission, Role, Part, ServiceRecord, AppSettings, Workshop, Announcement, WorkSession, CloudConfig } from './types';
import { INITIAL_USERS, INITIAL_WORKSHOPS, SUPER_ADMIN_ID, DEFAULT_SETTINGS } from './constants';
import { fetchFromCloud, syncToCloud, getCloudConfig, saveCloudConfig } from './cloudSync';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('synced');
  const [activeWorkshopId, setActiveWorkshopId] = usePersistedState<string | null>('lsc_active_workshop_id_v4', null);

  const triggerCloudSync = useCallback(async (newWorkshops?: Workshop[], newUsers?: User[]) => {
    if (getCloudConfig().provider === 'none') return;
    setCloudStatus('syncing');
    const success = await syncToCloud({
      workshops: newWorkshops || workshops,
      users: newUsers || globalUsers,
      lastUpdate: new Date().toISOString()
    });
    setCloudStatus(success ? 'synced' : 'error');
  }, [workshops, globalUsers]);

  const loadCloudData = useCallback(async () => {
    const config = getCloudConfig();
    if (config.provider === 'none') {
      setCloudStatus('offline');
      return;
    }

    setCloudStatus('syncing');
    try {
      const data = await fetchFromCloud();
      if (data && data._isNew) {
        await triggerCloudSync();
      } else if (data && data.workshops && data.users) {
        setWorkshops(data.workshops);
        setGlobalUsers(data.users);
        setCloudStatus('synced');
      }
    } catch (err) {
      setCloudStatus('error');
    }
  }, [setWorkshops, setGlobalUsers, triggerCloudSync]);

  useEffect(() => {
    loadCloudData();
  }, []); // Só no mount

  const isSuperAdmin = useMemo(() => currentUser?.workshopId === 'system', [currentUser]);
  const currentWorkshopId = useMemo(() => isSuperAdmin ? activeWorkshopId : currentUser?.workshopId || null, [isSuperAdmin, currentUser, activeWorkshopId]);
  const workshop = useMemo(() => workshops.find(w => w.id === currentWorkshopId) || null, [workshops, currentWorkshopId]);
  const workshopUsers = useMemo(() => globalUsers.filter(u => u.workshopId === currentWorkshopId && u.workshopId !== 'system'), [globalUsers, currentWorkshopId]);

  const updateWorkshop = useCallback((updated: Partial<Workshop>) => {
    setWorkshops(prev => {
      const wsId = isSuperAdmin ? activeWorkshopId : currentUser?.workshopId;
      if (!wsId) return prev;
      const newState = prev.map(w => w.id === wsId ? { ...w, ...updated } : w);
      triggerCloudSync(newState);
      return newState;
    });
  }, [isSuperAdmin, currentUser, activeWorkshopId, setWorkshops, triggerCloudSync]);

  const handleLogin = (u: User, selectedWorkshopId?: string) => {
    setCurrentUser(u);
    if (selectedWorkshopId) setActiveWorkshopId(selectedWorkshopId);
    else if (u.workshopId !== 'system') setActiveWorkshopId(u.workshopId);
    triggerCloudSync();
  };

  return (
    <HashRouter>
      <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
        {currentUser && (
          <Sidebar 
            user={currentUser} 
            workshop={workshop} 
            activeWorkshopId={activeWorkshopId}
            onLogout={() => { setCurrentUser(null); setActiveWorkshopId(null); }}
            onResetContext={() => setActiveWorkshopId(null)}
            cloudStatus={cloudStatus}
            onManualSync={loadCloudData}
          />
        )}
        <main className="flex-1 overflow-auto relative">
          <Routes>
            <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage users={globalUsers} workshops={workshops} onLogin={handleLogin} onOpenCloudConfig={() => {}} />} />
            <Route path="/central" element={<ProtectedRoute><CentralControl workshops={workshops} setWorkshops={setWorkshops} users={globalUsers} setUsers={setGlobalUsers} currentUser={currentUser} onEnterWorkshop={setActiveWorkshopId} triggerSync={triggerCloudSync} /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute>{workshop ? <Dashboard user={currentUser!} history={workshop.history} parts={workshop.parts} settings={workshop.settings} announcements={workshop.announcements} workSessions={workshop.workSessions} /> : <Navigate to="/central" />}</ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute requiredPermission={Permission.USE_CALCULATOR}><ServiceCalculator user={currentUser!} parts={workshop?.parts || []} settings={workshop?.settings || DEFAULT_SETTINGS} onSave={(record) => { const updatedHistory = [record, ...(workshop?.history || [])]; updateWorkshop({ history: updatedHistory }); const newUsers = globalUsers.map(u => u.id === record.mechanicId ? { ...u, pendingTax: (u.pendingTax || 0) + record.tax } : u); setGlobalUsers(newUsers); triggerCloudSync(undefined, newUsers); }} /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute requiredPermission={Permission.VIEW_HISTORY}><History user={currentUser!} history={workshop?.history || []} settings={workshop?.settings || DEFAULT_SETTINGS} /></ProtectedRoute>} />
            <Route path="/timetracker" element={<ProtectedRoute requiredPermission={Permission.VIEW_TIME_TRACKER}><TimeTracker user={currentUser!} sessions={workshop?.workSessions || []} onUpdateSessions={(s) => updateWorkshop({ workSessions: s })} /></ProtectedRoute>} />
            <Route path="/hr" element={<ProtectedRoute requiredPermission={Permission.MANAGE_TIME_TRACKER}><HumanResources sessions={workshop?.workSessions || []} onUpdateSessions={(s) => updateWorkshop({ workSessions: s })} users={workshopUsers} setUsers={setGlobalUsers} settings={workshop?.settings || DEFAULT_SETTINGS} workshop={workshop} onUpdateWorkshop={updateWorkshop} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute requiredPermission={Permission.MANAGE_ANNOUNCEMENTS}><AnnouncementsManager user={currentUser!} announcements={workshop?.announcements || []} setAnnouncements={(a) => updateWorkshop({ announcements: a })} users={workshopUsers} /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredPermission={Permission.MANAGE_SETTINGS}><AdminPanel user={currentUser!} users={workshopUsers} setUsers={(u) => { const res = typeof u === 'function' ? u(workshopUsers) : u; const full = [...globalUsers.filter(gu => gu.workshopId !== currentWorkshopId || gu.workshopId === 'system'), ...res]; setGlobalUsers(full); triggerCloudSync(undefined, full); }} roles={workshop?.roles || []} setRoles={(r) => updateWorkshop({ roles: typeof r === 'function' ? r(workshop!.roles) : r })} parts={workshop?.parts || []} setParts={(p) => updateWorkshop({ parts: typeof p === 'function' ? p(workshop!.parts) : p })} settings={workshop?.settings || DEFAULT_SETTINGS} setSettings={(s) => updateWorkshop({ settings: typeof s === 'function' ? s(workshop!.settings) : s })} workshopId={currentWorkshopId!} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

const Sidebar: React.FC<{ user: User, workshop: Workshop | null, activeWorkshopId: string | null, onLogout: () => void, onResetContext: () => void, cloudStatus: string, onManualSync: () => void }> = ({ user, workshop, activeWorkshopId, onLogout, onResetContext, cloudStatus, onManualSync }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = user.workshopId === 'system';
  
  const role = workshop?.roles.find(r => r.id === user.roleId);
  const perms = isSuperAdmin ? Object.values(Permission) : role?.permissions || [];

  const NavLink = ({ to, icon, label, permission }: { to: string, icon: string, label: string, permission?: Permission }) => {
    if (permission && !perms.includes(permission)) return null;
    const active = location.pathname === to;
    return (
      <Link to={to} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-primary text-slate-950 font-black shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
        <i className={`fa-solid ${icon} w-5 text-center`}></i>
        <span className="text-[10px] uppercase tracking-widest font-black">{label}</span>
      </Link>
    );
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-slate-950 text-xl shadow-lg shadow-primary/20"><i className="fa-solid fa-car"></i></div>
          <div className="overflow-hidden">
            <h1 className="font-black text-sm text-white uppercase truncate tracking-tighter">{workshop?.settings.workshopName || (isSuperAdmin ? 'ADMINISTRAÇÃO' : 'CARREGANDO...')}</h1>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Painel Operacional</p>
          </div>
        </div>
        {isSuperAdmin && activeWorkshopId && (
          <button onClick={() => { onResetContext(); navigate('/central'); }} className="w-full text-[9px] font-black text-primary bg-primary/10 py-2.5 rounded-xl border border-primary/20 hover:bg-primary hover:text-slate-950 transition-all uppercase tracking-widest">VOLTAR À CENTRAL</button>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-6">
        {isSuperAdmin && <NavLink to="/central" icon="fa-microchip" label="Central de Controle" />}
        
        {/* Mostra o menu se houver oficina ou se for admin com oficina ativa */}
        {(workshop || (isSuperAdmin && activeWorkshopId)) ? (
          <>
            <div className="px-4 py-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-2">Principal</div>
            <NavLink to="/" icon="fa-gauge-high" label="Painel Geral" />
            <NavLink to="/calculator" icon="fa-calculator" label="Calculadora" permission={Permission.USE_CALCULATOR} />
            <NavLink to="/history" icon="fa-clock-rotate-left" label="Histórico" permission={Permission.VIEW_HISTORY} />
            <NavLink to="/timetracker" icon="fa-stopwatch" label="Ponto" permission={Permission.VIEW_TIME_TRACKER} />
            
            <div className="px-4 py-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-4">Gestão</div>
            <NavLink to="/hr" icon="fa-users-gear" label="Equipe / RH" permission={Permission.MANAGE_TIME_TRACKER} />
            <NavLink to="/announcements" icon="fa-bullhorn" label="Avisos" permission={Permission.MANAGE_ANNOUNCEMENTS} />
            <NavLink to="/admin" icon="fa-screwdriver-wrench" label="Ajustes" permission={Permission.MANAGE_SETTINGS} />
          </>
        ) : isSuperAdmin && (
          <div className="px-4 py-10 text-center space-y-4">
             <i className="fa-solid fa-shop-slash text-slate-800 text-4xl block"></i>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Selecione uma oficina na Central para ver as ferramentas</p>
             <Link to="/central" className="inline-block text-[10px] font-black text-primary underline uppercase tracking-widest">Ir para Central</Link>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-between px-3 mb-4">
           <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Status Nuvem</span>
           <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${cloudStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_6px_var(--primary-color)]' : cloudStatus === 'syncing' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></span>
              <button onClick={onManualSync} className="text-[9px] font-black text-slate-500 uppercase hover:text-white transition-all">Sincronizar</button>
           </div>
        </div>
        
        <div className="flex items-center space-x-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
          <div className="relative">
            <img src={user.avatar} className="w-9 h-9 rounded-full border border-slate-800" alt="av" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{user.name}</p>
            <p className="text-[8px] text-primary font-bold uppercase tracking-[0.1em]">{role?.name || (isSuperAdmin ? 'SUPER ADMIN' : 'COLABORADOR')}</p>
          </div>
          <button onClick={onLogout} className="p-2 text-slate-600 hover:text-red-500 transition-colors"><i className="fa-solid fa-power-off"></i></button>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, requiredPermission }: { children: React.ReactNode, requiredPermission?: Permission }) => { 
  const userStr = localStorage.getItem('lsc_global_users_v4'); 
  const currentUserStr = localStorage.getItem('lsc_current_user_v4');
  if (!currentUserStr) return <Navigate to="/login" replace />; 
  return <>{children}</>; 
};

export default App;
