import { Users, TrendingUp, DollarSign, MessageCircle, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { monthlyData, conversations, deals } from '../data/mockData';
import type { Page } from '../types';

interface Props { onNavigate: (page: Page) => void; }

function StatCard({ label, value, sub, icon, trend, color }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  trend?: 'up' | 'down'; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{sub}</span>
        </div>
      </div>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
  );
}

const stageLabels: Record<string, string> = {
  new: 'Novo Lead', qualifying: 'Qualificando', proposal: 'Proposta',
  negotiation: 'Negociação', won: 'Ganho', lost: 'Perdido',
};
const stageColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', qualifying: 'bg-yellow-100 text-yellow-700',
  proposal: 'bg-orange-100 text-orange-700', negotiation: 'bg-purple-100 text-purple-700',
  won: 'bg-emerald-100 text-emerald-700', lost: 'bg-red-100 text-red-700',
};

const channelIcons: Record<string, string> = {
  whatsapp: '📱', instagram: '📸', email: '✉️', webchat: '💬',
};

export default function Dashboard({ onNavigate }: Props) {
  const totalLeads = 61;
  const activeDeals = deals.filter(d => !['won', 'lost'].includes(d.stage)).length;
  const revenue = deals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0);
  const openConvs = conversations.filter(c => c.status === 'open').length;

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Leads este mês" value={String(totalLeads)} sub="+14% vs mês anterior" icon={<Users size={20} className="text-primary-600" />} trend="up" color="bg-primary-50" />
        <StatCard label="Negócios Ativos" value={String(activeDeals)} sub="+3 esta semana" icon={<TrendingUp size={20} className="text-emerald-600" />} trend="up" color="bg-emerald-50" />
        <StatCard label="Receita Fechada" value={`R$ ${(revenue / 1000).toFixed(1)}k`} sub="+22% vs mês anterior" icon={<DollarSign size={20} className="text-blue-600" />} trend="up" color="bg-blue-50" />
        <StatCard label="Em Atendimento" value={String(openConvs)} sub="-2 vs ontem" icon={<MessageCircle size={20} className="text-amber-600" />} trend="down" color="bg-amber-50" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Bar Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Leads & Conversões por Mês</h2>
            <span className="text-xs text-gray-500">Últimos 7 meses</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="leads" fill="#ddd6fe" radius={[4, 4, 0, 0]} name="Leads" />
              <Bar dataKey="conversions" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Conversões" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Line */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Receita Mensal</h2>
            <span className="text-xs text-emerald-600 font-medium">+22% ↑</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Receita']} />
              <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Deals */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Negócios Recentes</h2>
            <button onClick={() => onNavigate('pipeline')} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              Ver todos <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {deals.slice(0, 5).map(deal => (
              <div key={deal.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-xs">
                    {deal.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 line-clamp-1">{deal.title}</p>
                    <p className="text-xs text-gray-500">{deal.company}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-sm font-semibold text-gray-800">R$ {deal.value.toLocaleString('pt-BR')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColors[deal.stage]}`}>
                    {stageLabels[deal.stage]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Conversas Recentes</h2>
            <button onClick={() => onNavigate('chat')} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
              Ver todas <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {conversations.map(conv => (
              <div key={conv.id} className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {conv.contact.avatar}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 text-xs">{channelIcons[conv.channel]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800">{conv.contact.name}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{conv.lastMessageTime}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold flex-shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
