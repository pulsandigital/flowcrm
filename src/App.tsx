import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Contacts from './pages/Contacts';
import Chat from './pages/Chat';
import Templates from './pages/Templates';
import MessageFlow from './pages/MessageFlow';
import Reports from './pages/Reports';
import Channels from './pages/Channels';
import Settings from './pages/Settings';
import type { Page } from './types';
import { Bell, Search, LogOut, Loader2 } from 'lucide-react';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  pipeline: 'Pipeline de Vendas',
  contacts: 'Contatos & Leads',
  chat: 'Atendimento',
  flow: 'Fluxo de Mensagens',
  templates: 'Templates',
  reports: 'Relatórios',
  channels: 'Números de WhatsApp',
  settings: 'Configurações',
};

const DEMO_STORAGE_KEY = 'flowcrm_demo_auth';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = loading
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [chatContactName, setChatContactName] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Demo mode — check localStorage
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      setIsLoggedIn(saved === '1');
      return;
    }

    // Real Supabase auth
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    }).catch(() => setIsLoggedIn(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (p: Page, channelId?: string) => {
    setPage(p);
    if (channelId !== undefined) setSelectedChannelId(channelId);
  };

  const handleLogin = () => setIsLoggedIn(true);

  const handleLogout = async () => {
    if (!isSupabaseConfigured) {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setIsLoggedIn(false);
      return;
    }
    await supabase.auth.signOut();
  };

  // Loading state while checking auth
  if (isLoggedIn === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  // Not logged in → show login page
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />;
      case 'pipeline': return <Pipeline
        selectedChannelId={selectedChannelId}
        onChannelChange={setSelectedChannelId}
        onOpenChat={(contactName, channelId) => {
          setChatContactName(contactName);
          setSelectedChannelId(channelId);
          setPage('chat');
        }}
      />;
      case 'contacts': return <Contacts />;
      case 'chat': return <Chat
        selectedChannelId={selectedChannelId}
        onChannelChange={setSelectedChannelId}
        initialContactName={chatContactName}
        onConversationOpened={() => setChatContactName(null)}
      />;
      case 'templates': return <Templates />;
      case 'flow': return <MessageFlow />;
      case 'reports': return <Reports />;
      case 'channels': return <Channels />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        current={page}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        selectedChannelId={selectedChannelId}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-800">{PAGE_TITLES[page]}</h1>
            {selectedChannelId && (page === 'pipeline' || page === 'chat') && (
              <button
                onClick={() => setSelectedChannelId(null)}
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-full px-2 py-0.5 hover:bg-gray-50 transition-colors"
              >
                ✕ limpar filtro
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"
              />
            </div>
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary-600 rounded-full" />
            </button>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
