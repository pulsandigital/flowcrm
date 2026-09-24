import { ChangeEvent, useState, useEffect, useCallback } from 'react';
import {
  Users, Zap, MessageSquare, FileText, Settings as SettingsIcon,
  Bot, Link2, CheckCircle, AlertCircle, ChevronRight, Plus,
  Trash2, Edit3, Shield, Bell, Palette, Globe, Key, Mail,
  Instagram, Phone, ToggleLeft, ToggleRight, ExternalLink,
  UserRound, Building2, Briefcase, Stethoscope, CalendarClock,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getBrandSettings, saveBrandSettings, type BrandSettings } from '../lib/branding';
import { applyCustomPrimaryColor } from '../lib/theme';

type SettingsTab = 'hub' | 'profile' | 'integrations' | 'users' | 'professionals' | 'services' | 'templates' | 'preconsultations' | 'tools' | 'privacy' | 'general';

interface NotificationSettings {
  newLead: boolean;
  newMessage: boolean;
  dealWon: boolean;
  dailyReport: boolean;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'coming_soon';
  category: 'messaging' | 'ads' | 'analytics' | 'tools';
  fieldLabel?: string;
  fieldPlaceholder?: string;
}

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'viewer';
  status: 'active' | 'inactive';
  avatar: string;
  createdAt: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Conecte números via Evolution API, Z-API ou WPPConnect',
    icon: <Phone size={24} className="text-emerald-600" />,
    status: 'connected',
    category: 'messaging',
  },
  {
    id: 'instagram',
    name: 'Instagram Direct',
    description: 'Receba e envie DMs direto na plataforma',
    icon: <Instagram size={24} className="text-pink-600" />,
    status: 'coming_soon',
    category: 'messaging',
  },
  {
    id: 'email',
    name: 'E-mail (SMTP/IMAP)',
    description: 'Integre seu e-mail para enviar e receber mensagens',
    icon: <Mail size={24} className="text-blue-600" />,
    status: 'disconnected',
    category: 'messaging',
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Capture leads do Facebook e Instagram Ads automaticamente',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-blue-600">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
    ),
    status: 'disconnected',
    category: 'ads',
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Importe leads e rastreie conversões de campanhas Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    status: 'disconnected',
    category: 'ads',
    fieldLabel: 'Customer ID',
    fieldPlaceholder: '123-456-7890',
  },
  // ── Analytics ──────────────────────────────────────────────────────────────
  {
    id: 'ga4',
    name: 'Google Analytics 4',
    description: 'Envie eventos de leads, deals e conversões para o GA4',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#E37400" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path fill="#fff" d="M13.5 7h-3v6.5l3 3V7z"/>
        <path fill="#fff" d="M16.5 10.5h-2V17l2-2v-4.5z"/>
        <path fill="#fff" d="M10.5 13.5h-2V17l2-2v-1.5z"/>
      </svg>
    ),
    status: 'disconnected',
    category: 'analytics',
    fieldLabel: 'Measurement ID',
    fieldPlaceholder: 'G-XXXXXXXXXX',
  },
  {
    id: 'gtm',
    name: 'Google Tag Manager',
    description: 'Dispare tags e eventos via GTM sem alterar o código',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <rect x="2" y="2" width="20" height="20" rx="3" fill="#8AB4F8"/>
        <path fill="#fff" d="M12 5l-5 7h3.5v7h3V12H17L12 5z"/>
      </svg>
    ),
    status: 'disconnected',
    category: 'analytics',
    fieldLabel: 'Container ID',
    fieldPlaceholder: 'GTM-XXXXXXX',
  },
  {
    id: 'google_analytics_ua',
    name: 'Google Analytics (Universal)',
    description: 'Compatibilidade com propriedades UA legadas',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#F9AB00" d="M22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10z"/>
        <path fill="#fff" d="M9 16V8l3 4 3-4v8"/>
      </svg>
    ),
    status: 'disconnected',
    category: 'analytics',
    fieldLabel: 'Tracking ID',
    fieldPlaceholder: 'UA-XXXXXXXXX-X',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Conecte com milhares de apps via automação',
    icon: <Zap size={24} className="text-orange-500" />,
    status: 'coming_soon',
    category: 'tools',
  },
  {
    id: 'webhook',
    name: 'Webhooks',
    description: 'Envie eventos em tempo real para qualquer URL',
    icon: <Link2 size={24} className="text-gray-600" />,
    status: 'disconnected',
    category: 'tools',
  },
  {
    id: 'openai',
    name: 'OpenAI / ChatGPT',
    description: 'Ative respostas automáticas com inteligência artificial',
    icon: <Bot size={24} className="text-gray-800" />,
    status: 'disconnected',
    category: 'tools',
  },
];


