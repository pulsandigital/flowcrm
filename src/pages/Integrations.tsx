import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, BarChart3, CalendarDays, CheckCircle2, ChevronDown, Link2,
  Loader2, LockKeyhole, Megaphone, MessageCircle, QrCode, RefreshCw,
  Settings, ShieldCheck, Smartphone, Unplug, WalletCards, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Provider =
  | 'evolution_api'
  | 'meta_ads'
  | 'google_ads'
  | 'google_analytics'
  | 'tiktok_ads'
  | 'asaas'
  | 'google_calendar';

type IntegrationStatus = {
  provider: Provider;
  status: string;
  enabled: boolean;
  public_config: Record<string, unknown>;
  last_checked_at?: string | null;
  last_error?: string | null;
};

type Field = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password';
};

type CatalogItem = {
  id: Provider;
  name: string;
  description: string;
  category: string;
  icon: typeof Smartphone;
  fields: Field[];
  connectionMode: 'whatsapp' | 'oauth' | 'google' | 'managed';
  actionLabel: string;
  accountLabel?: string;
};

const CATALOG: CatalogItem[] = [
  {
    id: 'evolution_api',
    name: 'WhatsApp',
    description: 'Leia o QR Code com o celular para receber e enviar mensagens.',
    category: 'WhatsApp e mensagens',
    icon: Smartphone,
    connectionMode: 'whatsapp',
    actionLabel: 'Conectar WhatsApp',
    fields: [
      { key: 'apiUrl', label: 'Endereço do servidor de mensagens' },
      { key: 'apiKey', label: 'Credencial de acesso', type: 'password' },
      { key: 'instanceName', label: 'Identificação da conexão' },
    ],
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Acompanhe campanhas, investimento, leads e resultados do Facebook e Instagram.',
    category: 'Anúncios e tráfego',
    icon: Megaphone,
    connectionMode: 'oauth',
    actionLabel: 'Entrar com Meta',
    accountLabel: 'conta Meta',
    fields: [
      { key: 'adAccountId', label: 'Identificação da conta de anúncios' },
      { key: 'accessToken', label: 'Credencial de acesso', type: 'password' },
    ],
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Acompanhe campanhas, investimento, leads e resultados do Google.',
    category: 'Anúncios e tráfego',
    icon: BarChart3,
    connectionMode: 'oauth',
    actionLabel: 'Entrar com Google',
    accountLabel: 'conta Google Ads',
    fields: [
      { key: 'customerId', label: 'Identificação da conta' },
      { key: 'developerToken', label: 'Credencial da integração', type: 'password' },
      { key: 'refreshToken', label: 'Autorização de acesso', type: 'password' },
    ],
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics 4',
    description: 'Visualize acessos, origem, conversões e comportamento do seu site.',
    category: 'Anúncios e tráfego',
    icon: BarChart3,
    connectionMode: 'oauth',
    actionLabel: 'Entrar com Google',
    accountLabel: 'conta Google Analytics',
    fields: [
      { key: 'propertyId', label: 'Identificação da propriedade' },
      { key: 'refreshToken', label: 'Autorização de acesso', type: 'password' },
    ],
  },
  {
    id: 'tiktok_ads',
    name: 'TikTok Ads',
    description: 'Acompanhe campanhas e resultados da sua conta do TikTok.',
    category: 'Anúncios e tráfego',
    icon: Megaphone,
    connectionMode: 'oauth',
    actionLabel: 'Entrar com TikTok',
    accountLabel: 'conta TikTok Ads',
    fields: [
      { key: 'advertiserId', label: 'Identificação da conta' },
      { key: 'accessToken', label: 'Credencial de acesso', type: 'password' },
    ],
  },
  {
    id: 'google_calendar',
    name: 'Agenda Google e videochamada',
    description: 'Sincronize consultas e crie links de videochamada automaticamente.',
    category: 'Agenda e teleconsulta',
    icon: CalendarDays,
    connectionMode: 'google',
    actionLabel: 'Continuar com Google',
    fields: [],
  },
];

