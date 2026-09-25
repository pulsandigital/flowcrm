import { useState, useEffect } from 'react';

// Captura o hash antes do Supabase JS processa-lo e limpa-lo
const _initialHash = typeof window !== 'undefined' ? window.location.hash : '';
const _hashParams  = new URLSearchParams(_initialHash.replace(/^#/, ''));
const _hashType    = _hashParams.get('type');
const _hashError   = _hashParams.get('error_description');
const _hashErrorCode = _hashParams.get('error_code');
const getInitialAuthError = () => {
  if (_hashErrorCode === 'otp_expired') {
    return 'O link de recuperação expirou. Solicite um novo link abaixo.';
  }
  return _hashError ? decodeURIComponent(_hashError.replace(/\+/g, ' ')) : null;
};
import { Link, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAppStore } from './store/useAppStore';
import { useRealtime } from './hooks/useRealtime';
import { useLeads } from './hooks/useLeads';
import { usePatients } from './hooks/usePatients';
import { useCurrentProfile } from './hooks/useCurrentProfile';
import Sidebar from './components/Sidebar';
import { Toaster } from './components/ui/toaster';
import Login from './pages/Login';
import LegalPage from './pages/Legal';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Contacts from './pages/Contacts';
import Chat from './pages/Chat';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import {
  Bell, Search, LogOut, Lock, Eye, EyeOff, Zap, HelpCircle, Plug, Shield, UserRound, Users, Moon, Sun,
  Building2, BadgeCheck, Settings as SettingsIcon, FileText, ScrollText
} from 'lucide-react';

/* Lazy-loaded pages for new modules */
import { lazy, Suspense } from 'react';
const Patients       = lazy(() => import('./pages/Patients'));
const PatientProfile = lazy(() => import('./pages/PatientProfile'));
const MedicalRecords = lazy(() => import('./pages/MedicalRecords'));
const CareDocuments  = lazy(() => import('./pages/CareDocuments'));
const CareScales     = lazy(() => import('./pages/CareScales'));
const CareLocations  = lazy(() => import('./pages/CareLocations'));
const InternalChat   = lazy(() => import('./pages/InternalChat'));
const Finance        = lazy(() => import('./pages/Finance'));
const ContentCalendar= lazy(() => import('./pages/Appointments'));
const Campaigns      = lazy(() => import('./pages/Campaigns'));
const NucleusAI      = lazy(() => import('./pages/NucleusAI'));
const Growth         = lazy(() => import('./pages/Growth'));
const Admin          = lazy(() => import('./pages/Admin'));
const Tasks          = lazy(() => import('./pages/Tasks'));
const Channels       = lazy(() => import('./pages/Channels'));
const PatientPortal  = lazy(() => import('./pages/PatientPortal'));
const Integrations   = lazy(() => import('./pages/Integrations'));
const Notifications  = lazy(() => import('./pages/Notifications'));
const Help            = lazy(() => import('./pages/Help'));
const DataImport      = lazy(() => import('./pages/DataImport'));
const ProductionSetup = lazy(() => import('./pages/ProductionSetup'));
const Onboarding      = lazy(() => import('./pages/Onboarding'));
const VideoCall       = lazy(() => import('./pages/VideoCall'));

const PAGE_TITLES: Record<string, string> = {
  '/':                     'Dashboard',
  '/crm/leads':            'Leads',
  '/crm/pipeline':         'Pipeline Comercial',
  '/crm/chat':             'WhatsApp & Atendimento',
  '/crm/channels':         'Canais WhatsApp',
  '/crm/tasks':            'Tarefas',
  '/care/patients':        'Pacientes',
  '/care/records':         'Prontuários',
  '/care/schedule':        'Agenda',
  '/care/documents':       'Documentos clínicos',
  '/care/scales':          'Escalas',
  '/care/locations':       'Locais de atendimento',
  '/care/internal-chat':    'Chat interno',
  '/finance':              'Financeiro',
  '/marketing/campaigns':  'Campanhas',
  '/marketing/growth':     'Growth',
  '/ai':                   'Nucleus AI',
  '/reports':              'Relatórios',
  '/admin':                'Admin',
  '/settings':             'Configurações',
  '/notifications':        'Notificações',
  '/help':                 'Ajuda',
  '/patient-portal':       'Portal do Paciente',
  '/integrations':         'Integrações',
  '/import':               'Importação de dados',
  '/production':           'Produção / White Label',
  '/onboarding':           'Configuração inicial',
  '/care/video-call':      'Chamada Nucleus',
};

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center animate-pulse-soft">
          <Zap size={20} className="text-white" />
        </div>
        <span className="text-sm text-slate-500">Carregando...</span>
      </div>
    </div>
  );
}

