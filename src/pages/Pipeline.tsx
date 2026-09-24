import { useState } from 'react';
import {
  AlertCircle, CalendarDays, Clock, DollarSign, Filter, Loader2, Mail,
  MapPin, MoreVertical, Phone, Settings2, Tag, UserRound, X,
} from 'lucide-react';
import { useLeads, useUpdateLead } from '../hooks/useLeads';
import type { Lead } from '../types';
import { TEAM_MEMBERS } from '../data/mockData';

const STAGES = [
  { id: 'Novo lead', color: 'bg-blue-400', dot: 'bg-blue-500' },
  { id: 'Primeiro contato', color: 'bg-slate-400', dot: 'bg-slate-500' },
  { id: 'Em atendimento', color: 'bg-primary-400', dot: 'bg-primary-500' },
  { id: 'Qualificação', color: 'bg-indigo-400', dot: 'bg-indigo-500' },
  { id: 'Proposta enviada', color: 'bg-violet-400', dot: 'bg-violet-500' },
  { id: 'Follow-up', color: 'bg-amber-400', dot: 'bg-amber-500' },
  { id: 'Fechado ganho', color: 'bg-teal-500', dot: 'bg-teal-600' },
  { id: 'Fechado perdido', color: 'bg-red-400', dot: 'bg-red-500' },
];

const TEMP_ICON: Record<string, string> = { hot: '🔥', warm: '☀️', cold: '❄️' };
const COLORS = ['bg-violet-500', 'bg-blue-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-gold-500', 'bg-emerald-500'];
const DEFAULT_VISIBLE_STAGES = STAGES.map(stage => stage.id);

const avatarColor = (name: string) => {
  let hash = 0;
  for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};
const initials = (name: string) => name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const isInsidePeriod = (dateValue: string, start: string, end: string) => {
  if (!start && !end) return true;
  const time = new Date(dateValue).getTime();
  if (!Number.isFinite(time)) return false;
  if (start && time < new Date(`${start}T00:00:00`).getTime()) return false;
  if (end && time > new Date(`${end}T23:59:59`).getTime()) return false;
  return true;
};

const sumValue = (items: Lead[]) => items.reduce((total, lead: any) => total + Number(lead.value ?? 0), 0);

