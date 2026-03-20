import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, Users, DollarSign, Clock, Award, ArrowUpRight, Loader2 } from 'lucide-react';
import { TEAM_MEMBERS, funnelData as staticFunnelData } from '../data/mockData';
import { dealsDb, contactsDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Deal, Contact } from '../types';

const channelData = [
  { name: 'WhatsApp', value: 45, color: '#25D366' },
  { name: 'Instagram', value: 28, color: '#E1306C' },
  { name: 'Web Chat', value: 18, color: '#7c3aed' },
  { name: 'Email', value: 9, color: '#3b82f6' },
];

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function buildMonthlyData(deals: Deal[]) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthDeals = deals.filter(deal => {
      const dd = new Date(deal.createdAt);
      return dd.getMonth() === m && dd.getFullYear() === y;
    });
    return {
      month: months[m],
      leads: monthDeals.length,
      conversions: monthDeals.filter(d => d.stage === 'won').length,
      revenue: monthDeals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0),
    };
  });
}

function buildFunnelData(deals: Deal[]) {
  const stages = [
    { key: 'new', stage: 'Novo Lead', color: '#8b5cf6' },
    { key: 'qualifying', stage: 'Qualificando', color: '#6d28d9' },
    { key: 'proposal', stage: 'Proposta', color: '#5b21b6' },
    { key: 'negotiation', stage: 'Negociação', color: '#4c1d95' },
    { key: 'won', stage: 'Ganho', color: '#10b981' },
  ];
  return stages.map(s => ({ ...s, count: deals.filter(d => d.stage === s.key).length }));
}

function KPICard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 font-medium">
        <ArrowUpRight size={13} /><span>{sub}</span>
      </div>
    </div>
  );
}

export default function Reports() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const [d, c] = await Promise.all([dealsDb.getAll(), contactsDb.getAll()]);
    setDeals(d);
    setContacts(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  );

  const totalRevenue = deals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0);
  const wonCount = deals.filter(d => d.stage === 'won').length;
  const convRate = deals.length > 0 ? ((wonCount / deals.length) * 100).toFixed(0) : '0';
  const monthlyData = buildMonthlyData(deals);
  const funnelData = deals.length > 0 ? buildFunnelData(deals) : staticFunnelData;

  const teamPerf = TEAM_MEMBERS.map(member => ({
    name: member.split(' ')[0],
    deals: deals.filter(d => d.assignee === member && d.stage === 'won').length,
    value: deals.filter(d => d.assignee === member && d.stage === 'won').reduce((s, d) => s + d.value, 0),
    leads: contacts.filter(c => c.assignee === member).length,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Dados dos últimos 6 meses</p>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['7 dias', '30 dias', '3 meses', '6 meses', '1 ano'].map((p, i) => (
            <button key={p} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${i === 3 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Receita Total" value={totalRevenue > 0 ? `R$ ${(totalRevenue / 1000).toFixed(1)}k` : 'R$ 0'} sub={wonCount > 0 ? `${wonCount} negócios ganhos` : 'Nenhum ganho ainda'} icon={<DollarSign size={18} className="text-emerald-600" />} color="bg-emerald-50" />
        <KPICard label="Total de Leads" value={String(contacts.length)} sub={contacts.length > 0 ? `${contacts.filter(c => c.status === 'lead').length} leads ativos` : 'Nenhum contato ainda'} icon={<Users size={18} className="text-blue-600" />} color="bg-blue-50" />
        <KPICard label="Taxa de Conversão" value={`${convRate}%`} sub={deals.length > 0 ? `${deals.length} negócios total` : 'Nenhum negócio ainda'} icon={<TrendingUp size={18} className="text-primary-600" />} color="bg-primary-50" />
        <KPICard label="Tempo Médio de Fechamento" value="—" sub="Calculado com dados reais" icon={<Clock size={18} className="text-amber-600" />} color="bg-amber-50" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Line */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Receita x Leads por Mês</h2>
          {deals.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-gray-400 text-sm">
              Crie negócios no Pipeline para ver dados aqui
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(v: number, name: string) => name === 'Receita' ? [`R$ ${v.toLocaleString('pt-BR')}`, name] : [v, name]} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} name="Receita" />
                <Line yAxisId="right" type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} name="Leads" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Channel Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Leads por Canal</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={channelData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {channelData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, 'Participação']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {channelData.map(ch => (
              <div key={ch.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: ch.color }} />
                  <span className="text-gray-600">{ch.name}</span>
                </div>
                <span className="font-semibold text-gray-800">{ch.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Funil de Vendas</h2>
          {funnelData[0].count === 0 && deals.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Crie negócios no Pipeline para ver o funil aqui
            </div>
          ) : (
            <div className="space-y-2">
              {funnelData.map((stage, i) => {
                const maxCount = funnelData[0].count || 1;
                const pct = Math.round((stage.count / maxCount) * 100);
                const conv = i > 0 && funnelData[i - 1].count > 0
                  ? Math.round((stage.count / funnelData[i - 1].count) * 100)
                  : i === 0 ? 100 : 0;
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{stage.stage}</span>
                      <div className="flex items-center gap-3">
                        {i > 0 && <span className="text-xs text-gray-400">Conv: {conv}%</span>}
                        <span className="font-bold text-gray-900">{stage.count}</span>
                      </div>
                    </div>
                    <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg flex items-center px-3 transition-all"
                        style={{ width: `${pct || 0}%`, background: stage.color, minWidth: stage.count > 0 ? '2rem' : '0' }}
                      >
                        {pct > 10 && <span className="text-white text-xs font-semibold">{pct}%</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Performance da Equipe</h2>
          <div className="space-y-3">
            {teamPerf.sort((a, b) => b.value - a.value).map((member, i) => (
              <div key={member.name} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-24 flex-shrink-0">
                  {i === 0 && <Award size={14} className="text-amber-500" />}
                  <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-xs">
                    {member.name[0]}
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{member.name}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">{member.leads} leads · {member.deals} fechados</span>
                    <span className="font-semibold text-gray-800">R$ {(member.value / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${teamPerf[0].value > 0 ? (member.value / teamPerf[0].value) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Vendas por Membro (últimos meses)</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={teamPerf}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="leads" name="Leads" fill="#ddd6fe" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deals" name="Fechados" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
