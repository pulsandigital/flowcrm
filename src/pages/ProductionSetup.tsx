import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  KeyRound,
  Palette,
  Plug,
  Rocket,
  Save,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  type ClinicIntegration,
  type ClinicProductionSettings,
  useClinicProduction,
  useUpdateClinicProduction,
  useUpsertClinicIntegration,
} from '../hooks/useClinicProduction';
import { applyCustomPrimaryColor } from '../lib/theme';
import { saveBrandSettings } from '../lib/branding';

const PROVIDERS = [
  {
    id: 'supabase',
    name: 'Supabase Produção',
    group: 'Base',
    required: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    publicFields: ['Project URL', 'Auth redirect URL'],
  },
  {
    id: 'google_oauth',
    name: 'Google OAuth / Calendar / Meet',
    group: 'Agenda',
    required: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
    publicFields: ['Client ID', 'Callback URL'],
  },
  {
    id: 'evolution_api',
    name: 'WhatsApp Evolution API',
    group: 'Comunicacao',
    required: ['EVOLUTION_API_URL', 'EVOLUTION_API_KEY'],
    publicFields: ['URL da API', 'Webhook URL'],
  },
  {
    id: 'asaas',
    name: 'Asaas PIX / Cartao / Boleto',
    group: 'Pagamentos',
    required: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN'],
    publicFields: ['Ambiente', 'Webhook URL'],
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    group: 'Marketing',
    required: ['META_APP_ID', 'META_APP_SECRET', 'META_ACCESS_TOKEN'],
    publicFields: ['Conta de anuncio', 'Pixel ID'],
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    group: 'Marketing',
    required: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID'],
    publicFields: ['Customer ID', 'Conta MCC'],
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics 4',
    group: 'Marketing',
    required: ['GA4_PROPERTY_ID', 'GOOGLE_SERVICE_ACCOUNT_JSON'],
    publicFields: ['Property ID', 'Stream URL'],
  },
  {
    id: 'openai',
    name: 'Nucleus AI',
    group: 'IA',
    required: ['OPENAI_API_KEY'],
    publicFields: ['Modelo padrao', 'Status'],
  },
];

const FALLBACK_SETTINGS: ClinicProductionSettings = {
  id: '',
  name: '',
  brand_name: 'Nucleus',
  primary_color: '#059669',
  logo_url: '',
  professional_name: '',
  professional_photo_url: '',
  portal_title: 'Portal do Paciente',
  portal_domain: '',
  custom_domain: '',
  custom_domain_status: 'not_configured',
  support_email: '',
  support_phone: '',
  terms_url: '',
  privacy_url: '',
  production_status: 'draft',
  production_notes: '',
};

