import { useState } from 'react';
import { Plus, MoreHorizontal, DollarSign, User, ChevronRight, ChevronLeft, X, Smartphone } from 'lucide-react';
import { deals as initialDeals, TEAM_MEMBERS, whatsappChannels } from '../data/mockData';
import type { Deal, DealStage } from '../types';

interface Props {
  selectedChannelId: string | null;
  onChannelChange: (id: string | null) => void;
}

const STAGES: { id: DealStage; label: string; color: string; dot: string }[] = [
  { id: 'new', label: 'Novo Lead', color: 'bg-slate-100', dot: 'bg-slate-400' },
  { id: 'qualifying', label: 'Qualificando', color: 'bg-blue-50', dot: 'bg-blue-400' },
  { id: 'proposal', label: 'Proposta', color: 'bg-yellow-50', dot: 'bg-yellow-400' },
  { id: 'negotiation', label: 'Negociação', color: 'bg-orange-50', dot: 'bg-orange-400' },
  { id: 'won', label: 'Ganho ✅', color: 'bg-emerald-50', dot: 'bg-emerald-400' },
  { id: 'lost', label: 'Perdido ❌', color: 'bg-red-50', dot: 'bg-red-400' },
];

const STAGE_ORDER = STAGES.map(s => s.id);

interface NewDeal { title: string; contactName: string; company: string; value: string; assignee: string; }

export default function Pipeline({ selectedChannelId, onChannelChange }: Props) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewDeal>({ title: '', contactName: '', company: '', value: '', assignee: TEAM_MEMBERS[0] });
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const activeChannel = selectedChannelId ? whatsappChannels.find(c => c.id === selectedChannelId) : null;
  const visibleDeals = selectedChannelId ? deals.filter(d => d.channelId === selectedChannelId) : deals;

  const moveStage = (dealId: string, dir: 'prev' | 'next') => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const idx = STAGE_ORDER.indexOf(d.stage);
      const newIdx = dir === 'next' ? Math.min(idx + 1, STAGE_ORDER.length - 1) : Math.max(idx - 1, 0);
      return { ...d, stage: STAGE_ORDER[newIdx], updatedAt: new Date().toISOString().split('T')[0] };
    }));
  };

  const addDeal = () => {
    if (!form.title || !form.contactName) return;
    const nd: Deal = {
      id: `d${Date.now()}`, title: form.title, contactId: '', contactName: form.contactName,
      company: form.company, value: Number(form.value) || 0, stage: 'new',
      assignee: form.assignee, probability: 15, createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      channelId: selectedChannelId || whatsappChannels[0].id,
    };
    setDeals(prev => [nd, ...prev]);
    setForm({ title: '', contactName: '', company: '', value: '', assignee: TEAM_MEMBERS[0] });
    setShowModal(false);
  };

  const totalValue = visibleDeals.reduce((s, d) => s + d.value, 0);
  const wonValue = visibleDeals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Channel Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 pt-3 flex-shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto pb-0">
          <button
            onClick={() => onChannelChange(null)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
              !selectedChannelId ? 'border-primary-600 text-primary-700 bg-primary-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Smartphone size={14} />
            Todos os funis
            <span className="bg-gray-200 text-gray-600 text-xs rounded-full px-1.5 py-0.5">{deals.length}</span>
          </button>
          {whatsappChannels.map(ch => {
            const count = deals.filter(d => d.channelId === ch.id).length;
            const isActive = selectedChannelId === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => onChannelChange(ch.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  isActive ? 'border-b-2 text-gray-900 bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                style={isActive ? { borderBottomColor: ch.color } : {}}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ch.color }} />
                {ch.name}
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={isActive ? { backgroundColor: ch.color + '20', color: ch.color } : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Header Bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-6 text-sm">
          {activeChannel && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeChannel.color }} />
              <span className="font-medium text-gray-700">{activeChannel.name}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{activeChannel.number}</span>
            </div>
          )}
          <span className="text-gray-500">Pipeline: <strong className="text-gray-800">R$ {totalValue.toLocaleString('pt-BR')}</strong></span>
          <span className="text-gray-500">Ganho: <strong className="text-emerald-600">R$ {wonValue.toLocaleString('pt-BR')}</strong></span>
          <span className="text-gray-500">{visibleDeals.length} negócios</span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} /> Novo Negócio
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {STAGES.map(stage => {
            const stageDeals = visibleDeals.filter(d => d.stage === stage.id);
            const stageTotal = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage.id} className={`w-64 flex flex-col rounded-xl ${stage.color} border border-gray-200`}>
                {/* Column Header */}
                <div className="px-3 py-3 border-b border-gray-200 flex-shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                      <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                    </div>
                    <span className="bg-white text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full border border-gray-200">
                      {stageDeals.length}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 pl-4">R$ {stageTotal.toLocaleString('pt-BR')}</p>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {stageDeals.map(deal => (
                    <div
                      key={deal.id}
                      onClick={() => setSelectedDeal(deal)}
                      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-primary-200 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2 flex-1">{deal.title}</p>
                        <button
                          className="text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0"
                          onClick={e => { e.stopPropagation(); }}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{deal.company}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-emerald-600">
                          <DollarSign size={12} />
                          <span className="text-xs font-semibold">R$ {deal.value.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <User size={12} />
                          <span className="text-xs">{deal.assignee.split(' ')[0]}</span>
                        </div>
                      </div>
                      {/* Probability bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-400">Prob.</span>
                          <span className="text-xs text-gray-500 font-medium">{deal.probability}%</span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>
                      </div>
                      {/* Move buttons */}
                      <div className="flex items-center gap-1 mt-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => moveStage(deal.id, 'prev')}
                          className="flex-1 flex items-center justify-center gap-0.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded py-0.5 transition-colors"
                        >
                          <ChevronLeft size={12} /> Voltar
                        </button>
                        <div className="w-px h-3 bg-gray-200" />
                        <button
                          onClick={() => moveStage(deal.id, 'next')}
                          className="flex-1 flex items-center justify-center gap-0.5 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded py-0.5 transition-colors"
                        >
                          Avançar <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-xs">Nenhum negócio</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Novo Negócio</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Título do Negócio *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Gestão de Redes Sociais" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nome do Contato *</label>
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
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={addDeal} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 transition-colors">Criar Negócio</button>
            </div>
          </div>
        </div>
      )}

      {/* Deal Detail Side Panel */}
      {selectedDeal && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Detalhes do Negócio</h2>
            <button onClick={() => setSelectedDeal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{selectedDeal.title}</h3>
              <p className="text-sm text-gray-500">{selectedDeal.company}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Valor</p>
                <p className="font-semibold text-gray-900">R$ {selectedDeal.value.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Probabilidade</p>
                <p className="font-semibold text-gray-900">{selectedDeal.probability}%</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Responsável</p>
              <p className="font-medium text-gray-800">{selectedDeal.assignee}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Etapa atual</p>
              <p className="font-medium text-gray-800">{STAGES.find(s => s.id === selectedDeal.stage)?.label}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Criado em</p>
              <p className="font-medium text-gray-800">{selectedDeal.createdAt}</p>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <button onClick={() => { moveStage(selectedDeal.id, 'prev'); setSelectedDeal(null); }} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1">
              <ChevronLeft size={14} /> Voltar etapa
            </button>
            <button onClick={() => { moveStage(selectedDeal.id, 'next'); setSelectedDeal(null); }} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-xs font-medium hover:bg-primary-700 flex items-center justify-center gap-1">
              Avançar <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
