
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Permission, Role, Workshop } from './types';
import { INITIAL_USERS, INITIAL_WORKSHOPS, DEFAULT_SETTINGS } from './constants';
import { fetchFromSupabase, saveToSupabase } from './supabaseService';
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
  const [currentUser, setCurrentUser] = usePersistedState<User | null>('lsc_current_user_v5', null);
  const [globalUsers, setGlobalUsers] = usePersistedState<User[]>('lsc_users_v5', INITIAL_USERS);
  const [workshops, setWorkshops] = usePersistedState<Workshop[]>('lsc_workshops_v5', INITIAL_WORKSHOPS);
  const [activeWorkshopId, setActiveWorkshopId] = usePersistedState<string | null>('lsc_active_ws_v5', null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'online' | 'syncing' | 'error' | 'offline'>('offline');
  const [isBooting, setIsBooting] = useState(true);

  // Refs to avoid circular dependencies in callbacks
  const workshopsRef = useRef(workshops);
  const usersRef = useRef(globalUsers);
  
  useEffect(() => { workshopsRef.current = workshops; }, [workshops]);
  useEffect(() => { usersRef.current = globalUsers; }, [globalUsers]);

  const syncData = useCallback(async (ws?: Workshop[], us?: User[]) => {
    setIsSyncing(true);
    setDbStatus('syncing');
    const dataToSave = {
      workshops: ws || workshopsRef.current,
      users: us || usersRef.current,
      ts: Date.now()
    };
    const success = await saveToSupabase(dataToSave);
    setDbStatus(success ? 'online' : 'error');
    setIsSyncing(false);
    return success;
  }, []);

  const loadData = useCallback(async () => {
    const data = await fetchFromSupabase();
    if (data) {
      if (data._isEmpty) {
        setDbStatus('online');
        await syncData(INITIAL_WORKSHOPS, INITIAL_USERS);
      } else if (data.workshops && data.users) {
        setWorkshops(data.workshops);
        setGlobalUsers(data.users);
        setDbStatus('online');
      }
    } else {
      setDbStatus('offline');
    }
    setIsBooting(false);
  }, [setWorkshops, setGlobalUsers, syncData]);

  // Initial Boot and background sync
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      // Only background sync if not currently interacting/syncing
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 60000); 
    return () => clearInterval(interval);
  }, [loadData]);

  const isSuperAdmin = currentUser?.workshopId === 'system';
  const currentWorkshopId = isSuperAdmin ? activeWorkshopId : currentUser?.workshopId || null;
  
  const workshop = useMemo(() => 
    workshops.find(w => w.id === currentWorkshopId) || null, 
  [workshops, currentWorkshopId]);

  const workshopUsers = useMemo(() => 
    globalUsers.filter(u => u.workshopId === currentWorkshopId && u.workshopId !== 'system'), 
  [globalUsers, currentWorkshopId]);

  const updateWorkshop = useCallback((updated: Partial<Workshop>) => {
    setWorkshops(prev => {
      const newState = prev.map(w => w.id === currentWorkshopId ? { ...w, ...updated } : w);
      // Trigger sync after a tick to avoid state setter side-effects
      setTimeout(() => syncData(newState), 0);
      return newState;
    });
  }, [currentWorkshopId, syncData, setWorkshops]);

  const handleLogin = (u: User, selectedWsId?: string) => {
    setCurrentUser(u);
    if (selectedWsId) setActiveWorkshopId(selectedWsId);
    else if (u.workshopId !== 'system') setActiveWorkshopId(u.workshopId);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveWorkshopId(null);
  };

  const ProtectedRoute = ({ children, requiredPermission }: { children: React.ReactNode, requiredPermission?: Permission }) => {
    const location = useLocation();
    if (!currentUser) return <Navigate to="/login" state={{ from: location }} replace />;
    
    if (requiredPermission && currentUser.workshopId !== 'system') {
      const role = workshop?.roles.find(r => r.id === currentUser.roleId);
      if (!role?.permissions.includes(requiredPermission)) return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  if (isBooting) {
    return (
      <div className="h-screen w-full bg-[#0a0c10] flex flex-col items-center justify-center p-10">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-900 text-3xl animate-bounce">
          <i className="fa-solid fa-car"></i>
        </div>
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mt-8 animate-pulse">Estabelecendo Conexão Supabase...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex h-screen w-full bg-[#0a0c10] text-slate-100 overflow-hidden font-['Inter']">
        {currentUser && (
          <Sidebar 
            user={currentUser} 
            workshop={workshop} 
            activeWorkshopId={activeWorkshopId}
            dbStatus={dbStatus}
            onLogout={handleLogout}
            onResetContext={() => setActiveWorkshopId(null)}
            isSyncing={isSyncing}
            onManualSync={loadData}
          />
        )}
        <main className="flex-1 overflow-auto bg-[#0a0c10]">
          <Routes>
            <Route path="/login" element={<LoginPage users={globalUsers} workshops={workshops} onLogin={handleLogin} settings={DEFAULT_SETTINGS} />} />
            <Route path="/central" element={<ProtectedRoute><CentralControl workshops={workshops} setWorkshops={(ws) => { const res = typeof ws === 'function' ? ws(workshops) : ws; setWorkshops(res); syncData(res); }} users={globalUsers} setUsers={(us) => { const res = typeof us === 'function' ? us(globalUsers) : us; setGlobalUsers(res); syncData(undefined, res); }} currentUser={currentUser} onEnterWorkshop={setActiveWorkshopId} triggerSync={syncData} /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute>{workshop ? <Dashboard user={currentUser!} history={workshop.history} settings={workshop.settings} announcements={workshop.announcements} workSessions={workshop.workSessions} /> : <Navigate to="/central" />}</ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute requiredPermission={Permission.USE_CALCULATOR}><ServiceCalculator user={currentUser!} parts={workshop?.parts || []} settings={workshop?.settings || DEFAULT_SETTINGS} onSave={(record) => { const updatedHistory = [record, ...(workshop?.history || [])]; updateWorkshop({ history: updatedHistory }); const newUsers = globalUsers.map(u => u.id === record.mechanicId ? { ...u, pendingTax: (u.pendingTax || 0) + record.tax } : u); setGlobalUsers(newUsers); syncData(undefined, newUsers); }} /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute requiredPermission={Permission.VIEW_HISTORY}><History user={currentUser!} history={workshop?.history || []} settings={workshop?.settings || DEFAULT_SETTINGS} /></ProtectedRoute>} />
            <Route path="/timetracker" element={<ProtectedRoute requiredPermission={Permission.VIEW_TIME_TRACKER}><TimeTracker user={currentUser!} sessions={workshop?.workSessions || []} onUpdateSessions={(s) => updateWorkshop({ workSessions: s })} /></ProtectedRoute>} />
            <Route path="/hr" element={<ProtectedRoute requiredPermission={Permission.MANAGE_TIME_TRACKER}><HumanResources sessions={workshop?.workSessions || []} onUpdateSessions={(s) => updateWorkshop({ workSessions: s })} users={workshopUsers} setUsers={setGlobalUsers} settings={workshop?.settings || DEFAULT_SETTINGS} workshop={workshop} onUpdateWorkshop={updateWorkshop} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute requiredPermission={Permission.MANAGE_ANNOUNCEMENTS}><AnnouncementsManager user={currentUser!} announcements={workshop?.announcements || []} setAnnouncements={(a) => updateWorkshop({ announcements: a })} users={workshopUsers} /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredPermission={Permission.MANAGE_SETTINGS}><AdminPanel user={currentUser!} users={workshopUsers} setUsers={(u) => { const res = typeof u === 'function' ? u(workshopUsers) : u; const full = [...globalUsers.filter(gu => gu.workshopId !== currentWorkshopId || gu.workshopId === 'system'), ...res]; setGlobalUsers(full); syncData(undefined, full); }} roles={workshop?.roles || []} setRoles={(r) => updateWorkshop({ roles: typeof r === 'function' ? r(workshop!.roles) : r })} parts={workshop?.parts || []} setParts={(p) => updateWorkshop({ parts: typeof p === 'function' ? p(workshop!.parts) : p })} settings={workshop?.settings || DEFAULT_SETTINGS} setSettings={(s) => updateWorkshop({ settings: typeof s === 'function' ? s(workshop!.settings) : s })} workshopId={currentWorkshopId!} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

const Sidebar: React.FC<{ user: User, workshop: Workshop | null, activeWorkshopId: string | null, dbStatus: string, onLogout: () => void, onResetContext: () => void, isSyncing: boolean, onManualSync: () => void }> = React.memo(({ user, workshop, activeWorkshopId, dbStatus, onLogout, onResetContext, isSyncing, onManualSync }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = user.workshopId === 'system';
  const role = workshop?.roles.find(r => r.id === user.roleId);
  const perms = isSuperAdmin ? Object.values(Permission) : role?.permissions || [];

  const NavLink = ({ to, icon, label, permission }: { to: string, icon: string, label: string, permission?: Permission }) => {
    if (permission && !perms.includes(permission)) return null;
    const active = location.pathname === to;
    return (
      <Link to={to} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${active ? 'bg-emerald-500/10 text-emerald-500 border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'}`}>
        <i className={`fa-solid ${icon} w-5 text-center text-sm`}></i>
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </Link>
    );
  };

  const getStatusColor = () => {
    switch(dbStatus) {
      case 'online': return 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
      case 'syncing': return 'bg-yellow-500 animate-pulse';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="w-64 bg-[#11141a] border-r border-slate-800/50 flex flex-col shrink-0">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 text-xl">
            <i className="fa-solid fa-car"></i>
          </div>
          <div className="overflow-hidden text-left">
            <h1 className="font-black text-xs text-white uppercase truncate tracking-tight italic leading-none">{workshop?.settings.workshopName || 'ADMIN'}</h1>
            <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest mt-1 opacity-60">SISTEMA ATIVO</p>
          </div>
        </div>
        {isSuperAdmin && activeWorkshopId && (
          <button onClick={() => { onResetContext(); navigate('/central'); }} className="w-full text-[9px] font-black text-emerald-400 border border-emerald-500/20 py-2.5 rounded-lg hover:bg-emerald-500 hover:text-slate-950 transition-all uppercase tracking-widest">
            <i className="fa-solid fa-arrow-left mr-2"></i> VOLTAR CENTRAL
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {isSuperAdmin && <NavLink to="/central" icon="fa-microchip" label="Control Center" />}
        
        {(workshop || (isSuperAdmin && activeWorkshopId)) && (
          <>
            <div className="px-4 pt-4 pb-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">Geral</div>
            <NavLink to="/" icon="fa-chart-pie" label="Dashboard" />
            <NavLink to="/calculator" icon="fa-calculator" label="Calculadora" permission={Permission.USE_CALCULATOR} />
            <NavLink to="/history" icon="fa-list-ul" label="Histórico" permission={Permission.VIEW_HISTORY} />
            <NavLink to="/timetracker" icon="fa-clock" label="Ponto" permission={Permission.VIEW_TIME_TRACKER} />
            
            <div className="px-4 pt-4 pb-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">Gestão</div>
            <NavLink to="/hr" icon="fa-user-group" label="RH & Tesouraria" permission={Permission.MANAGE_TIME_TRACKER} />
            <NavLink to="/announcements" icon="fa-bullhorn" label="Comunicados" permission={Permission.MANAGE_ANNOUNCEMENTS} />
            <NavLink to="/admin" icon="fa-gear" label="Ajustes" permission={Permission.MANAGE_SETTINGS} />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800/50">
        <button onClick={onManualSync} className="w-full mb-3 flex items-center justify-center gap-2 text-[8px] font-black uppercase text-emerald-500 hover:opacity-80 transition-all">
          <i className={`fa-solid ${isSyncing ? 'fa-spinner animate-spin' : 'fa-rotate'} text-xs`}></i>
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
        </button>
        <div className="bg-[#0a0c10] rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-3 px-1">
             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Status DB</span>
             <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          </div>
          <div className="flex items-center space-x-2">
            <img src={user.avatar} className="w-8 h-8 rounded-lg bg-slate-800" alt="u" />
            <div className="flex-1 overflow-hidden text-left">
              <p className="text-[10px] font-bold text-white truncate">{user.name}</p>
              <p className="text-[8px] text-emerald-500 font-bold uppercase truncate">{role?.name || (isSuperAdmin ? 'ROOT' : 'USER')}</p>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-500"><i className="fa-solid fa-power-off text-[10px]"></i></button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default App;
