
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
  const [isBooting, setIsBooting] = useState(true);
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [activeWorkshopId, setActiveWorkshopId] = usePersistedState<string | null>('lsc_active_workshop_id_v4', null);

  const triggerCloudSync = useCallback(async (newWorkshops?: Workshop[], newUsers?: User[]) => {
    const config = getCloudConfig();
    if (config.provider === 'none') return false;
    setIsSyncing(true);
    const success = await syncToCloud({
      workshops: newWorkshops || workshops,
      users: newUsers || globalUsers,
      lastUpdate: new Date().toISOString()
    });
    setIsSyncing(false);
    return success;
  }, [workshops, globalUsers]);

  const loadCloudData = useCallback(async () => {
    const config = getCloudConfig();
    
    // Se já temos dados locais, liberar a tela imediatamente (Optimistic UI)
    const hasLocalData = workshops.length > 0 && globalUsers.length > 0;
    if (hasLocalData) {
      setIsBooting(false);
    }

    if (config.provider === 'none') {
      setIsBooting(false);
      return;
    }

    setIsSyncing(true);
    try {
      const data = await fetchFromCloud();
      if (data && data._isNew) {
        await triggerCloudSync();
      } else if (data && data.workshops && data.users) {
        setWorkshops(data.workshops);
        setGlobalUsers(data.users);
      }
    } catch (err) {
      console.error("Cloud Fetch Error", err);
    } finally {
      setIsSyncing(false);
      setIsBooting(false);
    }
  }, [setWorkshops, setGlobalUsers, triggerCloudSync, workshops.length, globalUsers.length]);

  useEffect(() => {
    loadCloudData();
  }, [loadCloudData]);

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

  if (isBooting) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-slate-950 text-2xl animate-pulse mb-6"><i className="fa-solid fa-car-on"></i></div>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] animate-pulse">Sincronizando Sistema...</p>
      </div>
    );
  }

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
            isSyncing={isSyncing}
            onManualSync={loadCloudData}
            onOpenSettings={() => setShowCloudConfig(true)}
          />
        )}
        <main className="flex-1 overflow-auto relative bg-slate-950">
          <Routes>
            <Route path="/login" element={currentUser ? <Navigate to="/" /> : <LoginPage users={globalUsers} workshops={workshops} onLogin={handleLogin} onOpenCloudConfig={() => setShowCloudConfig(true)} />} />
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
      {showCloudConfig && <CloudSetupModal onClose={() => setShowCloudConfig(false)} />}
    </HashRouter>
  );
};

