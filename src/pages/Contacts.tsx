import { useState } from 'react';
import {
  Search, Filter, Plus, Phone, MapPin, Trash2, Edit2,
  X, Loader2, AlertCircle, Users, TrendingUp, MessageSquare, ArrowUpRight,
} from 'lucide-react';
import { useLeads, useInsertLead, useUpdateLead, useDeleteLead } from '../hooks/useLeads';
import type { Lead } from '../types';
import { TEAM_MEMBERS } from '../data/mockData';

const LEAD_STATUS = ['Novo lead','Primeiro contato','Em atendimento','Qualificação','Proposta enviada','Follow-up','Fechado ganho','Fechado perdido'];
const ORIGINS = ['WhatsApp','Instagram','Facebook','Site','Anúncio','Indicação','Orgânico','Outro'];
const SPECIALTIES = ['Psicologia','Nutrição','Fisioterapia','Psiquiatria','Odontologia','Medicina','Estética','Outro'];

const TEMP: Record<string, { label: string; cls: string }> = {
  hot:  { label: '🔥 Quente', cls: 'badge bg-red-50 text-red-600' },
  warm: { label: '☀️ Morno',  cls: 'badge bg-amber-50 text-amber-600' },
  cold: { label: '❄️ Frio',   cls: 'badge bg-blue-50 text-blue-600' },
};
const STATUS_BADGE: Record<string, string> = {
  'Novo lead':'badge-blue','Primeiro contato':'badge-gray','Em atendimento':'badge-purple',
  'Qualificação':'badge-gold','Proposta enviada':'badge-purple','Follow-up':'badge-gray',
  'Fechado ganho':'badge-green','Fechado perdido':'badge bg-red-50 text-red-600',
};
const COLORS = ['bg-violet-500','bg-blue-500','bg-teal-500','bg-indigo-500','bg-rose-500','bg-gold-500'];
const avatarColor = (n: string) => { let h=0; for(const c of n) h=n.charCodeAt(0)+((h<<5)-h); return COLORS[Math.abs(h)%COLORS.length]; };
const initials = (n: string) => n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-teal-500' : score >= 60 ? 'bg-gold-500' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-7 text-right">{score}</span>
    </div>
  );
}

const BLANK: Omit<Lead,'id'|'createdAt'|'updatedAt'> = {
  name:'', phone:'', email:'', city:'', origin:'WhatsApp', specialty:'',
  status:'Novo lead', temperature:'warm', score:50, responsible:'', secondaryResponsible:'', flowOwner:'', tags:[], notes:'',
};

