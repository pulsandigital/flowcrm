import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Calendar, CheckCircle2, Clock, DollarSign, MessageSquare, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ICONS: Record<string, typeof Bell> = {
  appointment: Calendar,
  calendar: Calendar,
  finance: DollarSign,
  payment: DollarSign,
  message: MessageSquare,
  lead: UserPlus,
  warning: AlertTriangle,
};

const TONES: Record<string, string> = {
  appointment: 'bg-teal-50 text-teal-600',
  calendar: 'bg-teal-50 text-teal-600',
  finance: 'bg-emerald-50 text-emerald-600',
  payment: 'bg-emerald-50 text-emerald-600',
  message: 'bg-primary-50 text-primary-600',
  lead: 'bg-primary-50 text-primary-600',
  warning: 'bg-red-50 text-red-600',
};

function formatTime(value?: string) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error) setNotifications(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(() => notifications.filter(item => !item.read_at).length, [notifications]);

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(item => !item.read_at).map(item => item.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
    loadNotifications();
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Notificações</h2>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhe mensagens, consultas, pagamentos e eventos importantes da operação.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{notifications.length}</div>
              <div className="text-sm text-slate-500">Total</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{unreadCount}</div>
              <div className="text-sm text-slate-500">Não lidas</div>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{notifications.length - unreadCount}</div>
              <div className="text-sm text-slate-500">Lidas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="section-title">Central de notificações</h3>
          <button onClick={markAllAsRead} className="btn-secondary btn-sm">Marcar todas como lidas</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Carregando notificações...</div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Bell size={22} />
            </div>
            <p className="font-semibold text-slate-700">Nenhuma notificação ainda</p>
            <p className="mt-1 text-sm text-slate-400">Quando pacientes, agenda, pagamentos e integrações gerarem eventos, eles aparecerão aqui.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map(item => {
              const Icon = ICONS[item.type] ?? Bell;
              const tone = TONES[item.type] ?? 'bg-slate-100 text-slate-500';
              return (
                <button key={item.id} className="w-full flex items-start gap-4 p-5 text-left hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      {!item.read_at && <span className="w-2 h-2 rounded-full bg-red-500" />}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{item.message}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{formatTime(item.created_at)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
