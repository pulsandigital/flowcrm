import { useState } from 'react';
import {
  Users, Zap, MessageSquare, FileText, Settings as SettingsIcon,
  Bot, Link2, CheckCircle, AlertCircle, ChevronRight, Plus,
  Trash2, Edit3, Shield, Bell, Palette, Globe, Key, Mail,
  Instagram, Phone, ToggleLeft, ToggleRight, ExternalLink,
} from 'lucide-react';

type SettingsTab = 'integrations' | 'users' | 'tools' | 'general';

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
  category: 'messaging' | 'ads' | 'tools';
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
    description: 'Importe leads e gerencie campanhas Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
    status: 'coming_soon',
    category: 'ads',
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

const MOCK_USERS: TeamUser[] = [
  { id: 'u1', name: 'Ana Lima', email: 'ana@empresa.com', role: 'admin', status: 'active', avatar: 'AL', createdAt: '2024-01-15' },
  { id: 'u2', name: 'Bruno Costa', email: 'bruno@empresa.com', role: 'agent', status: 'active', avatar: 'BC', createdAt: '2024-02-10' },
  { id: 'u3', name: 'Carla Souza', email: 'carla@empresa.com', role: 'agent', status: 'active', avatar: 'CS', createdAt: '2024-03-01' },
  { id: 'u4', name: 'Diego Martins', email: 'diego@empresa.com', role: 'viewer', status: 'inactive', avatar: 'DM', createdAt: '2024-03-20' },
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamUser['role']>('agent');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [notifications, setNotifications] = useState<NotificationSettings>({ newLead: true, newMessage: true, dealWon: true, dailyReport: false });
  const [generalSettings, setGeneralSettings] = useState({ businessName: 'Minha Empresa', timezone: 'America/Sao_Paulo', language: 'pt-BR', businessHours: true });

  const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'integrations', label: 'Integrações', icon: <Link2 size={16} /> },
    { id: 'users', label: 'Usuários', icon: <Users size={16} /> },
    { id: 'tools', label: 'Ferramentas', icon: <Bot size={16} /> },
    { id: 'general', label: 'Geral', icon: <SettingsIcon size={16} /> },
  ];

  return (
    <div className="flex h-full">
      {/* Left sidebar tabs */}
      <div className="w-56 bg-white border-r border-gray-200 flex-shrink-0 p-3 space-y-0.5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Configurações</p>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-primary-600' : 'text-gray-400'}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}

        <div className="pt-2 mt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">Plano</p>
          <div className="mx-3 p-3 bg-primary-50 rounded-lg">
            <p className="text-xs font-semibold text-primary-700">FlowCRM Pro</p>
            <p className="text-xs text-primary-500 mt-0.5">3 usuários ativos</p>
            <button className="mt-2 text-xs text-primary-600 font-medium flex items-center gap-1 hover:underline">
              Gerenciar plano <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'users' && (
          <UsersTab
            users={MOCK_USERS}
            showModal={showInviteModal}
            onShowModal={setShowInviteModal}
            inviteEmail={inviteEmail}
            setInviteEmail={setInviteEmail}
            inviteRole={inviteRole}
            setInviteRole={setInviteRole}
          />
        )}
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
          <GeneralTab settings={generalSettings} setSettings={setGeneralSettings} />
        )}
      </div>
    </div>
  );
}

/* ─── Integrations Tab ─── */
function IntegrationsTab() {
  const [connectedIds, setConnectedIds] = useState<string[]>(['whatsapp']);

  const categories = [
    { key: 'messaging', label: 'Canais de Mensagem' },
    { key: 'ads', label: 'Plataformas de Anúncio' },
    { key: 'tools', label: 'Ferramentas & Automação' },
  ] as const;

  const toggle = (id: string) => {
    setConnectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Integrações</h2>
        <p className="text-sm text-gray-500 mt-1">Conecte seus canais, plataformas de anúncios e ferramentas externas.</p>
      </div>

      {categories.map(cat => {
        const items = INTEGRATIONS.filter(i => i.category === cat.key);
        return (
          <div key={cat.key}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{cat.label}</h3>
            <div className="space-y-3">
              {items.map(integration => {
                const isConnected = connectedIds.includes(integration.id);
                const isComingSoon = integration.status === 'coming_soon';
                return (
                  <div
                    key={integration.id}
                    className={`flex items-center justify-between p-4 bg-white border rounded-xl transition-all ${
                      isConnected ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'
                    } ${isComingSoon ? 'opacity-60' : ''}`}
                  >
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
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <CheckCircle size={12} className="text-emerald-500" />
                            <span className="text-xs text-emerald-600 font-medium">Conectado</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {!isComingSoon && (
                      <button
                        onClick={() => toggle(integration.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                          isConnected
                            ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        {isConnected ? 'Desconectar' : 'Conectar'}
                      </button>
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
}

function UsersTab({ users, showModal, onShowModal, inviteEmail, setInviteEmail, inviteRole, setInviteRole }: UsersTabProps) {
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
                    <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <Edit3 size={14} />
                    </button>
                    {user.role !== 'admin' && (
                      <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
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
              <button onClick={() => onShowModal(false)} className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                Enviar convite
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
  const notifItems = [
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
          href="#"
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
                onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
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
  settings: { businessName: string; timezone: string; language: string; businessHours: boolean };
  setSettings: (v: any) => void;
}

function GeneralTab({ settings, setSettings }: GeneralTabProps) {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Configurações Gerais</h2>
        <p className="text-sm text-gray-500 mt-1">Personalize a plataforma para a sua empresa.</p>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Cor principal</label>
          <div className="flex gap-2">
            {['#7C3AED', '#2563EB', '#059669', '#DC2626', '#D97706', '#DB2777'].map(color => (
              <button
                key={color}
                className="w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 transition-transform"
                style={{ backgroundColor: color, borderColor: color === '#7C3AED' ? '#fff' : 'transparent', outline: color === '#7C3AED' ? '2px solid #7C3AED' : 'none', outlineOffset: '2px' }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors">
          Salvar alterações
        </button>
      </div>
    </div>
  );
}
