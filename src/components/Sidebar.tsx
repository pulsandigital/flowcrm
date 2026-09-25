import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Kanban,
  Calendar,
  FileText,
  DollarSign,
  Landmark,
  Megaphone,
  BarChart3,
  Sparkles,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  ClipboardList,
  FileSignature,
  Zap,
  Phone,
  Building2,
  Database,
  Rocket,
} from 'lucide-react';
import { getBrandSettings, type BrandSettings } from '../lib/branding';
import { useCurrentProfile } from '../hooks/useCurrentProfile';

/* Navigation Structure */
const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { path: '/',        icon: LayoutDashboard, label: 'Dashboard',   exact: true },
    ],
  },
  {
    label: 'Nucleus CRM',
    items: [
      { path: '/crm/leads',    icon: Users,        label: 'Leads' },
      { path: '/crm/pipeline', icon: Kanban,       label: 'Pipeline' },
      { path: '/crm/chat',     icon: MessageSquare, label: 'WhatsApp' },
      { path: '/crm/channels', icon: Phone,         label: 'Canais' },
      { path: '/crm/tasks',    icon: ClipboardList, label: 'Tarefas' },
    ],
  },
  {
    label: 'Nucleus Care',
    items: [
      { path: '/care/patients',  icon: Activity,   label: 'Pacientes' },
      { path: '/care/records',   icon: FileText,   label: 'Prontuários' },
      { path: '/care/schedule',  icon: Calendar,   label: 'Agenda' },
      { path: '/care/documents', icon: FileSignature, label: 'Documentos' },
      { path: '/care/scales',    icon: ClipboardList, label: 'Escalas' },
      { path: '/care/locations', icon: Building2, label: 'Locais' },
      { path: '/care/internal-chat', icon: MessageSquare, label: 'Chat interno' },
    ],
  },
  {
    label: 'Nucleus Finance',
    items: [
      { path: '/finance', icon: DollarSign, label: 'Financeiro' },
    ],
  },
  {
    label: 'Nucleus Marketing',
    items: [
      { path: '/marketing/campaigns',  icon: Megaphone, label: 'Campanhas' },
      { path: '/marketing/growth',     icon: TrendingUp, label: 'Growth' },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { path: '/ai',      icon: Sparkles,   label: 'Nucleus AI' },
      { path: '/reports', icon: BarChart3,  label: 'Relatórios' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { path: '/production', icon: Rocket, label: 'Produção' },
      { path: '/import', icon: Database, label: 'Importação' },
    ],
  },
];

/* Logo Component */
function NucleusLogo({ collapsed }: { collapsed: boolean }) {
  const [brand, setBrand] = useState<BrandSettings>(() => getBrandSettings());
  const { data: currentProfile } = useCurrentProfile();

  useEffect(() => {
    const update = () => setBrand(getBrandSettings());
    window.addEventListener('nucleus:brand-settings-updated', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('nucleus:brand-settings-updated', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  const clinic = currentProfile?.clinics;
  const businessName = clinic?.brand_name || clinic?.name || brand.businessName || 'Nucleus';
  const subtitle = brand.subtitle || currentProfile?.specialty || clinic?.default_specialty || 'Plataforma de saúde';
  const logoUrl = clinic?.logo_url || brand.logoUrl;

  return (
    <div className={`flex items-center gap-3 px-3 py-1 ${collapsed ? 'justify-center' : ''}`}>
      {logoUrl ? (
        <img src={logoUrl} alt={businessName} className="h-9 w-9 flex-shrink-0 rounded-xl border border-white/15 object-cover shadow-lg shadow-primary-900/30" />
      ) : (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-900/40 flex-shrink-0">
          <Zap size={18} className="text-white" />
        </div>
      )}
      {!collapsed && (
        <div className="min-w-0 animate-fade-in">
          <span className="block truncate text-lg font-bold text-white tracking-tight">{businessName}</span>
          <div className="truncate text-[10px] text-white/40 font-medium tracking-widest -mt-0.5">{subtitle}</div>
        </div>
      )}
    </div>
  );
}

/* Nav Item */
function NavItem({
  item,
  collapsed,
  exact = false,
}: {
  item: { path: string; icon: React.ElementType; label: string };
  collapsed: boolean;
  exact?: boolean;
}) {
  const Icon = item.icon;
  const location = useLocation();
  const isActive = exact
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200 cursor-pointer relative group
        ${isActive
          ? 'bg-white/15 text-white shadow-sm'
          : 'text-white/60 hover:text-white hover:bg-white/8'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-400 rounded-full" />
      )}
      <Icon size={17} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`} />
      {!collapsed && <span>{item.label}</span>}
      {/* Tooltip for collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg
          opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg
          transition-opacity duration-150">
          {item.label}
        </div>
      )}
    </NavLink>
  );
}

/* Sidebar */
export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed } = useAppStore();

  return (
    <aside
      translate="no"
      className={`notranslate relative flex flex-col h-screen flex-shrink-0 transition-all duration-300 ease-in-out
        bg-gradient-nucleus border-r border-white/5 overflow-hidden`}
      style={{ width: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }}
    >
      {/* Mesh overlay */}
      <div className="absolute inset-0 bg-mesh pointer-events-none opacity-40" />

      {/* Content */}
      <div className="relative flex flex-col h-full z-10">
        {/* Logo */}
        <div className="px-3 py-5 border-b border-white/8">
          <NucleusLogo collapsed={sidebarCollapsed} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar space-y-0.5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <div className="sidebar-section-label">{section.label}</div>
              )}
              {sidebarCollapsed && <div className="h-3" />}
              {section.items.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  collapsed={sidebarCollapsed}
                  exact={'exact' in item && (item as any).exact}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-800 border border-white/10
            rounded-full flex items-center justify-center text-white/60 hover:text-white
            hover:bg-slate-700 transition-all duration-200 shadow-md z-20"
          title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {sidebarCollapsed
            ? <ChevronRight size={13} />
            : <ChevronLeft size={13} />
          }
        </button>
      </div>
    </aside>
  );
}
