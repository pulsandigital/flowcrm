import { Loader2, AlertCircle, TrendingUp, TrendingDown, Brain, Download, Filter } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useReportsData } from '../hooks/useReports';

/* ─── Custom Tooltip ──────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <div className="font-bold text-slate-800 mb-1.5">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold text-slate-900">
            {p.name === 'Receita'
              ? `R$ ${Number(p.value).toLocaleString('pt-BR')}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── KPI Card ─────────────────────────────────────────────── */
function KPICard({
  label, value, change, up, sub,
}: {
  label: string; value: string; change: string; up: boolean; sub?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${up ? 'text-teal-600' : 'text-red-500'}`}>
        {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {change} vs. mês anterior
      </div>
    </div>
  );
}

/* ─── Empty State ──────────────────────────────────────────── */
function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-sm text-slate-400">
      {message}
    </div>
  );
}

/* ─── Reports Page ─────────────────────────────────────────── */
export default function Reports() {
  const { data, isLoading, isError } = useReportsData();

  const now = new Date();
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthCap   = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center p-10">
      <Loader2 size={28} className="animate-spin text-primary-600" />
    </div>
  );

  if (isError) return (
    <div className="p-6">
      <div className="card p-6 flex items-center gap-3 text-red-600">
        <AlertCircle size={20} />
        <span>Erro ao carregar dados de relatórios.</span>
      </div>
    </div>
  );

  const d = data!;

  const totalLeadsStr  = d.totalLeads.toString();
  const convRateStr    = `${d.convRate.toFixed(1)}%`;
  const revenueStr     = `R$ ${d.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  const avgCplStr      = d.avgCpl > 0 ? `R$ ${d.avgCpl.toFixed(2)}` : '—';

  const leadsUp   = d.leadsDelta >= 0;
  const revenueUp = d.revDelta  >= 0;

  /* dynamic insights */
  const insights: { type: 'up' | 'down'; text: string }[] = [];
  if (d.leadsDelta !== 0) {
    insights.push({
      type: d.leadsDelta > 0 ? 'up' : 'down',
      text: `Leads ${d.leadsDelta > 0 ? 'cresceram' : 'caíram'} ${Math.abs(d.leadsDelta)}% em relação ao mês anterior.`,
    });
  }
  if (d.totalLeads === 0) {
    insights.push({ type: 'down', text: 'Nenhum lead registrado ainda. Cadastre leads no CRM para ver estatísticas.' });
  }
  if (d.convRate > 0 && d.convRate < 10) {
    insights.push({ type: 'down', text: `Taxa de conversão em ${d.convRate.toFixed(1)}% — revisar abordagem comercial pós-qualificação.` });
  }
  if (d.convRate >= 20) {
    insights.push({ type: 'up', text: `Excelente taxa de conversão: ${d.convRate.toFixed(1)}%!` });
  }
  if (d.campaignPerf.length > 0) {
    const best = [...d.campaignPerf].sort((a, b) => b.conversions - a.conversions)[0];
    if (best.conversions > 0) {
      insights.push({ type: 'up', text: `Campanha "${best.name}" tem o maior número de conversões (${best.conversions}).` });
    }
  }
  if (insights.length === 0) {
    insights.push({ type: 'up', text: 'Plataforma conectada ao Supabase. Os dados aparecerão aqui conforme forem cadastrados.' });
  }

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-500">Nucleus Growth — Análise completa · {monthCap}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm"><Filter size={13} /> Período</button>
          <button className="btn-secondary btn-sm"><Download size={13} /> Exportar PDF</button>
        </div>
      </div>

      {/* AI Summary */}
      <div className="card dark-readable-panel dark-readable-success p-5 bg-gradient-to-r from-primary-50 to-nucleus-50 border border-primary-100">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <Brain size={18} className="text-primary-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 mb-1.5">Análise Nucleus — {monthCap}</div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {d.totalLeads > 0
                ? <>
                    <strong>Total de leads:</strong> {d.totalLeads} registrados.{' '}
                    <strong>Conversão:</strong> {d.convRate.toFixed(1)}% ({d.converted} convertidos).{' '}
                    {d.totalRevenue > 0 && <><strong>Receita confirmada:</strong> R$ {d.totalRevenue.toLocaleString('pt-BR')}.</>}
                    {' '}{d.avgCpl > 0 && <>CPL médio de campanhas: R$ {d.avgCpl.toFixed(2)}.</>}
                  </>
                : 'Nenhum dado registrado ainda. Comece cadastrando leads, pacientes e campanhas para ver sua análise completa aqui.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Leads"
          value={totalLeadsStr}
          change={`${leadsUp ? '+' : ''}${d.leadsDelta}%`}
          up={leadsUp}
          sub={`${d.converted} convertidos`}
        />
        <KPICard
          label="Conversão"
          value={convRateStr}
          change="—"
          up={d.convRate >= 15}
          sub={`${d.converted}/${d.totalLeads} leads`}
        />
        <KPICard
          label="Receita Confirmada"
          value={revenueStr}
          change={`${revenueUp ? '+' : ''}${d.revDelta}%`}
          up={revenueUp}
        />
        <KPICard
          label="CPL Médio"
          value={avgCplStr}
          change="—"
          up={d.avgCpl > 0 && d.avgCpl < 50}
          sub="custo por lead (campanhas)"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lead trend */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="section-title">Evolução mensal de leads</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-primary-500 inline-block" /> Leads
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 rounded-full bg-teal-500 inline-block" /> Convertidos
              </span>
            </div>
          </div>
          {d.monthlyLeads.every(m => m.leads === 0)
            ? <EmptyChartState message="Nenhum lead cadastrado nos últimos 7 meses" />
            : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d.monthlyLeads}>
                  <defs>
                    <linearGradient id="leads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="conv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0D9488" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="leads"     name="Leads"
                    stroke="#3B82F6" strokeWidth={2} fill="url(#leads)"
                    dot={{ r: 3, fill: '#3B82F6' }} />
                  <Area type="monotone" dataKey="converted" name="Convertidos"
                    stroke="#0D9488" strokeWidth={2} fill="url(#conv)"
                    dot={{ r: 3, fill: '#0D9488' }} />
                </AreaChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Channel pie */}
        <div className="card p-5">
          <h2 className="section-title mb-5">Leads por canal</h2>
          {d.channelData.length === 0
            ? <EmptyChartState message="Sem dados de canal" />
            : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={d.channelData} cx="50%" cy="50%"
                      innerRadius={45} outerRadius={75}
                      dataKey="value" paddingAngle={3}>
                      {d.channelData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => [`${val}%`, 'Participação']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {d.channelData.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                        <span className="text-slate-600">{c.name}</span>
                      </div>
                      <span className="font-bold text-slate-800">{c.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )
          }
        </div>
      </div>

      {/* Charts row 2 — Campaign performance */}
      {d.campaignPerf.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-5">Performance por campanha</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.campaignPerf} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="leads"       name="Leads"      fill="#3B82F6" radius={[4,4,0,0]} />
              <Bar dataKey="conversions" name="Conversões" fill="#0D9488" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          {d.campaignPerf.some(c => c.cpl > 0) && (
            <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4">
              {d.campaignPerf.map(c => (
                <div key={c.name} className="text-center">
                  <div className="text-xs font-semibold text-slate-800">
                    {c.cpl > 0 ? `R$ ${c.cpl.toFixed(0)}` : '—'}
                  </div>
                  <div className="text-[10px] text-slate-400">CPL {c.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Insights */}
      <div className="card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Brain size={16} className="text-nucleus-600" /> Insights automáticos
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`dark-readable-panel flex items-start gap-3 p-3.5 rounded-xl ${
                insight.type === 'up'
                  ? 'bg-teal-50 border border-teal-100 dark-readable-success'
                  : 'bg-red-50 border border-red-100 dark-readable-danger'
              }`}
            >
              {insight.type === 'up'
                ? <TrendingUp  size={15} className="text-teal-600 flex-shrink-0 mt-0.5" />
                : <TrendingDown size={15} className="text-red-500  flex-shrink-0 mt-0.5" />
              }
              <p className={`text-sm ${insight.type === 'up' ? 'text-teal-800' : 'text-red-800'}`}>
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