function KanbanCard({
  lead,
  onMove,
  onOpen,
  stages,
}: {
  lead: Lead & Record<string, any>;
  onMove: (id: string, status: string) => void;
  onOpen: (lead: Lead & Record<string, any>) => void;
  stages: typeof STAGES;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className="kanban-card group relative cursor-grab active:cursor-grabbing"
      draggable
      onClick={() => onOpen(lead)}
      onDragStart={event => {
        event.dataTransfer.setData('text/plain', lead.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={`avatar-sm ${avatarColor(lead.name)}`}>{initials(lead.name)}</div>
          <div>
            <div className="text-sm font-semibold text-slate-800 leading-tight">{lead.name}</div>
            <div className="text-[11px] text-slate-500">{lead.specialty || lead.origin}</div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={event => { event.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={13} />
          </button>
          {showMenu && (
            <div onClick={event => event.stopPropagation()} className="absolute right-0 top-6 z-20 bg-white rounded-xl shadow-lg border border-slate-100 py-1 min-w-[160px]">
              {stages.filter(stage => stage.id !== lead.status).map(stage => (
                <button
                  key={stage.id}
                  onClick={() => { onMove(lead.id, stage.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                  {stage.id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span>{lead.origin}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock size={10} />{new Date(lead.createdAt).toLocaleDateString('pt-BR')}
          </span>
          <span className="text-xs">{TEMP_ICON[lead.temperature]}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
          <DollarSign size={10} className="text-teal-500" />
          {formatCurrency(Number(lead.value ?? 0))}
        </div>
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {lead.tags.map((tag: string) => (
            <span key={tag} className="badge badge-gray py-0.5 px-1.5 text-[10px] flex items-center gap-0.5">
              <Tag size={8} />{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${lead.score >= 80 ? 'bg-teal-500' : lead.score >= 60 ? 'bg-amber-400' : 'bg-slate-300'}`}
              style={{ width: `${lead.score}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500">{lead.score}</span>
        </div>
        {lead.responsible && (
          <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-[9px] font-bold text-primary-700">
            {lead.responsible.split(' ').map((word: string) => word[0]).join('').slice(0, 2)}
          </div>
        )}
        {lead.secondaryResponsible && (
          <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center text-[9px] font-bold text-teal-700" title={`Secundário: ${lead.secondaryResponsible}`}>
            {lead.secondaryResponsible.split(' ').map((word: string) => word[0]).join('').slice(0, 2)}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadDetailsModal({
  lead,
  stages,
  onClose,
  onMove,
  onUpdateValue,
}: {
  lead: Lead & Record<string, any>;
  stages: typeof STAGES;
  onClose: () => void;
  onMove: (id: string, status: string) => void;
  onUpdateValue: (id: string, value: number) => void;
}) {
  const [value, setValue] = useState(String(lead.value ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className={`avatar-lg ${avatarColor(lead.name)}`}>{initials(lead.name)}</div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{lead.name}</h2>
              <p className="text-sm text-slate-500">{lead.specialty || lead.origin || 'Lead comercial'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="label">Etapa</label>
            <select className="input" value={lead.status} onChange={event => onMove(lead.id, event.target.value)}>
              {stages.map(stage => <option key={stage.id}>{stage.id}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Valor de fechamento</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                className="input"
                value={value}
                onChange={event => setValue(event.target.value)}
                placeholder="0,00"
              />
              <button className="btn-primary btn-sm" onClick={() => onUpdateValue(lead.id, Number(value || 0))}>Salvar</button>
            </div>
          </div>

          <div>
            <label className="label">Temperatura</label>
            <div className="input flex items-center">{TEMP_ICON[lead.temperature] || '-'} <span className="ml-2 capitalize">{lead.temperature || 'Não informada'}</span></div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-sm text-slate-600">
            <Phone size={15} className="text-slate-400" />{lead.phone || 'Telefone não informado'}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-sm text-slate-600">
            <Mail size={15} className="text-slate-400" />{lead.email || 'E-mail não informado'}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-sm text-slate-600">
            <MapPin size={15} className="text-slate-400" />{lead.city || 'Cidade não informada'}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-sm text-slate-600">
            <UserRound size={15} className="text-slate-400" />{lead.responsible || lead.assignee || 'Responsável não informado'}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-sm text-slate-600">
            <UserRound size={15} className="text-teal-500" />{lead.secondaryResponsible || 'Profissional secundário não informado'}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-sm text-slate-600">
            <Mail size={15} className="text-primary-500" />Fluxo WhatsApp: {lead.flowOwner || lead.responsible || 'não definido'}
          </div>

          <div className="sm:col-span-2">
            <label className="label">Observações</label>
            <div className="min-h-[96px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">
              {lead.notes || 'Sem observações registradas.'}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 p-5">
          <button onClick={onClose} className="btn-secondary btn-sm">Fechar</button>
        </div>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { data: leads = [], isLoading, isError } = useLeads();
  const updateMut = useUpdateLead();
  const [dragOverStage, setDragOverStage] = useState('');
  const [selectedLead, setSelectedLead] = useState<(Lead & Record<string, any>) | null>(null);
  const [localStages, setLocalStages] = useState<Record<string, string>>({});
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const [moveError, setMoveError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [compareStart, setCompareStart] = useState('');
  const [compareEnd, setCompareEnd] = useState('');
  const [tempFilter, setTempFilter] = useState('Todos');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [secondaryFilter, setSecondaryFilter] = useState('');
  const [flowFilter, setFlowFilter] = useState('');
  const [visibleStageIds, setVisibleStageIds] = useState<string[]>(DEFAULT_VISIBLE_STAGES);

  const handleMove = async (id: string, newStatus: string) => {
    const previousStatus = localStages[id] ?? leads.find((lead: any) => lead.id === id)?.status;
    setMoveError('');
    setLocalStages(prev => ({ ...prev, [id]: newStatus }));
    setSelectedLead(prev => prev?.id === id ? { ...prev, status: newStatus, stage: newStatus } : prev);

    try {
      await updateMut.mutateAsync({ id, data: { status: newStatus } });
    } catch (error: any) {
      setLocalStages(prev => ({ ...prev, [id]: previousStatus ?? 'Novo lead' }));
      setSelectedLead(prev => prev?.id === id ? { ...prev, status: previousStatus ?? 'Novo lead', stage: previousStatus ?? 'Novo lead' } : prev);
      setMoveError(error?.message ?? 'Não foi possível mover o lead.');
    }
  };

  const handleUpdateValue = async (id: string, value: number) => {
    setMoveError('');
    const previousValue = localValues[id] ?? Number(leads.find((lead: any) => lead.id === id)?.value ?? 0);
    setLocalValues(prev => ({ ...prev, [id]: value }));
    setSelectedLead(prev => prev?.id === id ? { ...prev, value } : prev);

    try {
      const lead = leads.find((item: any) => item.id === id);
      await updateMut.mutateAsync({ id, data: { ...lead, value } });
    } catch (error: any) {
      setLocalValues(prev => ({ ...prev, [id]: previousValue }));
      setSelectedLead(prev => prev?.id === id ? { ...prev, value: previousValue } : prev);
      setMoveError(error?.message ?? 'Não foi possível atualizar o valor.');
    }
  };

  const displayedLeads = leads.map((lead: any) => ({
    ...lead,
    status: localStages[lead.id] ?? lead.status,
    value: localValues[lead.id] ?? Number(lead.value ?? 0),
  }));

  const periodLeads = displayedLeads.filter((lead: any) =>
    isInsidePeriod(lead.createdAt, periodStart, periodEnd)
    && (tempFilter === 'Todos' || lead.temperature === tempFilter)
    && (!responsibleFilter || lead.responsible === responsibleFilter)
    && (!secondaryFilter || lead.secondaryResponsible === secondaryFilter)
    && (!flowFilter || (lead.flowOwner || lead.responsible) === flowFilter)
  );
  const comparisonLeads = displayedLeads.filter((lead: any) =>
    isInsidePeriod(lead.createdAt, compareStart, compareEnd)
    && (tempFilter === 'Todos' || lead.temperature === tempFilter)
    && (!responsibleFilter || lead.responsible === responsibleFilter)
    && (!secondaryFilter || lead.secondaryResponsible === secondaryFilter)
    && (!flowFilter || (lead.flowOwner || lead.responsible) === flowFilter)
  );
  const visibleStages = STAGES.filter(stage => visibleStageIds.includes(stage.id));
  const activeFilterCount = [periodStart || periodEnd, compareStart || compareEnd, tempFilter !== 'Todos', responsibleFilter, secondaryFilter, flowFilter, visibleStageIds.length !== STAGES.length].filter(Boolean).length;
  const wonLeads = periodLeads.filter((lead: any) => lead.status === 'Fechado ganho');
  const openLeads = periodLeads.filter((lead: any) => !['Fechado ganho', 'Fechado perdido'].includes(lead.status));
  const comparisonWonLeads = comparisonLeads.filter((lead: any) => lead.status === 'Fechado ganho');
  const openValue = sumValue(openLeads);
  const wonValue = sumValue(wonLeads);
  const comparisonWonValue = sumValue(comparisonWonLeads);

  const toggleStageVisibility = (stageId: string) => {
    setVisibleStageIds(prev => {
      if (prev.includes(stageId)) return prev.filter(id => id !== stageId);
      return [...prev, stageId];
    });
  };

  const clearFilters = () => {
    setPeriodStart('');
    setPeriodEnd('');
    setCompareStart('');
    setCompareEnd('');
    setTempFilter('Todos');
    setResponsibleFilter('');
    setSecondaryFilter('');
    setFlowFilter('');
    setVisibleStageIds(DEFAULT_VISIBLE_STAGES);
  };

  return (
    <div className="p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pipeline Comercial</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading ? 'Carregando...' : `${periodLeads.length} leads · ${wonLeads.length} fechados`}
          </p>
        </div>
        <button
          className={`btn-secondary btn-sm ${showFilters || activeFilterCount ? 'ring-2 ring-primary-100 text-primary-700' : ''}`}
          onClick={() => setShowFilters(prev => !prev)}
        >
          <Filter size={14} /> Filtros
          {activeFilterCount > 0 && <span className="ml-1 rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="card p-4 mb-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Filtros do pipeline</h3>
              <p className="text-xs text-slate-500">Filtre por período, compare resultados e escolha quais colunas aparecem.</p>
            </div>
            <button onClick={clearFilters} className="btn-secondary btn-sm">Limpar filtros</button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_220px]">
            <div className="rounded-xl border border-slate-100 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700"><CalendarDays size={13} /> Período principal</div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="input" value={periodStart} onChange={event => setPeriodStart(event.target.value)} />
                <input type="date" className="input" value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700"><CalendarDays size={13} /> Período de comparação</div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="input" value={compareStart} onChange={event => setCompareStart(event.target.value)} />
                <input type="date" className="input" value={compareEnd} onChange={event => setCompareEnd(event.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Temperatura</label>
              <select className="input" value={tempFilter} onChange={event => setTempFilter(event.target.value)}>
                <option value="Todos">Todas</option>
                <option value="hot">Quente</option>
                <option value="warm">Morno</option>
                <option value="cold">Frio</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="label">Responsável principal</label>
              <select className="input" value={responsibleFilter} onChange={event => setResponsibleFilter(event.target.value)}>
                <option value="">Todos</option>
                {TEAM_MEMBERS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Profissional secundário</label>
              <select className="input" value={secondaryFilter} onChange={event => setSecondaryFilter(event.target.value)}>
                <option value="">Todos</option>
                {TEAM_MEMBERS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fluxo WhatsApp</label>
              <select className="input" value={flowFilter} onChange={event => setFlowFilter(event.target.value)}>
                <option value="">Todos</option>
                {TEAM_MEMBERS.map(name => <option key={name}>{name}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-100 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-700"><Settings2 size={13} /> Colunas visíveis</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {STAGES.map(stage => (
                <label key={stage.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={visibleStageIds.includes(stage.id)} onChange={() => toggleStageVisibility(stage.id)} />
                  <span>{stage.id}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 mb-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Valor em aberto</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(openValue)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Valor fechado</div>
          <div className="mt-1 text-xl font-bold text-teal-700">{formatCurrency(wonValue)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Comparação fechados</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{comparisonWonLeads.length} leads</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Comparação valor fechado</div>
          <div className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(comparisonWonValue)}</div>
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />Erro ao carregar pipeline.
        </div>
      )}
      {moveError && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />{moveError}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="overflow-x-auto no-scrollbar pb-4">
          <div className="flex gap-3 min-w-max">
            {visibleStages.map(stage => {
              const stageLeads = periodLeads.filter((lead: any) => lead.status === stage.id);
              const stageValue = sumValue(stageLeads);
              return (
                <div
                  key={stage.id}
                  className={`kanban-column rounded-2xl transition-colors ${dragOverStage === stage.id ? 'bg-primary-50/60 ring-2 ring-primary-200' : ''}`}
                  onDragOver={event => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverStage(stage.id);
                  }}
                  onDragLeave={() => setDragOverStage('')}
                  onDrop={event => {
                    event.preventDefault();
                    const leadId = event.dataTransfer.getData('text/plain');
                    setDragOverStage('');
                    if (leadId) handleMove(leadId, stage.id);
                  }}
                >
                  <div className="mb-3 px-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                        <span className="text-xs font-semibold text-slate-700">{stage.id}</span>
                        <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {stageLeads.length}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-slate-500">{formatCurrency(stageValue)}</div>
                  </div>

                  <div className="space-y-2 flex-1">
                    {stageLeads.map((lead: any) => (
                      <KanbanCard key={lead.id} lead={lead} onMove={handleMove} onOpen={setSelectedLead} stages={visibleStages} />
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-400">Sem leads</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          stages={STAGES}
          onClose={() => setSelectedLead(null)}
          onMove={handleMove}
          onUpdateValue={handleUpdateValue}
        />
      )}
    </div>
  );
}