const ROLE_LABELS: Record<TeamUser['role'], string> = {
  admin: 'Administrador',
  agent: 'Agente',
  viewer: 'Visualizador',
};

const ROLE_COLORS: Record<TeamUser['role'], string> = {
  admin: 'bg-purple-100 text-purple-700',
  agent: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
};

export default function Settings() {
  const params = new URLSearchParams(window.location.search);
  const clinicFocus = params.get('focus') === 'clinic';
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    const tabFromUrl = params.get('tab') as SettingsTab | null;
    if (tabFromUrl && ['hub', 'profile', 'integrations', 'users', 'professionals', 'services', 'templates', 'preconsultations', 'tools', 'privacy', 'general'].includes(tabFromUrl)) return tabFromUrl;
    const requested = sessionStorage.getItem('nucleus_settings_tab') as SettingsTab | null;
    sessionStorage.removeItem('nucleus_settings_tab');
    return requested || 'hub';
  });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamUser['role']>('agent');
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);

  const loadUsers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setTeamUsers(data.map((u: any) => ({
        id: u.id,
        name: u.full_name || u.email?.split('@')[0] || 'Usuário',
        email: u.email || '',
        role: u.role || 'agent',
        status: u.status || 'active',
        avatar: (u.full_name || u.email || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        createdAt: u.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      })));
    } else {
      // Fallback: show current logged-in user
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const u = userData.user;
        const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Usuário';
        setTeamUsers([{
          id: u.id,
          name,
          email: u.email || '',
          role: 'admin',
          status: 'active',
          avatar: name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
          createdAt: u.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        }]);
      }
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('cfg_webhook') ?? '');
  const [openAiKey, setOpenAiKey] = useState(() => localStorage.getItem('cfg_openai') ?? '');
  const [notifications, setNotifications] = useState<NotificationSettings>(() => {
    try { return JSON.parse(localStorage.getItem('cfg_notif') ?? '{}') as NotificationSettings; } catch { return { newLead: true, newMessage: true, dealWon: true, dailyReport: false }; }
  });
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(() => getBrandSettings());
  const [generalSettings, setGeneralSettings] = useState<{ businessName: string; timezone: string; language: string; businessHours: boolean; primaryColor: string }>(() => {
    const defaults = { businessName: 'Minha Empresa', timezone: 'America/Sao_Paulo', language: 'pt-BR', businessHours: true, primaryColor: '#7C3AED' };
    try {
      const saved = { ...defaults, ...JSON.parse(localStorage.getItem('cfg_general') ?? '{}') };
      // Apply saved color on load
      if (saved.primaryColor) applyCustomPrimaryColor(saved.primaryColor);
      return saved;
    } catch { return defaults; }
  });

  // Persist to localStorage whenever settings change
  useEffect(() => { localStorage.setItem('cfg_webhook', webhookUrl); }, [webhookUrl]);
  useEffect(() => { localStorage.setItem('cfg_openai', openAiKey); }, [openAiKey]);
  useEffect(() => { localStorage.setItem('cfg_notif', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('cfg_general', JSON.stringify(generalSettings)); }, [generalSettings]);

  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'hub', label: 'Configuracoes', icon: <SettingsIcon size={16} /> },
    { id: 'profile', label: 'Meu perfil', icon: <UserRound size={16} /> },
    { id: 'professionals', label: 'Profissionais', icon: <Stethoscope size={16} /> },
    { id: 'services', label: 'Servicos', icon: <Briefcase size={16} /> },
    { id: 'templates', label: 'Modelos', icon: <FileText size={16} /> },
    { id: 'preconsultations', label: 'Pre-consultas', icon: <CalendarClock size={16} /> },
    { id: 'privacy', label: 'Privacidade & Aceites', icon: <Shield size={16} /> },
    { id: 'integrations', label: 'Integrações', icon: <Link2 size={16} /> },
    { id: 'users', label: 'Usuários', icon: <Users size={16} /> },
    { id: 'tools', label: 'Ferramentas', icon: <Bot size={16} /> },
    { id: 'general', label: 'Geral', icon: <SettingsIcon size={16} /> },
  ];

  if (clinicFocus) {
    return (
      <div className="h-full overflow-auto p-6">
        <GeneralTab settings={generalSettings} setSettings={setGeneralSettings} brand={brandSettings} setBrand={setBrandSettings} clinicFocus />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      {false && <div className="w-56 bg-white border-r border-gray-200 flex-shrink-0 p-3 space-y-0.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Configurações</p>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-emerald-600' : 'text-gray-400'}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}

        <div className="pt-2 mt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Plano</p>
          <div className="mx-3 p-3 bg-emerald-50 rounded-lg">
            <p className="text-xs font-semibold text-emerald-700">FlowCRM Pro</p>
            <p className="text-xs text-emerald-600 mt-0.5">{teamUsers.filter(u => u.status === 'active').length} usuários ativos</p>
            <button
              onClick={() => setActiveTab('users')}
              className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1 hover:underline"
            >
              Gerenciar usuários <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>}

      {/* Content */}
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Configuracoes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">Ajustes da plataforma, equipe, privacidade e operacao.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'hub' && <SettingsHub onSelect={setActiveTab} />}
        {activeTab === 'profile' && <ProfileSettings />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'users' && (
          <UsersTab
            users={teamUsers}
            showModal={showInviteModal}
            onShowModal={setShowInviteModal}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
            onReload={loadUsers}
          />
        )}
        {activeTab === 'professionals' && <SimpleSettingsList title="Profissionais" description="Cadastre profissionais, conselho, RQE, especialidade e permissoes de atendimento." items={['Medico', 'Psicologo', 'Nutricionista', 'Fisioterapeuta', 'Odontologo']} />}
        {activeTab === 'services' && <SimpleSettingsList title="Servicos" description="Configure consultas, retornos, pacotes, duracao, valores e modalidade." items={['Primeira consulta', 'Retorno/consulta', 'Consulta online', 'Procedimento', 'Pacote de acompanhamento']} />}
        {activeTab === 'templates' && <SimpleSettingsList title="Modelos de documentos" description="Modelos de atestado, receita, declaracao, solicitacao de exame e guias." items={['Atestado', 'Declaracao de comparecimento', 'Receita/prescricao', 'Solicitacao de exames', 'Guia SP/SADT', 'Guia de consulta']} />}
        {activeTab === 'preconsultations' && <SimpleSettingsList title="Pre-consultas" description="Questionarios enviados antes do atendimento por especialidade e faixa etaria." items={['Pre-consulta de clinica medica', 'Pre-consulta de psiquiatria adulto', 'Pre-consulta de psiquiatria infantil', 'Solicitacao de receitas', 'Solicitacao de documentos medicos']} />}
        {activeTab === 'privacy' && <PrivacyTab />}
        {activeTab === 'tools' && (
          <ToolsTab
            webhookUrl={webhookUrl}
            setWebhookUrl={setWebhookUrl}
            openAiKey={openAiKey}
            setOpenAiKey={setOpenAiKey}
            notifications={notifications}
            setNotifications={setNotifications}
          />
        )}
        {activeTab === 'general' && (
          <GeneralTab settings={generalSettings} setSettings={setGeneralSettings} brand={brandSettings} setBrand={setBrandSettings} />
        )}
      </div>
    </div>
  );
}

