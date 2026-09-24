import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Brain,
  CalendarDays,
  DollarSign,
  Loader2,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAppointments } from '../hooks/useAppointments';
import { useCampaigns } from '../hooks/useCampaigns';
import { useFinancial } from '../hooks/useFinancial';
import { useLeads } from '../hooks/useLeads';
import { usePatients } from '../hooks/usePatients';

const money = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

const monthKey = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export default function Growth() {
  const campaignsQuery = useCampaigns();
  const leadsQuery = useLeads();
  const patientsQuery = usePatients();
  const appointmentsQuery = useAppointments();
  const financialQuery = useFinancial();

  const campaigns = campaignsQuery.data ?? [];
  const leads = leadsQuery.data ?? [];
  const patients = patientsQuery.data ?? [];
  const appointments = appointmentsQuery.data ?? [];
  const transactions = financialQuery.data ?? [];
  const isLoading = [
    campaignsQuery,
    leadsQuery,
    patientsQuery,
    appointmentsQuery,
    financialQuery,
  ].some((query) => query.isLoading);

  const currentMonth = monthKey(new Date().toISOString());
  const periodLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const stats = useMemo(() => {
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(
      (lead: any) => lead.status === 'Fechado ganho' || lead.stage === 'Fechado ganho',
    ).length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const investment = campaigns.reduce(
      (sum: number, item: any) => sum + Number(item.spent ?? 0),
      0,
    );
    const activePatients = patients.filter((patient: any) => patient.status === 'ativo').length;
    const completedAppointments = appointments.filter(
      (appointment: any) =>
        appointment.status === 'realizado' && monthKey(appointment.date ?? appointment.starts_at) === currentMonth,
    ).length;
    const confirmedRevenue = transactions
      .filter(
        (transaction: any) =>
          transaction.status === 'pago' &&
          monthKey(transaction.paidDate ?? transaction.payment_date ?? transaction.created_at) ===
            currentMonth,
      )
      .reduce((sum: number, transaction: any) => sum + Number(transaction.amount ?? 0), 0);

    return {
      totalLeads,
      convertedLeads,
      conversionRate,
      investment,
      activePatients,
      completedAppointments,
      confirmedRevenue,
      costPerPatient: activePatients > 0 ? investment / activePatients : 0,
    };
  }, [appointments, campaigns, currentMonth, leads, patients, transactions]);

  const funnel = [
    { stage: 'Leads', count: stats.totalLeads },
    { stage: 'Convertidos', count: stats.convertedLeads },
    { stage: 'Pacientes ativos', count: stats.activePatients },
  ];
  const max = Math.max(...funnel.map((item) => item.count), 1);

  const channels = [
    { label: 'WhatsApp', terms: ['whatsapp'] },
    { label: 'Instagram', terms: ['instagram'] },
    { label: 'Google', terms: ['google', 'anúncio', 'anuncio'] },
    { label: 'Indicação', terms: ['indicação', 'indicacao', 'referral'] },
  ].map(({ label, terms }) => ({
    channel: label,
    leads: leads.filter((lead: any) => {
      const source = String(lead.origin || lead.channel || '').toLowerCase();
      return terms.some((term) => source.includes(term));
    }).length,
  }));

  const hasData =
    leads.length > 0 ||
    campaigns.length > 0 ||
    patients.length > 0 ||
    appointments.length > 0 ||
    transactions.length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-6 p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">Growth Marketing</h1>
          </div>
          <p className="text-sm text-slate-500">
            Inteligência estratégica calculada com os dados reais da clínica.
          </p>
        </div>
        <span className="btn-secondary btn-sm w-fit capitalize">{periodLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total de leads', value: stats.totalLeads, icon: Users },
          {
            label: 'Taxa de conversão',
            value: `${stats.conversionRate.toFixed(1)}%`,
            icon: Target,
          },
          {
            label: 'Receita confirmada no mês',
            value: money(stats.confirmedRevenue),
            icon: DollarSign,
          },
          {
            label: 'Consultas realizadas no mês',
            value: stats.completedAppointments,
            icon: CalendarDays,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <Icon size={18} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="mt-0.5 text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="section-title mb-4">Funil de conversão</h2>
          <div className="space-y-3">
            {funnel.map(({ stage, count }) => {
              const percentage = Math.round((count / max) * 100);
              return (
                <div key={stage}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{stage}</span>
                    <span className="font-bold text-slate-900">{count}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {!hasData && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-600">
                O funil será preenchido conforme a clínica cadastrar leads e pacientes.
              </p>
            </div>
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Brain size={16} className="text-nucleus-600" />
            <h2 className="section-title">Indicadores operacionais</h2>
          </div>
          {hasData ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Insight
                title="Leads cadastrados"
                desc={`${stats.totalLeads} leads disponíveis para acompanhamento comercial.`}
                to="/crm/leads"
              />
              <Insight
                title="Campanhas sincronizadas"
                desc={`${campaigns.length} campanhas com dados importados das integrações.`}
                to="/marketing/campaigns"
              />
              <Insight
                title="Pacientes ativos"
                desc={`${stats.activePatients} pacientes ativos na clínica.`}
                to="/care/patients"
              />
              <Insight
                title="Custo por paciente ativo"
                desc={
                  campaigns.length > 0
                    ? `${money(stats.costPerPatient)} considerando o investimento sincronizado.`
                    : 'Conecte as plataformas de anúncios para calcular este indicador.'
                }
                to={campaigns.length > 0 ? '/marketing/campaigns' : '/integrations'}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-6 text-sm text-slate-500">
              Nenhum dado operacional foi registrado. Os indicadores surgirão automaticamente
              após o início do uso da clínica.
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-4">Leads por canal</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {channels.map(({ channel, leads: channelLeads }) => (
            <div key={channel} className="rounded-xl bg-slate-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-teal-500" />
                <span className="text-sm font-semibold text-slate-800">{channel}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Leads</span>
                <span className="font-bold text-slate-900">{channelLeads}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Insight({ title, desc, to }: { title: string; desc: string; to: string }) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-teal-100 bg-teal-50 p-4 hover:border-teal-200"
    >
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{desc}</p>
      <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-teal-700">
        Abrir <ArrowUpRight size={11} />
      </span>
    </Link>
  );
}
