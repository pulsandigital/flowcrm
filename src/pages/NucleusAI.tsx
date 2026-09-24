import { useRef, useEffect } from 'react';
import { Brain, Send, Sparkles, ThumbsUp, Copy, AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useClaudinho } from '../hooks/useClaudinho';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { useLeads } from '../hooks/useLeads';
import { useConversations } from '../hooks/useConversations';
import { useDeals } from '../hooks/useDeals';
import { toast } from '../hooks/useToast';
import type { CRMContext } from '../agents/types';

const EXAMPLES = [
  { label: 'Responder objeção de preço',  category: 'CRM',       prompt: 'O lead disse "achei caro". Sugira uma resposta consultiva.' },
  { label: 'Qualificar lead',             category: 'Leads',     prompt: 'Faça uma qualificação BANT do lead mais recente e dê um score de prioridade.' },
  { label: 'Criar mensagem de prospecção',category: 'BDR',       prompt: 'Crie uma mensagem de primeiro contato no WhatsApp para um médico cardiologista.' },
  { label: 'Criar post para Instagram',   category: 'Marketing', prompt: 'Crie um post para Instagram sobre saúde mental no trabalho.' },
  { label: 'Analisar CPL de campanha',    category: 'Growth',    prompt: 'Analise por que o CPL da campanha subiu 20% esta semana.' },
];

const CATEGORY_CLS: Record<string, string> = {
  CRM:       'badge-blue',
  Leads:     'badge-purple',
  BDR:       'badge bg-emerald-50 text-emerald-700',
  Marketing: 'badge bg-violet-50 text-violet-700',
  Growth:    'badge bg-amber-50 text-amber-700',
};

export default function NucleusAI() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { ask, isLoading, history, clearHistory } = useClaudinho();
  const { data: currentProfile } = useCurrentProfile();
  const { data: leads = [] } = useLeads();
  const { data: conversations = [] } = useConversations();
  const { data: deals = [] } = useDeals();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  const buildContext = (): CRMContext => ({
    operatorName: currentProfile?.full_name || currentProfile?.email?.split('@')[0] || 'Operador',
    contacts: (leads as any[]).slice(0, 20).map(l => ({
      id: l.id, name: l.name, company: l.company || '', status: l.status, assignee: l.assignee || '',
    })),
    deals: (deals as any[]).slice(0, 10).map(d => ({
      id: d.id, title: d.title, contactName: d.contactName || '', value: d.value || 0, stage: d.stage, assignee: d.assignee || '',
    })),
    conversations: (conversations as any[]).slice(0, 10).map(c => ({
      id: c.id, contact: { name: c.contact?.name || '' }, status: c.status, channel: c.channel, lastMessage: c.lastMessage || '',
    })),
  });

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    setInput('');
    try {
      await ask(msg, buildContext());
    } catch {
      toast.error('Erro', 'Não foi possível conectar ao Claudinho. Verifique as configurações.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copiado', 'Texto copiado para a área de transferência.'));
  };

  const hasMessages = history.length > 0;

  return (
    <div className="p-6 h-full flex flex-col gap-5 animate-slide-up" style={{ maxHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-lg bg-nucleus-100 flex items-center justify-center">
              <Brain size={15} className="text-nucleus-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Nucleus AI</h1>
          </div>
          <p className="text-sm text-slate-500">Claudinho — assistente inteligente para CRM, Care, Marketing e Growth</p>
        </div>
        {hasMessages && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            <RefreshCw size={13} /> Nova conversa
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div className="card p-3.5 bg-amber-50 border border-amber-100 flex items-start gap-2.5 flex-shrink-0">
        <Sparkles size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          <strong>Aviso importante:</strong> A IA do Nucleus apoia a organização e documentação do atendimento, mas a decisão clínica permanece sempre com o profissional de saúde.
        </p>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">
        {/* Chat */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!hasMessages && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-10">
                <div className="w-14 h-14 rounded-2xl bg-nucleus-100 flex items-center justify-center">
                  <Brain size={26} className="text-nucleus-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-1">Olá! Sou o Claudinho</p>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Posso ajudar com qualificação de leads, criação de copies de prospecção, análise de campanhas, respostas para atendimento e muito mais.
                  </p>
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-nucleus-100 flex items-center justify-center flex-shrink-0">
                    <Brain size={15} className="text-nucleus-600" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl p-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                      <button className="text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1">
                        <ThumbsUp size={11} /> Útil
                      </button>
                      <button
                        onClick={() => copyToClipboard(msg.content)}
                        className="text-xs text-slate-400 hover:text-primary-600 flex items-center gap-1"
                      >
                        <Copy size={11} /> Copiar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-nucleus-100 flex items-center justify-center">
                  <Brain size={15} className="text-nucleus-600 animate-pulse" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm p-3.5 flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 p-4">
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Pergunte ao Claudinho... (Enter para enviar)"
                disabled={isLoading}
                className="input flex-1 resize-none py-2.5 disabled:opacity-60"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="btn-primary px-4 self-end disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Suggestions Panel */}
        <div className="w-64 flex-shrink-0 space-y-3">
          <h3 className="section-title">Sugestões rápidas</h3>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => sendMessage(ex.prompt)}
              disabled={isLoading}
              className="w-full text-left card p-3.5 hover:shadow-card-md transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className={`badge mb-2 ${CATEGORY_CLS[ex.category]}`}>{ex.category}</span>
              <p className="text-sm font-medium text-slate-800">{ex.label}</p>
            </button>
          ))}

          {hasMessages && (
            <div className="card p-3.5 bg-slate-50">
              <p className="text-xs text-slate-500 text-center">
                {history.length / 2} pergunta{history.length / 2 !== 1 ? 's' : ''} nesta sessão
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