function SettingsHub({ onSelect }: { onSelect: (tab: SettingsTab) => void }) {
  const cards: Array<{ tab: SettingsTab; title: string; desc: string; icon: React.ReactNode }> = [
    { tab: 'profile', title: 'Meu perfil', desc: 'Dados da conta, conselho, contato e assinatura.', icon: <UserRound size={24} /> },
    { tab: 'general', title: 'Minha instituicao', desc: 'Nome, marca, white label, cores e horarios.', icon: <Building2 size={24} /> },
    { tab: 'users', title: 'Minha equipe', desc: 'Usuarios, convites e permissoes.', icon: <Users size={24} /> },
    { tab: 'professionals', title: 'Profissionais', desc: 'Cadastro clinico dos profissionais.', icon: <Stethoscope size={24} /> },
    { tab: 'services', title: 'Servicos', desc: 'Tipos de atendimento, valores e duracao.', icon: <Briefcase size={24} /> },
    { tab: 'templates', title: 'Modelos de documentos', desc: 'Receitas, atestados, guias e prescricoes.', icon: <FileText size={24} /> },
    { tab: 'preconsultations', title: 'Pre-consultas', desc: 'Questionarios enviados antes do atendimento.', icon: <CalendarClock size={24} /> },
    { tab: 'privacy', title: 'Privacidade & Aceites', desc: 'Politicas, LGPD, consentimentos e termos.', icon: <Shield size={24} /> },
    { tab: 'integrations', title: 'Integracoes', desc: 'Asaas, Google, WhatsApp, anuncios e IA.', icon: <Link2 size={24} /> },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map(card => (
        <button key={card.tab} type="button" onClick={() => onSelect(card.tab)} className="card p-6 text-left transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">{card.icon}</div>
          <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{card.desc}</p>
        </button>
      ))}
    </div>
  );
}

