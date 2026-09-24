import { useState, useCallback } from 'react';
import {
  FileSpreadsheet, Download, RefreshCw, Zap, Eye, Send,
  CheckCircle, Clock, AlertCircle, Loader2, X, ChevronDown,
  MessageCircle, Target, Users, Sparkles,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { loadKnowledgeBase } from '../agents/knowledge-base-loader';
import { useChannels } from '../hooks/useChannels';
import { toast } from '../hooks/useToast';
import { evolutionApi } from '../lib/evolution';
import type { ProspectLead } from '../agents/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1xXZMk7eIOs3L1HDFaoMtXAODkCBmCN8EfXtJ4M-7TDU/export?format=csv&gid=1535614336';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const values: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    values.push(cur.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

function csvRowToLead(row: Record<string, string>, index: number): ProspectLead {
  const phone = row['WhatsApp'] || row['Telefone'] || '';
  // Normalize phone: strip non-digits, add 55 if not present
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  return {
    id: `lead_${index}_${Date.now()}`,
    nome: row['Nome'] || '',
    clinica: row['Clínica'] || row['Clinica'] || '',
    telefone: row['Telefone'] || '',
    whatsapp: normalized,
    especialidade: row['Especialidade'] || '',
    cidade: row['Cidade'] || '',
    estagio: row['Estágio'] || row['Estagio'] || 'Novo',
    dataContato: row['Data Contato'] || '',
    proximoFollowup: row['Próximo Follow-up'] || row['Proximo Follow-up'] || '',
    notas: row['Notas'] || '',
    responsavel: row['Responsável'] || row['Responsavel'] || '',
    copyStatus: 'pendente',
    generatedCopy: '',
    approvedCopy: '',
    sdrPriority: '',
  };
}

function normalizeDisplayPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  // Remove 55 prefix for display
  const local = d.startsWith('55') ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return raw;
}

// ─── Copy Status Badge ─────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pendente:              { label: 'Pendente',       color: 'bg-gray-100 text-gray-600',    icon: <Clock size={12} /> },
  gerando:               { label: 'Gerando...',     color: 'bg-blue-100 text-blue-700',    icon: <Loader2 size={12} className="animate-spin" /> },
  aguardando_aprovacao:  { label: 'Revisar',        color: 'bg-amber-100 text-amber-700',  icon: <Eye size={12} /> },
  aprovado:              { label: 'Aprovado',       color: 'bg-purple-100 text-purple-700', icon: <CheckCircle size={12} /> },
  enviando:              { label: 'Enviando...',    color: 'bg-blue-100 text-blue-700',    icon: <Loader2 size={12} className="animate-spin" /> },
  enviado:               { label: 'Enviado',        color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle size={12} /> },
  erro:                  { label: 'Erro',           color: 'bg-red-100 text-red-700',      icon: <AlertCircle size={12} /> },
};

const PRIORITY_CONFIG = {
  alta:  { label: 'Alta',  color: 'bg-red-100 text-red-700' },
  media: { label: 'Média', color: 'bg-amber-100 text-amber-700' },
  baixa: { label: 'Baixa', color: 'bg-gray-100 text-gray-500' },
  '':    { label: '',      color: '' },
};

// ─── Copy Review Modal ─────────────────────────────────────────────────────────

