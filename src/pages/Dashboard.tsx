import {
  Users, Calendar, DollarSign, TrendingUp, TrendingDown,
  Clock, Brain, Target, ChevronRight, FileText, Wallet,
  MessageSquare, Megaphone, CheckCircle2, Circle, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Link } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import { useLeads } from '../hooks/useLeads';
import { useAppointments } from '../hooks/useAppointments';
import { useTasks } from '../hooks/useTasks';
import { useFinancial } from '../hooks/useFinancial';
import { useCurrentProfile } from '../hooks/useCurrentProfile';

const CHANNEL_ICONS: Record<string, string> = {
  WhatsApp:'📱', Instagram:'📸', Facebook:'📘', Site:'🌐',
  Anúncio:'📢', Indicação:'👥', Orgânico:'🔍', Outro:'💬',
};
const STATUS_BADGE: Record<string, string> = {
  'Novo lead':'badge-blue','Em atendimento':'badge-purple',
  'Qualificação':'badge-gold','Proposta enviada':'badge-purple',
  'Follow-up':'badge-gray','Fechado ganho':'badge-green','Fechado perdido':'badge bg-red-50 text-red-600',
};
const COLORS = ['bg-violet-500','bg-blue-500','bg-teal-500','bg-indigo-500','bg-rose-500','bg-gold-500'];
const avatarColor = (n: string) => { let h=0; for(const c of n) h=c.charCodeAt(0)+((h<<5)-h); return COLORS[Math.abs(h)%COLORS.length]; };
const initials = (n: string) => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:0})}`;

function SectionHeader({ title, link, to }: { title: string; link?: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="section-title">{title}</h2>
      {link && to && (
        <Link to={to} className="text-xs text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700">
          {link}<ChevronRight size={12}/>
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: patients=[], isLoading: loadingPatients } = usePatients();
  const { data: leads=[], isLoading: loadingLeads } = useLeads();
  const { data: appointments=[], isLoading: loadingApts } = useAppointments();
  const { data: tasks=[], isLoading: loadingTasks } = useTasks();
  const { data: transactions=[], isLoading: loadingFin } = useFinancial();
  const { data: currentProfile } = useCurrentProfile();

  const isLoading = loadingPatients || loadingLeads || loadingApts || loadingTasks || loadingFin;

  // Derived metrics
  const today = new Date().toISOString().split('T')[0];
  const todayApts = appointments.filter((a: any) => a.date === today).sort((a: any,b: any)=>a.time.localeCompare(b.time));
  const newLeadsToday = leads.filter((l: any) => l.createdAt?.startsWith(today));
  const pendingTasks = tasks.filter((t: any) => t.status === 'pendente' || t.status === 'em_progresso');
  const monthReceipts = transactions
    .filter((t: any) => t.type==='receita' && t.status==='pago')
    .reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalLeads = leads.length;
  const wonLeads = leads.filter((l: any) => l.status === 'Fechado ganho').length;
  const convRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';

  const METRICS = [
    { label:'Novos Leads Hoje', value: isLoading ? '...' : String(newLeadsToday.length), icon: Users,       bg:'bg-primary-50', text:'text-primary-600', change:null, up:true },
    { label:'Consultas Hoje',   value: isLoading ? '...' : String(todayApts.length),     icon: Calendar,    bg:'bg-teal-50',    text:'text-teal-600',   change:null, up:true },
    { label:'Receita do Mês',   value: isLoading ? '...' : fmt(monthReceipts),            icon: DollarSign,  bg:'bg-gold-50',    text:'text-gold-600',   change:null, up:true },
    { label:'Taxa Conversão',   value: isLoading ? '...' : `${convRate}%`,               icon: Target,      bg:'bg-violet-50',  text:'text-violet-600', change:null, up:true },
  ];

  const metricRoutes: Record<string, string> = {
    'Novos Leads Hoje': '/crm/leads',
    'Consultas Hoje': '/care/schedule',
    'Receita do Mês': '/finance',
    'Taxa Conversão': '/crm/pipeline',
  };

  const quickRoutes: Record<string, string> = {
    Leads: '/crm/leads',
    WhatsApp: '/crm/chat',
    Financeiro: '/finance',
    Campanhas: '/marketing/campaigns',
    Crescimento: '/growth',
  };

  const PIPELINE_SUMMARY = [
    { stage:'Novo lead',        count: leads.filter((l:any)=>l.status==='Novo lead').length,        color:'bg-blue-400' },
    { stage:'Em atendimento',   count: leads.filter((l:any)=>l.status==='Em atendimento').length,   color:'bg-primary-400' },
    { stage:'Proposta enviada', count: leads.filter((l:any)=>l.status==='Proposta enviada').length, color:'bg-violet-400' },
    { stage:'Fechado ganho',    count: wonLeads,                                                    color:'bg-teal-400' },
    { stage:'Fechado perdido',  count: leads.filter((l:any)=>l.status==='Fechado perdido').length,  color:'bg-red-400' },
  ];

  // Date label
  const dateLabel = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});
  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const displayName = currentProfile?.full_name?.split(' ')[0] || currentProfile?.clinics?.brand_name || 'Admin';

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-slide-up">

      {/* Welcome Banner */}
      <div className="card bg-gradient-nucleus p-6 flex items-center justify-between overflow-hidden relative">
        <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none"/>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"/>
            <span className="text-xs text-white/50 font-medium capitalize">{dateLabel}</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">{greeting}, {displayName}!</h1>
          <p className="text-sm text-white/60">
            Você tem{' '}
            <span className="text-white font-semibold">{todayApts.length} consultas</span> e{' '}
            <span className="text-white font-semibold">{newLeadsToday.length} novos leads</span> hoje.
          </p>
        </div>
        <div className="relative z-10 hidden md:flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{fmt(monthReceipts)}</div>
            <div className="text-xs text-white/50">Receita este mês</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
            <TrendingUp size={22} className="text-teal-300"/>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map(m => (
          <Link key={m.label} to={metricRoutes[m.label] ?? '/'} className="card p-5 flex items-start gap-4 hover:shadow-card-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl ${m.bg} flex items-center justify-center flex-shrink-0`}>
              <m.icon size={20} className={m.text}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="metric-label">{m.label}</p>
              {isLoading
                ? <div className="h-7 w-16 bg-slate-100 rounded animate-pulse mt-1"/>
                : <p className="metric-value mt-0.5">{m.value}</p>
              }
            </div>
          </Link>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Leads */}
        <div className="lg:col-span-2 card p-5">
          <SectionHeader title="Leads Recentes" link="Ver todos" to="/crm/leads"/>
          {loadingLeads ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400"/></div>
          ) : leads.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Nenhum lead cadastrado ainda</div>
          ) : (
            <div className="space-y-2">
              {leads.slice(0,5).map((lead: any) => (
                <Link key={lead.id} to={`/crm/leads?lead=${lead.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className={`avatar-md ${avatarColor(lead.name)}`}>{initials(lead.name)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{lead.name}</span>
                      <span className={`badge ${STATUS_BADGE[lead.status]??'badge-gray'}`}>{lead.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{CHANNEL_ICONS[lead.origin]??'💬'} {lead.origin}</span>
                      {lead.specialty && <><span className="text-slate-300">·</span><span className="text-xs text-slate-500">{lead.specialty}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={11}/>
                    {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights (static for now) */}
        <div className="card p-5">
          <SectionHeader title="Nucleus AI"/>
          <div className="flex items-center gap-2 mb-4 p-3 bg-nucleus-50 rounded-xl border border-nucleus-100">
            <Brain size={16} className="text-nucleus-600 flex-shrink-0"/>
            <p className="text-xs text-nucleus-700 font-medium">Insights do sistema</p>
          </div>
          <div className="space-y-3">
            {[
              { type:'warning',     title:'Leads quentes', desc:`${leads.filter((l:any)=>l.temperature==='hot').length} leads quentes aguardando resposta.`, cls:'bg-amber-50 border-amber-100', textCls:'text-amber-700' },
              { type:'info',        title:'Tarefas pendentes', desc:`${pendingTasks.length} tarefas pendentes ou em progresso.`, cls:'bg-blue-50 border-blue-100', textCls:'text-primary-700' },
              { type:'opportunity', title:'Pacientes ativos', desc:`${patients.filter((p:any)=>p.status==='ativo').length} de ${patients.length} pacientes ativos.`, cls:'bg-teal-50 border-teal-100', textCls:'text-teal-700' },
            ].map((insight,i) => (
              <div key={i} className={`p-3.5 rounded-xl border ${insight.cls}`}>
                <div className="font-semibold mb-1 text-slate-800 text-sm">{insight.title}</div>
                <p className="text-slate-600 text-xs leading-relaxed">{insight.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Agenda de hoje */}
        <div className="lg:col-span-2 card p-5">
          <SectionHeader title="Agenda de Hoje" link="Ver agenda" to="/care/schedule"/>
          {loadingApts ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400"/></div>
          ) : todayApts.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Nenhuma consulta agendada para hoje</div>
          ) : (
            <div className="space-y-2">
              {todayApts.map((apt: any) => (
                <Link key={apt.id} to="/care/schedule" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-14 text-center flex-shrink-0">
                    <div className="text-sm font-bold text-slate-800">{apt.time.slice(0,5)}</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200 flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{apt.patientName}</div>
                    <div className="text-xs text-slate-500">{apt.specialty} · {apt.type}</div>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${apt.status==='confirmado'?'bg-teal-400':'bg-amber-400'}`}/>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Tasks + Pipeline */}
        <div className="space-y-5">
          {/* Tarefas pendentes */}
          <div className="card p-5">
            <SectionHeader title="Tarefas Pendentes" link="Ver todas" to="/crm/tasks"/>
            {loadingTasks ? (
              <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-400"/></div>
            ) : pendingTasks.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">Nenhuma tarefa pendente 🎉</div>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0,4).map((task: any) => (
                  <Link key={task.id} to="/crm/tasks" className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    {task.status==='concluida'
                      ? <CheckCircle2 size={16} className="text-teal-500 flex-shrink-0 mt-0.5"/>
                      : <Circle size={16} className={`flex-shrink-0 mt-0.5 ${task.priority==='urgente'||task.priority==='alta'?'text-red-400':'text-slate-300'}`}/>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{task.title}</p>
                      {task.priority==='urgente'&&<span className="text-[10px] text-red-500 font-semibold">URGENTE</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline mini */}
          <div className="card p-5">
            <SectionHeader title="Pipeline CRM" link="Abrir" to="/crm/pipeline"/>
            {loadingLeads ? (
              <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-slate-400"/></div>
            ) : (
              <div className="space-y-2">
                {PIPELINE_SUMMARY.map(({stage,count,color})=>(
                  <div key={stage} className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`}/>
                    <span className="text-xs text-slate-600 flex-1">{stage}</span>
                    <span className="text-xs font-bold text-slate-800">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Leads por status */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Pipeline — Leads por Etapa</h2>
          {loadingLeads ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-400"/></div>
          ) : leads.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Cadastre leads para visualizar o gráfico</div>
          ) : (() => {
            const stages = [
              { name:'Novo lead',       color:'#3b82f6' },
              { name:'Primeiro contato',color:'#8b5cf6' },
              { name:'Em atendimento',  color:'#6366f1' },
              { name:'Proposta enviada',color:'#06b6d4' },
              { name:'Fechado ganho',   color:'#10b981' },
              { name:'Fechado perdido', color:'#ef4444' },
            ];
            const data = stages
              .map(s => ({ name: s.name.replace(' ', '\n'), value: leads.filter((l:any)=>l.status===s.name).length, color: s.color }))
              .filter(d => d.value > 0);
            if (data.length === 0) return <div className="py-10 text-center text-sm text-slate-400">Nenhum lead por etapa ainda</div>;
            return (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {data.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v} leads`]}/>
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600">{v}</span>}/>
                </PieChart>
              </ResponsiveContainer>
            );
          })()}
        </div>

        {/* Financeiro — receita vs pendente */}
        <div className="card p-5">
          <h2 className="section-title mb-4">Financeiro — Receita por Status</h2>
          {loadingFin ? (
            <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-400"/></div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Cadastre cobranças para visualizar o gráfico</div>
          ) : (() => {
            const statuses = ['pago','pendente','atrasado','cancelado'];
            const colors: Record<string,string> = { pago:'#10b981', pendente:'#f59e0b', atrasado:'#ef4444', cancelado:'#94a3b8' };
            const data = statuses.map(s => ({
              name: s.charAt(0).toUpperCase()+s.slice(1),
              valor: transactions.filter((t:any)=>t.type==='receita'&&t.status===s).reduce((sum:number,t:any)=>sum+Number(t.amount),0),
              fill: colors[s],
            })).filter(d => d.valor > 0);
            if (data.length === 0) return <div className="py-10 text-center text-sm text-slate-400">Nenhuma receita registrada ainda</div>;
            return (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill:'#64748b' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 11, fill:'#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={(v:any) => [`R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}`]}/>
                  <Bar dataKey="valor" radius={[6,6,0,0]}>
                    {data.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label:'Leads',      icon:Users,        color:'text-primary-600 bg-primary-50' },
          { label:'WhatsApp',   icon:MessageSquare,color:'text-teal-600 bg-teal-50' },
          { label:'Prontuário', icon:FileText,     color:'text-violet-600 bg-violet-50' },
          { label:'Financeiro', icon:Wallet,       color:'text-gold-600 bg-gold-50' },
          { label:'Campanhas',  icon:Megaphone,    color:'text-rose-600 bg-rose-50' },
          { label:'Crescimento',icon:TrendingUp,   color:'text-emerald-600 bg-emerald-50' },
        ].map(({label,icon:Icon,color})=>(
          <Link key={label} to={quickRoutes[label] ?? '/care/records'} className="card p-4 flex flex-col items-center gap-2 hover:shadow-card-md transition-all hover:-translate-y-0.5">
            <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}><Icon size={18}/></div>
            <span className="text-xs font-medium text-slate-700 text-center">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