function ProfileSettings() {
  return (
    <div className="card p-5">
      <h2 className="section-title mb-4">Meu perfil</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <input className="input" placeholder="Nome completo" />
        <input className="input" placeholder="CPF" />
        <input className="input" placeholder="Telefone / WhatsApp" />
        <input className="input" placeholder="E-mail" />
        <select className="input" defaultValue="">
          <option value="" disabled>Conselho regional</option>
          <option>CRM - Medicina</option>
          <option>CRP - Psicologia</option>
          <option>CRN - Nutricao</option>
          <option>CREFITO - Fisioterapia</option>
          <option>CRO - Odontologia</option>
        </select>
        <input className="input" placeholder="Numero do conselho" />
        <input className="input" placeholder="UF do conselho" />
        <input className="input" placeholder="Especialidade" />
        <input className="input" placeholder="RQE" />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <input className="input" placeholder="CEP" />
        <input className="input" placeholder="Endereco profissional" />
        <input className="input" placeholder="Cidade / UF" />
        <input className="input" placeholder="Foto profissional / URL" />
      </div>
      <div className="mt-5 flex justify-end">
        <button className="btn-primary" type="button">Salvar perfil</button>
      </div>
    </div>
  );
}

function SimpleSettingsList({ title, description, items }: { title: string; description: string; items: string[] }) {
  const [search, setSearch] = useState('');
  const filtered = items.filter(item => item.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button className="btn-primary btn-sm" type="button"><Plus size={14} /> Incluir</button>
      </div>
      <div className="border-b border-slate-100 p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar..." />
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {filtered.map(item => (
          <div key={item} className="grid grid-cols-[1fr_160px_120px] gap-4 px-4 py-3 text-sm">
            <span className="font-medium text-slate-800">{item}</span>
            <span className="text-slate-500">Geral</span>
            <span className="badge badge-green">Ativo</span>
          </div>
        ))}
        {filtered.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Nenhum registro encontrado.</div>}
      </div>
    </div>
  );
}