async function invokeManager(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('integration-manager', { body: payload });
  if (error) {
    let message = error.message;
    try {
      const parsed = (error as any).context ? await (error as any).context.json() : null;
      message = parsed?.error ?? message;
    } catch {
      // Keep the original server error.
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

function useIntegrations() {
  return useQuery({
    queryKey: ['real-integrations'],
    queryFn: async () => {
      const data = await invokeManager({ action: 'list' });
      return (data.integrations ?? []) as IntegrationStatus[];
    },
    staleTime: 20_000,
    retry: false,
  });
}

function isConnected(status?: IntegrationStatus) {
  return status?.status === 'connected' && status.enabled;
}

function StatusBadge({ status }: { status?: IntegrationStatus }) {
  const connected = isConnected(status);
  const failed = status?.status === 'error';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${
      connected
        ? 'bg-emerald-50 text-emerald-700'
        : failed
          ? 'bg-red-50 text-red-700'
          : 'bg-slate-100 text-slate-500'
    }`}>
      {connected ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {connected ? 'Conectado' : failed ? 'Precisa de atenção' : 'Desconectado'}
    </span>
  );
}

function ConnectionModal({
  item,
  current,
  onClose,
  onOpenWhatsApp,
  onConnectGoogle,
}: {
  item: CatalogItem;
  current?: IntegrationStatus;
  onClose: () => void;
  onOpenWhatsApp: () => void;
  onConnectGoogle: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const mutation = useMutation({
    mutationFn: () => invokeManager({ action: 'connect', provider: item.id, credentials }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['real-integrations'] });
      onClose();
    },
    onError: () => setError('Não foi possível concluir a conexão. Revise os dados ou fale com o suporte.'),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <form onSubmit={submit} className="card w-full max-w-xl overflow-hidden">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{item.actionLabel}</h2>
            <p className="mt-1 text-sm text-slate-500">Siga as etapas. A Nucleus cuida da parte técnica.</p>
          </div>
          <button type="button" className="btn-ghost p-2" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {item.connectionMode === 'whatsapp' ? (
            <>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex gap-3">
                  <QrCode className="mt-0.5 flex-none text-emerald-700" size={22} />
                  <div>
                    <p className="font-semibold text-emerald-900">Conecte pelo QR Code</p>
                    <p className="mt-1 text-sm text-emerald-800">
                      No celular, abra WhatsApp, Aparelhos conectados e leia o código mostrado pela Nucleus.
                    </p>
                  </div>
                </div>
              </div>
              <button type="button" className="btn-primary w-full justify-center" onClick={onOpenWhatsApp}>
                <QrCode size={16} /> Mostrar QR Code
              </button>
            </>
          ) : item.connectionMode === 'google' ? (
            <>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 flex-none text-emerald-700" size={22} />
                  <div>
                    <p className="font-semibold text-emerald-900">Autorize sua Agenda Google</p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Entre na sua conta Google e permita que a Nucleus crie consultas e links do Google Meet.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Nenhuma senha do Google fica salva na Nucleus. Você pode remover a autorização quando quiser.
              </div>
            </>
          ) : item.connectionMode === 'managed' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 flex-none" size={20} />
                <div>
                  <p className="font-semibold">Ativação protegida</p>
                  <p className="mt-1">Você não precisa informar chaves ou códigos técnicos.</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex gap-3">
                  <LockKeyhole className="mt-0.5 flex-none text-emerald-700" size={20} />
                  <div>
                    <p className="font-semibold text-slate-900">Conexão segura com sua {item.accountLabel}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      O login simplificado está em preparação. Agências e suporte podem usar a configuração avançada.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                onClick={() => setShowAdvanced((value) => !value)}
              >
                Configuração avançada para agência ou suporte
                <ChevronDown size={16} className={showAdvanced ? 'rotate-180' : ''} />
              </button>
              {showAdvanced && (
                <div className="space-y-4 rounded-lg border border-slate-200 p-4">
                  {item.fields.map((field) => (
                    <label key={field.key} className="block">
                      <span className="label">{field.label}</span>
                      <input
                        className="input"
                        type={field.type ?? 'text'}
                        placeholder={field.placeholder}
                        value={credentials[field.key] ?? ''}
                        onChange={(event) => setCredentials((value) => ({
                          ...value,
                          [field.key]: event.target.value,
                        }))}
                        required
                        autoComplete="off"
                      />
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {current?.last_error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              A última tentativa não foi concluída. Tente novamente ou peça ajuda ao suporte.
            </div>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Fechar</button>
          {item.connectionMode === 'google' && (
            <button
              type="button"
              className="btn-primary"
              disabled={isRedirecting}
              onClick={async () => {
                setError('');
                setIsRedirecting(true);
                try {
                  await onConnectGoogle();
                } catch {
                  setError('Não foi possível abrir a autorização do Google agora. Tente novamente.');
                  setIsRedirecting(false);
                }
              }}
            >
              {isRedirecting ? <Loader2 size={15} className="animate-spin" /> : <CalendarDays size={15} />}
              Continuar com Google
            </button>
          )}
          {item.connectionMode !== 'whatsapp' && item.connectionMode !== 'google' && (item.connectionMode === 'managed' || showAdvanced) && (
            <button className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {item.connectionMode === 'managed' ? 'Ativar conexão' : 'Salvar e conectar'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function IntegrationCard({
  item,
  status,
  onConfigure,
}: {
  item: CatalogItem;
  status?: IntegrationStatus;
  onConfigure: () => void;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const connected = isConnected(status);
  const testMutation = useMutation({
    mutationFn: () => invokeManager({ action: 'test', provider: item.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['real-integrations'] }),
    onError: () => setError('Não foi possível verificar a conexão agora.'),
  });
  const disconnectMutation = useMutation({
    mutationFn: () => invokeManager({ action: 'disconnect', provider: item.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['real-integrations'] }),
    onError: () => setError('Não foi possível desconectar agora.'),
  });
  const Icon = item.icon;

  return (
    <div className="card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <Icon size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{item.name}</h3>
              <StatusBadge status={status} />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
            {status?.last_checked_at && (
              <p className="mt-1 text-[11px] text-slate-400">
                Verificado em {new Date(status.last_checked_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <>
              <button className="btn-secondary btn-sm" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
                {testMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Verificar
              </button>
              {item.connectionMode !== 'managed' && (
                <button className="btn-secondary btn-sm" onClick={onConfigure}><Settings size={13} /> Configurar</button>
              )}
              <button
                className="btn-secondary btn-sm text-red-600"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                <Unplug size={13} /> Desconectar
              </button>
            </>
          ) : (
            <button className="btn-primary btn-sm" onClick={onConfigure}>
              <Link2 size={13} /> {item.actionLabel}
            </button>
          )}
        </div>
      </div>
      {(error || status?.last_error) && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error || 'Esta conexão precisa ser revisada.'}
        </p>
      )}
    </div>
  );
}

export default function Integrations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data = [], isLoading, error, refetch, isFetching } = useIntegrations();
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const statusMap = useMemo(
    () => new Map(data.map((integration) => [integration.provider, integration])),
    [data],
  );
  const categories = Array.from(new Set(CATALOG.map((item) => item.category)));
  const activeCount = data.filter(isConnected).length;

  useEffect(() => {
    const finishGoogleConnection = async () => {
      const params = new URLSearchParams(window.location.search);
      const pendingProvider = sessionStorage.getItem('nucleus_pending_integration');
      if (params.get('integration') !== 'google_calendar' && pendingProvider !== 'google_calendar') return;

      setConnectionMessage('Concluindo a conexão com sua Agenda Google...');
      setConnectionError('');

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const session = sessionData.session;
        const accessToken = session?.provider_token ?? '';
        const refreshToken = session?.provider_refresh_token ?? '';
        if (!accessToken && !refreshToken) {
          throw new Error('A autorização do Google não foi concluída.');
        }

        await invokeManager({
          action: 'connect',
          provider: 'google_calendar',
          credentials: {
            accessToken,
            refreshToken,
            calendarId: 'primary',
          },
        });

        sessionStorage.removeItem('nucleus_pending_integration');
        params.delete('integration');
        const query = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
        await queryClient.invalidateQueries({ queryKey: ['real-integrations'] });
        setConnectionMessage('Agenda Google conectada com sucesso.');
      } catch {
        setConnectionMessage('');
        setConnectionError('Não foi possível concluir a conexão com o Google. Tente conectar novamente.');
      }
    };

    void finishGoogleConnection();
  }, [queryClient]);

  const connectGoogleCalendar = async () => {
    sessionStorage.setItem('nucleus_pending_integration', 'google_calendar');
    const redirectTo = `${window.location.origin}/integrations?integration=google_calendar`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true',
        },
      },
    });
    if (oauthError) {
      sessionStorage.removeItem('nucleus_pending_integration');
      throw oauthError;
    }
  };

  return (
    <div className="animate-slide-up space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Integrações</h1>
          <p className="text-sm text-slate-500">{activeCount} de {CATALOG.length} conexões ativas</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button className="btn-secondary btn-sm" onClick={() => navigate('/help')}>
            <MessageCircle size={13} /> Ajuda
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Não foi possível consultar suas conexões agora. Tente novamente em alguns instantes.
        </div>
      )}

      {connectionMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {connectionMessage}
        </div>
      )}
      {connectionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {connectionError}
        </div>
      )}

      {isLoading ? (
        <div className="card flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="animate-spin" size={18} /> Consultando conexões...
        </div>
      ) : categories.map((category) => {
        const items = CATALOG.filter((item) => item.category === category);
        const connected = items.filter((item) => isConnected(statusMap.get(item.id))).length;
        return (
          <section key={category}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="section-title">{category}</h2>
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs text-slate-400">{connected}/{items.length} ativos</span>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  status={statusMap.get(item.id)}
                  onConfigure={() => setSelected(item)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <div className="card flex items-start gap-3 p-4">
        <ShieldCheck className="mt-0.5 text-emerald-600" size={18} />
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Seus acessos ficam protegidos</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            A Nucleus guarda as autorizações de forma segura e só ativa uma conexão depois de validá-la.
            Você pode desconectar qualquer serviço quando quiser.
          </p>
        </div>
      </div>

      {selected && (
        <ConnectionModal
          item={selected}
          current={statusMap.get(selected.id)}
          onClose={() => setSelected(null)}
          onOpenWhatsApp={() => {
            setSelected(null);
            navigate('/crm/channels');
          }}
          onConnectGoogle={connectGoogleCalendar}
        />
      )}
    </div>
  );
}
