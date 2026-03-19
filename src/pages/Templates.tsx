import { useState, useRef } from 'react';
import { Plus, Copy, Edit2, Trash2, Search, FileText, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { templates as initialTemplates } from '../data/mockData';
import type { MessageTemplate, TemplateCategory } from '../types';

const CAT_LABELS: Record<TemplateCategory, string> = {
  welcome: 'Boas-vindas',
  followup: 'Follow-up',
  proposal: 'Proposta',
  billing: 'Cobrança',
  custom: 'Personalizado',
};
const CAT_STYLES: Record<TemplateCategory, string> = {
  welcome: 'bg-emerald-100 text-emerald-700',
  followup: 'bg-blue-100 text-blue-700',
  proposal: 'bg-purple-100 text-purple-700',
  billing: 'bg-orange-100 text-orange-700',
  custom: 'bg-gray-100 text-gray-700',
};

const EMPTY: Omit<MessageTemplate, 'id' | 'usageCount' | 'createdAt'> = {
  name: '', category: 'custom', content: '', variables: [],
};

const AVAILABLE_VARS: { key: string; label: string; example: string }[] = [
  { key: 'nome',       label: 'Nome',           example: 'João Silva' },
  { key: 'empresa',    label: 'Empresa',         example: 'Acme Ltda' },
  { key: 'telefone',   label: 'Telefone',        example: '(11) 99999-0000' },
  { key: 'email',      label: 'E-mail',          example: 'joao@email.com' },
  { key: 'produto',    label: 'Produto',         example: 'Plano Pro' },
  { key: 'valor',      label: 'Valor',           example: 'R$ 1.200,00' },
  { key: 'data',       label: 'Data',            example: '19/03/2026' },
  { key: 'vendedor',   label: 'Vendedor',        example: 'Maria Santos' },
  { key: 'link',       label: 'Link',            example: 'https://...' },
  { key: 'cidade',     label: 'Cidade',          example: 'São Paulo' },
  { key: 'prazo',      label: 'Prazo',           example: '7 dias' },
  { key: 'desconto',   label: 'Desconto',        example: '10%' },
];

function highlightVars(text: string) {
  const parts = text.split(/({{[^}]+}})/g);
  return parts.map((p, i) =>
    p.startsWith('{{') ? (
      <span key={i} className="bg-primary-100 text-primary-700 rounded px-0.5 font-medium">{p}</span>
    ) : p
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState<MessageTemplate[]>(initialTemplates);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<TemplateCategory | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [copied, setCopied] = useState<string | null>(null);
  const [preview, setPreview] = useState<MessageTemplate | null>(null);
  const [showVars, setShowVars] = useState(true);
  const [hoveredVar, setHoveredVar] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || t.category === catFilter;
    return matchSearch && matchCat;
  });

  const insertVar = (key: string) => {
    const tag = `{{${key}}}`;
    const el = textareaRef.current;
    if (!el) {
      setForm(f => ({ ...f, content: f.content + tag }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const newContent = before + tag + after;
    setForm(f => ({ ...f, content: newContent }));
    // restore cursor after tag
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  };

  const extractVars = (content: string) => {
    const matches = content.match(/{{([^}]+)}}/g) || [];
    return [...new Set(matches.map(m => m.slice(2, -2)))];
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  };

  const openEdit = (t: MessageTemplate) => {
    setEditing(t);
    setForm({ name: t.name, category: t.category, content: t.content, variables: t.variables });
    setShowModal(true);
  };

  const save = () => {
    if (!form.name || !form.content) return;
    const variables = extractVars(form.content);
    if (editing) {
      setTemplates(prev => prev.map(t => t.id === editing.id ? { ...t, ...form, variables } : t));
    } else {
      const nt: MessageTemplate = {
        id: `t${Date.now()}`, ...form, variables,
        usageCount: 0, createdAt: new Date().toISOString().split('T')[0],
      };
      setTemplates(prev => [nt, ...prev]);
    }
    setShowModal(false);
  };

  const deleteTemplate = (id: string) => setTemplates(prev => prev.filter(t => t.id !== id));

  const copyTemplate = (t: MessageTemplate) => {
    navigator.clipboard.writeText(t.content).catch(() => {});
    setCopied(t.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar template..." className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-52" />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setCatFilter('all')} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${catFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Todos</button>
            {(Object.keys(CAT_LABELS) as TemplateCategory[]).map(cat => (
              <button key={cat} onClick={() => setCatFilter(cat)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${catFilter === cat ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex-shrink-0">
          <Plus size={16} /> Novo Template
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[{ label: 'Total', count: templates.length, style: 'text-gray-800' },
          ...Object.entries(CAT_LABELS).map(([cat, label]) => ({
            label, count: templates.filter(t => t.category === cat).length, style: 'text-gray-700'
          }))
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <p className={`text-xl font-bold ${stat.style}`}>{stat.count}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(template => (
          <div key={template.id} className="bg-white rounded-xl border border-gray-200 flex flex-col hover:border-primary-200 hover:shadow-md transition-all">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary-600 flex-shrink-0" />
                  <h3 className="font-semibold text-gray-800 text-sm">{template.name}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${CAT_STYLES[template.category]}`}>
                  {CAT_LABELS[template.category]}
                </span>
              </div>
              <div className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                {highlightVars(template.content)}
              </div>
            </div>
            <div className="p-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span>Usado {template.usageCount}x</span>
                {template.variables.length > 0 && (
                  <span>{template.variables.length} variável{template.variables.length > 1 ? 'is' : ''}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPreview(template)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="Prévia">
                  <FileText size={14} />
                </button>
                <button onClick={() => copyTemplate(template)} className={`p-1.5 rounded-md transition-colors ${copied === template.id ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`} title="Copiar">
                  {copied === template.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <button onClick={() => openEdit(template)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors" title="Editar">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => deleteTemplate(template.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum template encontrado</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editing ? 'Editar Template' : 'Novo Template'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nome *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Nome do template" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TemplateCategory }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {(Object.entries(CAT_LABELS) as [TemplateCategory, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              {/* Variables panel */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowVars(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Campos personalizados disponíveis</span>
                    <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium">{AVAILABLE_VARS.length}</span>
                  </div>
                  {showVars ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>
                {showVars && (
                  <div className="p-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2.5">Clique para inserir no cursor do texto ↓</p>
                    <div className="flex flex-wrap gap-1.5">
                      {AVAILABLE_VARS.map(v => (
                        <div key={v.key} className="relative">
                          <button
                            type="button"
                            onClick={() => insertVar(v.key)}
                            onMouseEnter={() => setHoveredVar(v.key)}
                            onMouseLeave={() => setHoveredVar(null)}
                            className="group flex items-center gap-1 bg-white border border-gray-200 hover:border-primary-400 hover:bg-primary-50 rounded-lg px-2.5 py-1.5 transition-all"
                          >
                            <span className="text-xs font-mono text-primary-600 font-semibold group-hover:text-primary-700">{`{{${v.key}}}`}</span>
                            <span className="text-xs text-gray-400 group-hover:text-gray-500">· {v.label}</span>
                          </button>
                          {hoveredVar === v.key && (
                            <div className="absolute bottom-full left-0 mb-1.5 z-10 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                              Ex: <span className="text-gray-300">{v.example}</span>
                              <div className="absolute top-full left-3 border-4 border-transparent border-t-gray-900" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Conteúdo * <span className="font-normal text-gray-400 text-xs">(use {'{{variavel}}'} para personalizar)</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Olá, {{nome}}! Como posso te ajudar?"
                />
              </div>
              {form.content && extractVars(form.content).length > 0 && (
                <div className="bg-primary-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-primary-700 mb-1">Variáveis detectadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {extractVars(form.content).map(v => (
                      <span key={v} className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full font-medium">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={save} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 transition-colors">
                {editing ? 'Salvar' : 'Criar Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Prévia: {preview.name}</h2>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {highlightVars(preview.content)}
              </div>
              {preview.variables.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Variáveis</p>
                  <div className="flex flex-wrap gap-2">
                    {preview.variables.map(v => (
                      <span key={v} className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full font-medium">{`{{${v}}}`}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                <span>Usado {preview.usageCount} vezes</span>
                <span>Criado em {preview.createdAt}</span>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3">
              <button onClick={() => { copyTemplate(preview); }} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors">
                <Copy size={14} /> Copiar
              </button>
              <button onClick={() => { setPreview(null); openEdit(preview); }} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 flex items-center justify-center gap-2 transition-colors">
                <Edit2 size={14} /> Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
