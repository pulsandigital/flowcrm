import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Clock, User, MapPin, Video } from 'lucide-react';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00`);
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const APPOINTMENTS = [
  { id: 1, patient: 'Sofia Lima',      type: 'Psicologia',    professional: 'Dra. Ana',    start: 9,  duration: 1, day: 1, color: 'bg-violet-100 border-violet-400 text-violet-800', dot: 'bg-violet-500' },
  { id: 2, patient: 'Rodrigo Farias',  type: 'Fisioterapia',  professional: 'Dr. Carlos',  start: 10, duration: 1, day: 1, color: 'bg-blue-100 border-blue-400 text-blue-800', dot: 'bg-blue-500' },
  { id: 3, patient: 'Luciana Melo',    type: 'Psicologia',    professional: 'Dra. Ana',    start: 15, duration: 1, day: 1, color: 'bg-violet-100 border-violet-400 text-violet-800', dot: 'bg-violet-500' },
  { id: 4, patient: 'Camila Torres',   type: 'Nutrição',      professional: 'Dra. Ana',    start: 11, duration: 1, day: 2, color: 'bg-teal-100 border-teal-400 text-teal-800', dot: 'bg-teal-500' },
  { id: 5, patient: 'Felipe Alves',    type: 'Psiquiatria',   professional: 'Dr. Carlos',  start: 14, duration: 1, day: 3, color: 'bg-indigo-100 border-indigo-400 text-indigo-800', dot: 'bg-indigo-500' },
  { id: 6, patient: 'Ana Rodrigues',   type: 'Fisioterapia',  professional: 'Dr. Carlos',  start: 9,  duration: 1, day: 3, color: 'bg-blue-100 border-blue-400 text-blue-800', dot: 'bg-blue-500' },
  { id: 7, patient: 'Carlos Mendes',   type: 'Psiquiatria',   professional: 'Dr. Carlos',  start: 16, duration: 1, day: 4, color: 'bg-indigo-100 border-indigo-400 text-indigo-800', dot: 'bg-indigo-500' },
  { id: 8, patient: 'Beatriz Santos',  type: 'Odontologia',   professional: 'Dra. Ana',    start: 10, duration: 2, day: 5, color: 'bg-rose-100 border-rose-400 text-rose-800', dot: 'bg-rose-500' },
  { id: 9, patient: 'João Pereira',    type: 'Nutrição',      professional: 'Dra. Ana',    start: 13, duration: 1, day: 5, color: 'bg-teal-100 border-teal-400 text-teal-800', dot: 'bg-teal-500' },
  { id: 10, patient: 'Mariana Costa',  type: 'Psicologia',    professional: 'Dra. Ana',    start: 15, duration: 1, day: 6, color: 'bg-violet-100 border-violet-400 text-violet-800', dot: 'bg-violet-500' },
];

const WEEK_DATES = [11, 12, 13, 14, 15, 16, 17];

type ViewMode = 'week' | 'day' | 'month';

export default function CalendarView() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('week');
  const [appointments, setAppointments] = useState(APPOINTMENTS);
  const [selectedApt, setSelectedApt] = useState<typeof APPOINTMENTS[0] | null>(null);
  const [selectedDay, setSelectedDay] = useState(12);
  const [currentMonth, setCurrentMonth] = useState(4);
  const [currentYear, setCurrentYear] = useState(2026);
  const [weekStartDay, setWeekStartDay] = useState(11);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDay, setRescheduleDay] = useState('1');
  const [rescheduleHour, setRescheduleHour] = useState('9');

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstWeekday = new Date(currentYear, currentMonth, 1).getDay();
  const weekDates = Array.from({ length: 7 }, (_, index) => weekStartDay + index).filter(day => day >= 1 && day <= daysInMonth);
  const selectedWeekIndex = weekDates.indexOf(selectedDay);
  const selectedWeekdayIndex = new Date(currentYear, currentMonth, selectedDay).getDay();
  const selectedColumnIndex = selectedWeekIndex >= 0 ? selectedWeekIndex : selectedWeekdayIndex;
  const isDemoMonth = currentMonth === 4 && currentYear === 2026;
  const selectedApts = isDemoMonth && selectedWeekIndex >= 0 ? appointments.filter(a => a.day === selectedWeekIndex) : [];
  const selectedDayLabel = `${selectedDay.toString().padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}`;
  const calendarTitle = view === 'month'
    ? `${MONTH_NAMES[currentMonth]} de ${currentYear}`
    : view === 'day'
      ? `${DAYS_OF_WEEK[selectedWeekdayIndex]}, ${selectedDayLabel}`
      : `${weekStartDay}-${Math.min(weekStartDay + 6, daysInMonth)} de ${MONTH_NAMES[currentMonth]} de ${currentYear}`;

  const setCalendarMonth = (month: number, year = currentYear) => {
    let nextMonth = month;
    let nextYear = year;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    const nextDaysInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
    setSelectedDay(day => Math.min(day, nextDaysInMonth));
    setWeekStartDay(1);
    setSelectedApt(null);
  };

  const goToday = () => {
    setCurrentMonth(4);
    setCurrentYear(2026);
    setWeekStartDay(11);
    setSelectedDay(12);
    setView('day');
    setSelectedApt(null);
  };

  const goPrevious = () => {
    setSelectedApt(null);
    if (view === 'month') {
      setCalendarMonth(currentMonth - 1);
      return;
    }
    if (view === 'week') {
      if (weekStartDay <= 1) {
        setCalendarMonth(currentMonth - 1);
        return;
      }
      const nextStart = Math.max(1, weekStartDay - 7);
      setWeekStartDay(nextStart);
      setSelectedDay(nextStart);
      return;
    }
    if (selectedDay <= 1) {
      setCalendarMonth(currentMonth - 1);
      return;
    }
    setSelectedDay(day => day - 1);
  };

  const goNext = () => {
    setSelectedApt(null);
    if (view === 'month') {
      setCalendarMonth(currentMonth + 1);
      return;
    }
    if (view === 'week') {
      if (weekStartDay + 7 > daysInMonth) {
        setCalendarMonth(currentMonth + 1);
        return;
      }
      const nextStart = weekStartDay + 7;
      setWeekStartDay(nextStart);
      setSelectedDay(nextStart);
      return;
    }
    if (selectedDay >= daysInMonth) {
      setCalendarMonth(currentMonth + 1);
      return;
    }
    setSelectedDay(day => day + 1);
  };
  const openPatientRecord = () => {
    if (!selectedApt) return;
    navigate(`/care/records?patientName=${encodeURIComponent(selectedApt.patient)}`);
  };
  const openVideoCall = () => {
    if (!selectedApt) return;
    navigate(`/care/video-call/${selectedApt.id}`);
  };
  const openReschedule = () => {
    if (!selectedApt) return;
    setRescheduleDay(String(selectedApt.day));
    setRescheduleHour(String(selectedApt.start));
    setRescheduleOpen(true);
  };
  const saveReschedule = () => {
    if (!selectedApt) return;
    const updated = { ...selectedApt, day: Number(rescheduleDay), start: Number(rescheduleHour) };
    setAppointments(prev => prev.map(item => item.id === selectedApt.id ? updated : item));
    setSelectedApt(updated);
    setRescheduleOpen(false);
  };
  const cancelAppointment = () => {
    if (!selectedApt) return;
    setAppointments(prev => prev.filter(item => item.id !== selectedApt.id));
    setSelectedApt(null);
  };

  return (
    <div className="flex h-full overflow-hidden animate-fade-in" style={{ height: 'calc(100vh - 60px)' }}>

      {/* Left mini panel */}
      <div className="w-64 flex-shrink-0 border-r border-slate-100 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <button className="btn-primary w-full justify-center"><Plus size={14} /> Novo agendamento</button>
        </div>

        {/* Mini calendar */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm text-slate-800">{MONTH_NAMES[currentMonth]} {currentYear}</span>
            <div className="flex gap-1">
              <button onClick={() => setCalendarMonth(currentMonth - 1)} className="p-1 text-slate-400 hover:text-slate-600 rounded" type="button"><ChevronLeft size={13} /></button>
              <button onClick={() => setCalendarMonth(currentMonth + 1)} className="p-1 text-slate-400 hover:text-slate-600 rounded" type="button"><ChevronRight size={13} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 pb-1">{d[0]}</div>
            ))}
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const isSelected = day === selectedDay;
              const weekIndex = weekDates.indexOf(day);
              const hasApt = isDemoMonth && weekIndex >= 0 && appointments.some(a => a.day === weekIndex);
              return (
                <button
                  key={day}
                  onClick={() => { setSelectedDay(day); setView('day'); setSelectedApt(null); }}
                  className={`aspect-square flex flex-col items-center justify-center rounded-full text-xs cursor-pointer transition-all
                  ${isSelected ? 'bg-primary-600 text-white font-bold' : 'hover:bg-slate-100 text-slate-700'}`}
                >
                  {day}
                  {hasApt && !isSelected && <div className="w-1 h-1 rounded-full bg-primary-400 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Today's list */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{selectedDay === 12 ? 'Hoje' : 'Selecionado'} - {selectedDayLabel}</p>
          <div className="space-y-2">
            {selectedApts.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">Nenhum agendamento neste dia</p>}
            {selectedApts.map(apt => (
              <div key={apt.id} onClick={() => setSelectedApt(apt)}
                className={`p-3 rounded-xl border-l-4 ${apt.color} cursor-pointer hover:opacity-80 transition-opacity`}>
                <div className="font-semibold text-xs">{apt.start}:00</div>
                <div className="font-medium text-sm truncate">{apt.patient}</div>
                <div className="text-xs opacity-75">{apt.type}</div>
              </div>
            ))}
          </div>

          {/* Professionals legend */}
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-5 mb-3">Profissionais</p>
          <div className="space-y-2">
            {[
              { name: 'Dra. Ana Martins', color: 'bg-violet-500' },
              { name: 'Dr. Carlos Brandão', color: 'bg-blue-500' },
            ].map(p => (
              <div key={p.name} className="flex items-center gap-2 text-xs text-slate-700">
                <div className={`w-2.5 h-2.5 rounded-sm ${p.color}`} />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main calendar */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">

        {/* Calendar header */}
        <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={goPrevious} className="btn-ghost btn-sm" type="button"><ChevronLeft size={15} /></button>
            <h2 className="font-bold text-slate-900 text-base">{calendarTitle}</h2>
            <button onClick={goNext} className="btn-ghost btn-sm" type="button"><ChevronRight size={15} /></button>
            <button onClick={goToday} className="btn-secondary btn-sm text-xs ml-2" type="button">Hoje</button>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                  ${view === v ? 'bg-white shadow text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}>
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar body */}
        <div className="flex-1 overflow-auto">
          {view === 'month' ? (
            <div className="p-4">
              <div className="grid grid-cols-7 overflow-hidden rounded-2xl border border-slate-100">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-500">
                    {day}
                  </div>
                ))}
                {Array.from({ length: firstWeekday }).map((_, i) => <div key={`blank-${i}`} className="min-h-[120px] border-b border-r border-slate-100 bg-slate-50/40" />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const weekIndex = WEEK_DATES.indexOf(day);
                  const dayApts = isDemoMonth && weekIndex >= 0 ? appointments.filter(a => a.day === weekIndex) : [];
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => { setSelectedDay(day); setView('day'); setSelectedApt(null); }}
                      className={`min-h-[120px] border-b border-r border-slate-100 p-2 text-left transition-colors hover:bg-primary-50/50 ${day === selectedDay ? 'bg-primary-50' : 'bg-white'}`}
                    >
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${day === selectedDay ? 'bg-primary-600 text-white' : 'text-slate-700'}`}>
                        {day}
                      </span>
                      <div className="mt-2 space-y-1">
                        {dayApts.slice(0, 3).map(apt => (
                          <div key={apt.id} onClick={(event) => { event.stopPropagation(); setSelectedApt(apt); }} className={`truncate rounded-md border-l-4 px-2 py-1 text-xs ${apt.color}`}>
                            {apt.start}:00 {apt.patient}
                          </div>
                        ))}
                        {dayApts.length > 3 && <div className="text-xs text-slate-400">+{dayApts.length - 3} agendamentos</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="grid border-b border-slate-100 sticky top-0 bg-white z-10" style={{ gridTemplateColumns: view === 'day' ? '60px 1fr' : '60px repeat(7, 1fr)' }}>
                <div />
                {DAYS_OF_WEEK.map((day, i) => (view === 'day' && i !== selectedColumnIndex) ? null : (
                  <button key={day} type="button" onClick={() => { setSelectedDay(weekDates[i] ?? selectedDay); setView('day'); setSelectedApt(null); }} className={`text-center py-3 border-l border-slate-100 transition-colors ${i === selectedColumnIndex ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
                    <div className="text-xs font-medium text-slate-500">{day}</div>
                    <div className={`text-lg font-bold mt-0.5 mx-auto w-9 h-9 flex items-center justify-center rounded-full
                      ${i === selectedColumnIndex ? 'bg-primary-600 text-white' : 'text-slate-800'}`}>
                      {view === 'day' ? selectedDay : weekDates[i]}
                    </div>
                  </button>
                ))}
              </div>

              <div className="relative">
                {HOURS.map((hour, hIdx) => {
                  const hourNum = hIdx + 8;
                  return (
                    <div key={hour} className="grid" style={{ gridTemplateColumns: view === 'day' ? '60px 1fr' : '60px repeat(7, 1fr)', minHeight: view === 'day' ? '78px' : '64px' }}>
                      <div className="text-[11px] text-slate-400 font-medium text-right pr-3 pt-1 flex-shrink-0">
                        {hour}
                      </div>
                      {DAYS_OF_WEEK.map((_, dayIdx) => {
                        if (view === 'day' && dayIdx !== selectedColumnIndex) return null;
                        const lookupDay = view === 'day' ? selectedWeekIndex : dayIdx;
                        const apts = isDemoMonth && lookupDay >= 0 ? appointments.filter(a => a.day === lookupDay && a.start === hourNum) : [];
                        return (
                          <div key={dayIdx}
                            className={`border-l border-t border-slate-100 relative min-h-[64px] p-0.5
                              ${dayIdx === selectedColumnIndex ? 'bg-primary-50/40' : ''}`}>
                            {apts.map(apt => (
                              <div key={apt.id}
                                onClick={() => setSelectedApt(apt)}
                                className={`${apt.color} border-l-4 rounded-lg p-1.5 cursor-pointer hover:opacity-80 transition-opacity text-xs`}
                                style={{ minHeight: `${apt.duration * 60}px` }}>
                                <div className="font-bold truncate">{apt.start}:00</div>
                                <div className="font-semibold truncate">{apt.patient}</div>
                                <div className="opacity-75 truncate">{apt.type}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Appointment detail drawer */}
      {selectedApt && (
        <div className="w-72 flex-shrink-0 border-l border-slate-100 bg-white flex flex-col animate-slide-up overflow-y-auto">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Detalhes</h3>
            <button onClick={() => setSelectedApt(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className={`${selectedApt.color} border-l-4 rounded-xl p-4`}>
              <div className="font-bold text-base">{selectedApt.patient}</div>
              <div className="text-sm opacity-75 mt-0.5">{selectedApt.type}</div>
            </div>
            {[
              { icon: Clock,   label: `${DAYS_OF_WEEK[selectedApt.day]}, ${WEEK_DATES[selectedApt.day]}/05 - ${selectedApt.start}:00 às ${selectedApt.start + selectedApt.duration}:00` },
              { icon: User,    label: selectedApt.professional },
              { icon: MapPin,  label: 'Consultório 2' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-slate-700">
                <Icon size={15} className="text-slate-400 flex-shrink-0" />
                {label}
              </div>
            ))}
            <div className="pt-2 space-y-2">
              <button onClick={openPatientRecord} className="btn-primary w-full justify-center text-sm">Abrir prontuário</button>
              <button onClick={openVideoCall} className="btn-secondary w-full justify-center text-sm"><Video size={14} /> Chamada interna</button>
              <button onClick={openReschedule} className="btn-secondary w-full justify-center text-sm">Reagendar</button>
              <button onClick={cancelAppointment} className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">Cancelar consulta</button>
            </div>
          </div>
        </div>
      )}
      {rescheduleOpen && selectedApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-bold text-slate-900">Reagendar consulta</h3>
            <p className="mt-1 text-sm text-slate-500">{selectedApt.patient} · {selectedApt.type}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Dia</label>
                <select className="input" value={rescheduleDay} onChange={event => setRescheduleDay(event.target.value)}>
                  {DAYS_OF_WEEK.map((day, index) => <option key={day} value={index}>{day}, {WEEK_DATES[index]}/05</option>)}
                </select>
              </div>
              <div>
                <label className="label">Horário</label>
                <select className="input" value={rescheduleHour} onChange={event => setRescheduleHour(event.target.value)}>
                  {HOURS.map(hour => {
                    const value = Number(hour.split(':')[0]);
                    return <option key={hour} value={value}>{hour}</option>;
                  })}
                </select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setRescheduleOpen(false)} className="btn-secondary">Cancelar</button>
              <button onClick={saveReschedule} className="btn-primary">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