/* App Root */
export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [needsPasswordSet, setNeedsPasswordSet] = useState(
    _hashType === 'recovery' || _hashType === 'invite'
  );
  const [authError] = useState<string | null>(getInitialAuthError);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const isResetPasswordPath = location.pathname === '/reset-password';

  useEffect(() => {
    if (_hashErrorCode || _hashError) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    localStorage.removeItem('nucleus_auth');

    let cancelled = false;
    const authTimeout = window.setTimeout(() => {
      if (!cancelled) setIsLoggedIn(false);
    }, 3000);

    const finishAuthCheck = (loggedIn: boolean) => {
      if (cancelled) return;
      window.clearTimeout(authTimeout);
      setIsLoggedIn(loggedIn);
    };

    supabase.auth.getSession()
      .then(({ data }) => finishAuthCheck(!!data.session))
      .catch(() => finishAuthCheck(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') setNeedsPasswordSet(true);
      finishAuthCheck(!!session);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  if (location.pathname === '/politica-de-privacidade') return <LegalPage type="privacy" />;
  if (location.pathname === '/termos-de-uso') return <LegalPage type="terms" />;

  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gradient-nucleus flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <Zap size={28} className="text-white animate-pulse-soft" />
          </div>
          <span className="text-white/60 text-sm">Iniciando Nucleus...</span>
        </div>
      </div>
    );
  }

  if (needsPasswordSet || (isResetPasswordPath && isLoggedIn)) {
    return (
      <SetPassword
        onDone={async () => {
          setNeedsPasswordSet(false);
          window.location.hash = '';
          await supabase.auth.signOut();
          setIsLoggedIn(false);
          setAuthNotice('Senha atualizada com sucesso. Entre novamente para continuar.');
          navigate('/', { replace: true });
        }}
      />
    );
  }

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={(portalMode) => {
          setIsLoggedIn(true);
          if (portalMode === 'patient') navigate('/patient-portal', { replace: true });
        }}
        errorMessage={authError}
        successMessage={authNotice}
      />
    );
  }

  return <AppLayout onLogout={() => setIsLoggedIn(false)} />;
}

/* Authenticated Layout */
function AppLayout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const [isPatientAccount, setIsPatientAccount] = useState<boolean | null>(
    location.pathname === '/patient-portal' ? true : null,
  );

  useEffect(() => {
    if (location.pathname === '/patient-portal') {
      setIsPatientAccount(true);
      return;
    }

    let active = true;
    supabase.rpc('is_patient_portal_user').then(({ data, error }) => {
      if (active) setIsPatientAccount(!error && data === true);
    });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (location.pathname === '/patient-portal') {
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <PatientPortal />
        </Suspense>
        <Toaster />
      </>
    );
  }

  if (isPatientAccount === null) return <PageLoader />;
  if (isPatientAccount) return <Navigate to="/patient-portal" replace />;

  return <ProfessionalAppLayout onLogout={onLogout} />;
}

