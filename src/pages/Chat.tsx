import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, Smile, Search, MoreHorizontal,
  Bot, CheckCheck, Clock, Tag, User, Phone, ChevronDown,
  Mic, MicOff, Image, Calendar, Lock, Edit2, Trash2,
  X, Check, AlertCircle, Info, MapPin, Square, Loader2,
} from 'lucide-react';
import { TEAM_MEMBERS } from '../data/mockData';
import { conversationsDb, messagesDb, channelsDb } from '../lib/db';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Conversation, ChatMessage, ConvStatus, LeadSource, LossReason, WhatsAppChannel } from '../types';

interface Props {
  selectedChannelId: string | null;
  onChannelChange: (id: string | null) => void;
  initialContactName?: string | null;
  onConversationOpened?: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────
const channelIcons: Record<string, string> = { whatsapp: '📱', instagram: '📸', email: '✉️', webchat: '💬' };
const channelLabel: Record<string, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', email: 'Email', webchat: 'Web Chat' };

const statusStyle: Record<ConvStatus, string> = {
  open: 'bg-emerald-100 text-emerald-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-gray-100 text-gray-600',
};
const statusLabel: Record<ConvStatus, string> = { open: 'Aberto', waiting: 'Aguardando', resolved: 'Resolvido' };

const LEAD_SOURCES: { value: LeadSource; label: string; icon: string }[] = [
  { value: 'meta_ads', label: 'Meta Ads', icon: '🎯' },
  { value: 'instagram', label: 'Instagram', icon: '📸' },
  { value: 'google_ads', label: 'Google Ads', icon: '🔍' },
  { value: 'google_organic', label: 'Google Orgânico', icon: '🌿' },
  { value: 'instagram_bio', label: 'Bio do Instagram', icon: '🔗' },
  { value: 'referral', label: 'Indicação', icon: '🤝' },
  { value: 'other', label: 'Outro', icon: '💡' },
];

const LOSS_REASONS: { value: LossReason; label: string }[] = [
  { value: 'price', label: 'Preço alto' },
  { value: 'competitor', label: 'Foi para concorrente' },
  { value: 'no_budget', label: 'Sem orçamento' },
  { value: 'no_interest', label: 'Sem interesse' },
  { value: 'no_response', label: 'Sem resposta' },
  { value: 'timing', label: 'Momento errado' },
  { value: 'other', label: 'Outro motivo' },
];

const QUICK_REPLIES = [
  'Olá! Em que posso ajudar?',
  'Certo! Vou verificar isso para você.',
  'Posso me passar mais detalhes?',
  'Aguarde um momento, por favor.',
];

const EMOJIS = ['😊', '👍', '🙏', '❤️', '😂', '🔥', '✅', '👋', '💪', '🎉', '📌', '⚡', '🚀', '💰', '📞', '📱'];

// ── Sub-components ───────────────────────────────────────────────────────────
function MessageBubble({
  msg, onEdit, onDelete,
}: {
  msg: ChatMessage;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(msg.content);
  const [showMenu, setShowMenu] = useState(false);

  const isUser = msg.sender === 'user';
  const isInternal = msg.sender === 'internal';
  const isBot = msg.sender === 'bot';

  const confirmEdit = () => {
    if (editVal.trim()) { onEdit(msg.id, editVal.trim()); }
    setEditing(false);
  };

  if (isInternal) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 max-w-md text-sm text-amber-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Lock size={11} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-600">Nota Interna</span>
            {msg.internalAuthor && <span className="text-xs text-amber-500">· {msg.internalAuthor}</span>}
            <span className="text-xs text-amber-400 ml-auto">{msg.timestamp}</span>
          </div>
          {msg.isDeleted ? (
            <span className="italic text-amber-400 text-xs">Nota apagada</span>
          ) : (
            <p>{msg.content}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      {isBot && (
        <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <Bot size={12} className="text-violet-600" />
        </div>
      )}
      <div className={`max-w-xs lg:max-w-md relative ${isUser ? 'order-1' : ''}`}>
        {isUser && !msg.isDeleted && (
          <div className="absolute -left-16 top-1 hidden group-hover:flex items-center gap-1 z-10">
            <button onClick={() => setEditing(true)} className="p-1 bg-white border border-gray-200 rounded shadow-sm text-gray-400 hover:text-primary-600 transition-colors" title="Editar">
              <Edit2 size={11} />
            </button>
            <button onClick={() => { setShowMenu(false); onDelete(msg.id); }} className="p-1 bg-white border border-gray-200 rounded shadow-sm text-gray-400 hover:text-red-500 transition-colors" title="Apagar">
              <Trash2 size={11} />
            </button>
          </div>
        )}

        {editing ? (
          <div className="bg-white border-2 border-primary-400 rounded-2xl px-3 py-2 min-w-[180px]">
            <textarea
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              className="w-full text-sm resize-none focus:outline-none"
              rows={2}
              autoFocus
            />
            <div className="flex justify-end gap-1 mt-1">
              <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
              <button onClick={confirmEdit} className="p-1 text-primary-600 hover:text-primary-700"><Check size={14} /></button>
            </div>
          </div>
        ) : (
          <div className={`px-4 py-2.5 rounded-2xl text-sm ${
            isUser ? 'bg-primary-600 text-white rounded-br-sm' :
            isBot ? 'bg-violet-100 text-violet-900 rounded-bl-sm' :
            'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
          }`}>
            {msg.isDeleted ? (
              <span className="italic opacity-60 flex items-center gap-1"><Trash2 size={12} /> Mensagem apagada</span>
            ) : msg.type === 'image' ? (
              <div>
                <div className="w-40 h-32 bg-gray-200 rounded-lg flex items-center justify-center mb-1">
                  <Image size={24} className="text-gray-400" />
                </div>
                {msg.content && <p>{msg.content}</p>}
              </div>
            ) : msg.type === 'audio' ? (
              <div className="flex items-center gap-2 min-w-[140px]">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Mic size={14} />
                </div>
                <div className="flex-1">
                  <div className="h-1 bg-white/30 rounded-full">
                    <div className="h-1 bg-white/80 rounded-full w-1/3" />
                  </div>
                  <span className="text-xs opacity-70 mt-0.5 block">0:12</span>
                </div>
              </div>
            ) : (
              <p>{msg.content}</p>
            )}
            {msg.isEdited && !msg.isDeleted && (
              <span className="text-xs opacity-50 ml-1">(editado)</span>
            )}
            {msg.scheduledFor && (
              <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                <Clock size={10} /> Agendado: {msg.scheduledFor}
              </div>
            )}
          </div>
        )}
        <div className={`flex items-center gap-1 mt-0.5 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-xs text-gray-400">{msg.timestamp}</span>
          {isUser && !msg.isDeleted && (
            msg.status === 'read' ? <CheckCheck size={12} className="text-primary-500" /> :
            msg.status === 'delivered' ? <CheckCheck size={12} className="text-gray-400" /> :
            <Clock size={12} className="text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state placeholder ───────────────────────────────────────────────────
const EMPTY_CONV: Conversation = {
  id: '', contact: { id: '', name: '', phone: '', email: '', company: '', tags: [], status: 'lead', assignee: '', createdAt: '', lastActivity: '', avatar: '' },
  lastMessage: '', lastMessageTime: '', unreadCount: 0, status: 'open',
  assignee: '', channel: 'whatsapp', channelId: '', tags: [], inFlow: false, messages: [],
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Chat({ selectedChannelId, onChannelChange, initialContactName, onConversationOpened }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [channels, setChannels] = useState<WhatsAppChannel[]>([]);
  const [selected, setSelected] = useState<Conversation>(EMPTY_CONV);
  const [loadingConvs, setLoadingConvs] = useState(true);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoadingConvs(false); return; }
    const [data, chData] = await Promise.all([conversationsDb.getAll(), channelsDb.getAll()]);
    setConversations(data);
    setChannels(chData);
    if (data.length > 0) setSelected(data[0]);
    setLoadingConvs(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Supabase Realtime — listen for new messages and conversation updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const msgChannel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        const newMessage: import('../types').ChatMessage = {
          id: msg.id, content: msg.content, sender: msg.sender,
          timestamp: msg.timestamp, status: msg.status ?? 'delivered',
          type: msg.type ?? 'text', isDeleted: false, isEdited: false,
          internalAuthor: msg.internal_author,
        };
        setConversations(prev => prev.map(c => {
          if (c.id !== msg.conversation_id) return c;
          const alreadyExists = c.messages.some(m => m.id === msg.id);
          if (alreadyExists) return c;
          return { ...c, messages: [...c.messages, newMessage], lastMessage: msg.content, lastMessageTime: msg.timestamp };
        }));
        setSelected(prev => {
          if (prev.id !== msg.conversation_id) return prev;
          const alreadyExists = prev.messages.some(m => m.id === msg.id);
          if (alreadyExists) return prev;
          return { ...prev, messages: [...prev.messages, newMessage], lastMessage: msg.content, lastMessageTime: msg.timestamp };
        });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => {
        // Reload conversations when a new one arrives
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); };
  }, [isSupabaseConfigured, load]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select conversation when coming from Pipeline
  useEffect(() => {
    if (!initialContactName || conversations.length === 0) return;
    const match = conversations.find(c =>
      c.contact.name.toLowerCase().includes(initialContactName.toLowerCase())
    );
    if (match) setSelected(match);
    onConversationOpened?.();
  }, [initialContactName, conversations]); // eslint-disable-line react-hooks/exhaustive-deps

  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ConvStatus | 'all'>('all');
  const [isInternal, setIsInternal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [rightTab, setRightTab] = useState<'info' | 'source' | 'loss'>('info');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChannel = selectedChannelId
    ? { id: selectedChannelId, name: '', color: '#7c3aed' }
    : null;

  const filtered = conversations.filter(c => {
    const matchSearch = c.contact.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchChannel = !selectedChannelId || c.channelId === selectedChannelId;
    return matchSearch && matchStatus && matchChannel;
  });

  const updateSelected = (updated: Conversation[]) => {
    setConversations(updated);
    const s = updated.find(c => c.id === selected.id);
    if (s) setSelected(s);
  };

  const sendMessage = async (type: 'text' | 'audio' | 'image' = 'text', scheduled?: string) => {
    if (!input.trim() && type === 'text') return;
    if (!selected.id) return;
    const msg: ChatMessage = {
      id: `m${Date.now()}`,
      content: type === 'audio' ? '🎙 Áudio gravado' : type === 'image' ? 'Imagem' : input.trim(),
      sender: isInternal ? 'internal' : 'user',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      type,
      internalAuthor: isInternal ? 'Ana Lima' : undefined,
      scheduledFor: scheduled,
    };
    await messagesDb.insert(selected.id, msg);
    await conversationsDb.updateField(selected.id, 'last_message', msg.content);
    const updated = conversations.map(c =>
      c.id === selected.id
        ? { ...c, messages: [...c.messages, msg], lastMessage: msg.content, lastMessageTime: msg.timestamp, unreadCount: 0 }
        : c
    );
    updateSelected(updated);
    setInput('');
    setShowSchedule(false);
    setIsRecording(false);
  };

  const editMessage = async (msgId: string, newContent: string) => {
    await messagesDb.update(msgId, { content: newContent, is_edited: true });
    const updated = conversations.map(c =>
      c.id === selected.id
        ? { ...c, messages: c.messages.map(m => m.id === msgId ? { ...m, content: newContent, isEdited: true } : m) }
        : c
    );
    updateSelected(updated);
  };

  const deleteMessage = async (msgId: string) => {
    await messagesDb.update(msgId, { is_deleted: true });
    const updated = conversations.map(c =>
      c.id === selected.id
        ? { ...c, messages: c.messages.map(m => m.id === msgId ? { ...m, isDeleted: true, content: '' } : m) }
        : c
    );
    updateSelected(updated);
  };

  const selectConv = (conv: Conversation) => {
    const updated = conversations.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c);
    updateSelected(updated);
    setSelected(updated.find(c => c.id === conv.id)!);
  };

  const changeStatus = (status: ConvStatus) => {
    const updated = conversations.map(c => c.id === selected.id ? { ...c, status } : c);
    updateSelected(updated);
  };

  const setLeadSource = (leadSource: LeadSource) => {
    const updated = conversations.map(c => c.id === selected.id ? { ...c, leadSource } : c);
    updateSelected(updated);
  };

  const setLossReason = (lossReason: LossReason, note: string) => {
    const updated = conversations.map(c => c.id === selected.id ? { ...c, lossReason, lossReasonNote: note } : c);
    updateSelected(updated);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      sendMessage('image');
    }
  };

  const handleScheduleSend = () => {
    if (!scheduleDate || !scheduleTime) return;
    sendMessage('text', `${scheduleDate} ${scheduleTime}`);
  };

  if (loadingConvs) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  );

  return (
    <div className="flex h-full bg-white">
      {/* ── Left: Conversation List ── */}
      <div className="w-72 border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Channel Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto flex-shrink-0">
          <div className="flex min-w-max">
            <button onClick={() => onChannelChange(null)} className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${!selectedChannelId ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Todos
            </button>
            {channels.map(ch => (
              <button key={ch.id} onClick={() => onChannelChange(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${selectedChannelId === ch.id ? '' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                style={selectedChannelId === ch.id ? { borderBottomColor: ch.color, color: ch.color } : {}}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ch.color }} />
                {ch.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="p-3 border-b border-gray-100 space-y-2 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversa..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-1">
            {(['all', 'open', 'waiting', 'resolved'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${filterStatus === s ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                {s === 'all' ? 'Todos' : statusLabel[s]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(conv => (
            <button key={conv.id} onClick={() => selectConv(conv)} className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected.id === conv.id ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">{conv.contact.avatar}</div>
                  <span className="absolute -bottom-0.5 -right-0.5 text-sm">{channelIcons[conv.channel]}</span>
                  {conv.inFlow && <div className="absolute -top-1 -left-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center"><Bot size={8} className="text-white" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-gray-800 truncate">{conv.contact.name}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{conv.lastMessageTime}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusStyle[conv.status]}`}>{statusLabel[conv.status]}</span>
                    {conv.leadSource && <span className="text-xs">{LEAD_SOURCES.find(l => l.value === conv.leadSource)?.icon}</span>}
                    {conv.unreadCount > 0 && <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{conv.unreadCount}</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Center: Chat Window ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">{selected.contact.avatar}</div>
              <span className="absolute -bottom-0.5 -right-0.5 text-sm">{channelIcons[selected.channel]}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{selected.contact.name}</p>
                {selected.inFlow && <span className="flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium"><Bot size={10} /> No Fluxo</span>}
              </div>
              <p className="text-xs text-gray-500">{selected.contact.company} · {channelLabel[selected.channel]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <button className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border ${statusStyle[selected.status]} border-current/20`}>
                {statusLabel[selected.status]} <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-36 py-1 hidden group-hover:block">
                {(['open', 'waiting', 'resolved'] as ConvStatus[]).map(s => (
                  <button key={s} onClick={() => changeStatus(s)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">{statusLabel[s]}</button>
                ))}
              </div>
            </div>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Phone size={16} /></button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><MoreHorizontal size={16} /></button>
          </div>
        </div>

        {/* Tags */}
        {selected.tags.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap flex-shrink-0">
            <Tag size={12} className="text-gray-400" />
            {selected.tags.map(tag => <span key={tag} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">{tag}</span>)}
            {selected.leadSource && (
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                {LEAD_SOURCES.find(l => l.value === selected.leadSource)?.icon} {LEAD_SOURCES.find(l => l.value === selected.leadSource)?.label}
              </span>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {selected.messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} onEdit={editMessage} onDelete={deleteMessage} />
          ))}
        </div>

        {/* Internal Note Banner */}
        {isInternal && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center gap-2 flex-shrink-0">
            <Lock size={14} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Modo Nota Interna — o contato NÃO verá esta mensagem</span>
          </div>
        )}

        {/* Quick Replies */}
        <div className="px-4 py-2 border-t border-gray-100 bg-white flex gap-2 overflow-x-auto flex-shrink-0">
          {QUICK_REPLIES.map(reply => (
            <button key={reply} onClick={() => setInput(reply)} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-primary-100 hover:text-primary-700 transition-colors whitespace-nowrap flex-shrink-0">{reply}</button>
          ))}
        </div>

        {/* Emoji Picker */}
        {showEmoji && (
          <div className="px-4 py-2 border-t border-gray-100 bg-white flex flex-wrap gap-2 flex-shrink-0">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => { setInput(i => i + e); setShowEmoji(false); }} className="text-xl hover:scale-125 transition-transform">{e}</button>
            ))}
          </div>
        )}

        {/* Schedule Panel */}
        {showSchedule && (
          <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center gap-3 flex-shrink-0">
            <Calendar size={16} className="text-primary-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">Agendar envio:</span>
            <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <button onClick={handleScheduleSend} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700">Agendar</button>
            <button onClick={() => setShowSchedule(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
        )}

        {/* Input */}
        <div className={`border-t border-gray-200 p-3 bg-white flex-shrink-0 ${isInternal ? 'bg-amber-50 border-amber-200' : ''}`}>
          {/* Toolbar */}
          <div className="flex items-center gap-1 mb-2">
            <button onClick={() => setIsInternal(false)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${!isInternal ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Send size={12} /> Mensagem
            </button>
            <button onClick={() => setIsInternal(true)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${isInternal ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Lock size={12} /> Nota Interna
            </button>
            <div className="flex-1" />
            <button onClick={() => { setShowEmoji(!showEmoji); setShowSchedule(false); }} className={`p-1.5 rounded-lg transition-colors ${showEmoji ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`} title="Emojis"><Smile size={16} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Enviar imagem"><Image size={16} /></button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <button onClick={() => { setShowSchedule(!showSchedule); setShowEmoji(false); }} className={`p-1.5 rounded-lg transition-colors ${showSchedule ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`} title="Agendar mensagem"><Calendar size={16} /></button>
          </div>

          <div className="flex items-end gap-2">
            {/* Audio record */}
            <button
              onClick={() => { if (!isRecording) { setIsRecording(true); } else { sendMessage('audio'); } }}
              className={`p-2.5 rounded-lg flex-shrink-0 transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
            >
              {isRecording ? <Square size={16} /> : <Mic size={16} />}
            </button>

            <div className={`flex-1 border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent ${isInternal ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={isInternal ? 'Nota interna (não visível ao contato)...' : 'Digite uma mensagem...'}
                rows={2}
                className={`w-full px-4 py-2.5 text-sm resize-none focus:outline-none ${isInternal ? 'bg-amber-50' : 'bg-white'}`}
              />
            </div>

            <button onClick={() => sendMessage()} disabled={!input.trim() && !isRecording} className="p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
              <Send size={18} />
            </button>
          </div>

          {isRecording && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-xs">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Gravando... clique no botão para enviar
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Contact Panel ── */}
      <div className="w-64 border-l border-gray-200 bg-white flex-col hidden xl:flex">
        {/* Contact Info */}
        <div className="p-4 border-b border-gray-100 text-center flex-shrink-0">
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg mx-auto mb-2">{selected.contact.avatar}</div>
          <p className="font-semibold text-gray-900">{selected.contact.name}</p>
          <p className="text-sm text-gray-500">{selected.contact.company}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {[
            { id: 'info', label: 'Info', icon: <User size={12} /> },
            { id: 'source', label: 'Origem', icon: <MapPin size={12} /> },
            { id: 'loss', label: 'Perda', icon: <AlertCircle size={12} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setRightTab(tab.id as typeof rightTab)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors border-b-2 ${rightTab === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {rightTab === 'info' && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Contato</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={14} className="text-gray-400" /> {selected.contact.phone}</div>
                  <div className="text-sm text-gray-600 break-all">{selected.contact.email}</div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selected.tags.map(tag => <span key={tag} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{tag}</span>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Responsável</p>
                <select
                  value={selected.assignee}
                  onChange={async e => {
                    const val = e.target.value;
                    const updated = conversations.map(c => c.id === selected.id ? { ...c, assignee: val } : c);
                    updateSelected(updated);
                    if (selected.id) await conversationsDb.updateField(selected.id, 'assignee', val);
                  }}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Canal</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{channelIcons[selected.channel]}</span>
                  <span>{channelLabel[selected.channel]}</span>
                </div>
              </div>
            </>
          )}

          {rightTab === 'source' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">De onde veio este contato?</p>
              <div className="space-y-2">
                {LEAD_SOURCES.map(src => (
                  <button
                    key={src.value}
                    onClick={() => setLeadSource(src.value)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      selected.leadSource === src.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{src.icon}</span>
                    {src.label}
                    {selected.leadSource === src.value && <Check size={14} className="ml-auto text-primary-600" />}
                  </button>
                ))}
              </div>
              {selected.leadSource && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-medium">
                    {LEAD_SOURCES.find(l => l.value === selected.leadSource)?.icon} Origem: {LEAD_SOURCES.find(l => l.value === selected.leadSource)?.label}
                  </p>
                </div>
              )}
            </div>
          )}

          {rightTab === 'loss' && (
            <LossReasonTab
              conversation={selected}
              onSave={setLossReason}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LossReasonTab({ conversation, onSave }: {
  conversation: Conversation;
  onSave: (reason: LossReason, note: string) => void;
}) {
  const [reason, setReason] = useState<LossReason | ''>(conversation.lossReason || '');
  const [note, setNote] = useState(conversation.lossReasonNote || '');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
        <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
        <p className="text-xs text-red-700">Registre o motivo de perda para melhorar seus processos</p>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Motivo da Perda</p>
        <div className="space-y-1.5">
          {LOSS_REASONS.map(r => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                reason === r.value
                  ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {reason === r.value && '✓ '}{r.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Observação</p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Detalhes adicionais..."
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <button
        onClick={() => reason && onSave(reason, note)}
        disabled={!reason}
        className="w-full bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Registrar Perda
      </button>
      {conversation.lossReason && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-xs font-semibold text-red-700 mb-1">Motivo registrado:</p>
          <p className="text-xs text-red-600">{LOSS_REASONS.find(r => r.value === conversation.lossReason)?.label}</p>
          {conversation.lossReasonNote && <p className="text-xs text-red-500 mt-1">{conversation.lossReasonNote}</p>}
        </div>
      )}
    </div>
  );
}
