import {
  LayoutDashboard, GitMerge, Users, MessageCircle,
  FileText, Workflow, BarChart2, Settings, Zap, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { Page } from '../types';

interface Props {
  current: Page;
  onNavigate: (page: Page) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'pipeline', label: 'Pipeline', icon: <GitMerge size={20} /> },
  { id: 'contacts', label: 'Contatos', icon: <Users size={20} /> },
  { id: 'chat', label: 'Atendimento', icon: <MessageCircle size={20} />, badge: 6 },
  { id: 'flow', label: 'Fluxo de Msgs', icon: <Workflow size={20} /> },
  { id: 'templates', label: 'Templates', icon: <FileText size={20} /> },
  { id: 'reports', label: 'Relatórios', icon: <BarChart2 size={20} /> },
];

export default function Sidebar({ current, onNavigate, collapsed, onToggle }: Props) {
  return (
    <aside
      className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-56'
      } min-h-screen`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">FlowCRM</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
            <Zap size={18} className="text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={`p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${
            collapsed ? 'hidden' : ''
          }`}
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          className="p-2 mx-auto mt-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={active ? 'text-primary-600' : 'text-gray-500'}>{item.icon}</span>
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              {!collapsed && item.badge && item.badge > 0 && (
                <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge && item.badge > 0 && (
                <span className="absolute ml-6 -mt-6 bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings & User */}
      <div className="border-t border-gray-100 p-2 space-y-1">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Configurações' : undefined}
        >
          <Settings size={20} className="text-gray-500" />
          {!collapsed && <span>Configurações</span>}
        </button>
        <div className={`flex items-center gap-3 px-3 py-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
            AL
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">Ana Lima</p>
              <p className="text-xs text-gray-500 truncate">Administradora</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