function CopyModal({
  lead,
  onClose,
  onApprove,
  onApproveAndSend,
}: {
  lead: ProspectLead;
  onClose: () => void;
  onApprove: (id: string, copy: string) => void;
  onApproveAndSend: (id: string, copy: string) => void;
}) {
  const [text, setText] = useState(lead.generatedCopy);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{lead.nome}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{lead.especialidade} · {lead.cidade}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Copy editor */}
        <div className="p-5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Copy para WhatsApp — edite se necessário
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={8}
            className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">{text.length} caracteres</p>
        </div>

        {/* Phone preview */}
        <div className="px-5 pb-3">
          <span className="text-xs text-gray-500">Enviar para: </span>
          <span className="text-xs font-medium text-gray-700">{normalizeDisplayPhone(lead.whatsapp)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-5 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onApprove(lead.id, text)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
          >
            Só aprovar
          </button>
          <button
            onClick={() => onApproveAndSend(lead.id, text)}
            disabled={!text.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <Send size={14} />
            Aprovar e Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SDR Analysis Modal ────────────────────────────────────────────────────────

function SdrModal({ analysis, onClose }: { analysis: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-primary-600" />
            <h2 className="text-base font-semibold text-gray-900">Análise SDR — Priorização de Leads</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{analysis}</pre>
        </div>
        <div className="p-5 pt-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Prospecting() {
  const { data: channels = [] } = useChannels();
  const connectedChannels = channels.filter(c => c.status === 'connected');

  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [reviewLead, setReviewLead] = useState<ProspectLead | null>(null);
  const [sdrAnalysis, setSdrAnalysis] = useState<string>('');
  const [showSdrModal, setShowSdrModal] = useState(false);
  const [analyzingSDR, setAnalyzingSDR] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(SHEET_CSV_URL);

  // Stats
  const total = leads.length;
  const pendente = leads.filter(l => l.copyStatus === 'pendente').length;
  const aguardando = leads.filter(l => l.copyStatus === 'aguardando_aprovacao').length;
  const aprovado = leads.filter(l => ['aprovado', 'enviado'].includes(l.copyStatus)).length;
  const enviado = leads.filter(l => l.copyStatus === 'enviado').length;

  // ── Import sheet ────────────────────────────────────────────────────────────

  const importSheet = useCallback(async () => {
    setImportStatus('loading');
    try {
      const res = await fetch(sheetUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csv = await res.text();
      const rows = parseCsv(csv);
      if (rows.length === 0) throw new Error('Planilha vazia ou formato inválido.');
      const imported = rows.map((row, i) => csvRowToLead(row, i));
      setLeads(imported);
      setImportStatus('done');
      toast({ title: `${imported.length} leads importados`, variant: 'default' });
    } catch (err) {
      setImportStatus('error');
      toast({ title: 'Erro ao importar planilha', description: String(err), variant: 'error' });
    }
  }, [sheetUrl]);

  // ── Generate copy for one lead (BDR agent) ──────────────────────────────────

  const generateCopy = useCallback(async (leadId: string) => {
    if (!isSupabaseConfigured) {
      toast({ title: 'Supabase não configurado', description: 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.', variant: 'error' });
      return;
    }

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, copyStatus: 'gerando' } : l));
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    try {
      const kb = loadKnowledgeBase();
      const prompt = `Gera uma mensagem de prospecção outbound para WhatsApp para:

Nome: ${lead.nome}
Clínica: ${lead.clinica}
Especialidade: ${lead.especialidade}
Cidade: ${lead.cidade}
${lead.notas ? `Notas: ${lead.notas}` : ''}

Use o Agente BDR. Retorne APENAS o texto da mensagem, sem mais nada.`;

      const { data, error } = await supabase.functions.invoke<{ content: string }>('claudinho', {
        body: { message: prompt, context: {}, knowledgeBase: kb, conversationHistory: [] },
      });

      if (error) throw new Error(error.message);
      const copy = data?.content ?? '';

      setLeads(prev => prev.map(l =>
        l.id === leadId
          ? { ...l, copyStatus: 'aguardando_aprovacao', generatedCopy: copy }
          : l
      ));
    } catch (err) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, copyStatus: 'erro' } : l));
      toast({ title: 'Erro ao gerar copy', description: String(err), variant: 'error' });
    }
  }, [leads]);

  // ── Generate copy for all pending leads ────────────────────────────────────

  const generateAllCopys = useCallback(async () => {
    const pending = leads.filter(l => l.copyStatus === 'pendente');
    if (pending.length === 0) {
      toast({ title: 'Nenhum lead pendente', variant: 'default' });
      return;
    }
    for (const lead of pending) {
      await generateCopy(lead.id);
    }
  }, [leads, generateCopy]);

  // ── SDR analysis ────────────────────────────────────────────────────────────

  const runSdrAnalysis = useCallback(async () => {
    if (!isSupabaseConfigured) {
      toast({ title: 'Supabase não configurado', variant: 'error' });
      return;
    }
    if (leads.length === 0) {
      toast({ title: 'Importe a planilha primeiro', variant: 'error' });
      return;
    }
    setAnalyzingSDR(true);
    try {
      const kb = loadKnowledgeBase();
      const listSummary = leads.map(l =>
        `- ${l.nome} | ${l.especialidade} | ${l.cidade} | Clínica: ${l.clinica}${l.notas ? ` | Notas: ${l.notas}` : ''}`
      ).join('\n');

      const prompt = `Use o Agente SDR para analisar e priorizar esta lista de ${leads.length} prospects e indicar os mais importantes para abordar hoje:\n\n${listSummary}`;

      const { data, error } = await supabase.functions.invoke<{ content: string }>('claudinho', {
        body: { message: prompt, context: {}, knowledgeBase: kb, conversationHistory: [] },
      });

      if (error) throw new Error(error.message);
      setSdrAnalysis(data?.content ?? '');
      setShowSdrModal(true);
    } catch (err) {
      toast({ title: 'Erro na análise SDR', description: String(err), variant: 'error' });
    } finally {
      setAnalyzingSDR(false);
    }
  }, [leads]);

  // ── Approve copy ───────────────────────────────────────────────────────────

  const approveCopy = useCallback((leadId: string, copy: string) => {
    setLeads(prev => prev.map(l =>
      l.id === leadId ? { ...l, copyStatus: 'aprovado', approvedCopy: copy } : l
    ));
    setReviewLead(null);
    toast({ title: 'Copy aprovado', variant: 'default' });
  }, []);

  // ── Send WhatsApp message ──────────────────────────────────────────────────

  const sendMessage = useCallback(async (leadId: string, copy: string) => {
    setReviewLead(null);
    setLeads(prev => prev.map(l =>
      l.id === leadId ? { ...l, copyStatus: 'enviando', approvedCopy: copy } : l
    ));
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (!selectedChannelId) {
      toast({ title: 'Selecione um canal de WhatsApp', variant: 'error' });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, copyStatus: 'aprovado' } : l));
      return;
    }

    try {
      await evolutionApi.sendText(selectedChannelId, lead.whatsapp, copy);

      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, copyStatus: 'enviado' } : l));
      toast({ title: `Mensagem enviada para ${lead.nome}`, variant: 'default' });
    } catch (err) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, copyStatus: 'erro' } : l));
      toast({ title: 'Erro ao enviar mensagem', description: String(err), variant: 'error' });
    }
  }, [leads, selectedChannelId]);

  const approveAndSend = useCallback((leadId: string, copy: string) => {
    void sendMessage(leadId, copy);
  }, [sendMessage]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6">

      {/* Stats strip */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: total, icon: <Users size={16} />, color: 'text-gray-700 bg-white' },
            { label: 'Pendentes', value: pendente, icon: <Clock size={16} />, color: 'text-gray-700 bg-white' },
            { label: 'Aguard. aprovação', value: aguardando, icon: <Eye size={16} />, color: 'text-amber-700 bg-amber-50' },
            { label: 'Enviados', value: enviado, icon: <CheckCircle size={16} />, color: 'text-emerald-700 bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 ${s.color}`}>
              {s.icon}
              <div>
                <p className="text-xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Sheet URL input */}
          <div className="flex-1 min-w-64">
            <input
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="URL de exportação CSV do Google Sheets"
            />
          </div>

          {/* Import button */}
          <button
            onClick={importSheet}
            disabled={importStatus === 'loading'}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors"
          >
            {importStatus === 'loading'
              ? <Loader2 size={15} className="animate-spin" />
              : <Download size={15} />}
            {importStatus === 'loading' ? 'Importando...' : 'Importar Planilha'}
          </button>

          {/* SDR Analysis */}
          {total > 0 && (
            <button
              onClick={runSdrAnalysis}
              disabled={analyzingSDR}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-60 rounded-lg transition-colors"
            >
              {analyzingSDR ? <Loader2 size={15} className="animate-spin" /> : <Target size={15} />}
              Analisar com SDR
            </button>
          )}

          {/* Generate all */}
          {pendente > 0 && (
            <button
              onClick={generateAllCopys}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Sparkles size={15} />
              Gerar todos os copys ({pendente})
            </button>
          )}

          {/* Channel selector */}
          {total > 0 && (
            <div className="relative">
              <select
                value={selectedChannelId}
                onChange={e => setSelectedChannelId(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
              >
                <option value="">Selecionar canal WA</option>
                {connectedChannels.map(c => (
                  <option key={c.id} value={c.id}>{c.name} · {c.number}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* No connected channels warning */}
        {total > 0 && connectedChannels.length === 0 && (
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <AlertCircle size={13} />
            Nenhum canal WhatsApp conectado. Vá em <strong className="mx-1">Canais</strong> para conectar seu número antes de enviar.
          </div>
        )}
      </div>

      {/* Empty state */}
      {total === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <FileSpreadsheet size={40} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-medium text-gray-700 mb-1">Nenhum lead importado</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">
            Clique em <strong>Importar Planilha</strong> para carregar os leads do Google Sheets.
          </p>
          <button
            onClick={importSheet}
            disabled={importStatus === 'loading'}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            {importStatus === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {importStatus === 'loading' ? 'Importando...' : 'Importar Planilha'}
          </button>
        </div>
      )}

      {/* Leads table */}
      {total > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Especialidade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Cidade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">WhatsApp</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Prioridade</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status Copy</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map(lead => {
                const statusCfg = STATUS_CONFIG[lead.copyStatus];
                const priCfg = PRIORITY_CONFIG[lead.sdrPriority];
                return (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-sm">{lead.nome}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{lead.clinica}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.especialidade}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lead.cidade}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">{normalizeDisplayPhone(lead.whatsapp)}</td>
                    <td className="px-4 py-3">
                      {lead.sdrPriority && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${priCfg.color}`}>
                          {priCfg.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {lead.copyStatus === 'pendente' && (
                          <button
                            onClick={() => generateCopy(lead.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Zap size={12} />
                            Gerar Copy
                          </button>
                        )}
                        {lead.copyStatus === 'erro' && (
                          <button
                            onClick={() => generateCopy(lead.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <RefreshCw size={12} />
                            Tentar novamente
                          </button>
                        )}
                        {(lead.copyStatus === 'aguardando_aprovacao' || lead.copyStatus === 'aprovado') && (
                          <button
                            onClick={() => setReviewLead(lead)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                          >
                            <Eye size={12} />
                            Revisar
                          </button>
                        )}
                        {lead.copyStatus === 'aprovado' && (
                          <button
                            onClick={() => void sendMessage(lead.id, lead.approvedCopy)}
                            disabled={!selectedChannelId}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg transition-colors"
                          >
                            <Send size={12} />
                            Enviar
                          </button>
                        )}
                        {lead.copyStatus === 'enviado' && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <MessageCircle size={12} />
                            Enviado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Copy review modal */}
      {reviewLead && (
        <CopyModal
          lead={reviewLead}
          onClose={() => setReviewLead(null)}
          onApprove={approveCopy}
          onApproveAndSend={approveAndSend}
        />
      )}

      {/* SDR analysis modal */}
      {showSdrModal && (
        <SdrModal
          analysis={sdrAnalysis}
          onClose={() => setShowSdrModal(false)}
        />
      )}
    </div>
  );
}
