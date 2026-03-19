import { useState } from 'react';
import {
  Plus, Play, Pause, Edit2, Trash2, MessageSquare,
  Clock, GitBranch, Zap, Square, ChevronDown, ChevronRight, X, Users
} from 'lucide-react';
import { messageFlows as initialFlows } from '../data/mockData';
import type { MessageFlow, FlowStep, FlowStepType } from '../types';

const STEP_CONFIG: Record<FlowStepType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  message: { icon: <MessageSquare size={14} />, label: 'Mensagem', color: 'text-blue-600', bg: 'bg-blue-100' },
  wait: { icon: <Clock size={14} />, label: 'Aguardar', color: 'text-amber-600', bg: 'bg-amber-100' },
  condition: { icon: <GitBranch size={14} />, label: 'Condição', color: 'text-purple-600', bg: 'bg-purple-100' },
  action: { icon: <Zap size={14} />, label: 'Ação', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  end: { icon: <Square size={14} />, label: 'Fim', color: 'text-gray-500', bg: 'bg-gray-100' },
};

function FlowStepNode({ step, index }: { step: FlowStep; index: number }) {
  const cfg = STEP_CONFIG[step.type];
  const isLast = step.type === 'end';

  return (
    <div className="flex flex-col items-center">
      <div className={`w-full max-w-sm bg-white border-2 rounded-xl p-4 transition-all hover:shadow-md hover:border-primary-200 cursor-pointer ${isLast ? 'border-gray-200' : 'border-gray-200'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
            <span className={cfg.color}>{cfg.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs text-gray-400">#{index + 1}</span>
            </div>
            <p className="text-sm font-medium text-gray-800">{step.label}</p>
            {step.content && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{step.content}</p>
            )}
            {step.waitTime !== undefined && step.type === 'wait' && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                {step.waitTime === 0 ? 'Aguardar resposta do contato' : `Aguardar ${step.waitTime >= 60 ? `${step.waitTime / 60}h` : `${step.waitTime}min`}`}
              </p>
            )}
            {step.condition && (
              <p className="text-xs text-purple-600 mt-1 font-medium">Se: {step.condition}</p>
            )}
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center my-1">
          <div className="w-0.5 h-4 bg-gray-300" />
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      )}
      {step.type === 'condition' && step.nextStepElseId && (
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <ChevronRight size={12} /> <span>Se não: continua em outra ramificação</span>
        </div>
      )}
    </div>
  );
}

export default function MessageFlow() {
  const [flows, setFlows] = useState<MessageFlow[]>(initialFlows);
  const [selected, setSelected] = useState<MessageFlow | null>(initialFlows[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [newFlowTrigger, setNewFlowTrigger] = useState('Primeira mensagem recebida');

  const toggleActive = (id: string) => {
    setFlows(prev => prev.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
  };

  const deleteFlow = (id: string) => {
    setFlows(prev => prev.filter(f => f.id !== id));
    if (selected?.id === id) setSelected(flows.find(f => f.id !== id) || null);
  };

  const createFlow = () => {
    if (!newFlowName) return;
    const nf: MessageFlow = {
      id: `f${Date.now()}`, name: newFlowName, description: newFlowDesc,
      isActive: false, trigger: newFlowTrigger, leadsCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      steps: [
        { id: 's1', type: 'message', label: 'Mensagem inicial', content: 'Olá! Como posso te ajudar?', nextStepId: 's2' },
        { id: 's2', type: 'end', label: 'Fim do Fluxo' },
      ],
    };
    setFlows(prev => [nf, ...prev]);
    setSelected(nf);
    setShowCreateModal(false);
    setNewFlowName('');
    setNewFlowDesc('');
  };

  const TRIGGER_OPTIONS = [
    'Primeira mensagem recebida',
    'Lead criado manualmente',
    'Tag adicionada ao contato',
    'Formulário preenchido no site',
    'Palavra-chave na mensagem',
    'Proposta enviada',
  ];

  return (
    <div className="flex h-full">
      {/* Flow List */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <button onClick={() => setShowCreateModal(true)} className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            <Plus size={16} /> Novo Fluxo
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {flows.map(flow => (
            <button
              key={flow.id}
              onClick={() => setSelected(flow)}
              className={`w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected?.id === flow.id ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold text-gray-800">{flow.name}</p>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${flow.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              </div>
              <p className="text-xs text-gray-500 line-clamp-2 mb-2">{flow.description}</p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Users size={10} /> {flow.leadsCount} leads</span>
                <span>{flow.steps.length} etapas</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Flow Detail */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Flow Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-bold text-gray-900 text-lg">{selected.name}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${selected.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {selected.isActive ? '● Ativo' : '○ Pausado'}
                </span>
              </div>
              <p className="text-sm text-gray-500">{selected.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => deleteFlow(selected.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
              <button className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                <Edit2 size={14} /> Editar
              </button>
              <button
                onClick={() => toggleActive(selected.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selected.isActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
              >
                {selected.isActive ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Ativar</>}
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-8 text-sm flex-shrink-0">
            <div>
              <span className="text-gray-500">Gatilho: </span>
              <span className="font-medium text-gray-800">{selected.trigger}</span>
            </div>
            <div>
              <span className="text-gray-500">Leads processados: </span>
              <span className="font-medium text-primary-600">{selected.leadsCount}</span>
            </div>
            <div>
              <span className="text-gray-500">Etapas: </span>
              <span className="font-medium text-gray-800">{selected.steps.length}</span>
            </div>
            <div>
              <span className="text-gray-500">Criado em: </span>
              <span className="font-medium text-gray-800">{selected.createdAt}</span>
            </div>
          </div>

          {/* Flow Canvas */}
          <div className="flex-1 overflow-auto p-8 bg-gray-50">
            <div className="flex flex-col items-center gap-0 max-w-sm mx-auto">
              {/* Trigger Node */}
              <div className="w-full max-w-sm bg-primary-600 text-white rounded-xl p-4 text-center shadow-lg mb-1">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Zap size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Gatilho</span>
                </div>
                <p className="text-sm font-medium">{selected.trigger}</p>
              </div>
              <div className="flex flex-col items-center my-1">
                <div className="w-0.5 h-4 bg-gray-300" />
                <ChevronDown size={14} className="text-gray-400" />
              </div>

              {/* Steps */}
              {selected.steps.map((step, i) => (
                <FlowStepNode key={step.id} step={step} index={i} />
              ))}

              {/* Add Step Button */}
              <button className="mt-4 flex items-center gap-2 text-sm text-primary-600 border-2 border-dashed border-primary-300 rounded-xl px-6 py-3 hover:bg-primary-50 transition-colors w-full max-w-sm justify-center">
                <Plus size={16} /> Adicionar Etapa
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap size={28} className="text-gray-300" />
            </div>
            <p className="text-sm">Selecione um fluxo para visualizar</p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Novo Fluxo de Mensagens</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nome do Fluxo *</label>
                <input value={newFlowName} onChange={e => setNewFlowName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Boas-vindas WhatsApp" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
                <input value={newFlowDesc} onChange={e => setNewFlowDesc(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Breve descrição do objetivo do fluxo" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Gatilho (Trigger)</label>
                <select value={newFlowTrigger} onChange={e => setNewFlowTrigger(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {TRIGGER_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={createFlow} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 transition-colors">Criar Fluxo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
