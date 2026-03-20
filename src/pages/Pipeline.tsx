import { useState, useEffect, useCallback } from 'react';
import {
  Plus, MoreHorizontal, DollarSign, User, ChevronRight, ChevronLeft,
  X, Search, AlignLeft, TrendingUp, MessageCircle, Loader2,
} from 'lucide-react';
import { TEAM_MEMBERS } from '../data/mockData';
import { dealsDb, channelsDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Deal, DealStage } from '../types';

/* ─── Funnel type ─────────────────────────────────────────────────────────── */
interface Funnel { id: string; name: string; color: string; }

const FUNNEL_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#0891b2','#be185d','#0d9488'];

/* ─── Stages ──────────────────────────────────────────────────────────────── */
const STAGES: { id: DealStage; label: string; color: string; dot: string }[] = [
  { id: 'new',         label: 'Novo Lead',    color: 'bg-slate-50',   dot: 'bg-slate-400' },
  { id: 'qualifying',  label: 'Qualificando', color: 'bg-blue-50',    dot: 'bg-blue-400' },
  { id: 'proposal',    label: 'Proposta',     color: 'bg-yellow-50',  dot: 'bg-yellow-400' },
  { id: 'negotiation', label: 'Negociação',   color: 'bg-orange-50',  dot: 'bg-orange-400' },
  { id: 'won',         label: 'Ganho ✅',     color: 'bg-emerald-50', dot: 'bg-emerald-400' },
  { id: 'lost',        label: 'Perdido ❌',   color: 'bg-red-50',     dot: 'bg-red-400' },
];
const STAGE_ORDER = STAGES.map(s => s.id);

interface NewDeal { title: string; contactName: string; company: string; value: string; assignee: string; }
const EMPTY_DEAL: NewDeal = { title: '', contactName: '', company: '', value: '', assignee: TEAM_MEMBERS[0] };

