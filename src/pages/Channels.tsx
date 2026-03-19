import { useState } from 'react';
import {
  Smartphone, Plus, X, Wifi, WifiOff, RefreshCw, QrCode,
  MessageCircle, Users, Trash2, Edit2, GitMerge, Zap
} from 'lucide-react';
import { whatsappChannels as initialChannels } from '../data/mockData';
import type { WhatsAppChannel, ChannelStatus } from '../types';
import { TEAM_MEMBERS } from '../data/mockData';

const STATUS_CONFIG: Record<ChannelStatus, { label: string; icon: React.ReactNode; style: string; dot: string }> = {
  connected: { label: 'Conectado', icon: <Wifi size={14} />, style: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  disconnected: { label: 'Desconectado', icon: <WifiOff size={14} />, style: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
  connecting: { label: 'Conectando...', icon: <RefreshCw size={14} className="animate-spin" />, style: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400 animate-pulse' },
};

const CHANNEL_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#be185d'];

interface FormState { name: string; number: string; assignee: string; color: string; }
const EMPTY_FORM: FormState = { name: '', number: '', assignee: TEAM_MEMBERS[0], color: CHANNEL_COLORS[0] };

function QRCodeModal({ channel, onClose, onConnect }: { channel: WhatsAppChannel; onClose: () => void; onConnect: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Conectar WhatsApp</h2>
            <p className="text-sm text-gray-500">{channel.name} · {channel.number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 text-center">
          <div className="w-48 h-48 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <QrCode size={48} className="text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-400">QR Code aparece aqui</p>
              <p className="text-xs text-gray-400">após integrar a API</p>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 mb-4 text-left">
            <p className="text-xs font-semibold text-blue-700 mb-1">Como conectar:</p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
              <li>Abra o WhatsApp no celular</li>
              <li>Vá em Configurações → Dispositivos Conectados</li>
              <li>Toque em "Conectar dispositivo"</li>
              <li>Aponte a câmera para o QR Code</li>
            </ol>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-left">
            <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Integração necessária</p>
            <p className="text-xs text-amber-600">Para gerar o QR Code real, conecte a <strong>Evolution API</strong> ou <strong>Z-API</strong> ao backend do sistema.</p>
          </div>
          <button
            onClick={onConnect}
            className="w-full bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Simular Conexão (Demo)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Channels() {
  const [channels, setChannels] = useState<WhatsAppChannel[]>(initialChannels);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WhatsAppChannel | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [qrChannel, setQrChannel] = useState<WhatsAppChannel | null>(null);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (ch: WhatsAppChannel) => {
    setEditing(ch);
    setForm({ name: ch.name, number: ch.number, assignee: ch.assignee, color: ch.color });
    setShowModal(true);
  };

  const save = () => {
    if (!form.name || !form.number) return;
    if (editing) {
      setChannels(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } : c));
    } else {
      const nc: WhatsAppChannel = {
        id: `ch${Date.now()}`, ...form, status: 'disconnected',
        leadsCount: 0, messagesCount: 0, createdAt: new Date().toISOString().split('T')[0],
      };
      setChannels(prev => [...prev, nc]);
    }
    setShowModal(false);
  };

  const deleteChannel = (id: string) => setChannels(prev => prev.filter(c => c.id !== id));

  const connectChannel = (id: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, status: 'connecting' as ChannelStatus } : c));
    setTimeout(() => {
      setChannels(prev => prev.map(c => c.id === id ? { ...c, status: 'connected' as ChannelStatus } : c));
    }, 2000);
    setQrChannel(null);
  };

  const disconnectChannel = (id: string) => {
    setChannels(prev => prev.map(c => c.id === id ? { ...c, status: 'disconnected' as ChannelStatus } : c));
  };

  const totalConnected = channels.filter(c => c.status === 'connected').length;
  const totalLeads = channels.reduce((s, c) => s + c.leadsCount, 0);
  const totalMessages = channels.reduce((s, c) => s + c.messagesCount, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Wifi size={20} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalConnected}/{channels.length}</p>
            <p className="text-sm text-gray-500">Números conectados</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
            <p className="text-sm text-gray-500">Total de leads</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <MessageCircle size={20} className="text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalMessages}</p>
            <p className="text-sm text-gray-500">Mensagens enviadas</p>
          </div>
        </div>
      </div>

      {/* Channels List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Números de WhatsApp</h2>
            <p className="text-sm text-gray-500 mt-0.5">Cada número tem seu próprio funil e fluxo de atendimento</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
            <Plus size={16} /> Adicionar Número
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {channels.map(ch => {
            const statusCfg = STATUS_CONFIG[ch.status];
            return (
              <div key={ch.id} className="p-5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                {/* Color indicator */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: ch.color + '20' }}>
                    <Smartphone size={22} style={{ color: ch.color }} />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${statusCfg.dot}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-gray-900">{ch.name}</h3>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.style}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{ch.number}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Users size={11} /> {ch.leadsCount} leads</span>
                    <span className="flex items-center gap-1"><MessageCircle size={11} /> {ch.messagesCount} msgs</span>
                    <span className="flex items-center gap-1"><GitMerge size={11} /> Pipeline próprio</span>
                    {ch.flowId && <span className="flex items-center gap-1"><Zap size={11} /> Fluxo ativo</span>}
                    <span>Responsável: {ch.assignee.split(' ')[0]}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {ch.status === 'disconnected' && (
                    <button
                      onClick={() => setQrChannel(ch)}
                      className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <QrCode size={14} /> Conectar
                    </button>
                  )}
                  {ch.status === 'connected' && (
                    <button
                      onClick={() => disconnectChannel(ch.id)}
                      className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <WifiOff size={14} /> Desconectar
                    </button>
                  )}
                  {ch.status === 'connecting' && (
                    <span className="text-xs text-amber-600 font-medium px-3 py-1.5">Aguardando QR...</span>
                  )}
                  <button onClick={() => openEdit(ch)} className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => deleteChannel(ch.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {channels.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">Nenhum número configurado</p>
            <p className="text-sm text-gray-400 mt-1">Adicione o primeiro número de WhatsApp</p>
            <button onClick={openCreate} className="mt-4 flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors mx-auto">
              <Plus size={16} /> Adicionar Número
            </button>
          </div>
        )}
      </div>

      {/* Integration Info */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-100 p-5">
        <h3 className="font-semibold text-gray-800 mb-1">🔌 Integração com WhatsApp Real</h3>
        <p className="text-sm text-gray-600 mb-3">Para conectar números reais de WhatsApp, você precisa de uma das APIs abaixo:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'Evolution API', desc: 'Open source, gratuita, self-hosted', badge: 'Recomendado' },
            { name: 'Z-API', desc: 'Pago, simples de integrar, suporte PT-BR', badge: 'Popular' },
            { name: 'WPPConnect', desc: 'Open source, comunidade ativa', badge: 'Gratuito' },
          ].map(api => (
            <div key={api.name} className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-gray-800 text-sm">{api.name}</span>
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{api.badge}</span>
              </div>
              <p className="text-xs text-gray-500">{api.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editing ? 'Editar Número' : 'Novo Número de WhatsApp'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nome do Funil *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Comercial, Suporte, SDR..." />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Número do WhatsApp *</label>
                <input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="(11) 99999-9999" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Responsável</label>
                <select value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {TEAM_MEMBERS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Cor do Funil</label>
                <div className="flex gap-2 flex-wrap">
                  {CHANNEL_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className={`w-8 h-8 rounded-lg transition-all ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={save} className="flex-1 bg-primary-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-primary-700 transition-colors">
                {editing ? 'Salvar' : 'Adicionar Número'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrChannel && (
        <QRCodeModal
          channel={qrChannel}
          onClose={() => setQrChannel(null)}
          onConnect={() => connectChannel(qrChannel.id)}
        />
      )}
    </div>
  );
}
