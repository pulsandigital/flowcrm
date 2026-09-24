import { useMemo, useState } from 'react';
import { MessageSquare, Plus, Search, Send, Users } from 'lucide-react';

interface InternalMessage {
  id: string;
  channel: string;
  author: string;
  role: string;
  text: string;
  createdAt: string;
}

const STORAGE_KEY = 'nucleus_internal_chat';
const CHANNELS = ['Equipe geral', 'Recepcao', 'Profissionais', 'Financeiro', 'Nucleus Care'];

const seedMessages: InternalMessage[] = [
  {
    id: 'seed-1',
    channel: 'Equipe geral',
    author: 'Admin',
    role: 'Administrador',
    text: 'Chat interno liberado para alinhamentos da equipe.',
    createdAt: new Date().toISOString(),
  },
];

const readMessages = (): InternalMessage[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return saved.length ? saved : seedMessages;
  } catch {
    return seedMessages;
  }
};

export default function InternalChat() {
  const [messages, setMessages] = useState<InternalMessage[]>(readMessages);
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return messages
      .filter(message => message.channel === channel)
      .filter(message => [message.author, message.role, message.text].join(' ').toLowerCase().includes(term));
  }, [messages, channel, search]);

  const persist = (next: InternalMessage[]) => {
    setMessages(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-300)));
  };

  const send = () => {
    if (!draft.trim()) return;
    const message: InternalMessage = {
      id: `msg-${Date.now()}`,
      channel,
      author: 'Admin',
      role: 'Administrador',
      text: draft.trim(),
      createdAt: new Date().toISOString(),
    };
    persist([...messages, message]);
    setDraft('');
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-72px)] animate-slide-up">
      <aside className="hidden w-72 border-r border-slate-100 bg-white p-4 lg:block">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <Users size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Chat interno</h2>
            <p className="text-xs text-slate-500">Canais da equipe</p>
          </div>
        </div>
        <div className="space-y-1">
          {CHANNELS.map(item => (
            <button
              key={item}
              onClick={() => setChannel(item)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                channel === item ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{item}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                {messages.filter(message => message.channel === item).length}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex flex-1 flex-col bg-slate-50">
        <div className="border-b border-slate-100 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{channel}</h1>
              <p className="text-sm text-slate-500">Mensagens internas para alinhamento da equipe.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar no chat..." />
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
            {CHANNELS.map(item => (
              <button
                key={item}
                onClick={() => setChannel(item)}
                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${channel === item ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <MessageSquare size={28} className="mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">Nenhuma mensagem nesse canal</p>
            </div>
          ) : (
            filtered.map(message => (
              <div key={message.id} className="max-w-3xl rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                      {message.author.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{message.author}</div>
                      <div className="text-[11px] text-slate-400">{message.role}</div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(message.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{message.text}</p>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-100 bg-white p-4">
          <div className="flex gap-2">
            <textarea
              className="input min-h-[46px] flex-1 resize-none"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Escreva uma mensagem interna..."
            />
            <button onClick={send} disabled={!draft.trim()} className="btn-primary self-end disabled:opacity-50">
              {draft.trim() ? <Send size={15} /> : <Plus size={15} />} Enviar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