function LeadForm({ initial, onSave, onClose, loading, error, isEdit }: {
  initial: Omit<Lead,'id'|'createdAt'|'updatedAt'>; onSave:(l:any)=>void;
  onClose:()=>void; loading:boolean; error?:string; isEdit?:boolean;
}) {
  const [f, setF] = useState(initial);
  const s = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{isEdit ? 'Editar Lead' : 'Novo Lead'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18}/></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle size={14}/>{error}</div>}
          <div><label className="label">Nome *</label><input className="input" value={f.name} onChange={e=>s('name',e.target.value)} placeholder="Ex: Mariana Costa"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Telefone</label><input className="input" value={f.phone} onChange={e=>s('phone',e.target.value)}/></div>
            <div><label className="label">E-mail</label><input className="input" value={f.email} onChange={e=>s('email',e.target.value)}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Cidade</label><input className="input" value={f.city} onChange={e=>s('city',e.target.value)}/></div>
            <div><label className="label">Origem</label><select className="input" value={f.origin} onChange={e=>s('origin',e.target.value)}>{ORIGINS.map(o=><option key={o}>{o}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Especialidade</label><select className="input" value={f.specialty} onChange={e=>s('specialty',e.target.value)}><option value="">Selecione...</option>{SPECIALTIES.map(o=><option key={o}>{o}</option>)}</select></div>
            <div><label className="label">Status</label><select className="input" value={f.status} onChange={e=>s('status',e.target.value)}>{LEAD_STATUS.map(o=><option key={o}>{o}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Temperatura</label><select className="input" value={f.temperature} onChange={e=>s('temperature',e.target.value)}><option value="hot">🔥 Quente</option><option value="warm">☀️ Morno</option><option value="cold">❄️ Frio</option></select></div>
            <div><label className="label">Score (0-100)</label><input type="number" min={0} max={100} className="input" value={f.score} onChange={e=>s('score',Number(e.target.value))}/></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Responsável principal</label>
              <select className="input" value={f.responsible} onChange={e=>s('responsible',e.target.value)}>
                <option value="">Selecione...</option>
                {TEAM_MEMBERS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Profissional secundário</label>
              <select className="input" value={f.secondaryResponsible ?? ''} onChange={e=>s('secondaryResponsible',e.target.value)}>
                <option value="">Sem secundário</option>
                {TEAM_MEMBERS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Fluxo WhatsApp</label>
            <select className="input" value={f.flowOwner ?? ''} onChange={e=>s('flowOwner',e.target.value)}>
              <option value="">Usar responsável principal</option>
              {TEAM_MEMBERS.map(name => <option key={name}>{name}</option>)}
            </select>
          </div>
          <div><label className="label">Observações</label><textarea className="input resize-none" rows={3} value={f.notes} onChange={e=>s('notes',e.target.value)}/></div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={()=>onSave(f)} disabled={loading||!f.name.trim()} className="btn-primary min-w-[120px] justify-center">
            {loading?<><Loader2 size={15} className="animate-spin"/>Salvando...</>:isEdit?'Salvar':'Cadastrar lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Contacts() {
  const { data: leads=[], isLoading, isError } = useLeads();
  const insertMut = useInsertLead();
  const updateMut = useUpdateLead();
  const deleteMut = useDeleteLead();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [tempFilter, setTempFilter] = useState('Todos');
  const [originFilter, setOriginFilter] = useState('Todos');
  const [specialtyFilter, setSpecialtyFilter] = useState('Todos');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [secondaryFilter, setSecondaryFilter] = useState('');
  const [flowFilter, setFlowFilter] = useState('');
  const [minScore, setMinScore] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Lead|null>(null);
  const [deleting, setDeleting] = useState<Lead|null>(null);
  const [formError, setFormError] = useState('');

  const filtered = leads.filter(l => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q
      || l.name.toLowerCase().includes(q)
      || (l.phone ?? '').toLowerCase().includes(q)
      || (l.email ?? '').toLowerCase().includes(q)
      || (l.city ?? '').toLowerCase().includes(q)
      || (l.specialty ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'Todos' || l.status === statusFilter;
    const matchesTemp = tempFilter === 'Todos' || l.temperature === tempFilter;
    const matchesOrigin = originFilter === 'Todos' || l.origin === originFilter || l.channel === originFilter;
    const matchesSpecialty = specialtyFilter === 'Todos' || l.specialty === specialtyFilter;
    const matchesResponsible = !responsibleFilter.trim() || (l.responsible ?? '').toLowerCase().includes(responsibleFilter.toLowerCase().trim());
    const matchesSecondary = !secondaryFilter.trim() || (l.secondaryResponsible ?? '').toLowerCase().includes(secondaryFilter.toLowerCase().trim());
    const matchesFlow = !flowFilter.trim() || (l.flowOwner || l.responsible || '').toLowerCase().includes(flowFilter.toLowerCase().trim());
    const matchesScore = !minScore || Number(l.score ?? 0) >= Number(minScore);

    return matchesSearch && matchesStatus && matchesTemp && matchesOrigin && matchesSpecialty && matchesResponsible && matchesSecondary && matchesFlow && matchesScore;
  });
  const activeFilterCount = [
    statusFilter !== 'Todos',
    tempFilter !== 'Todos',
    originFilter !== 'Todos',
    specialtyFilter !== 'Todos',
    !!responsibleFilter.trim(),
    !!secondaryFilter.trim(),
    !!flowFilter.trim(),
    !!minScore,
  ].filter(Boolean).length;
  const clearFilters = () => {
    setStatusFilter('Todos');
    setTempFilter('Todos');
    setOriginFilter('Todos');
    setSpecialtyFilter('Todos');
    setResponsibleFilter('');
    setSecondaryFilter('');
    setFlowFilter('');
    setMinScore('');
  };

  const handleInsert = async (form: any) => {
    setFormError(''); try { await insertMut.mutateAsync(form); setShowForm(false); }
    catch(e:any){setFormError(e.message??'Erro ao salvar.');}
  };
  const handleUpdate = async (form: any) => {
    if(!editing)return; setFormError('');
    try { await updateMut.mutateAsync({id:editing.id,data:form}); setEditing(null); }
    catch(e:any){setFormError(e.message??'Erro ao salvar.');}
  };
  const handleDelete = async () => {
    if(!deleting)return;
    try { await deleteMut.mutateAsync(deleting.id); setDeleting(null); } catch{}
  };

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">{isLoading?'Carregando...':`${leads.length} leads · ${leads.filter(l=>l.temperature==='hot').length} quentes`}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`btn-secondary btn-sm ${showFilters || activeFilterCount ? 'ring-2 ring-primary-100 text-primary-700' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter size={14}/> Filtros
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
            )}
          </button>
          <button className="btn-primary btn-sm" onClick={()=>{setShowForm(true);setFormError('');}}><Plus size={14}/> Novo Lead</button>
        </div>
      </div>

      {showFilters && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Filtros avançados</h3>
              <p className="text-xs text-slate-500">Refine a lista sem alterar os dados dos leads.</p>
            </div>
            <button onClick={clearFilters} className="btn-secondary btn-sm">Limpar filtros</button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                {['Todos', ...LEAD_STATUS].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Temperatura</label>
              <select className="input" value={tempFilter} onChange={e=>setTempFilter(e.target.value)}>
                <option value="Todos">Todas</option>
                <option value="hot">Quente</option>
                <option value="warm">Morno</option>
                <option value="cold">Frio</option>
              </select>
            </div>
            <div>
              <label className="label">Origem</label>
              <select className="input" value={originFilter} onChange={e=>setOriginFilter(e.target.value)}>
                {['Todos', ...ORIGINS].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Especialidade</label>
              <select className="input" value={specialtyFilter} onChange={e=>setSpecialtyFilter(e.target.value)}>
                {['Todos', ...SPECIALTIES].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Score mínimo</label>
              <input type="number" min={0} max={100} className="input" value={minScore} onChange={e=>setMinScore(e.target.value)} placeholder="0"/>
            </div>
            <div>
              <label className="label">Responsável principal</label>
              <select className="input" value={responsibleFilter} onChange={e=>setResponsibleFilter(e.target.value)}>
                <option value="">Todos</option>
                {TEAM_MEMBERS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Profissional secundário</label>
              <select className="input" value={secondaryFilter} onChange={e=>setSecondaryFilter(e.target.value)}>
                <option value="">Todos</option>
                {TEAM_MEMBERS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fluxo WhatsApp</label>
              <select className="input" value={flowFilter} onChange={e=>setFlowFilter(e.target.value)}>
                <option value="">Todos</option>
                {TEAM_MEMBERS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Total',value:leads.length,color:'text-primary-600 bg-primary-50',icon:Users},
          {label:'Quentes',value:leads.filter(l=>l.temperature==='hot').length,color:'text-red-600 bg-red-50',icon:TrendingUp},
          {label:'Em atendimento',value:leads.filter(l=>l.status==='Em atendimento').length,color:'text-teal-600 bg-teal-50',icon:MessageSquare},
          {label:'Proposta',value:leads.filter(l=>l.status==='Proposta enviada').length,color:'text-violet-600 bg-violet-50',icon:ArrowUpRight},
        ].map(({label,value,color,icon:Icon})=>(
          <div key={label} className="card px-4 py-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}><Icon size={15}/></div>
            <div><div className="text-lg font-bold text-slate-900">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-9" placeholder="Buscar leads..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-1 flex-wrap">
          {['Todos',...LEAD_STATUS.slice(0,5)].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter===s?'bg-primary-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s}</button>
          ))}
        </div>
      </div>

      {isError&&<div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle size={16}/>Erro ao carregar leads.</div>}

      <div className="card overflow-hidden">
        {isLoading?(
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={28} className="animate-spin"/><span className="text-sm">Carregando leads...</span></div>
        ):filtered.length===0?(
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><Users size={24} className="text-slate-400"/></div>
            <p className="font-medium text-slate-700 mb-1">{search?'Nenhum lead encontrado':'Nenhum lead cadastrado'}</p>
            <p className="text-sm text-slate-400 mb-4">{search || activeFilterCount ? 'Tente outros termos ou limpe os filtros':'Cadastre o primeiro lead'}</p>
            {!search&&<button className="btn-primary btn-sm" onClick={()=>setShowForm(true)}><Plus size={14}/> Novo Lead</button>}
          </div>
        ):(
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50/50">
              <tr>{['Lead','Contato','Serviço','Status','Score','Temp.','Responsáveis',''].map(h=><th key={h} className="table-head py-3 px-4 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(lead=>(
                <tr key={lead.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className={`avatar-sm ${avatarColor(lead.name)} flex-shrink-0`}>{initials(lead.name)}</div>
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{lead.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={10}/>{lead.city||'—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-xs text-slate-600"><Phone size={10}/>{lead.phone||'—'}</div>
                      <div className="text-xs text-slate-400">{lead.origin}</div>
                    </div>
                  </td>
                  <td className="table-cell"><span className="text-sm text-slate-700">{lead.specialty||'—'}</span></td>
                  <td className="table-cell"><span className={`badge ${STATUS_BADGE[lead.status]??'badge-gray'}`}>{lead.status}</span></td>
                  <td className="table-cell w-32"><ScoreBar score={lead.score}/></td>
                  <td className="table-cell"><span className={TEMP[lead.temperature]?.cls}>{TEMP[lead.temperature]?.label}</span></td>
                  <td className="table-cell">
                    <div className="text-xs text-slate-600">{lead.responsible || '—'}</div>
                    {lead.secondaryResponsible && <div className="text-[11px] text-slate-400">Sec.: {lead.secondaryResponsible}</div>}
                    {lead.flowOwner && <div className="text-[11px] text-primary-600">Fluxo: {lead.flowOwner}</div>}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>{setEditing(lead);setFormError('');}} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={13}/></button>
                      <button onClick={()=>setDeleting(lead)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm&&<LeadForm initial={BLANK} onSave={handleInsert} onClose={()=>setShowForm(false)} loading={insertMut.isPending} error={formError}/>}
      {editing&&<LeadForm isEdit initial={{name:editing.name,phone:editing.phone??'',email:editing.email??'',city:editing.city??'',origin:editing.origin,specialty:editing.specialty??'',status:editing.status,temperature:editing.temperature,score:editing.score,responsible:editing.responsible??'',secondaryResponsible:editing.secondaryResponsible??'',flowOwner:editing.flowOwner??'',tags:editing.tags??[],notes:editing.notes??''}} onSave={handleUpdate} onClose={()=>setEditing(null)} loading={updateMut.isPending} error={formError}/>}
      {deleting&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-600"/></div>
            <h3 className="text-base font-semibold text-slate-900 text-center mb-1">Excluir lead</h3>
            <p className="text-sm text-slate-500 text-center mb-5">Tem certeza que deseja excluir <strong>{deleting.name}</strong>?</p>
            <div className="flex gap-2">
              <button onClick={()=>setDeleting(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleDelete} disabled={deleteMut.isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all disabled:opacity-60">
                {deleteMut.isPending?<Loader2 size={15} className="animate-spin"/>:<Trash2 size={15}/>}Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
