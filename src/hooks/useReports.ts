import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const CHANNEL_COLORS = ['#0D9488','#EC4899','#3B82F6','#F59E0B','#8B5CF6','#6B7280'];

export function useReportsData() {
  return useQuery({
    queryKey: ['reports-data'],
    queryFn: async () => {
      const [leadsRes, invoicesRes, campaignsRes] = await Promise.all([
        supabase.from('leads').select('created_at,channel,stage,value'),
        supabase.from('invoices').select('amount,status,created_at,payment_date'),
        supabase.from('campaigns').select('name,leads,conversions,cpl,roas,spent'),
      ]);

      const leads     = leadsRes.data     ?? [];
      const invoices  = invoicesRes.data  ?? [];
      const campaigns = campaignsRes.data ?? [];

      /* ── Monthly aggregation (last 7 months) ── */
      const now = new Date();
      const monthKeys: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      const monthlyMap: Record<string, { leads: number; converted: number; revenue: number }> = {};
      monthKeys.forEach(k => (monthlyMap[k] = { leads: 0, converted: 0, revenue: 0 }));

      leads.forEach(l => {
        const key = (l.created_at ?? '').slice(0, 7);
        if (monthlyMap[key]) {
          monthlyMap[key].leads++;
          if (['won','converted','ganho','convertido'].includes((l.stage ?? '').toLowerCase()))
            monthlyMap[key].converted++;
        }
      });

      invoices
        .filter(i => i.status === 'paid')
        .forEach(inv => {
          const key = ((inv.payment_date ?? inv.created_at) ?? '').slice(0, 7);
          if (monthlyMap[key]) monthlyMap[key].revenue += Number(inv.amount ?? 0);
        });

      const monthlyLeads = monthKeys.map(k => ({
        month: MONTH_NAMES[parseInt(k.split('-')[1]) - 1],
        ...monthlyMap[k],
      }));

      /* ── Channel breakdown ── */
      const channelMap: Record<string, number> = {};
      leads.forEach(l => {
        const ch = l.channel || 'Outros';
        channelMap[ch] = (channelMap[ch] || 0) + 1;
      });
      const total = leads.length || 1;
      const channelData = Object.entries(channelMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count], i) => ({
          name,
          value: Math.round((count / total) * 100),
          color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
        }));

      /* ── Campaign performance ── */
      const campaignPerf = campaigns.slice(0, 4).map(c => ({
        name: c.name.length > 10 ? c.name.slice(0, 9) + '.' : c.name,
        leads: Number(c.leads ?? 0),
        conversions: Number(c.conversions ?? 0),
        cpl: Number(c.cpl ?? 0),
      }));

      /* ── KPIs ── */
      const totalLeads = leads.length;
      const converted = leads.filter(l =>
        ['won','converted','ganho','convertido'].includes((l.stage ?? '').toLowerCase())
      ).length;
      const convRate   = totalLeads > 0 ? (converted / totalLeads) * 100 : 0;
      const totalRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((s, i) => s + Number(i.amount ?? 0), 0);
      const campWithCpl = campaigns.filter(c => Number(c.cpl ?? 0) > 0);
      const avgCpl = campWithCpl.length > 0
        ? campWithCpl.reduce((s, c) => s + Number(c.cpl ?? 0), 0) / campWithCpl.length
        : 0;

      /* ── Month-over-month delta ── */
      const thisMonth = monthlyLeads[monthlyLeads.length - 1] ?? { leads: 0, revenue: 0 };
      const prevMonth = monthlyLeads[monthlyLeads.length - 2] ?? { leads: 1, revenue: 1 };
      const leadsDelta = prevMonth.leads > 0
        ? Math.round(((thisMonth.leads - prevMonth.leads) / prevMonth.leads) * 100) : 0;
      const revDelta = prevMonth.revenue > 0
        ? Math.round(((thisMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100) : 0;

      return {
        monthlyLeads, channelData, campaignPerf,
        totalLeads, converted, convRate, totalRevenue, avgCpl,
        leadsDelta, revDelta,
        hasData: totalLeads > 0 || invoices.length > 0 || campaigns.length > 0,
      };
    },
    staleTime: 60_000,
  });
}