function ProfessionalAppLayout({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed } = useAppStore();
  const { data: currentProfile, isLoading: loadingCurrentProfile } = useCurrentProfile();
  const { data: leads = [] } = useLeads();
  const { data: patients = [] } = usePatients();
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nucleus_color_scheme') === 'dark');

  useRealtime();

  useEffect(() => {
    const mode = darkMode ? 'dark' : 'light';
    localStorage.setItem('nucleus_color_scheme', mode);
    document.documentElement.dataset.appTheme = mode;
    window.dispatchEvent(new CustomEvent('nucleus:color-scheme-changed', { detail: mode }));
  }, [darkMode]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname, location.search]);

  const onboardingCompleted = currentProfile?.clinics?.onboarding_completed !== false;
  if (loadingCurrentProfile) {
    return <PageLoader />;
  }

  if (!onboardingCompleted || location.pathname === '/onboarding') {
    return (
      <>
        <Suspense fallback={<PageLoader />}>
          <Onboarding />
        </Suspense>
        <Toaster />
      </>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const title = PAGE_TITLES[location.pathname] ?? 'Nucleus';
  const professionalName = currentProfile?.full_name?.trim() || currentProfile?.email?.split('@')[0] || 'Usuário';
  const userInitials = professionalName
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const roleLabel = currentProfile?.role === 'admin'
    ? 'Administrador'
    : currentProfile?.role === 'professional'
      ? 'Profissional'
      : currentProfile?.role || 'Usuário';
  const clinicName = currentProfile?.clinics?.brand_name || currentProfile?.clinics?.name || 'Minha instituição';
  const planLabel = currentProfile?.clinics?.subscription_status === 'active'
    ? 'Plano ativo'
    : currentProfile?.clinics?.subscription_status === 'trialing'
      ? 'Plano teste'
      : 'Plano Basic';
  const avatarUrl = (currentProfile as any)?.avatar_url || (currentProfile?.clinics as any)?.professional_photo_url || '';
  const goMenu = (path: string) => {
    setUserMenuOpen(false);
    navigate(path);
  };

  /* Module badge colors */
  const getModuleBadge = (path: string) => {
    if (path.startsWith('/crm'))       return { label: 'CRM',       cls: 'bg-primary-50 text-primary-700' };
    if (path.startsWith('/care'))      return { label: 'Care',      cls: 'bg-teal-50 text-teal-700' };
    if (path.startsWith('/finance'))   return { label: 'Finance',   cls: 'bg-gold-50 text-gold-700' };
    if (path.startsWith('/marketing')) return { label: 'Marketing', cls: 'bg-violet-50 text-violet-700' };
    if (path.startsWith('/ai'))        return { label: 'AI',        cls: 'bg-nucleus-50 text-nucleus-700' };
    return null;
  };
  const badge = getModuleBadge(location.pathname);
  const searchTerm = globalSearch.trim().toLowerCase();
  const leadResults = searchTerm
    ? leads.filter((lead: any) =>
        [lead.name, lead.phone, lead.email, lead.city, lead.specialty, lead.origin]
          .some(value => String(value ?? '').toLowerCase().includes(searchTerm))
      ).slice(0, 5)
    : [];
  const patientResults = searchTerm
    ? patients.filter((patient: any) =>
        [patient.name, patient.phone, patient.email, patient.cpf, patient.city, patient.specialty]
          .some(value => String(value ?? '').toLowerCase().includes(searchTerm))
      ).slice(0, 5)
    : [];
  const hasSearchResults = leadResults.length > 0 || patientResults.length > 0;

  const openResult = (path: string) => {
    setSearchOpen(false);
    setGlobalSearch('');
    navigate(path);
  };

  return (
    <div translate="no" className={`notranslate flex h-screen overflow-hidden bg-slate-50 ${darkMode ? 'nucleus-dark' : ''}`}>
      <Sidebar />

      <div translate="no" className="notranslate flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-100 px-6 flex items-center justify-between flex-shrink-0"
          style={{ height: 'var(--header-height)' }}>
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900">{title}</h1>
                {badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
                    Nucleus {badge.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar pacientes, leads..."
                value={globalSearch}
                onChange={event => {
                  setGlobalSearch(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={event => {
                  if (event.key === 'Escape') setSearchOpen(false);
                  if (event.key === 'Enter' && (patientResults[0] || leadResults[0])) {
                    const firstPatient = patientResults[0] as any;
                    const firstLead = leadResults[0] as any;
                    openResult(firstPatient ? `/care/patients/${firstPatient.id}` : `/crm/leads`);
                  }
                }}
                className="pl-8 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  w-52 placeholder-slate-400 text-slate-700 transition-all"
              />
              {searchOpen && searchTerm && (
                <div className="absolute right-0 top-11 z-50 w-[360px] rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
                  {hasSearchResults ? (
                    <div className="max-h-[420px] overflow-y-auto">
                      {patientResults.length > 0 && (
                        <div className="mb-2">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Pacientes</div>
                          {patientResults.map((patient: any) => (
                            <Link
                              key={patient.id}
                              to={`/care/patients/${patient.id}`}
                              onClick={() => {
                                setSearchOpen(false);
                                setGlobalSearch('');
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                                <UserRound size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-800">{patient.name}</div>
                                <div className="truncate text-xs text-slate-500">{patient.phone || patient.email || patient.specialty || 'Paciente'}</div>
                              </div>
                              <span className="text-[10px] font-semibold text-teal-600">Ficha</span>
                            </Link>
                          ))}
                        </div>
                      )}
                      {leadResults.length > 0 && (
                        <div>
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Leads</div>
                          {leadResults.map((lead: any) => (
                            <Link
                              key={lead.id}
                              to={`/crm/leads?lead=${lead.id}`}
                              onClick={() => {
                                setSearchOpen(false);
                                setGlobalSearch('');
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                                <Users size={15} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-800">{lead.name}</div>
                                <div className="truncate text-xs text-slate-500">{lead.phone || lead.origin || lead.status || 'Lead'}</div>
                              </div>
                              <span className="text-[10px] font-semibold text-primary-600">Leads</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-3 py-6 text-center text-sm text-slate-500">Nenhum paciente ou lead encontrado.</div>
                  )}
                </div>
              )}
            </div>

            {/* Header shortcuts */}
            <button
              onClick={() => navigate('/notifications')}
              className={`relative z-10 flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${location.pathname === '/notifications' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              title="Notificações"
            >
              <Bell size={17} />
              <span className="hidden lg:inline">Notificações</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>

            <button
              onClick={() => navigate('/integrations')}
              className={`relative z-10 flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${location.pathname === '/integrations' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              title="Integrações"
            >
              <Plug size={17} />
              <span className="hidden lg:inline">Integrações</span>
            </button>

            <button
              onClick={() => navigate('/admin')}
              className={`relative z-10 flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${location.pathname === '/admin' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              title="Admin"
            >
              <Shield size={17} />
              <span className="hidden lg:inline">Admin</span>
            </button>

            {/* Help */}
            <button
              onClick={() => navigate('/help')}
              className={`relative z-10 flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${location.pathname === '/help' ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              title="Ajuda"
            >
              <HelpCircle size={17} />
              <span className="hidden lg:inline">Ajuda</span>
            </button>

            <button
              onClick={() => setDarkMode(value => !value)}
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title={darkMode ? 'Usar tema claro' : 'Usar tema escuro'}
              aria-label={darkMode ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {/* Divider */}
            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(value => !value)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                title="Menu do usuário"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={professionalName} className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-blue flex items-center justify-center text-white text-xs font-bold">
                    {userInitials || 'U'}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">{professionalName}</div>
                  <div className="text-[10px] text-slate-400">{roleLabel}</div>
                </div>
              </button>

              {userMenuOpen && (
                <>
                  <button
                    type="button"
                    aria-label="Fechar menu do usuário"
                    className="fixed inset-0 z-40 cursor-default bg-transparent"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    translate="no"
                    className="notranslate absolute right-0 top-12 z-50 grid w-[520px] max-w-[calc(100vw-2rem)] grid-cols-[210px_1fr] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                    role="menu"
                  >
                    <div className="space-y-1 border-r border-slate-200 p-4">
                      <button onClick={() => goMenu('/settings?tab=profile')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
                        <UserRound size={18} /> Meu usuário
                      </button>
                      <button onClick={() => goMenu('/settings?tab=general')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
                        <Building2 size={18} /> Minha instituição
                      </button>
                      <button onClick={() => goMenu('/settings')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">
                        <SettingsIcon size={18} /> Configurações
                      </button>

                      <div className="pt-4 text-sm font-bold text-teal-700">Info. da versão</div>
                      <button onClick={() => goMenu('/settings?tab=privacy')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50">
                        <ScrollText size={17} /> Termos de uso
                      </button>
                      <button onClick={() => goMenu('/settings?tab=privacy')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50">
                        <FileText size={17} /> Política de privacidade
                      </button>
                    </div>

                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={professionalName} className="mb-4 h-24 w-24 rounded-full object-cover" />
                      ) : (
                        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-teal-700 text-3xl font-bold text-white">
                          {userInitials || 'U'}
                        </div>
                      )}
                      <div className="max-w-[240px] text-base font-medium leading-snug text-slate-800">{professionalName}</div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                        <Building2 size={13} />
                        <span className="truncate">{clinicName}</span>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-500 px-4 py-2 text-sm font-bold text-emerald-700">
                        <BadgeCheck size={17} /> {planLabel}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-800"
                      >
                        <LogOut size={18} /> Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto animate-fade-in">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Core */}
              <Route path="/"           element={<Dashboard />} />
              <Route path="/reports"    element={<Reports />} />
              <Route path="/settings"   element={<Settings />} />

              {/* CRM */}
              <Route path="/crm/leads"    element={<Contacts />} />
              <Route path="/crm/pipeline" element={<Pipeline />} />
              <Route path="/crm/chat"     element={<Chat />} />
              <Route path="/crm/channels" element={<Channels />} />
              <Route path="/crm/tasks"    element={<Tasks />} />

              {/* Care */}
              <Route path="/care/patients"  element={<Patients />} />
              <Route path="/care/patients/:patientId" element={<PatientProfile />} />
              <Route path="/care/records"   element={<MedicalRecords />} />
              <Route path="/care/schedule"  element={<ContentCalendar />} />
              <Route path="/care/documents" element={<CareDocuments />} />
              <Route path="/care/scales"    element={<CareScales />} />
              <Route path="/care/locations" element={<CareLocations />} />
              <Route path="/care/internal-chat" element={<InternalChat />} />
              <Route path="/care/video-call/:appointmentId" element={<VideoCall />} />

              {/* Finance */}
              <Route path="/finance" element={<Finance />} />
              <Route path="/finance/bank-accounts" element={<Finance />} />
              <Route path="/finance/receivable" element={<Finance />} />
              <Route path="/finance/payable" element={<Finance />} />

              {/* Marketing */}
              <Route path="/marketing/calendar"  element={<Navigate to="/care/schedule" replace />} />
              <Route path="/marketing/campaigns" element={<Campaigns />} />
              <Route path="/marketing/growth"    element={<Growth />} />

              {/* Intelligence */}
              <Route path="/ai"     element={<NucleusAI />} />
              <Route path="/growth" element={<Navigate to="/marketing/growth" replace />} />

              {/* Admin */}
              <Route path="/admin" element={<Admin />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/help" element={<Help />} />

              {/* Phase 2 new pages */}
              <Route path="/patient-portal" element={<PatientPortal />} />
              <Route path="/integrations"   element={<Integrations />} />
              <Route path="/import"         element={<DataImport />} />
              <Route path="/production"     element={<ProductionSetup />} />
              <Route path="/onboarding"     element={<Onboarding />} />

              {/* Redirects from old paths */}
              <Route path="/pipeline"    element={<Navigate to="/crm/pipeline" replace />} />
              <Route path="/contacts"    element={<Navigate to="/crm/leads" replace />} />
              <Route path="/chat"        element={<Navigate to="/crm/chat" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <Toaster />
    </div>
  );
}

/* Set Password Screen */
function SetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError('Erro ao definir senha. Tente novamente.'); setLoading(false); return; }
    setLoading(false);
    onDone();
  };

  return (
    <div className="min-h-screen bg-gradient-nucleus flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-900/30">
              <Zap size={24} className="text-white" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Defina sua senha</h1>
          <p className="text-sm text-slate-500 mt-1">Crie uma senha segura para acessar o Nucleus</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="label">Nova senha</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" required
                className="input pl-10 pr-10" />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirmar senha</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a senha" required
                className="input pl-10" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary w-full justify-center py-3 mt-2 text-sm">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Definir senha e entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
