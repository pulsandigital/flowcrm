import { useState, useRef, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, GitMerge, Users, MessageCircle,
  FileText, Workflow, BarChart2, Settings, Zap,
  ChevronLeft, ChevronRight, Smartphone, Plus, ChevronDown,
  Wifi, WifiOff, Loader2,
} from 'lucide-react';
import type { Page, WhatsAppChannel } from '../types';
import { channelsDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';

interface Props {
  current: Page;
  onNavigate: (page: Page, channelId?: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  selectedChannelId: string | null;
}

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: 'dashboard', label: 'Dashboard',      icon: <LayoutDashboard size={20} /> },
  { id: 'pipeline',  label: 'Pipeline',        icon: <GitMerge size={20} /> },
  { id: 'contacts',  label: 'Contatos',        icon: <Users size={20} /> },
  { id: 'chat',      label: 'Atendimento',     icon: <MessageCircle size={20} />, badge: 6 },
  { id: 'flow',      label: 'Fluxo de Msgs',   icon: <Workflow size={20} /> },
  { id: 'templates', label: 'Templates',       icon: <FileText size={20} /> },
  { id: 'reports',   label: 'Relatórios',      icon: <BarChart2 size={20} /> },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  connected:    <Wifi size={11} className="text-emerald-500" />,
  disconnected: <WifiOff size={11} className="text-gray-400" />,
  connecting:   <Loader2 size={11} className="text-amber-400 animate-spin" />,
};

const STATUS_DOT: Record<string, string> = {
  connected:    'bg-emerald-500',
  disconnected: 'bg-gray-300',
  connecting:   'bg-amber-400 animate-pulse',
};

export default function Sidebar({ current, onNavigate, collapsed, onToggle, selectedChannelId }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [channels, setChannels] = useState<WhatsAppChannel[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadChannels = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const data = await channelsDb.getAll();
    setChannels(data);
  }, []);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  // Refresh channels when dropdown opens
  useEffect(() => {
    if (dropdownOpen) loadChannels();
  }, [dropdownOpen, loadChannels]);

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeChannel = selectedChannelId
    ? channels.find(c => c.id === selectedChannelId)
    : null;

  return (
    <aside className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} min-h-screen relative`}>

      {/* ── LOGO + FUNNEL DROPDOWN ────────────────────────────────────────── */}
      <div className="relative border-b border-gray-100" ref={dropdownRef}>
        <div className="flex items-center justify-between px-4 py-4">
          {/* clickable logo area → opens dropdown */}
          <button
            onClick={() => !collapsed && setDropdownOpen(o => !o)}
            className={`flex items-center gap-2 min-w-0 ${!collapsed ? 'hover:opacity-80 transition-opacity' : ''}`}
            title={collapsed ? 'FlowCRM' : undefined}
          >
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 text-left">
                  <p className="font-bold text-gray-900 text-sm leading-tight tracking-tight">FlowCRM</p>
                  {activeChannel ? (
                    <p className="text-xs truncate max-w-[100px]" style={{ color: activeChannel.color }}>
                      {activeChannel.name}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 truncate">Todos os funis</p>
                  )}
                </div>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>

          {/* collapse toggle */}
          {!collapsed && (
            <button
              onClick={onToggle}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 ml-1"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* ── DROPDOWN ──────────────────────────────────────────────────────── */}
        {dropdownOpen && !collapsed && (
          <div className="absolute top-full left-3 right-3 z-50 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
            {/* header */}
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Funis WhatsApp</span>
              <button
                onClick={() => { setDropdownOpen(false); onNavigate('channels'); }}
                className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title="Gerenciar números"
              >
                <Plus size={13} />
              </button>
            </div>

            {/* "Todos" option */}
            <button
              onClick={() => { setDropdownOpen(false); onNavigate('pipeline', undefined); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${
                !selectedChannelId ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
              <span className="flex-1 truncate">Todos os funis</span>
              <span className="text-xs text-gray-400">{channels.length}</span>
            </button>

            {/* channels */}
            <div className="max-h-56 overflow-y-auto">
              {channels.length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-3 text-center">Nenhum funil. Clique em + para adicionar.</p>
              )}
              {channels.map(ch => {
                const isActive = selectedChannelId === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => { setDropdownOpen(false); onNavigate('pipeline', ch.id); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      isActive ? 'font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={isActive ? { backgroundColor: ch.color + '12', color: ch.color } : {}}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white ${STATUS_DOT[ch.status]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">{ch.name}</p>
                      <p className="text-xs text-gray-400 truncate">{ch.number}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      {STATUS_ICON[ch.status]}
                      <button
                        onClick={e => { e.stopPropagation(); setDropdownOpen(false); onNavigate('chat', ch.id); }}
                        className="p-1 text-gray-300 hover:text-primary-600 rounded transition-colors"
                        title="Ver conversas"
                      >
                        <MessageCircle size={12} />
                      </button>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* footer */}
            <div className="border-t border-gray-100">
              <button
                onClick={() => { setDropdownOpen(false); onNavigate('channels'); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <Smartphone size={13} />
                <span>+ Conectar número</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* collapse toggle when collapsed */}
      {collapsed && (
        <button onClick={onToggle} className="p-2 mx-auto mt-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <ChevronRight size={16} />
        </button>
      )}

      {/* ── MAIN NAV ─────────────────────────────────────────────────────────── */}
      <nav className="py-3 space-y-0.5 px-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const active = current === item.id;
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

      {/* ── BOTTOM ───────────────────────────────────────────────────────────── */}
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