function PrivacyTab() {
  const [showPolicy, setShowPolicy] = useState(false);
  const lastUpdate = 'Agosto/2025 - v1 Nucleus';
  const policySections = [
    ['1. Introducao', 'A Nucleus disponibiliza recursos de CRM, agenda, prontuario, documentos clinicos, financeiro, portal do paciente, teleatendimento, integracoes e inteligencia artificial para apoiar profissionais e instituicoes de saude.'],
    ['2. Dados coletados', 'Podemos tratar dados de cadastro, contato, conselho profissional, dados de pacientes inseridos pelo profissional, dados financeiros, registros de uso, cookies, identificadores tecnicos e dados necessarios para integracoes como Asaas, Google, WhatsApp e ferramentas de IA.'],
    ['3. Dados sensiveis de pacientes', 'Dados de saude sao tratados para execucao das funcionalidades contratadas. O profissional ou instituicao atua como controlador dos dados dos pacientes e deve obter os consentimentos e autorizacoes aplicaveis.'],
    ['4. Finalidade do tratamento', 'Os dados sao usados para cadastro, autenticacao, funcionamento da plataforma, prontuario, agenda, documentos, cobrancas, portal do paciente, suporte, seguranca, auditoria, cumprimento legal e melhoria do servico.'],
    ['5. IA, gravacao, transcricao e sumarizacao', 'Funcionalidades de IA sao opcionais. Quando ativadas, podem processar audio, texto e registros clinicos para gerar transcricoes, resumos, orientacoes e apoio operacional. A Nucleus nao deve usar esses dados para treinamento de modelos sem autorizacao expressa.'],
    ['6. Compartilhamento', 'Dados podem ser compartilhados com operadores necessarios para prestacao do servico, como provedores de pagamento, infraestrutura, comunicacao, agenda, armazenamento, IA e suporte, sempre conforme contrato, confidencialidade e LGPD.'],
    ['7. Conservacao e exclusao', 'Dados sao mantidos pelo periodo necessario para prestacao do servico, cumprimento legal, defesa de direitos e guarda de prontuario conforme legislacao aplicavel. Solicitacoes de exclusao serao avaliadas conforme LGPD e obrigacoes legais.'],
    ['8. Direitos do titular', 'O titular pode solicitar confirmacao de tratamento, acesso, correcao, portabilidade, anonimizacao, bloqueio, exclusao e revogacao de consentimento quando aplicavel.'],
    ['9. Seguranca', 'A plataforma adota controles de acesso, conexao segura, segregacao por clinica, politicas de banco, logs e medidas tecnicas/administrativas para reduzir riscos de acesso indevido.'],
    ['10. Canal de contato', 'O canal oficial de privacidade deve ser configurado pela clinica ou pela Nucleus antes do lancamento comercial, incluindo e-mail de suporte, DPO/responsavel e dados da empresa controladora.'],
  ];

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="section-title flex items-center gap-2"><Shield size={16} /> Politica de privacidade</h2>
            <p className="mt-1 text-sm text-slate-500">Politica geral do sistema e site, adaptada para Nucleus.</p>
          </div>
          <button className="btn-primary btn-sm" type="button" onClick={() => setShowPolicy(!showPolicy)}>
            {showPolicy ? 'Ocultar' : 'Visualizar'}
          </button>
        </div>
        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_220px_160px]">
          <div>
            <div className="font-semibold text-slate-900">Politica de privacidade geral sistema e site</div>
            <div className="text-xs text-slate-500">{lastUpdate}</div>
          </div>
          <div>
            <span className="badge badge-green">Aceito</span>
            <div className="mt-1 text-xs text-slate-400">Controle de aceite habilitado</div>
          </div>
          <div className="text-sm text-slate-500">LGPD e saude</div>
        </div>
      </div>

      {showPolicy && (
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Politica de Privacidade da Plataforma Nucleus</h2>
            <p className="mt-1 text-sm text-slate-500">Ultima atualizacao: {lastUpdate}</p>
          </div>
          <div className="space-y-5">
            {policySections.map(([title, body]) => (
              <section key={title}>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Integrations Tab */
function IntegrationsTab() {
  const [connectedIds, setConnectedIds] = useState<string[]>(['whatsapp']);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const categories = [
    { key: 'messaging',  label: 'Canais de Mensagem' },
    { key: 'ads',        label: 'Plataformas de Anúncio' },
    { key: 'analytics',  label: 'Rastreamento & Analytics' },
    { key: 'tools',      label: 'Ferramentas & Automação' },
  ] as const;

  const toggle = (integration: Integration) => {
    const id = integration.id;
    if (connectedIds.includes(id)) {
      setConnectedIds(prev => prev.filter(x => x !== id));
      setExpandedId(null);
    } else if (integration.fieldLabel) {
      // needs a field → expand inline
      setExpandedId(prev => prev === id ? null : id);
    } else {
      setConnectedIds(prev => [...prev, id]);
    }
  };

  const confirmConnect = (id: string) => {
    setConnectedIds(prev => [...prev, id]);
    setExpandedId(null);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Integrações</h2>
        <p className="text-sm text-gray-500 mt-1">Conecte seus canais, plataformas de anúncios e ferramentas externas.</p>
      </div>

      {categories.map(cat => {
        const items = INTEGRATIONS.filter(i => i.category === cat.key);
        if (items.length === 0) return null;
        return (
          <div key={cat.key}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{cat.label}</h3>
            <div className="space-y-3">
              {items.map(integration => {
                const isConnected = connectedIds.includes(integration.id);
                const isComingSoon = integration.status === 'coming_soon';
                const isExpanded = expandedId === integration.id;
                return (
                  <div
                    key={integration.id}
                    className={`bg-white border rounded-xl transition-all overflow-hidden ${
                      isConnected ? 'border-emerald-200 bg-emerald-50/20' : isExpanded ? 'border-primary-300' : 'border-gray-200'
                    } ${isComingSoon ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                          {integration.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{integration.name}</p>
                            {isComingSoon && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Em breve</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">{integration.description}</p>
                          {isConnected && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <CheckCircle size={12} className="text-emerald-500" />
                              <span className="text-xs text-emerald-600 font-medium">
                                Conectado{integration.fieldLabel && fieldValues[integration.id] ? ` · ${fieldValues[integration.id]}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {!isComingSoon && (
                        <button
                          onClick={() => toggle(integration)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                            isConnected
                              ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                              : isExpanded
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                        >
                          {isConnected ? 'Desconectar' : isExpanded ? 'Cancelar' : 'Conectar'}
                        </button>
                      )}
                    </div>

                    {/* Inline field for ID-based integrations */}
                    {isExpanded && integration.fieldLabel && (
                      <div className="px-4 pb-4 border-t border-primary-100 pt-3 bg-primary-50/30">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">{integration.fieldLabel}</label>
                        <div className="flex gap-2">
                          <input
                            value={fieldValues[integration.id] ?? ''}
                            onChange={e => setFieldValues(prev => ({ ...prev, [integration.id]: e.target.value }))}
                            placeholder={integration.fieldPlaceholder}
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                          />
                          <button
                            onClick={() => confirmConnect(integration.id)}
                            disabled={!fieldValues[integration.id]?.trim()}
                            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            Salvar
                          </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">Cole o ID fornecido pela plataforma.</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Users Tab ─── */
interface UsersTabProps {
  users: TeamUser[];
  showModal: boolean;
  onShowModal: (v: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteRole: TeamUser['role'];
  setInviteRole: (v: TeamUser['role']) => void;
  onReload: () => void;
}

function UsersTab({ users, showModal, onShowModal, inviteEmail, setInviteEmail, inviteRole, setInviteRole, onReload }: UsersTabProps) {
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<TeamUser['role']>('agent');
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  const openEdit = (user: TeamUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    await supabase.from('profiles').update({ full_name: editName, role: editRole }).eq('id', editingUser.id);
    setSaving(false);
    setEditingUser(null);
    onReload();
  };

  const deleteUser = async (user: TeamUser) => {
    if (!confirm(`Remover ${user.name}?`)) return;
    await supabase.from('profiles').delete().eq('id', user.id);
    onReload();
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Usuários & Permissões</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie quem tem acesso à plataforma e suas permissões.</p>
        </div>
        <button
          onClick={() => onShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />
          Convidar usuário
        </button>
      </div>

      {/* Edit modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Editar usuário</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Perfil</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as TeamUser['role'])}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="admin">Administrador</option>
                  <option value="agent">Agente</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-3 gap-3">
        {(['admin', 'agent', 'viewer'] as const).map(role => (
          <div key={role} className="p-3 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Shield size={14} className={role === 'admin' ? 'text-purple-600' : role === 'agent' ? 'text-blue-600' : 'text-gray-500'} />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</span>
            </div>
            <p className="text-xs text-gray-500">
              {role === 'admin' ? 'Acesso total, incluindo configurações' :
               role === 'agent' ? 'Atende conversas e gerencia leads' :
               'Visualiza dados sem poder editar'}
            </p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuário</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Perfil</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Desde</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                      {user.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-600">{user.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(user)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => deleteUser(user)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Convidar usuário</h3>
              <p className="text-sm text-gray-500 mt-1">Um e-mail de convite será enviado.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Perfil de acesso</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as TeamUser['role'])}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="agent">Agente</option>
                  <option value="admin">Administrador</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => onShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!inviteEmail.trim()) return;
                  setSendingInvite(true);
                  try {
                    if (isSupabaseConfigured) {
                      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
                      const { data: sessionData } = await supabase.auth.getSession();
                      const res = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
                        },
                        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
                      });
                      const json = await res.json();
                      if (json.error) throw new Error(json.error);
                    }
                    alert(`Convite enviado para ${inviteEmail.trim()}!`);
                    onShowModal(false);
                    setInviteEmail('');
                    onReload();
                  } catch (err: any) {
                    alert(`Erro ao enviar convite: ${err.message}`);
                  } finally {
                    setSendingInvite(false);
                  }
                }}
                disabled={sendingInvite}
                className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {sendingInvite ? 'Enviando...' : 'Convidar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tools Tab ─── */
interface ToolsTabProps {
  webhookUrl: string;
  setWebhookUrl: (v: string) => void;
  openAiKey: string;
  setOpenAiKey: (v: string) => void;
  notifications: NotificationSettings;
  setNotifications: (v: NotificationSettings) => void;
}

function ToolsTab({ webhookUrl, setWebhookUrl, openAiKey, setOpenAiKey, notifications, setNotifications }: ToolsTabProps) {
  const notifItems: { key: keyof NotificationSettings; label: string; desc: string }[] = [
    { key: 'newLead', label: 'Novo lead criado', desc: 'Notificar quando um novo lead entrar' },
    { key: 'newMessage', label: 'Nova mensagem recebida', desc: 'Notificar para cada mensagem não lida' },
    { key: 'dealWon', label: 'Negócio ganho', desc: 'Notificar quando um deal for marcado como Ganho' },
    { key: 'dailyReport', label: 'Relatório diário', desc: 'Resumo diário por e-mail às 8h' },
  ];

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Ferramentas & Automação</h2>
        <p className="text-sm text-gray-500 mt-1">Configure integrações avançadas e notificações.</p>
      </div>

      {/* Webhook */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-gray-100 rounded-lg">
            <Link2 size={18} className="text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Webhook</h3>
            <p className="text-sm text-gray-500 mt-0.5">Receba eventos em tempo real no seu servidor (novo lead, nova mensagem, deal atualizado…)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://seu-servidor.com/webhook"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button className="px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap">
            Salvar URL
          </button>
        </div>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-gray-600">Enviaremos um POST com payload JSON para cada evento. <a href="#" className="text-primary-600 hover:underline">Ver documentação</a></p>
        </div>
      </div>

      {/* OpenAI */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-gray-100 rounded-lg">
            <Bot size={18} className="text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Assistente de IA (OpenAI)</h3>
            <p className="text-sm text-gray-500 mt-0.5">Ative sugestões automáticas de resposta e respostas automáticas nos fluxos.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="password"
              value={openAiKey}
              onChange={e => setOpenAiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button className="px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap">
            Salvar chave
          </button>
        </div>
        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
        >
          <ExternalLink size={12} />
          Obter chave de API no OpenAI
        </a>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-gray-100 rounded-lg">
            <Bell size={18} className="text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Notificações</h3>
            <p className="text-sm text-gray-500 mt-0.5">Escolha quais eventos geram alertas para a equipe.</p>
          </div>
        </div>
        <div className="space-y-3">
          {notifItems.map(item => (
            <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <button
                onClick={() => {
                  const updated = { ...notifications } as NotificationSettings;
                  updated[item.key] = !notifications[item.key];
                  setNotifications(updated);
                }}
                className={`flex-shrink-0 transition-colors ${notifications[item.key] ? 'text-primary-600' : 'text-gray-300'}`}
              >
                {notifications[item.key] ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── General Tab ─── */
interface GeneralTabProps {
  settings: { businessName: string; timezone: string; language: string; businessHours: boolean; primaryColor: string };
  setSettings: (v: any) => void;
  brand: BrandSettings;
  setBrand: (v: BrandSettings) => void;
  clinicFocus?: boolean;
}

const COLOR_OPTIONS = [
  { hex: '#7C3AED', name: 'Roxo' },
  { hex: '#2563EB', name: 'Azul' },
  { hex: '#059669', name: 'Verde' },
  { hex: '#DC2626', name: 'Vermelho' },
  { hex: '#D97706', name: 'Laranja' },
  { hex: '#DB2777', name: 'Rosa' },
];

const SECURITY_COMPLIANCE_ITEMS = [
  {
    title: 'Criptografia SSL/TLS',
    description: 'Comunicação protegida por HTTPS com criptografia SSL/TLS, padrão usado para troca segura de dados sensíveis.',
    status: 'Ativo',
  },
  {
    title: 'Backups diarios',
    description: 'Rotina de backup diário para reduzir risco de perda de dados e apoiar recuperação operacional.',
    status: 'Configurar rotina',
  },
  {
    title: 'Servidores redundantes',
    description: 'Arquitetura preparada para alta disponibilidade, com redundância de infraestrutura e plano de contingência.',
    status: 'Planejado',
  },
  {
    title: 'Trilha SBIS S-RES v5.2',
    description: 'Preparação para requisitos de prontuário eletrônico, segurança da informação e certificação digital.',
    status: 'Em preparação',
  },
  {
    title: 'Meta de segurança NGS2',
    description: 'Estrutura orientada a assinatura digital, rastreabilidade, controle de acesso e integridade dos registros.',
    status: 'Planejado',
  },
  {
    title: 'LGPD e dados sensíveis',
    description: 'Controles de acesso, registro de operação, consentimento e proteção de dados de saúde.',
    status: 'Em evolução',
  },
];

function GeneralTab({ settings, setSettings, brand, setBrand, clinicFocus = false }: GeneralTabProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateBrand = (patch: Partial<BrandSettings>) => {
    setBrand({ ...brand, ...patch });
  };

  const readImage = (event: ChangeEvent<HTMLInputElement>, key: 'logoUrl' | 'professionalPhotoUrl') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateBrand({ [key]: String(reader.result) } as Partial<BrandSettings>);
    reader.readAsDataURL(file);
  };

  const handleColorSelect = (hex: string) => {
    setSettings({ ...settings, primaryColor: hex });
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) applyCustomPrimaryColor(hex);
  };

  const handleSave = async () => {
    setSaving(true);
    // Persist to localStorage
    localStorage.setItem('cfg_general', JSON.stringify(settings));
    saveBrandSettings(brand);
    applyCustomPrimaryColor(/^#[0-9A-Fa-f]{6}$/.test(settings.primaryColor) ? settings.primaryColor : '#059669');
    // Persist company name to Supabase profiles if configured
    if (isSupabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({
          company_name: settings.businessName,
        }).eq('email', user.email);
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{clinicFocus ? 'Configurar clínica' : 'Configurações Gerais'}</h2>
        <p className="text-sm text-gray-500 mt-1">{clinicFocus ? 'Ajuste nome, logo, profissional, cor e identidade visual exibida na plataforma.' : 'Personalize a plataforma para a sua empresa.'}</p>
      </div>

      {/* Company info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">Informações da empresa</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome da empresa</label>
            <input
              type="text"
              value={settings.businessName}
              onChange={e => setSettings({ ...settings, businessName: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fuso horário</label>
            <select
              value={settings.timezone}
              onChange={e => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="America/Sao_Paulo">América/São Paulo (BRT -3)</option>
              <option value="America/Manaus">América/Manaus (AMT -4)</option>
              <option value="America/Belem">América/Belém (BRT -3)</option>
              <option value="America/Fortaleza">América/Fortaleza (BRT -3)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Idioma</label>
            <select
              value={settings.language}
              onChange={e => setSettings({ ...settings, language: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security and compliance */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Seguranca e conformidade</h3>
              <p className="mt-1 text-sm text-gray-500">
                Base de governanca para LGPD, prontuario eletronico e preparacao para certificacao SBIS.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <AlertCircle size={13} /> SBIS em preparacao
          </span>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <strong className="block">Importante:</strong>
          A plataforma nao deve exibir selo de Certificacao SBIS como concluido ate passar pela auditoria oficial e receber numero/validade do certificado. Redundancia e backups devem ser validados na infraestrutura antes de serem anunciados comercialmente como ativos.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {SECURITY_COMPLIANCE_ITEMS.map(item => (
            <div key={item.title} className="rounded-xl border border-gray-200 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={15} className="text-emerald-600" />
                  <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">{item.status}</span>
              </div>
              <p className="text-xs leading-relaxed text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="https://sbis.org.br/certificacoes/certificacao-software/manuais-e-listas-de-requisitos/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink size={14} /> Requisitos SBIS
          </a>
          <a
            href="https://sbis.org.br/certificacoes/certificacao-software/sistemas-certificados/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink size={14} /> Sistemas certificados
          </a>
        </div>
      </div>

      {/* White label */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">White label</h3>
        </div>
        <p className="text-sm text-gray-500">Personalize a marca exibida no menu lateral e a identidade do profissional/clínica.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome no topo</label>
            <input
              type="text"
              value={brand.businessName}
              onChange={e => updateBrand({ businessName: e.target.value })}
              placeholder="Nome da clínica ou profissional"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtítulo</label>
            <input
              type="text"
              value={brand.subtitle}
              onChange={e => updateBrand({ subtitle: e.target.value })}
              placeholder="Ex: Clínica Integrada"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do profissional</label>
            <input
              type="text"
              value={brand.professionalName}
              onChange={e => updateBrand({ professionalName: e.target.value })}
              placeholder="Ex: Dra. Ana Martins"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-xl border border-dashed border-gray-200 p-3 text-sm text-gray-600 hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer">
              <span className="font-medium text-gray-900">Logo da clínica</span>
              <span className="block text-xs text-gray-400 mt-1">PNG/JPG</span>
              <input type="file" accept="image/*" className="hidden" onChange={event => readImage(event, 'logoUrl')} />
            </label>
            <label className="rounded-xl border border-dashed border-gray-200 p-3 text-sm text-gray-600 hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer">
              <span className="font-medium text-gray-900">Foto profissional</span>
              <span className="block text-xs text-gray-400 mt-1">PNG/JPG</span>
              <input type="file" accept="image/*" className="hidden" onChange={event => readImage(event, 'professionalPhotoUrl')} />
            </label>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-nucleus p-4">
          <div className="flex items-center gap-3">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.businessName} className="h-11 w-11 rounded-xl object-cover" />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-primary-600 flex items-center justify-center"><Zap size={20} className="text-white" /></div>
            )}
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-white">{brand.businessName || 'Nucleus'}</div>
              <div className="truncate text-[10px] font-semibold tracking-widest text-white/50">{brand.subtitle || 'HEALTH PLATFORM'}</div>
            </div>
            {brand.professionalPhotoUrl && (
              <img src={brand.professionalPhotoUrl} alt={brand.professionalName} className="ml-auto h-11 w-11 rounded-full border border-white/20 object-cover" />
            )}
          </div>
        </div>
      </div>

      {/* Business hours */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-gray-500" />
            <div>
              <h3 className="font-semibold text-gray-900">Horário de atendimento</h3>
              <p className="text-sm text-gray-500">Exibe mensagem automática fora do horário</p>
            </div>
          </div>
          <button
            onClick={() => setSettings({ ...settings, businessHours: !settings.businessHours })}
            className={settings.businessHours ? 'text-primary-600' : 'text-gray-300'}
          >
            {settings.businessHours ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
        {settings.businessHours && (
          <div className="space-y-2 pt-1">
            {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'].map(day => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-16">{day}</span>
                <input type="time" defaultValue="08:00" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                <span className="text-gray-400 text-sm">até</span>
                <input type="time" defaultValue="18:00" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">Aparência</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Cor principal</label>
          <div className="flex flex-wrap items-center gap-3">
            {COLOR_OPTIONS.map(({ hex, name }) => (
              <button
                key={hex}
                title={name}
                onClick={() => handleColorSelect(hex)}
                className="w-9 h-9 rounded-full hover:scale-110 transition-transform relative"
                style={{ backgroundColor: hex, outline: settings.primaryColor === hex ? `3px solid ${hex}` : 'none', outlineOffset: '3px' }}
              >
                {settings.primaryColor === hex && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
            <label className="flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm cursor-pointer hover:bg-gray-50">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={event => handleColorSelect(event.target.value)}
                className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Escolher cor personalizada"
              />
              <span>Escolher cor</span>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs uppercase text-gray-500">{settings.primaryColor}</span>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              value={settings.primaryColor}
              onChange={event => handleColorSelect(event.target.value)}
              placeholder="#059669"
              className="w-32 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-xs text-gray-400">A cor será aplicada imediatamente ao selecionar.</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Alterações salvas!
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
