import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Loader2, AlertCircle, Edit2, Trash2, Video, Check } from 'lucide-react';
import { useAppointments, useInsertAppointment, useUpdateAppointment, useDeleteAppointment } from '../hooks/useAppointments';
import type { Appointment } from '../types';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { SPECIALTIES as ALL_SPECIALTIES, allowedSpecialtiesForProfile } from '../lib/specialties';

type CalendarView = 'day' | 'week' | 'month';

const TYPES = ['1ª Consulta', 'Retorno', 'Avaliação', 'Sessão', 'Exame', 'Online', 'Outro'];
const SPECIALTIES = ALL_SPECIALTIES;
const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_COLOR: Record<string, string> = {
  agendado: 'bg-blue-100 border-blue-300 text-blue-800',
  confirmado: 'bg-teal-100 border-teal-300 text-teal-800',
  realizado: 'bg-slate-100 border-slate-300 text-slate-600',
  cancelado: 'bg-red-100 border-red-300 text-red-700',
  falta: 'bg-orange-100 border-orange-300 text-orange-700',
};
const STATUS_BADGE: Record<string, string> = {
  agendado: 'badge-blue',
  confirmado: 'badge-green',
  realizado: 'badge-gray',
  cancelado: 'badge bg-red-50 text-red-600',
  falta: 'badge bg-orange-50 text-orange-600',
};

const BLANK: any = {
  patientName: '',
  specialty: '',
  type: '1ª Consulta',
  professional: '',
  date: new Date().toISOString().split('T')[0],
  time: '09:00',
  durationMin: 60,
  status: 'agendado',
  notes: '',
  isOnline: false,
};

