import {
  LayoutDashboard, GitMerge, Users, MessageCircle,
  FileText, Workflow, BarChart2, Settings, Zap,
  ChevronLeft, ChevronRight, Smartphone, Plus,
} from 'lucide-react';
import type { Page } from '../types';
import { whatsappChannels } from '../data/mockData';

interface Props {
  current: Page;
  onNavigate: (page: Page, channelId?: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  selectedChannelId: string | null;
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

const STATUS_DOT: Record<string, string> = {
  connected: 'bg-emerald-500',
  disconnected: 'bg-gray-300',
  connecting: 'bg-amber-400 animate-pulse',
};

export default function Sidebar({ current, onNavigate, collapsed, onToggle, selectedChannelId }: Props) {
  return (
    <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} min-h-screen`}>
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
        {!collapsed && (
          <button onClick={onToggle} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={onToggle} className="p-2 mx-auto mt-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <ChevronRight size={16} />
        </button>
      )}

      {/* Main Nav */}
      <nav className="py-3 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const active = current === item.id && !selectedChannelId;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id, undefined)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
            </button>
          );
        })}
      </nav>

      {/* WhatsApp Channels Section */}
      {!collapsed && (
        <div className="px-2 mt-2 flex-1 overflow-y-auto">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Funis WhatsApp</span>
            <button
              onClick={() => onNavigate('channels')}
              className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
              title="Gerenciar números"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-0.5">
            {/* "Todos" option */}
            <button
              onClick={() => { onNavigate('pipeline', undefined); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                (current === 'pipeline' || current === 'chat') && !selectedChannelId
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300 flex-shrink-0" />
              <span className="truncate">Todos os funis</span>
            </button>

            {whatsappChannels.map(ch => {
              const isSelected = selectedChannelId === ch.id && (current === 'pipeline' || current === 'chat');
              return (
                <button
                  key={ch.id}
                  onClick={() => onNavigate('pipeline', ch.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group ${
                    isSelected ? 'text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  style={isSelected ? { backgroundColor: ch.color + '18' } : {}}
                >
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: ch.color }}
                    />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${STATUS_DOT[ch.status]}`} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate text-sm">{ch.name}</p>
                    <p className="text-xs text-gray-400 truncate">{ch.number}</p>
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); onNavigate('chat', ch.id); }}
                      className="p-1 text-gray-400 hover:text-primary-600 rounded"
                      title="Ver conversas"
                    >
                      <MessageCircle size={12} />
                    </button>
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => onNavigate('channels')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Smartphone size={14} />
              <span>+ Conectar número</span>
            </button>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex-1 py-2 px-2 space-y-1">
          {whatsappChannels.map(ch => (
            <button
              key={ch.id}
              onClick={() => onNavigate('pipeline', ch.id)}
              title={`${ch.name} · ${ch.number}`}
              className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="relative">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ch.color }} />
                <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${STATUS_DOT[ch.status]}`} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Settings & User */}
      <div className="border-t border-gray-100 p-2 space-y-1 flex-shrink-0">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${collapsed ? 'justify-center' : ''}`}
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
