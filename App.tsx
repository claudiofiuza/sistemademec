
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [currentUser, setCurrentUser] = usePersistedState<User | null>('lsc_user_v5', null);
  const [globalUsers, setGlobalUsers] = usePersistedState<User[]>('lsc_users_v5', INITIAL_USERS);
  const [workshops, setWorkshops] = usePersistedState<Workshop[]>('lsc_workshops_v5', INITIAL_WORKSHOPS);
  const [activeWorkshopId, setActiveWorkshopId] = usePersistedState<string | null>('lsc_active_ws_v5', null);
  const [dbStatus, setDbStatus] = useState<'online' | 'syncing' | 'error' | 'offline'>('offline');

  const syncData = useCallback(async (ws?: Workshop[], us?: User[]) => {
    setDbStatus('syncing');
    const success = await saveToSupabase({
      workshops: ws || workshops,
      users: us || globalUsers,
      ts: Date.now()
    });
    setDbStatus(success ? 'online' : 'error');
  }, [workshops, globalUsers]);

  const loadData = useCallback(async () => {
    const data = await fetchFromSupabase();
    if (data) {
      if (data._isEmpty) {
        setDbStatus('online');
        syncData();
      } else if (data.workshops && data.users) {
        setWorkshops(data.workshops);
        setGlobalUsers(data.users);
        setDbStatus('online');
      }
    } else {
      setDbStatus('offline');
    }
  }, [setWorkshops, setGlobalUsers, syncData]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, [loadData]);

  const isSuperAdmin = currentUser?.workshopId === 'system';
  const currentWorkshopId = isSuperAdmin ? activeWorkshopId : currentUser?.workshopId || null;
  const workshop = useMemo(() => workshops.find(w => w.id === currentWorkshopId) || null, [workshops, currentWorkshopId]);
  const workshopUsers = useMemo(() => globalUsers.filter(u => u.workshopId === currentWorkshopId && u.workshopId !== 'system'), [globalUsers, currentWorkshopId]);

  const updateWorkshop = (updated: Partial<Workshop>) => {
    const newState = workshops.map(w => w.id === currentWorkshopId ? { ...w, ...updated } : w);
    setWorkshops(newState);
    syncData(newState);
  };

  return (
    <HashRouter>
      <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-['Inter']">
        {currentUser && (
          <Sidebar 
            user={currentUser} 
            workshop={workshop} 
            activeWorkshopId={activeWorkshopId}
            dbStatus={dbStatus}
            onLogout={() => { setCurrentUser(null); setActiveWorkshopId(null); }}
            onResetContext={() => setActiveWorkshopId(null)}
          />
        )}
        <main className="flex-1 overflow-auto bg-slate-950/50 backdrop-blur-md">
          <Routes>
            <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage users={globalUsers} workshops={workshops} onLogin={(u, ws) => { setCurrentUser(u); if(ws) setActiveWorkshopId(ws); else if(u.workshopId !== 'system') setActiveWorkshopId(u.workshopId); }} settings={DEFAULT_SETTINGS} />} />
            <Route path="/central" element={<ProtectedRoute user={currentUser} workshop={workshop}><CentralControl workshops={workshops} setWorkshops={setWorkshops} users={globalUsers} setUsers={setGlobalUsers} currentUser={currentUser} onEnterWorkshop={setActiveWorkshopId} triggerSync={syncData} /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute user={currentUser} workshop={workshop}>{workshop ? <Dashboard user={currentUser!} history={workshop.history} settings={workshop.settings} announcements={workshop.announcements} workSessions={workshop.workSessions} /> : <Navigate to="/central" />}</ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute user={currentUser} workshop={workshop} requiredPermission={Permission.USE_CALCULATOR}><ServiceCalculator user={currentUser!} parts={workshop?.parts || []} settings={workshop?.settings || DEFAULT_SETTINGS} onSave={(record) => { const updatedHistory = [record, ...(workshop?.history || [])]; updateWorkshop({ history: updatedHistory }); const newUsers = globalUsers.map(u => u.id === record.mechanicId ? { ...u, pendingTax: (u.pendingTax || 0) + record.tax } : u); setGlobalUsers(newUsers); syncData(undefined, newUsers); }} /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute user={currentUser} workshop={workshop} requiredPermission={Permission.VIEW_HISTORY}><History user={currentUser!} history={workshop?.history || []} settings={workshop?.settings || DEFAULT_SETTINGS} /></ProtectedRoute>} />
            <Route path="/timetracker" element={<ProtectedRoute user={currentUser} workshop={workshop} requiredPermission={Permission.VIEW_TIME_TRACKER}><TimeTracker user={currentUser!} sessions={workshop?.workSessions || []} onUpdateSessions={(s) => updateWorkshop({ workSessions: s })} /></ProtectedRoute>} />
            <Route path="/hr" element={<ProtectedRoute user={currentUser} workshop={workshop} requiredPermission={Permission.MANAGE_TIME_TRACKER}><HumanResources sessions={workshop?.workSessions || []} onUpdateSessions={(s) => updateWorkshop({ workSessions: s })} users={workshopUsers} setUsers={setGlobalUsers} settings={workshop?.settings || DEFAULT_SETTINGS} workshop={workshop} onUpdateWorkshop={updateWorkshop} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute user={currentUser} workshop={workshop} requiredPermission={Permission.MANAGE_ANNOUNCEMENTS}><AnnouncementsManager user={currentUser!} announcements={workshop?.announcements || []} setAnnouncements={(a) => updateWorkshop({ announcements: a })} users={workshopUsers} /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute user={currentUser} workshop={workshop} requiredPermission={Permission.MANAGE_SETTINGS}><AdminPanel user={currentUser!} users={workshopUsers} setUsers={(u) => { const res = typeof u === 'function' ? u(workshopUsers) : u; const full = [...globalUsers.filter(gu => gu.workshopId !== currentWorkshopId || gu.workshopId === 'system'), ...res]; setGlobalUsers(full); syncData(undefined, full); }} roles={workshop?.roles || []} setRoles={(r) => updateWorkshop({ roles: typeof r === 'function' ? r(workshop!.roles) : r })} parts={workshop?.parts || []} setParts={(p) => updateWorkshop({ parts: typeof p === 'function' ? p(workshop!.parts) : p })} settings={workshop?.settings || DEFAULT_SETTINGS} setSettings={(s) => updateWorkshop({ settings: typeof s === 'function' ? s(workshop!.settings) : s })} workshopId={currentWorkshopId!} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

const Sidebar: React.FC<{ user: User, workshop: Workshop | null, activeWorkshopId: string | null, dbStatus: string, onLogout: () => void, onResetContext: () => void }> = ({ user, workshop, activeWorkshopId, dbStatus, onLogout, onResetContext }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = user.workshopId === 'system';
  const role = workshop?.roles.find(r => r.id === user.roleId);
  const perms = isSuperAdmin ? Object.values(Permission) : role?.permissions || [];

  const NavLink = ({ to, icon, label, permission }: { to: string, icon: string, label: string, permission?: Permission }) => {
    if (permission && !perms.includes(permission)) return null;
    const active = location.pathname === to;
    return (
      <Link to={to} className={`group flex items-center space-x-4 px-5 py-4 rounded-[1.8rem] transition-all duration-300 ${active ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_25px_rgba(16,185,129,0.3)] scale-[1.02]' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'}`}>
        <i className={`fa-solid ${icon} w-5 text-center text-sm ${active ? 'text-slate-950' : 'group-hover:text-emerald-400'}`}></i>
        <span className="text-[10px] uppercase tracking-[0.25em] font-black">{label}</span>
      </Link>
    );
  };

  const getStatusColor = () => {
    switch(dbStatus) {
      case 'online': return 'bg-emerald-500 shadow-[0_0_12px_#10b981]';
      case 'syncing': return 'bg-yellow-500 animate-pulse';
      default: return 'bg-red-500 shadow-[0_0_12px_#ef4444]';
    }
  };

  return (
    <div className="w-72 bg-slate-900/60 border-r border-slate-800/40 flex flex-col shrink-0 backdrop-blur-2xl">
      <div className="p-10">
        <div className="flex items-center space-x-4 mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 text-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <i className="fa-solid fa-car-side"></i>
          </div>
          <div className="overflow-hidden">
            <h1 className="font-black text-sm text-white uppercase truncate tracking-tight italic leading-none">{workshop?.settings.workshopName || (isSuperAdmin ? 'CENTRAL' : 'LSC PRO')}</h1>
            <p className="text-[8px] text-emerald-500/60 font-black uppercase tracking-[0.4em] mt-2">Terminal V5.3</p>
          </div>
        </div>
        {isSuperAdmin && activeWorkshopId && (
          <button onClick={() => { onResetContext(); navigate('/central'); }} className="w-full text-[9px] font-black text-emerald-400 bg-emerald-500/10 py-4 rounded-[1.5rem] border border-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 transition-all uppercase tracking-[0.2em] shadow-lg">
            <i className="fa-solid fa-arrow-left mr-2"></i> VOLTAR CENTRAL
          </button>
        )}
      </div>

      <nav className="flex-1 px-5 space-y-2.5 overflow-y-auto custom-scrollbar">
        {isSuperAdmin && <NavLink to="/central" icon="fa-microchip" label="Control Center" />}
        
        {(workshop || (isSuperAdmin && activeWorkshopId)) && (
          <>
            <div className="px-5 pt-8 pb-3 text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] opacity-50">Operacional</div>
            <NavLink to="/" icon="fa-gauge-high" label="Dashboard" />
            <NavLink to="/calculator" icon="fa-calculator" label="Calculadora" permission={Permission.USE_CALCULATOR} />
            <NavLink to="/history" icon="fa-clock-rotate-left" label="Histórico" permission={Permission.VIEW_HISTORY} />
            <NavLink to="/timetracker" icon="fa-stopwatch" label="Meu Ponto" permission={Permission.VIEW_TIME_TRACKER} />
            
            <div className="px-5 pt-8 pb-3 text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] opacity-50">Gestão</div>
            <NavLink to="/hr" icon="fa-users-gear" label="RH & Tesouraria" permission={Permission.MANAGE_TIME_TRACKER} />
            <NavLink to="/announcements" icon="fa-bullhorn" label="Comunicados" permission={Permission.MANAGE_ANNOUNCEMENTS} />
            <NavLink to="/admin" icon="fa-screwdriver-wrench" label="Configuração" permission={Permission.MANAGE_SETTINGS} />
          </>
        )}
      </nav>

      <div className="p-8">
        <div className="bg-slate-950/50 rounded-[2.5rem] p-5 border border-slate-800/60 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-5 px-1">
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">Database Link</span>
             <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
          </div>
          <div className="flex items-center space-x-3">
            <img src={user.avatar} className="w-12 h-12 rounded-[1.2rem] border border-slate-800 shadow-xl bg-slate-900" alt="u" />
            <div className="flex-1 overflow-hidden">
              <p className="text-[12px] font-black text-white uppercase truncate italic">{user.name}</p>
              <p className="text-[9px] text-emerald-500 font-black uppercase truncate tracking-[0.15em] mt-1">{role?.name || (isSuperAdmin ? 'ROOT' : 'USER')}</p>
            </div>
            <button onClick={onLogout} className="p-2.5 text-slate-600 hover:text-red-500 transition-all hover:scale-110"><i className="fa-solid fa-power-off text-sm"></i></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, user, requiredPermission, workshop }: any) => { 
  if (!user) return <Navigate to="/login" replace />; 
  if (requiredPermission && user.workshopId !== 'system') {
    const role = workshop?.roles.find((r: any) => r.id === user.roleId);
    if (!role?.permissions.includes(requiredPermission)) return <Navigate to="/" replace />;
  }
  return <>{children}</>; 
};

export default App;