function AppForm({ initial, onSave, onClose, loading, error, isEdit }: {
  initial: any;
  onSave: (appointment: any) => void;
  onClose: () => void;
  loading: boolean;
  error?: string;
  isEdit?: boolean;
}) {
  const { data: currentProfile } = useCurrentProfile();
  const specialtyOptions = allowedSpecialtiesForProfile(currentProfile);
  const visibleSpecialties = specialtyOptions.length > 0 ? specialtyOptions : SPECIALTIES;
  const [form, setForm] = useState(initial);
  const set = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <Calendar size={18} className="text-primary-600" />
            </div>
            <h2 className="font-semibold text-slate-900">{isEdit ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={14} />{error}
            </div>
          )}

          <div>
            <label className="label">Nome do paciente *</label>
            <input className="input" value={form.patientName} onChange={event => set('patientName', event.target.value)} placeholder="Ex: Sofia Lima" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data *</label>
              <input type="date" className="input" value={form.date} onChange={event => set('date', event.target.value)} />
            </div>
            <div>
              <label className="label">Horário *</label>
              <select className="input" value={form.time} onChange={event => set('time', event.target.value)}>
                {HOURS.map(hour => <option key={hour}>{hour}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={event => set('type', event.target.value)}>
                {TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Especialidade</label>
              <select className="input" value={form.specialty} onChange={event => set('specialty', event.target.value)}>
                <option value="">Selecione...</option>
                {visibleSpecialties.map(specialty => <option key={specialty}>{specialty}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Profissional</label>
              <input className="input" value={form.professional} onChange={event => set('professional', event.target.value)} placeholder="Dra. Ana M." />
            </div>
            <div>
              <label className="label">Duração (min)</label>
              <input type="number" min={15} max={480} step={15} className="input" value={form.durationMin} onChange={event => set('durationMin', Number(event.target.value))} />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={event => set('status', event.target.value)}>
                {(['agendado','confirmado','realizado','cancelado','falta'] as const).map(status => (
                  <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input type="checkbox" id="isOnline" checked={form.isOnline} onChange={event => set('isOnline', event.target.checked)} className="w-4 h-4 accent-primary-600" />
            <label htmlFor="isOnline" className="text-sm text-slate-700 cursor-pointer flex items-center gap-1.5">
              <Video size={14} />Consulta online
            </label>
          </div>

          {form.isOnline && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-700">
              Google Meet automático exige conectar o Google Calendar da clínica. Até essa integração ser autorizada, o agendamento online fica salvo na agenda como consulta online.
            </div>
          )}

          <div>
            <label className="label">Observações</label>
            <textarea className="input resize-none" rows={3} value={form.notes} onChange={event => set('notes', event.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            disabled={loading || !form.patientName.trim() || !form.date || !form.time}
            className="btn-primary min-w-[120px] justify-center"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" />Salvando...</> : isEdit ? 'Salvar' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Appointments() {
  const { data: appointments = [], isLoading, isError } = useAppointments();
  const insertMut = useInsertAppointment();
  const updateMut = useUpdateAppointment();
  const deleteMut = useDeleteAppointment();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const [formError, setFormError] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<CalendarView>('week');
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((appointment: any) => appointment.date === today).sort((a: any, b: any) => a.time.localeCompare(b.time));
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + weekOffset * 7);
  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() + weekOffset);
  const selectedDateString = selectedDate.toISOString().split('T')[0];
  const selectedDayAppointments = appointments.filter((appointment: any) => appointment.date === selectedDateString).sort((a: any, b: any) => a.time.localeCompare(b.time));
  const monthCursor = new Date();
  monthCursor.setMonth(monthCursor.getMonth() + weekOffset);
  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const monthGridStart = new Date(monthStart);
  monthGridStart.setDate(monthGridStart.getDate() - monthGridStart.getDay());
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(monthGridStart);
    date.setDate(monthGridStart.getDate() + index);
    return date;
  });

  const handleInsert = async (form: any) => {
    setFormError('');
    try {
      await insertMut.mutateAsync(form);
      setShowForm(false);
    } catch (error: any) {
      setFormError(error.message ?? 'Erro ao salvar.');
    }
  };

  const handleUpdate = async (form: any) => {
    if (!editing) return;
    setFormError('');
    try {
      await updateMut.mutateAsync({ id: editing.id, data: form });
      setEditing(null);
    } catch (error: any) {
      setFormError(error.message ?? 'Erro ao salvar.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      setDeleting(null);
    } catch (error: any) {
      setFormError(error.message ?? 'Erro ao excluir.');
    }
  };

  const confirmAppointment = async (appointment: any) => {
    await updateMut.mutateAsync({ id: appointment.id, data: { status: 'confirmado' } });
  };

  const weekLabel = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${weekStart.getDate()}/${weekStart.getMonth() + 1} a ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  };
  const viewLabel = view === 'month'
    ? monthCursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : view === 'day'
      ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
      : `Semana de ${weekLabel()}`;

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500 capitalize">{viewLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {[
              { id: 'day', label: 'Dia' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mês' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id as CalendarView)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${view === item.id ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button onClick={() => setWeekOffset(value => value - 1)} className="btn-ghost btn-sm"><ChevronLeft size={14} /></button>
          <button onClick={() => setWeekOffset(0)} className="btn-ghost btn-sm">Hoje</button>
          <button onClick={() => setWeekOffset(value => value + 1)} className="btn-ghost btn-sm"><ChevronRight size={14} /></button>
          <button className="btn-primary btn-sm" onClick={() => { setShowForm(true); setFormError(''); }}>
            <Plus size={14} /> Novo Agendamento
          </button>
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />Erro ao carregar agenda.
        </div>
      )}

      {view === 'week' && <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-5">
          <h2 className="section-title mb-4">
            Hoje - {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : todayAppointments.length === 0 ? (
            <div className="py-8 text-center">
              <Calendar size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">Nenhum agendamento hoje</p>
              <button className="btn-primary btn-sm mt-3" onClick={() => setShowForm(true)}><Plus size={13} /> Agendar</button>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appointment: any) => (
                <div key={appointment.id} className={`p-3 rounded-xl border ${STATUS_COLOR[appointment.status]}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{appointment.time.slice(0, 5)}</span>
                    <div className="flex items-center gap-1">
                      {appointment.status === 'agendado' && (
                        <button onClick={() => confirmAppointment(appointment)} title="Confirmar" className="p-0.5 rounded hover:bg-white/50 transition-colors"><Check size={12} /></button>
                      )}
                      <button onClick={() => { setEditing(appointment); setFormError(''); }} className="p-0.5 rounded hover:bg-white/50 transition-colors"><Edit2 size={12} /></button>
                      <button onClick={() => setDeleting(appointment)} className="p-0.5 rounded hover:bg-white/50 transition-colors"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="font-medium text-sm">{appointment.patientName}</div>
                  <div className="text-xs opacity-75 flex items-center gap-1">
                    {appointment.isOnline && <Video size={10} />}
                    {appointment.specialty && `${appointment.specialty} · `}{appointment.type}
                  </div>
                  <span className={`badge mt-1.5 ${STATUS_BADGE[appointment.status]}`}>{appointment.status}</span>
                </div>
              ))}
              <button onClick={() => setShowForm(true)} className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 hover:border-primary-300 hover:text-primary-600 transition-colors">
                + Novo agendamento
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card p-5 overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="grid grid-cols-8 mb-3">
              <div />
              {WEEK_DAYS.map((day, index) => {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + index);
                const isToday = date.toISOString().split('T')[0] === today;
                return (
                  <div key={day} className={`text-center pb-2 ${isToday ? 'text-primary-600' : 'text-slate-500'}`}>
                    <div className="text-xs font-medium">{day}</div>
                    <div className={`text-lg font-bold mt-0.5 ${isToday ? 'text-primary-600' : 'text-slate-800'}`}>{date.getDate()}</div>
                  </div>
                );
              })}
            </div>
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-t border-slate-50">
                <div className="text-[10px] text-slate-400 py-3 pr-2 text-right font-medium">{hour}</div>
                {WEEK_DAYS.map((_, dayIndex) => {
                  const date = new Date(weekStart);
                  date.setDate(date.getDate() + dayIndex);
                  const dateString = date.toISOString().split('T')[0];
                  const hourAppointments = appointments.filter((appointment: any) =>
                    appointment.date === dateString && appointment.time.startsWith(hour.split(':')[0].padStart(2, '0'))
                  );
                  return (
                    <div key={dayIndex} className="border-l border-slate-50 py-1 px-0.5 min-h-[44px]">
                      <div className="space-y-1">
                        {hourAppointments.map((appointment: any) => (
                          <div
                            key={appointment.id}
                            onClick={() => { setEditing(appointment); setFormError(''); }}
                            className={`${STATUS_COLOR[appointment.status]} border rounded-lg p-1.5 cursor-pointer hover:opacity-80 transition-opacity`}
                          >
                            <div className="text-[10px] font-semibold truncate">{appointment.patientName}</div>
                            <div className="text-[9px] opacity-75 truncate">{appointment.isOnline ? 'Online · ' : ''}{appointment.specialty || appointment.type}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>}

      {view === 'day' && (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
          <div className="card p-5">
            <h2 className="section-title mb-4 capitalize">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
            </h2>
            {selectedDayAppointments.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Nenhum agendamento neste dia</p>
                <button className="btn-primary btn-sm mt-3" onClick={() => setShowForm(true)}><Plus size={13} /> Agendar</button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayAppointments.map((appointment: any) => (
                  <div key={appointment.id} onClick={() => { setEditing(appointment); setFormError(''); }} className={`cursor-pointer rounded-xl border p-3 ${STATUS_COLOR[appointment.status]}`}>
                    <div className="text-sm font-bold">{appointment.time.slice(0, 5)}</div>
                    <div className="mt-1 text-sm font-semibold">{appointment.patientName}</div>
                    <div className="text-xs opacity-75">{appointment.specialty || appointment.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5 overflow-x-auto">
            <div className="min-w-[680px]">
              {HOURS.map(hour => {
                const hourAppointments = selectedDayAppointments.filter((appointment: any) =>
                  appointment.time.startsWith(hour.split(':')[0].padStart(2, '0'))
                );
                return (
                  <div key={hour} className="grid grid-cols-[76px_1fr] border-t border-slate-100 first:border-t-0">
                    <div className="py-5 pr-4 text-right text-xs font-semibold text-slate-400">{hour}</div>
                    <div className="min-h-[72px] border-l border-slate-100 p-2">
                      {hourAppointments.length === 0 ? (
                        <button onClick={() => { setShowForm(true); setFormError(''); }} className="h-full w-full rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 hover:border-primary-300 hover:text-primary-600">
                          Livre
                        </button>
                      ) : (
                        <div className="space-y-2">
                          {hourAppointments.map((appointment: any) => (
                            <div key={appointment.id} onClick={() => { setEditing(appointment); setFormError(''); }} className={`${STATUS_COLOR[appointment.status]} cursor-pointer rounded-xl border p-3`}>
                              <div className="font-semibold">{appointment.patientName}</div>
                              <div className="text-xs opacity-75">{appointment.time.slice(0, 5)} - {appointment.isOnline ? 'Online - ' : ''}{appointment.specialty || appointment.type}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'month' && (
        <div className="card p-5 overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="grid grid-cols-7 border-b border-slate-100 pb-3">
              {WEEK_DAYS.map(day => (
                <div key={day} className="text-center text-xs font-bold uppercase tracking-wide text-slate-400">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map(date => {
                const dateString = date.toISOString().split('T')[0];
                const inMonth = date.getMonth() === monthCursor.getMonth();
                const isCurrentDay = dateString === today;
                const dayAppointments = appointments
                  .filter((appointment: any) => appointment.date === dateString)
                  .sort((a: any, b: any) => a.time.localeCompare(b.time));
                return (
                  <div key={dateString} className={`min-h-[130px] border-b border-r border-slate-100 p-2 ${inMonth ? 'bg-white' : 'bg-slate-50/70'}`}>
                    <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isCurrentDay ? 'bg-primary-600 text-white' : inMonth ? 'text-slate-800' : 'text-slate-400'}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((appointment: any) => (
                        <button
                          key={appointment.id}
                          onClick={() => { setEditing(appointment); setFormError(''); }}
                          className={`block w-full truncate rounded-lg border px-2 py-1 text-left text-[10px] font-semibold ${STATUS_COLOR[appointment.status]}`}
                        >
                          {appointment.time.slice(0, 5)} {appointment.patientName}
                        </button>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-[10px] font-semibold text-slate-400">+{dayAppointments.length - 3} agendamento(s)</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showForm && <AppForm initial={BLANK} onSave={handleInsert} onClose={() => setShowForm(false)} loading={insertMut.isPending} error={formError} />}
      {editing && (
        <AppForm
          isEdit
          initial={{
            patientName: editing.patientName,
            specialty: editing.specialty ?? '',
            type: editing.type,
            professional: editing.professional ?? '',
            date: editing.date,
            time: editing.time,
            durationMin: editing.durationMin,
            status: editing.status,
            notes: editing.notes ?? '',
            isOnline: editing.isOnline,
          }}
          onSave={handleUpdate}
          onClose={() => setEditing(null)}
          loading={updateMut.isPending}
          error={formError}
        />
      )}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-600" /></div>
            <h3 className="text-base font-semibold text-slate-900 text-center mb-1">Cancelar agendamento</h3>
            <p className="text-sm text-slate-500 text-center mb-5">Excluir agendamento de <strong>{deleting.patientName}</strong> às <strong>{deleting.time.slice(0, 5)}</strong>?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="btn-secondary flex-1 justify-center">Voltar</button>
              <button onClick={handleDelete} disabled={deleteMut.isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all disabled:opacity-60">
                {deleteMut.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