const Sidebar: React.FC<{ user: User, workshop: Workshop | null, activeWorkshopId: string | null, onLogout: () => void, onResetContext: () => void, isSyncing: boolean, onManualSync: () => void, onOpenSettings: () => void }> = ({ user, workshop, activeWorkshopId, onLogout, onResetContext, isSyncing, onManualSync, onOpenSettings }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = user.workshopId === 'system';
  
  const role = workshop?.roles.find(r => r.id === user.roleId);
  const perms = isSuperAdmin ? Object.values(Permission) : role?.permissions || [];

  const NavLink = ({ to, icon, label, permission }: { to: string, icon: string, label: string, permission?: Permission }) => {
    if (permission && !perms.includes(permission)) return null;
    const active = location.pathname === to;
    return (
      <Link to={to} className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all ${active ? 'bg-primary text-slate-950 font-black shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
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
            <h1 className="font-black text-sm text-white uppercase truncate tracking-tighter">{workshop?.settings.workshopName || 'LSC PRO'}</h1>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Painel Operacional</p>
          </div>
        </div>
        {isSuperAdmin && activeWorkshopId && (
          <button onClick={() => { onResetContext(); navigate('/central'); }} className="w-full text-[9px] font-black text-primary bg-primary/10 py-2.5 rounded-xl border border-primary/20 hover:bg-primary hover:text-slate-950 transition-all uppercase tracking-widest">VOLTAR À CENTRAL</button>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto pb-6">
        {isSuperAdmin && <NavLink to="/central" icon="fa-microchip" label="Central de Controle" />}
        
        {(workshop || isSuperAdmin) && activeWorkshopId && (
          <>
            <div className="px-4 py-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-2">Principal</div>
            <NavLink to="/" icon="fa-gauge-high" label="Painel Geral" />
            <NavLink to="/calculator" icon="fa-calculator" label="Calculadora" permission={Permission.USE_CALCULATOR} />
            <NavLink to="/history" icon="fa-clock-rotate-left" label="Logs de Atendimento" permission={Permission.VIEW_HISTORY} />
            <NavLink to="/timetracker" icon="fa-stopwatch" label="Ponto Eletrônico" permission={Permission.VIEW_TIME_TRACKER} />
            
            <div className="px-4 py-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mt-4">Gestão Técnica</div>
            <NavLink to="/hr" icon="fa-users-gear" label="Recursos Humanos (RH)" permission={Permission.MANAGE_TIME_TRACKER} />
            <NavLink to="/announcements" icon="fa-bullhorn" label="Avisos e Comunicados" permission={Permission.MANAGE_ANNOUNCEMENTS} />
            <NavLink to="/admin" icon="fa-screwdriver-wrench" label="Ajustes da Oficina" permission={Permission.MANAGE_SETTINGS} />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <button onClick={onManualSync} className={`w-full mb-4 flex items-center justify-center gap-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-800 transition-all ${isSyncing ? 'text-primary' : 'text-slate-500 hover:text-white hover:border-slate-700'}`}>
          <i className={`fa-solid ${isSyncing ? 'fa-spinner animate-spin' : 'fa-cloud-check'}`}></i>
          {isSyncing ? 'Sincronizando...' : 'Nuvem Conectada'}
        </button>
        
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

const CloudSetupModal = ({ onClose }: { onClose: () => void }) => {
  const [cfg, setCfg] = useState<CloudConfig>(getCloudConfig());
  const handleSave = () => { saveCloudConfig(cfg); onClose(); window.location.reload(); };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] p-10 space-y-8 shadow-2xl">
        <div>
          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Conexão Global LSC</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Configure o destino dos dados</p>
        </div>
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
          <button onClick={() => setCfg({...cfg, provider: 'gsheets'})} className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${cfg.provider === 'gsheets' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-500'}`}>GOOGLE DRIVE</button>
          <button onClick={() => setCfg({...cfg, provider: 'github'})} className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${cfg.provider === 'github' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-500'}`}>GITHUB</button>
          <button onClick={() => setCfg({...cfg, provider: 'none'})} className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${cfg.provider === 'none' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>OFFLINE</button>
        </div>
        <div className="space-y-4">
          {cfg.provider === 'gsheets' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Script URL</label>
              <input type="text" value={cfg.gsheetsUrl || ''} onChange={e => setCfg({...cfg, gsheetsUrl: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs outline-none focus:ring-1 ring-primary" placeholder="https://script.google.com/macros/s/.../exec" />
            </div>
          )}
          {cfg.provider === 'github' && (
            <>
              <input type="password" value={cfg.githubToken || ''} onChange={e => setCfg({...cfg, githubToken: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white font-mono text-xs" placeholder="Token GitHub..." />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={cfg.githubOwner || ''} onChange={e => setCfg({...cfg, githubOwner: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs" placeholder="Usuário" />
                <input type="text" value={cfg.githubRepo || ''} onChange={e => setCfg({...cfg, githubRepo: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs" placeholder="Repo" />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-4">
          <button onClick={handleSave} className="flex-1 bg-primary text-slate-950 font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-primary/20">Salvar e Reiniciar</button>
          <button onClick={onClose} className="px-6 bg-slate-800 text-slate-400 font-bold rounded-2xl text-xs uppercase">Sair</button>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, requiredPermission }: { children: React.ReactNode, requiredPermission?: Permission }) => { 
  const userStr = localStorage.getItem('lsc_current_user_v4'); 
  if (!userStr) return <Navigate to="/login" replace />; 
  return <>{children}</>; 
};

export default App;
