
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
  const [bootStatus, setBootStatus] = useState('Iniciando sistemas...');
  const [bootError, setBootError] = useState<string | null>(null);
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  
  const [activeWorkshopId, setActiveWorkshopId] = usePersistedState<string | null>('lsc_active_workshop_id_v4', null);

  const loadCloudData = useCallback(async () => {
    const config = getCloudConfig();
    if (config.provider === 'none') {
      setBootStatus('Modo Offline: Nuvem não configurada.');
      setTimeout(() => setIsBooting(false), 800);
      return;
    }

    setIsSyncing(true);
    setBootError(null);
    setBootStatus(`Conectando ao ${config.provider === 'github' ? 'GitHub' : 'Google Sheets'}...`);
    
    try {
      const data = await fetchFromCloud();
      if (data && data._isNew) {
        setBootStatus('Banco de dados inicializado na nuvem.');
        setTimeout(() => setIsBooting(false), 800);
      } else if (data && data.workshops && data.users) {
        setWorkshops(data.workshops);
        setGlobalUsers(data.users);
        setBootStatus('Sincronização concluída!');
        setTimeout(() => setIsBooting(false), 800);
      } else {
        setBootStatus('Falha na resposta da nuvem.');
        setBootError('Verifique se suas credenciais (Token/URL) estão corretas.');
        setTimeout(() => setIsBooting(false), 2500);
      }
    } catch (err) {
      setBootError('Erro de conexão com a nuvem.');
      setTimeout(() => setIsBooting(false), 2500);
    } finally {
      setIsSyncing(false);
    }
  }, [setWorkshops, setGlobalUsers]);

  useEffect(() => {
    loadCloudData();
  }, [loadCloudData]);

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

  const isSuperAdmin = useMemo(() => currentUser?.workshopId === 'system', [currentUser]);

  const currentWorkshopId = useMemo(() => {
    if (isSuperAdmin) return activeWorkshopId;
    return currentUser?.workshopId || null;
  }, [isSuperAdmin, currentUser, activeWorkshopId]);

  const workshop = useMemo(() => 
    workshops.find(w => w.id === currentWorkshopId) || null
  , [workshops, currentWorkshopId]);

  const workshopUsers = useMemo(() => 
    globalUsers.filter(u => u.workshopId === currentWorkshopId && u.workshopId !== 'system')
  , [globalUsers, currentWorkshopId]);

  const updateWorkshop = useCallback((updated: Partial<Workshop>) => {
    setWorkshops(prevWorkshops => {
      const wsId = isSuperAdmin ? activeWorkshopId : currentUser?.workshopId;
      if (!wsId) return prevWorkshops;
      const newState = prevWorkshops.map(w => w.id === wsId ? { ...w, ...updated } : w);
      setTimeout(() => triggerCloudSync(newState), 500);
      return newState;
    });
  }, [isSuperAdmin, currentUser, activeWorkshopId, setWorkshops, triggerCloudSync]);

  const handleLogin = (u: User, selectedWorkshopId?: string) => {
    setCurrentUser(u);
    if (selectedWorkshopId) {
      setActiveWorkshopId(selectedWorkshopId);
    } else if (u.workshopId !== 'system') {
      setActiveWorkshopId(u.workshopId);
    }
    triggerCloudSync();
  };

  const CloudSetupModal = () => {
    const [cfg, setCfg] = useState<CloudConfig>(getCloudConfig());
    
    const handleSave = () => {
      saveCloudConfig(cfg);
      setShowCloudConfig(false);
      window.location.reload();
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl space-y-8">
          <div>
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Conexão em Nuvem</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configure onde os dados serão salvos</p>
          </div>

          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1">
            <button onClick={() => setCfg({...cfg, provider: 'github'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cfg.provider === 'github' ? 'bg-primary text-slate-950 shadow-lg' : 'text-slate-500'}`}>GITHUB</button>
            <button onClick={() => setCfg({...cfg, provider: 'gsheets'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cfg.provider === 'gsheets' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-500'}`}>PLANILHA</button>
            <button onClick={() => setCfg({...cfg, provider: 'none'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cfg.provider === 'none' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>OFFLINE</button>
          </div>

          <div className="space-y-4">
            {cfg.provider === 'github' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">GitHub Personal Token</label>
                  <input type="password" value={cfg.githubToken || ''} onChange={e => setCfg({...cfg, githubToken: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white font-mono text-sm" placeholder="ghp_..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Owner (Usuário)</label>
                    <input type="text" value={cfg.githubOwner || ''} onChange={e => setCfg({...cfg, githubOwner: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs" placeholder="seu-usuario" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Repo (Pasta)</label>
                    <input type="text" value={cfg.githubRepo || ''} onChange={e => setCfg({...cfg, githubRepo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs" placeholder="lsc-pro-db" />
                  </div>
                </div>
              </>
            )}

            {cfg.provider === 'gsheets' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">URL do Web App (Google Scripts)</label>
                <input type="text" value={cfg.gsheetsUrl || ''} onChange={e => setCfg({...cfg, gsheetsUrl: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-xs" placeholder="https://script.google.com/macros/s/..." />
                <p className="text-[8px] text-slate-500 font-bold uppercase leading-tight p-2">Dica: Use o Google Sheets para uma conexão mais estável se o GitHub bloquear seu Token.</p>
              </div>
            )}

            {cfg.provider === 'none' && (
              <div className="p-6 bg-slate-950 border border-slate-800 rounded-3xl text-center">
                <p className="text-xs text-slate-500 font-medium italic">Os dados serão salvos apenas no seu computador atual.</p>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button onClick={handleSave} className="flex-1 bg-primary text-slate-950 font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-xs transition-all hover:scale-105">Salvar e Reiniciar</button>
            <button onClick={() => setShowCloudConfig(false)} className="px-8 bg-slate-800 text-slate-400 font-bold rounded-2xl uppercase tracking-widest text-xs">Fechar</button>
          </div>
        </div>
      </div>
    );
  };

  if (isBooting) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-10">
        <div className="w-24 h-24 rounded-3xl bg-primary flex items-center justify-center text-slate-950 text-4xl shadow-2xl animate-pulse mb-12">
          <i className="fa-solid fa-car-on"></i>
        </div>
        <div className="text-center space-y-4 max-w-sm w-full">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">LSC PRO SYSTEM</h2>
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${bootError ? 'text-red-500' : 'text-primary animate-pulse'}`}>
            {bootStatus}
          </p>
          {bootError && <p className="text-[9px] text-slate-600 font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20">{bootError}</p>}
        </div>
        <button onClick={() => setShowCloudConfig(true)} className="mt-10 text-[9px] font-black text-slate-700 hover:text-white uppercase tracking-widest border border-slate-900 px-4 py-2 rounded-lg transition-all">Configurar Conexão Manual</button>
        {showCloudConfig && <CloudSetupModal />}
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
        {showCloudConfig && <CloudSetupModal />}
        {currentUser && (
          <Sidebar 
            user={currentUser} 
            workshop={workshop} 
            activeWorkshopId={activeWorkshopId}
            onLogout={() => { setCurrentUser(null); setActiveWorkshopId(null); }}
            onResetContext={() => setActiveWorkshopId(null)}
            onUpdateAvatar={(url) => {
              const newUsers = globalUsers.map(u => u.id === currentUser.id ? { ...u, avatar: url } : u);
              setGlobalUsers(newUsers);
              setCurrentUser({ ...currentUser, avatar: url });
              triggerCloudSync(undefined, newUsers);
            }}
            isSyncing={isSyncing}
            onManualSync={loadCloudData}
          />
        )}
        <main className="flex-1 overflow-auto relative">
          <Routes>
            <Route path="/login" element={
              currentUser ? <Navigate to="/" /> : <LoginPage users={globalUsers} workshops={workshops} onLogin={handleLogin} onOpenCloudConfig={() => setShowCloudConfig(true)} />
            } />
            <Route path="/central" element={<ProtectedRoute><CentralControl workshops={workshops} setWorkshops={(ws) => { const res = typeof ws === 'function' ? ws(workshops) : ws; setWorkshops(res); triggerCloudSync(res); }} users={globalUsers} setUsers={(us) => { const res = typeof us === 'function' ? us(globalUsers) : us; setGlobalUsers(res); triggerCloudSync(undefined, res); }} currentUser={currentUser} onEnterWorkshop={(id) => setActiveWorkshopId(id)} triggerSync={() => triggerCloudSync()} /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute>{workshop ? <Dashboard user={currentUser!} history={workshop.history} parts={workshop.parts} settings={workshop.settings} announcements={workshop.announcements} workSessions={workshop.workSessions} /> : <Navigate to="/central" />}</ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute requiredPermission={Permission.USE_CALCULATOR}><ServiceCalculator user={currentUser!} parts={workshop?.parts || []} settings={workshop?.settings || DEFAULT_SETTINGS} onSave={(record) => { const updatedHistory = [record, ...(workshop?.history || [])]; updateWorkshop({ history: updatedHistory }); const newUsers = globalUsers.map(u => u.id === record.mechanicId ? { ...u, pendingTax: (u.pendingTax || 0) + record.tax } : u); setGlobalUsers(newUsers); triggerCloudSync(undefined, newUsers); }} /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute requiredPermission={Permission.VIEW_HISTORY}><History user={currentUser!} history={workshop?.history || []} settings={workshop?.settings || DEFAULT_SETTINGS} /></ProtectedRoute>} />
            <Route path="/timetracker" element={<ProtectedRoute requiredPermission={Permission.VIEW_TIME_TRACKER}><TimeTracker user={currentUser!} sessions={workshop?.workSessions || []} onUpdateSessions={(s) => updateWorkshop({ workSessions: s })} /></ProtectedRoute>} />
            <Route path="/hr" element={<ProtectedRoute requiredPermission={Permission.MANAGE_TIME_TRACKER}><HumanResources sessions={workshop?.workSessions || []} onUpdateSessions={(s) => updateWorkshop({ workSessions: s })} users={workshopUsers} setUsers={(us) => { const res = typeof us === 'function' ? us(globalUsers) : us; setGlobalUsers(res); triggerCloudSync(undefined, res); }} settings={workshop?.settings || DEFAULT_SETTINGS} workshop={workshop} onUpdateWorkshop={updateWorkshop} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute requiredPermission={Permission.MANAGE_ANNOUNCEMENTS}><AnnouncementsManager user={currentUser!} announcements={workshop?.announcements || []} setAnnouncements={(a) => updateWorkshop({ announcements: a })} users={workshopUsers} /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel user={currentUser!} users={workshopUsers} setUsers={(newUsers) => { const updater = typeof newUsers === 'function' ? newUsers : () => newUsers; const result = updater(workshopUsers); const others = globalUsers.filter(u => u.workshopId !== currentWorkshopId || u.workshopId === 'system'); const fullUsers = [...others, ...result]; setGlobalUsers(fullUsers); triggerCloudSync(undefined, fullUsers); }} roles={workshop?.roles || []} setRoles={(r) => updateWorkshop({ roles: typeof r === 'function' ? r(workshop!.roles) : r })} parts={workshop?.parts || []} setParts={(p) => updateWorkshop({ parts: typeof p === 'function' ? p(workshop!.parts) : p })} settings={workshop?.settings || DEFAULT_SETTINGS} setSettings={(s) => updateWorkshop({ settings: typeof s === 'function' ? s(workshop!.settings) : s })} workshopId={currentWorkshopId!} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
};

const Sidebar: React.FC<{ user: User, workshop: Workshop | null, activeWorkshopId: string | null, onLogout: () => void, onResetContext: () => void, onUpdateAvatar: (url: string) => void, isSyncing: boolean, onManualSync: () => void }> = ({ user, workshop, activeWorkshopId, onLogout, onResetContext, onUpdateAvatar, isSyncing, onManualSync }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar || '');
  const isSuperAdmin = user.workshopId === 'system';
  const perms = isSuperAdmin ? Object.values(Permission) : workshop?.roles.find(r => r.id === user.roleId)?.permissions || [];

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
      <div className="p-6 flex flex-col space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white text-xl shadow-lg shadow-primary/20"><i className="fa-solid fa-car"></i></div>
          <h1 className="font-bold text-lg leading-tight tracking-tight uppercase truncate">{workshop?.settings.workshopName || 'LSC Pro'}</h1>
        </div>
        {isSuperAdmin && activeWorkshopId && <button onClick={() => { onResetContext(); navigate('/central'); }} className="text-[10px] font-black text-primary bg-primary/10 py-1.5 px-3 rounded-lg border border-primary/20">VOLTAR AO CONTROLE CENTRAL</button>}
      </div>
      <nav className="flex-1 px-4 space-y-1 mt-2">
        {isSuperAdmin && <Link to="/central" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/central' ? 'bg-primary text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800'}`}><i className="fa-solid fa-microchip w-5"></i><span>Controle Central</span></Link>}
        {(workshop || isSuperAdmin) && activeWorkshopId && <div className="pt-4 space-y-1"><div className="px-4 pb-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Oficina Atual</div><Link to="/" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/' ? 'bg-primary/10 text-primary' : 'text-slate-400'}`}><i className="fa-solid fa-gauge w-5"></i><span>Painel</span></Link><Link to="/calculator" className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${location.pathname === '/calculator' ? 'bg-primary/10 text-primary' : 'text-slate-400'}`}><i className="fa-solid fa-calculator w-5"></i><span>Calculadora</span></Link></div>}
      </nav>
      <div className="p-4 border-t border-slate-800"><button onClick={onManualSync} className={`w-full mb-3 flex items-center justify-center gap-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-800 transition-all ${isSyncing ? 'text-primary' : 'text-slate-500'}`}><i className={`fa-solid ${isSyncing ? 'fa-spinner animate-spin' : 'fa-cloud-arrow-down'}`}></i>{isSyncing ? 'Sincronizando...' : 'Nuvem Ativa'}</button><div className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-2xl border border-slate-800/50"><button onClick={() => setShowProfileEdit(true)} className="group relative"><img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700" alt="av" /><div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><i className="fa-solid fa-pen text-[8px] text-white"></i></div></button><div className="flex-1 overflow-hidden"><p className="text-sm font-bold truncate text-slate-200">{user.name}</p><p className="text-[9px] text-primary font-black uppercase">{isSuperAdmin ? 'Super Admin' : 'Mecânico'}</p></div><button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-400"><i className="fa-solid fa-power-off"></i></button></div></div>
    </div>
  );
};

const ProtectedRoute = ({ children, requiredPermission }: { children: React.ReactNode, requiredPermission?: Permission }) => { const storedUser = localStorage.getItem('lsc_current_user_v4'); if (!storedUser) return <Navigate to="/login" replace />; return <>{children}</>; };

export default App;