/* ─── Props ───────────────────────────────────────────────────────────────── */
interface Props {
  selectedChannelId: string | null;
  onChannelChange: (id: string | null) => void;
  onOpenChat?: (contactName: string, channelId: string) => void;
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Pipeline({ selectedChannelId, onChannelChange, onOpenChat }: Props) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFunnelId, setActiveFunnelId] = useState<string | null>(selectedChannelId);
  const [funnelSearch, setFunnelSearch] = useState('');
  const [showAddFunnel, setShowAddFunnel] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewDeal>(EMPTY_DEAL);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    const [dealsData, channelsData] = await Promise.all([dealsDb.getAll(), channelsDb.getAll()]);
    setDeals(dealsData);
    setFunnels(channelsData.map(ch => ({ id: ch.id, name: ch.name, color: ch.color })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* derived */
  const activeFunnel = funnels.find(f => f.id === activeFunnelId) ?? null;
  const visibleDeals = activeFunnelId
    ? deals.filter(d => d.channelId === activeFunnelId)
    : deals;
  const filteredFunnels = funnels.filter(f =>
    f.name.toLowerCase().includes(funnelSearch.toLowerCase())
  );

  /* stats */
  const totalValue = visibleDeals.reduce((s, d) => s + d.value, 0);
  const wonValue   = visibleDeals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0);

  /* handlers */
  const selectFunnel = (id: string | null) => {
    setActiveFunnelId(id);
    onChannelChange(id);
    setSelectedDeal(null);
  };

  const addFunnel = async () => {
    const name = newFunnelName.trim();
    if (!name) return;
    const color = FUNNEL_COLORS[funnels.length % FUNNEL_COLORS.length];
    const nf: Funnel = { id: `fn${Date.now()}`, name, color };
    setFunnels(prev => [...prev, nf]);
    setNewFunnelName('');
    setShowAddFunnel(false);
    selectFunnel(nf.id);
    // Persist to Supabase as a WhatsApp channel record
    if (isSupabaseConfigured) {
      await channelsDb.upsert({
        id: nf.id, name: nf.name, number: '', status: 'disconnected',
        color: nf.color, assignee: '', leadsCount: 0, messagesCount: 0,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const moveStage = async (dealId: string, dir: 'prev' | 'next') => {
    const updated = deals.map(d => {
      if (d.id !== dealId) return d;
      const idx = STAGE_ORDER.indexOf(d.stage);
      const ni = dir === 'next' ? Math.min(idx + 1, STAGE_ORDER.length - 1) : Math.max(idx - 1, 0);
      return { ...d, stage: STAGE_ORDER[ni], updatedAt: new Date().toISOString().split('T')[0] };
    });
    setDeals(updated);
    const changed = updated.find(d => d.id === dealId);
    if (changed) await dealsDb.upsert(changed);
  };

  const addDeal = async () => {
    if (!form.title || !form.contactName) return;
    const fid = activeFunnelId ?? funnels[0]?.id ?? '';
    const nd: Deal = {
      id: `d${Date.now()}`, title: form.title, contactId: '', contactName: form.contactName,
      company: form.company, value: Number(form.value) || 0, stage: 'new',
      assignee: form.assignee, probability: 15,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      channelId: fid,
    };
    await dealsDb.upsert(nd);
    setDeals(prev => [nd, ...prev]);
    setForm(EMPTY_DEAL);
    setShowModal(false);
  };

  /* ── render ─────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT FUNNEL SIDEBAR ─────────────────────────────────────────────── */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">

        {/* header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Leads</p>
          <p className="text-xs text-gray-400 mt-0.5">{deals.length} negócios no total</p>
        </div>

        {/* search */}
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={funnelSearch}
              onChange={e => setFunnelSearch(e.target.value)}
              placeholder="Buscar funil..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50"
            />
          </div>
        </div>

        {/* funnels list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {filteredFunnels.map(funnel => {
            const count  = deals.filter(d => d.channelId === funnel.id).length;
            const isActive = activeFunnelId === funnel.id;
            return (
              <button
                key={funnel.id}
                onClick={() => selectFunnel(funnel.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all group ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: funnel.color }} />
                <span
                  className={`text-sm flex-1 truncate ${isActive ? 'font-semibold' : 'font-medium'}`}
                  style={isActive ? { color: funnel.color } : {}}
                >
                  {funnel.name}
                </span>
                {count > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-medium flex-shrink-0 ${
                    isActive ? 'text-primary-600 bg-primary-100' : 'text-gray-400 bg-gray-100'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {filteredFunnels.length === 0 && funnelSearch && (
            <p className="text-xs text-gray-400 px-3 py-4 text-center">Nenhum funil encontrado</p>
          )}
        </div>

        {/* add funnel */}
        <div className="px-3 py-2 border-t border-gray-100">
          {showAddFunnel ? (
            <div className="space-y-1.5">
              <input
                autoFocus
                value={newFunnelName}
                onChange={e => setNewFunnelName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addFunnel(); if (e.key === 'Escape') { setShowAddFunnel(false); setNewFunnelName(''); } }}
                placeholder="Nome do funil..."
                className="w-full text-xs border border-primary-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <div className="flex gap-1.5">
                <button onClick={addFunnel} className="flex-1 bg-primary-600 text-white text-xs rounded-lg py-1.5 font-medium hover:bg-primary-700 transition-colors">Criar</button>
                <button onClick={() => { setShowAddFunnel(false); setNewFunnelName(''); }} className="flex-1 border border-gray-300 text-gray-600 text-xs rounded-lg py-1.5 hover:bg-gray-50 transition-colors">Cancelar</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddFunnel(true)}
              className="w-full flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 py-1.5 rounded-lg hover:bg-primary-50 px-2 transition-colors"
            >
              <Plus size={13} /> Adicionar funil de vendas
            </button>
          )}
        </div>

        {/* todos os leads */}
        <div className="border-t border-gray-200 px-3 py-2">
          <button
            onClick={() => selectFunnel(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              !activeFunnelId ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <AlignLeft size={14} />
            <span>Todos os leads</span>
            <span className="ml-auto text-xs text-gray-400">{deals.length}</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN KANBAN AREA ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* top bar */}
        <div className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-5 text-sm">
            {activeFunnel ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeFunnel.color }} />
                <span className="font-semibold text-gray-800">{activeFunnel.name}</span>
              </div>
            ) : (
              <span className="font-semibold text-gray-800">Todos os funis</span>
            )}
            <div className="flex items-center gap-1 text-gray-400">
              <TrendingUp size={14} />
              <span>Pipeline: <strong className="text-gray-700">R$ {totalValue.toLocaleString('pt-BR')}</strong></span>
            </div>
            <span className="text-gray-400">
              Ganho: <strong className="text-emerald-600">R$ {wonValue.toLocaleString('pt-BR')}</strong>
            </span>
            <span className="text-gray-400">{visibleDeals.length} negócio{visibleDeals.length !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus size={15} /> Novo Negócio
          </button>
        </div>

        {/* kanban board */}
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-3 h-full min-w-max">
            {STAGES.map(stage => {
              const stageDeals = visibleDeals.filter(d => d.stage === stage.id);
              const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
              return (
                <div key={stage.id} className={`w-60 flex flex-col rounded-xl ${stage.color} border border-gray-200`}>
                  {/* column header */}
                  <div className="px-3 py-2.5 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                        <span className="text-xs font-semibold text-gray-700">{stage.label}</span>
                      </div>
                      <span className="bg-white text-gray-600 text-xs font-semibold px-1.5 py-0.5 rounded-full border border-gray-200">
                        {stageDeals.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 pl-4">R$ {stageTotal.toLocaleString('pt-BR')}</p>
                  </div>

                  {/* cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {stageDeals.map(deal => {
                      const funnel = funnels.find(f => f.id === deal.channelId);
                      return (
                        <div
                          key={deal.id}
                          onClick={() => setSelectedDeal(deal)}
                          className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-primary-200 transition-all"
                        >
                          <div className="flex items-start justify-between mb-1.5">
                            <p className="text-sm font-medium text-gray-800 line-clamp-2 flex-1 leading-snug">{deal.title}</p>
                            <div className="flex items-center gap-0.5 ml-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                              {onOpenChat && (
                                <button
                                  title="Abrir conversa"
                                  onClick={() => { onOpenChat(deal.contactName, deal.channelId); }}
                                  className="text-gray-300 hover:text-emerald-500 p-0.5 rounded transition-colors"
                                >
                                  <MessageCircle size={13} />
                                </button>
                              )}
                              <button className="text-gray-300 hover:text-gray-500 p-0.5 rounded transition-colors">
                                <MoreHorizontal size={14} />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mb-2">{deal.company}</p>

                          {/* funnel tag */}
                          {funnel && !activeFunnelId && (
                            <div className="mb-2">
                              <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ backgroundColor: funnel.color + '18', color: funnel.color }}>
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: funnel.color }} />
                                {funnel.name}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-emerald-600">
                              <DollarSign size={11} />
                              <span className="text-xs font-semibold">R$ {deal.value.toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-400">
                              <User size={11} />
                              <span className="text-xs">{deal.assignee.split(' ')[0]}</span>
                            </div>
                          </div>

                          {/* prob bar */}
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-gray-300">Prob.</span>
                              <span className="text-xs text-gray-400 font-medium">{deal.probability}%</span>
                            </div>
                            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${deal.probability}%` }} />
                            </div>
                          </div>

                          {/* move buttons */}
                          <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => moveStage(deal.id, 'prev')} className="flex-1 flex items-center justify-center gap-0.5 text-xs text-gray-300 hover:text-gray-600 hover:bg-gray-50 rounded py-0.5 transition-colors">
                              <ChevronLeft size={11} /> Voltar
                            </button>
                            <div className="w-px h-3 bg-gray-100" />
                            <button onClick={() => moveStage(deal.id, 'next')} className="flex-1 flex items-center justify-center gap-0.5 text-xs text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded py-0.5 transition-colors">
                              Avançar <ChevronRight size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {stageDeals.length === 0 && (
                      <div className="text-center py-8 text-gray-300 text-xs">Nenhum negócio</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── NEW DEAL MODAL ───────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Novo Negócio</h2>
                {activeFunnel && (
                  <p className="text-xs text-gray-400 mt-0.5">Funil: <span className="font-medium" style={{ color: activeFunnel.color }}>{activeFunnel.name}</span></p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Gestão de Redes Sociais" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Contato *</label>
                  <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} placeholder="Nome completo" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Empresa</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Nome da empresa" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Valor (R$)</label>
                  <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0,00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Responsável</label>
                  <select value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={addDeal} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700">Criar Negócio</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEAL DETAIL PANEL ────────────────────────────────────────────────── */}
      {selectedDeal && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Detalhes do Negócio</h2>
            <button onClick={() => setSelectedDeal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            <div>
              <h3 className="font-semibold text-gray-900 mb-0.5">{selectedDeal.title}</h3>
              <p className="text-sm text-gray-500">{selectedDeal.company}</p>
              {(() => { const f = funnels.find(f => f.id === selectedDeal.channelId); return f ? (
                <span className="inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: f.color + '18', color: f.color }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} /> {f.name}
                </span>
              ) : null; })()}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Valor</p>
                <p className="font-semibold text-gray-900 text-sm">R$ {selectedDeal.value.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Probabilidade</p>
                <p className="font-semibold text-gray-900 text-sm">{selectedDeal.probability}%</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">Responsável</p>
              <p className="font-medium text-gray-800 text-sm">{selectedDeal.assignee}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">Etapa atual</p>
              <p className="font-medium text-gray-800 text-sm">{STAGES.find(s => s.id === selectedDeal.stage)?.label}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-0.5">Criado em</p>
              <p className="font-medium text-gray-800 text-sm">{selectedDeal.createdAt}</p>
            </div>
          </div>
          {/* Open chat button */}
          {onOpenChat && (
            <div className="px-4 pb-2">
              <button
                onClick={() => { onOpenChat(selectedDeal.contactName, selectedDeal.channelId); setSelectedDeal(null); }}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <MessageCircle size={15} /> Abrir Conversa
              </button>
            </div>
          )}
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <button onClick={() => { moveStage(selectedDeal.id, 'prev'); setSelectedDeal(null); }} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1">
              <ChevronLeft size={13} /> Voltar
            </button>
            <button onClick={() => { moveStage(selectedDeal.id, 'next'); setSelectedDeal(null); }} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-xs font-medium hover:bg-primary-700 flex items-center justify-center gap-1">
              Avançar <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
