import { useState } from 'react';
import {
  Send, Paperclip, Smile, Search, MoreHorizontal,
  Bot, CheckCheck, Clock, Tag, User, Phone, ChevronDown
} from 'lucide-react';
import { conversations as initialConvs, whatsappChannels } from '../data/mockData';
import type { Conversation, ChatMessage, ConvStatus } from '../types';

interface Props {
  selectedChannelId: string | null;
  onChannelChange: (id: string | null) => void;
}

const channelIcons: Record<string, string> = { whatsapp: '📱', instagram: '📸', email: '✉️', webchat: '💬' };
const channelLabel: Record<string, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', email: 'Email', webchat: 'Web Chat' };

const statusStyle: Record<ConvStatus, string> = {
  open: 'bg-emerald-100 text-emerald-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-gray-100 text-gray-600',
};
const statusLabel: Record<ConvStatus, string> = { open: 'Aberto', waiting: 'Aguardando', resolved: 'Resolvido' };

const QUICK_REPLIES = [
  'Olá! Em que posso ajudar?',
  'Certo! Vou verificar isso para você.',
  'Vou encaminhar sua solicitação.',
  'Pode me passar mais detalhes?',
];

export default function Chat({ selectedChannelId, onChannelChange }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConvs);
  const [selected, setSelected] = useState<Conversation>(initialConvs[0]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ConvStatus | 'all'>('all');

  const activeChannel = selectedChannelId ? whatsappChannels.find(c => c.id === selectedChannelId) : null;

  const filtered = conversations.filter(c => {
    const matchSearch = c.contact.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchChannel = !selectedChannelId || c.channelId === selectedChannelId;
    return matchSearch && matchStatus && matchChannel;
  });

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg: ChatMessage = {
      id: `m${Date.now()}`, content: input.trim(),
      sender: 'user', timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    const updated = conversations.map(c =>
      c.id === selected.id
        ? { ...c, messages: [...c.messages, msg], lastMessage: input.trim(), lastMessageTime: msg.timestamp, unreadCount: 0 }
        : c
    );
    setConversations(updated);
    setSelected(updated.find(c => c.id === selected.id)!);
    setInput('');
  };

  const selectConv = (conv: Conversation) => {
    const updated = conversations.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c);
    setConversations(updated);
    setSelected(updated.find(c => c.id === conv.id)!);
  };

  const changeStatus = (status: ConvStatus) => {
    const updated = conversations.map(c => c.id === selected.id ? { ...c, status } : c);
    setConversations(updated);
    setSelected(updated.find(c => c.id === selected.id)!);
  };

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar: Conversation List */}
      <div className="w-72 border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Channel Tabs */}
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex min-w-max">
            <button
              onClick={() => onChannelChange(null)}
              className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                !selectedChannelId ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Todos
            </button>
            {whatsappChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => onChannelChange(ch.id)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  selectedChannelId === ch.id ? 'text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={selectedChannelId === ch.id ? { borderBottomColor: ch.color, color: ch.color } : {}}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ch.color }} />
                {ch.name}
              </button>
            ))}
          </div>
        </div>
        {/* Search & Filter */}
        <div className="p-3 border-b border-gray-100 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conversa..." className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-1">
            {(['all', 'open', 'waiting', 'resolved'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${filterStatus === s ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                {s === 'all' ? 'Todos' : statusLabel[s]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConv(conv)}
              className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selected.id === conv.id ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {conv.contact.avatar}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 text-sm">{channelIcons[conv.channel]}</span>
                  {conv.inFlow && (
                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center">
                      <Bot size={8} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-gray-800 truncate">{conv.contact.name}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{conv.lastMessageTime}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusStyle[conv.status]}`}>
                      {statusLabel[conv.status]}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                {selected.contact.avatar}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 text-sm">{channelIcons[selected.channel]}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{selected.contact.name}</p>
                {selected.inFlow && (
                  <span className="flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                    <Bot size={10} /> No Fluxo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{selected.contact.company} · {channelLabel[selected.channel]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Status Dropdown */}
            <div className="relative group">
              <button className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border ${statusStyle[selected.status]} border-current/20`}>
                {statusLabel[selected.status]} <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-36 py-1 hidden group-hover:block">
                {(['open', 'waiting', 'resolved'] as ConvStatus[]).map(s => (
                  <button key={s} onClick={() => changeStatus(s)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </div>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Phone size={16} />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <User size={16} />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* Tags Bar */}
        {selected.tags.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
            <Tag size={12} className="text-gray-400" />
            {selected.tags.map(tag => (
              <span key={tag} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">{tag}</span>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {selected.messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'bot' && (
                <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <Bot size={12} className="text-violet-600" />
                </div>
              )}
              <div className={`max-w-xs lg:max-w-md ${msg.sender === 'user' ? 'order-1' : ''}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                  msg.sender === 'user'
                    ? 'bg-primary-600 text-white rounded-br-sm'
                    : msg.sender === 'bot'
                    ? 'bg-violet-100 text-violet-900 rounded-bl-sm'
                    : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                }`}>
                  {msg.content}
                </div>
                <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                  <span className="text-xs text-gray-400">{msg.timestamp}</span>
                  {msg.sender === 'user' && (
                    msg.status === 'read' ? <CheckCheck size={12} className="text-primary-500" /> :
                    msg.status === 'delivered' ? <CheckCheck size={12} className="text-gray-400" /> :
                    <Clock size={12} className="text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Replies */}
        <div className="px-4 py-2 border-t border-gray-100 bg-white flex gap-2 overflow-x-auto">
          {QUICK_REPLIES.map(reply => (
            <button
              key={reply}
              onClick={() => setInput(reply)}
              className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-primary-100 hover:text-primary-700 transition-colors whitespace-nowrap flex-shrink-0"
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
          <div className="flex items-end gap-3">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
              <Paperclip size={18} />
            </button>
            <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Digite uma mensagem... (Enter para enviar)"
                rows={2}
                className="w-full px-4 py-3 text-sm resize-none focus:outline-none"
              />
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
              <Smile size={18} />
            </button>
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="p-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Contact Info Panel */}
      <div className="w-64 border-l border-gray-200 bg-white flex-col hidden xl:flex">
        <div className="p-4 border-b border-gray-100 text-center">
          <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-lg mx-auto mb-2">
            {selected.contact.avatar}
          </div>
          <p className="font-semibold text-gray-900">{selected.contact.name}</p>
          <p className="text-sm text-gray-500">{selected.contact.company}</p>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Informações</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={14} className="text-gray-400" /> {selected.contact.phone}
              </div>
              <div className="text-sm text-gray-600 break-all">{selected.contact.email}</div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {selected.tags.map(tag => (
                <span key={tag} className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Responsável</p>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-semibold text-xs">
                {selected.assignee.split(' ').map(n => n[0]).join('')}
              </div>
              <span className="text-sm text-gray-700">{selected.assignee}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Canal</p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{channelIcons[selected.channel]}</span>
              <span>{channelLabel[selected.channel]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
