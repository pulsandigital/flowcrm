import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Pipeline from './pages/Pipeline';
import Contacts from './pages/Contacts';
import Chat from './pages/Chat';
import Templates from './pages/Templates';
import MessageFlow from './pages/MessageFlow';
import Reports from './pages/Reports';
import type { Page } from './types';
import { Bell, Search } from 'lucide-react';

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  pipeline: 'Pipeline de Vendas',
  contacts: 'Contatos & Leads',
  chat: 'Atendimento',
  flow: 'Fluxo de Mensagens',
  templates: 'Templates',
  reports: 'Relatórios',
  settings: 'Configurações',
};

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={setPage} />;
      case 'pipeline': return <Pipeline />;
      case 'contacts': return <Contacts />;
      case 'chat': return <Chat />;
      case 'templates': return <Templates />;
      case 'flow': return <MessageFlow />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      default: return <Dashboard onNavigate={setPage} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        current={page}
        onNavigate={setPage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-semibold text-gray-800">{PAGE_TITLES[page]}</h1>
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

function Settings() {
  return (
    <div className="p-8 max-w-2xl">
      <p className="text-gray-500">Configurações em breve...</p>
    </div>
  );
}