export default function ProductionSetup() {
  const { data, isLoading, error } = useClinicProduction();
  const updateClinic = useUpdateClinicProduction();
  const upsertIntegration = useUpsertClinicIntegration();
  const [settings, setSettings] = useState<ClinicProductionSettings>(FALLBACK_SETTINGS);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
      applyCustomPrimaryColor(data.settings.primary_color || '#059669');
    }
  }, [data?.settings]);

  const integrationMap = useMemo(() => {
    const map = new Map<string, ClinicIntegration>();
    data?.integrations.forEach(item => map.set(item.provider, item));
    return map;
  }, [data?.integrations]);

  const configuredCount = PROVIDERS.filter(provider => {
    const integration = integrationMap.get(provider.id);
    return integration?.enabled && integration?.status !== 'not_configured';
  }).length;

  const checklist = [
    { label: 'Supabase com migrations aplicadas', done: Boolean(integrationMap.get('supabase')?.enabled) },
    { label: 'White label salvo no banco', done: Boolean(settings.brand_name && settings.primary_color) },
    { label: 'Dominio/portal definido', done: Boolean(settings.custom_domain || settings.portal_domain) },
    { label: 'WhatsApp conectado', done: Boolean(integrationMap.get('evolution_api')?.enabled) },
    { label: 'Gateway de pagamento configurado', done: Boolean(integrationMap.get('asaas')?.enabled) },
    { label: 'Google Calendar/Meet configurado', done: Boolean(integrationMap.get('google_oauth')?.enabled) },
    { label: 'Marketing conectado', done: ['meta_ads', 'google_ads', 'google_analytics'].some(id => integrationMap.get(id)?.enabled) },
    { label: 'Termos e politica de privacidade definidos', done: Boolean(settings.terms_url && settings.privacy_url) },
  ];

  const readiness = Math.round((checklist.filter(item => item.done).length / checklist.length) * 100);

  const update = (patch: Partial<ClinicProductionSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (patch.primary_color && /^#[0-9A-Fa-f]{6}$/.test(patch.primary_color)) applyCustomPrimaryColor(patch.primary_color);
  };

  const save = async () => {
    setMessage('');
    await updateClinic.mutateAsync(settings);
    saveBrandSettings({
      businessName: settings.brand_name || settings.name || 'Nucleus',
      subtitle: settings.portal_title || 'HEALTH PLATFORM',
      logoUrl: settings.logo_url,
      professionalName: settings.professional_name,
      professionalPhotoUrl: settings.professional_photo_url,
    });
    window.dispatchEvent(new CustomEvent('nucleus:brand-settings-updated'));
    setMessage('Configuracao de producao salva.');
  };

  const readImage = (event: ChangeEvent<HTMLInputElement>, key: 'logo_url' | 'professional_photo_url') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ [key]: String(reader.result) } as Partial<ClinicProductionSettings>);
    reader.readAsDataURL(file);
  };

  const toggleIntegration = async (provider: string, enabled: boolean) => {
    const current = integrationMap.get(provider);
    await upsertIntegration.mutateAsync({
      provider,
      enabled,
      status: enabled ? 'configured' : 'not_configured',
      public_config: current?.public_config ?? {},
    });
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-6 animate-slide-up">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Producao / White Label</h1>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Go-live</span>
          </div>
          <p className="text-sm text-slate-500">Central para tirar a plataforma do modo demo, conectar servicos reais e publicar com a marca da clinica.</p>
        </div>
        <button onClick={save} disabled={updateClinic.isPending} className="btn-primary">
          <Save size={15} /> {updateClinic.isPending ? 'Salvando...' : 'Salvar producao'}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Rode a migration <strong>010_production_white_label_integrations.sql</strong> no Supabase antes de usar esta tela com persistencia completa.
        </div>
      )}

      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}

      <div className="grid gap-4 lg:grid-cols-4">
        <Metric title="Pronto para producao" value={`${readiness}%`} icon={<Rocket size={18} />} />
        <Metric title="Integracoes configuradas" value={`${configuredCount}/${PROVIDERS.length}`} icon={<Plug size={18} />} />
        <Metric title="Marca" value={settings.brand_name || 'Pendente'} icon={<Palette size={18} />} />
        <Metric title="Dominio" value={settings.custom_domain || settings.portal_domain || 'Pendente'} icon={<Globe2 size={18} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="section-title flex items-center gap-2"><ShieldCheck size={16} /> Checklist de go-live</h2>
            <div className="mt-4 space-y-2">
              {checklist.map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  {item.done ? <CheckCircle2 size={17} className="text-emerald-600" /> : <AlertCircle size={17} className="text-amber-500" />}
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="section-title">Segredos de servidor</h2>
            <p className="section-subtitle">Chaves privadas nao devem ficar no frontend. Configure no VPS/Supabase Functions.</p>
            <div className="mt-4 space-y-2">
              {Array.from(new Set(PROVIDERS.flatMap(provider => provider.required))).map(secret => (
                <div key={secret} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <code className="text-xs font-semibold text-slate-700">{secret}</code>
                  <KeyRound size={14} className="text-slate-400" />
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="section-title">White label completo</h2>
            <p className="section-subtitle">Esses dados passam a ser a identidade da plataforma e do portal do paciente.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <TextField label="Nome da clinica/profissional" value={settings.brand_name} onChange={value => update({ brand_name: value, name: value })} />
              <TextField label="Titulo do portal" value={settings.portal_title} onChange={value => update({ portal_title: value })} />
              <TextField label="Nome do profissional" value={settings.professional_name} onChange={value => update({ professional_name: value })} />
              <TextField label="Cor principal hexadecimal" value={settings.primary_color} onChange={value => update({ primary_color: value })} placeholder="#059669" />
              <TextField label="Dominio da plataforma" value={settings.custom_domain} onChange={value => update({ custom_domain: value })} placeholder="app.suaclinica.com.br" />
              <TextField label="Dominio do portal do paciente" value={settings.portal_domain} onChange={value => update({ portal_domain: value })} placeholder="portal.suaclinica.com.br" />
              <TextField label="E-mail de suporte" value={settings.support_email} onChange={value => update({ support_email: value })} />
              <TextField label="Telefone/WhatsApp de suporte" value={settings.support_phone} onChange={value => update({ support_phone: value })} />
              <TextField label="URL dos termos de uso" value={settings.terms_url} onChange={value => update({ terms_url: value })} />
              <TextField label="URL da politica de privacidade" value={settings.privacy_url} onChange={value => update({ privacy_url: value })} />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <UploadBox label="Logo da clinica" value={settings.logo_url} onChange={event => readImage(event, 'logo_url')} />
              <UploadBox label="Foto profissional" value={settings.professional_photo_url} onChange={event => readImage(event, 'professional_photo_url')} />
            </div>

            <div className="mt-5 rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${settings.primary_color || '#059669'}, #064e3b)` }}>
              <div className="flex items-center gap-3">
                {settings.logo_url ? <img src={settings.logo_url} className="h-12 w-12 rounded-2xl object-cover" alt="Logo" /> : <div className="h-12 w-12 rounded-2xl bg-white/15" />}
                <div>
                  <div className="text-lg font-bold">{settings.brand_name || 'Nucleus'}</div>
                  <div className="text-xs text-white/70">{settings.portal_title || 'Portal do Paciente'}</div>
                </div>
                {settings.professional_photo_url && <img src={settings.professional_photo_url} className="ml-auto h-12 w-12 rounded-full object-cover" alt="Profissional" />}
              </div>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 p-5">
              <h2 className="section-title">Integracoes reais</h2>
              <p className="section-subtitle">Marque como configurado apenas depois de inserir as credenciais no servidor/Supabase.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {PROVIDERS.map(provider => {
                const integration = integrationMap.get(provider.id);
                const enabled = Boolean(integration?.enabled);
                return (
                  <div key={provider.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{provider.name}</h3>
                        <span className="badge badge-gray text-[10px]">{provider.group}</span>
                        <span className={`badge text-[10px] ${enabled ? 'badge-green' : 'badge-gray'}`}>{enabled ? 'Configurado' : 'Pendente'}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {provider.required.map(secret => <code key={secret} className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">{secret}</code>)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copySecrets(provider.required)} className="btn-secondary btn-sm"><Copy size={13} /> Copiar vars</button>
                      <button onClick={() => toggleIntegration(provider.id, !enabled)} className={enabled ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}>
                        {enabled ? 'Marcar pendente' : 'Marcar configurado'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="section-title">Observacoes de producao</h2>
            <textarea className="input min-h-[110px] resize-none" value={settings.production_notes} onChange={event => update({ production_notes: event.target.value })} placeholder="Pendencias, credenciais faltantes, dominio, DNS, gateway escolhido..." />
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
              <a className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline" href="/import"><ExternalLink size={12} /> Importar dados de outra plataforma</a>
              <span>Use esta etapa antes do go-live para a clinica nao comecar do zero.</span>
            </div>
          </section>
        </div>
      </div>

      {isLoading && <div className="fixed bottom-4 right-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xl">Carregando configuracao...</div>}
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">{icon}</div>
      <div className="truncate text-xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{title}</div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function UploadBox({ label, value, onChange }: { label: string; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-4 hover:border-primary-300 hover:bg-primary-50/40">
      {value ? <img src={value} className="h-12 w-12 rounded-xl object-cover" alt={label} /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><Upload size={18} /></div>}
      <div>
        <div className="text-sm font-bold text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">PNG/JPG</div>
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={onChange} />
    </label>
  );
}

function copySecrets(secrets: string[]) {
  navigator.clipboard.writeText(secrets.map(secret => `${secret}=`).join('\n'));
}
