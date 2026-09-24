import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  DollarSign,
  ExternalLink,
  Loader2,
  Megaphone,
  MousePointerClick,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCampaigns } from '../hooks/useCampaigns';

const platformStyle: Record<string, { label: string; badge: string; dot: string }> = {
  google: { label: 'Google Ads', badge: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
  'Google Ads': { label: 'Google Ads', badge: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
  meta: { label: 'Meta Ads', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  'Meta Ads': { label: 'Meta Ads', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
};

const money = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function Campaigns() {
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading, isError } = useCampaigns();

  const totals = useMemo(() => {
    const spent = campaigns.reduce((sum, item: any) => sum + Number(item.spent ?? 0), 0);
    const leads = campaigns.reduce((sum, item: any) => sum + Number(item.leads ?? 0), 0);
    const conversions = campaigns.reduce(
      (sum, item: any) => sum + Number(item.conversions ?? 0),
      0,
    );
    const revenue = campaigns.reduce(
      (sum, item: any) => sum + Number(item.revenue ?? item.conversion_value ?? 0),
      0,
    );

    return {
      spent,
      leads,
      conversions,
      cpl: leads > 0 ? spent / leads : 0,
      roas: spent > 0 ? revenue / spent : 0,
    };
  }, [campaigns]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="card flex items-center gap-3 p-6 text-red-600">
          <AlertCircle size={20} />
          <span>Não foi possível carregar os dados das campanhas.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-5 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Campanhas</h1>
          <p className="text-sm text-slate-500">
            Resultados reais das campanhas conectadas ao Google Ads e ao Meta Ads.
          </p>
        </div>
        <button onClick={() => navigate('/integrations')} className="btn-secondary btn-sm w-fit">
          <ExternalLink size={14} /> Gerenciar integrações
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Investimento',
            value: money(totals.spent),
            icon: DollarSign,
            color: 'text-primary-600 bg-primary-50',
          },
          {
            label: 'Leads gerados',
            value: String(totals.leads),
            icon: Users,
            color: 'text-teal-600 bg-teal-50',
          },
          {
            label: 'CPL médio',
            value: money(totals.cpl),
            icon: Target,
            color: 'text-gold-600 bg-gold-50',
          },
          {
            label: 'ROAS',
            value: `${totals.roas.toFixed(1)}x`,
            icon: TrendingUp,
            color: 'text-emerald-600 bg-emerald-50',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <div className="text-xl font-bold text-slate-900">{value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="section-title">Campanhas em acompanhamento</h2>
            <p className="section-subtitle">
              Resumo operacional do tráfego pago por plataforma e objetivo.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {campaigns.length === 0 && (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Megaphone size={34} className="mb-3 text-slate-300" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Nenhuma campanha sincronizada
                </h3>
                <p className="mt-1 max-w-md text-sm text-slate-500">
                  Conecte uma conta do Google Ads ou Meta Ads para importar os resultados da
                  clínica. A Nucleus não exibe dados demonstrativos neste ambiente.
                </p>
                <button
                  onClick={() => navigate('/integrations')}
                  className="btn-primary btn-sm mt-4"
                >
                  <ExternalLink size={14} /> Conectar plataforma
                </button>
              </div>
            )}

            {campaigns.map((campaign: any) => {
              const platform =
                platformStyle[campaign.platform] ??
                platformStyle[String(campaign.platform).toLowerCase()] ?? {
                  label: campaign.platform || 'Campanha',
                  badge: 'bg-slate-100 text-slate-600',
                  dot: 'bg-slate-400',
                };
              const budget = Number(campaign.budget ?? 0);
              const spent = Number(campaign.spent ?? 0);
              const leads = Number(campaign.leads ?? 0);
              const percent = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;

              return (
                <div key={campaign.id} className="p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${platform.dot}`} />
                        <h3 className="font-semibold text-slate-900">{campaign.name}</h3>
                        <span className={`badge ${platform.badge}`}>{platform.label}</span>
                        <span className="badge badge-green">{campaign.status || 'Ativa'}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {campaign.objective || 'Objetivo não informado pela integração.'}
                      </p>
                      {campaign.professional && (
                        <p className="mt-1 text-xs text-slate-400">
                          Profissional: {campaign.professional}
                        </p>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{money(spent)}</div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                    {[
                      {
                        label: 'Impressões',
                        value: Number(campaign.impressions ?? 0).toLocaleString('pt-BR'),
                        icon: BarChart3,
                      },
                      {
                        label: 'Cliques',
                        value: Number(campaign.clicks ?? 0).toLocaleString('pt-BR'),
                        icon: MousePointerClick,
                      },
                      {
                        label: 'Leads',
                        value: leads.toLocaleString('pt-BR'),
                        icon: Users,
                      },
                      {
                        label: 'CPL',
                        value: money(Number(campaign.cpl ?? (leads > 0 ? spent / leads : 0))),
                        icon: Target,
                      },
                      {
                        label: 'ROAS',
                        value: `${Number(campaign.roas ?? 0).toFixed(1)}x`,
                        icon: TrendingUp,
                      },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-xl bg-slate-50 p-3">
                        <Icon size={14} className="mb-2 text-primary-600" />
                        <div className="text-sm font-bold text-slate-900">{value}</div>
                        <div className="text-[11px] text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>

                  {budget > 0 && (
                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-slate-500">
                          Verba utilizada: {money(spent)} de {money(budget)}
                        </span>
                        <span className="font-semibold text-slate-700">{percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-primary-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {campaign.insight && (
                    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
                      <strong className="text-slate-800">Observação do marketing:</strong>{' '}
                      {campaign.insight}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <Megaphone size={18} className="text-primary-600" />
              <h2 className="section-title">Resumo do período</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                <strong className="text-slate-900">{totals.leads}</strong> leads atribuídos às
                campanhas.
              </p>
              <p>
                <strong className="text-slate-900">{totals.conversions}</strong> conversões
                registradas.
              </p>
              <p>
                CPL médio de <strong className="text-slate-900">{money(totals.cpl)}</strong>.
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="section-title mb-3">Plataformas</h2>
            {['Google Ads', 'Meta Ads'].map((platform) => {
              const platformCampaigns = campaigns.filter((item: any) =>
                String(item.platform)
                  .toLowerCase()
                  .includes(platform.split(' ')[0].toLowerCase()),
              );
              const leads = platformCampaigns.reduce(
                (sum: number, item: any) => sum + Number(item.leads ?? 0),
                0,
              );
              const spent = platformCampaigns.reduce(
                (sum: number, item: any) => sum + Number(item.spent ?? 0),
                0,
              );

              return (
                <div key={platform} className="mb-3 rounded-xl border border-slate-100 p-3 last:mb-0">
                  <div className="font-semibold text-slate-900">{platform}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {platformCampaigns.length} campanhas · {leads} leads · {money(spent)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
