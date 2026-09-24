import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Baby,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileCheck,
  FileText,
  HeartPulse,
  History,
  Mail,
  MessageSquare,
  Microscope,
  Paperclip,
  Phone,
  Pill,
  Plus,
  Printer,
  Ruler,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import { useAppointments } from '../hooks/useAppointments';
import { usePatients } from '../hooks/usePatients';
import { toast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import type { Patient } from '../types';

type MainTab = 'registration' | 'health' | 'care' | 'attachments' | 'consents' | 'messages' | 'history';
type CareTab =
  | 'appointments'
  | 'prescriptions'
  | 'certificates'
  | 'referrals'
  | 'reports'
  | 'exams'
  | 'procedures'
  | 'scales'
  | 'vitals'
  | 'measurements'
  | 'receipts'
  | 'diagnostic'
  | 'diaries'
  | 'prevent';
type HealthTab = 'general' | 'women' | 'mental' | 'vaccines';

const MAIN_TABS: Array<{ id: MainTab; label: string; icon: any }> = [
  { id: 'registration', label: 'Cadastro', icon: User },
  { id: 'health', label: 'Saúde', icon: HeartPulse },
  { id: 'care', label: 'Atendimentos', icon: Stethoscope },
  { id: 'attachments', label: 'Anexos', icon: Paperclip },
  { id: 'consents', label: 'Aceites', icon: FileCheck },
  { id: 'messages', label: 'Mensagens', icon: Mail },
  { id: 'history', label: 'Histórico', icon: History },
];

const CARE_TABS: Array<{ id: CareTab; label: string; icon: any }> = [
  { id: 'appointments', label: 'Atendimentos', icon: ClipboardList },
  { id: 'prescriptions', label: 'Prescrições', icon: Pill },
  { id: 'certificates', label: 'Atestados', icon: ClipboardCheck },
  { id: 'referrals', label: 'Encaminhamentos', icon: Send },
  { id: 'reports', label: 'Relatórios', icon: FileText },
  { id: 'exams', label: 'Exames', icon: Microscope },
  { id: 'procedures', label: 'Procedimentos', icon: Stethoscope },
  { id: 'scales', label: 'Escalas', icon: Activity },
  { id: 'vitals', label: 'Sinais', icon: HeartPulse },
  { id: 'measurements', label: 'Medidas', icon: Ruler },
  { id: 'receipts', label: 'Recibos', icon: Printer },
  { id: 'diagnostic', label: 'Auxílio diagnóstico', icon: ShieldCheck },
  { id: 'diaries', label: 'Diários', icon: FileCheck },
  { id: 'prevent', label: 'Calculadora PREVENT', icon: Scale },
];

const HEALTH_TABS: Array<{ id: HealthTab; label: string; icon: any }> = [
  { id: 'general', label: 'Saúde geral', icon: HeartPulse },
  { id: 'women', label: 'Saúde da mulher', icon: Baby },
  { id: 'mental', label: 'Saúde mental', icon: Activity },
  { id: 'vaccines', label: 'Histórico de vacinação', icon: Syringe },
];

const GENERAL_DIAGNOSES = [
  'Arritmia cardíaca',
  'Hipertensão essencial',
  'Infarto agudo do miocárdio',
  'Acidente vascular cerebral',
  'Dislipidemia',
  'Insuficiência renal crônica',
  'Diabetes mellitus',
  'Hipotireoidismo',
  'Neoplasia',
  'Artrose',
  'Rinite',
  'Asma',
  'Catarata',
];

const ALLERGIES = [
  'Intolerância à lactose',
  'Alergia à penicilina',
  'Alergia a analgésicos',
  'Alergia a outros antibióticos',
];

const MENTAL_DIAGNOSES = [
  'Depressão prévia',
  'Transtorno ansioso prévio',
  'Dor de cabeça',
  'Epilepsia',
  'Traumatismo craniano',
  'Alzheimer',
  'Insônia',
  'Tabagismo',
];

const VACCINES = [
  'BCG',
  'Hepatite B',
  'Pentavalente',
  'VIP/VOP',
  'Pneumocócica',
  'Meningocócica',
  'Tríplice viral',
  'Varicela',
  'Influenza',
  'COVID-19',
  'HPV',
];

const MOCK_DOCUMENTS = [
  { type: 'Aceite', title: 'Consentimento de atendimento', status: 'Pendente' },
  { type: 'LGPD', title: 'Tratamento de dados sensíveis', status: 'Pendente' },
  { type: 'Portal', title: 'Acesso ao portal do paciente', status: 'Aceito' },
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function ageText(value?: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  let years = today.getFullYear() - date.getFullYear();
  let months = today.getMonth() - date.getMonth();
  if (today.getDate() < date.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years} anos${months > 0 ? ` e ${months} meses` : ''}`;
}

function daysAgoText(value?: string) {
  if (!value) return '';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diff < 0) return '';
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'há 1 dia';
  return `há ${diff} dias`;
}

function recordNumber(patient: Patient) {
  return patient.id ? patient.id.replace(/\D/g, '').slice(0, 7) || patient.id.slice(0, 6) : '0000000';
}

function SummaryLine({ label, value, strong }: { label: string; value?: ReactNode; strong?: boolean }) {
  return (
    <li className="leading-relaxed">
      <span>{label}: </span>
      <span className={strong ? 'font-bold text-slate-950' : 'font-medium text-slate-800'}>{value || '-'}</span>
    </li>
  );
}

function PatientSummaryModal({ patient, appointments, onClose }: { patient: Patient; appointments: any[]; onClose: () => void }) {
  const sortedAppointments = [...appointments].sort((a: any, b: any) => String(a.date || a.starts_at || '').localeCompare(String(b.date || b.starts_at || '')));
  const firstAppointment = sortedAppointments[0];
  const lastAppointment = sortedAppointments[sortedAppointments.length - 1];
  const diagnosisGroups = [
    'Neuropsiquiátrico',
    'Condições médicas gerais',
    'Estressores psicossociais',
    'Alergias e intolerâncias',
  ];
  const geneticMarkers = ['CYP1A2', 'CYP2B6', 'CYP2C19', 'CYP2C9', 'CYP2D6', 'CYP3A4', 'CYP3A5'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-950/50 px-3 py-6">
      <section className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between bg-teal-700 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <User size={20} />
            <h2 className="text-lg font-semibold">Resumo do paciente</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white hover:bg-white/10" aria-label="Fechar resumo">
            <X size={22} />
          </button>
        </header>

        <div className="max-h-[78vh] overflow-y-auto px-5 py-4 text-sm text-slate-800">
          <section className="space-y-3 border-b border-slate-200 pb-4">
            <h3 className="font-bold text-slate-950">Informações pessoais:</h3>
            <ul className="ml-5 list-square">
              <SummaryLine label="Prontuário" value={`#${recordNumber(patient)}`} strong />
              <SummaryLine label="Nome" value={patient.name} strong />
              <SummaryLine label="Nome da mãe" />
              <SummaryLine label="Idade" value={`${ageText(patient.dob) || '-'} (${formatDate(patient.dob)})`} strong />
              <SummaryLine label="Sexo" value="Não informado" />
              <SummaryLine label="Documento" value={patient.cpf || '-'} strong />
              <SummaryLine label="Contato" value={patient.phone || patient.email || '-'} strong />
              <SummaryLine label="Endereço" value={[patient.city, patient.state].filter(Boolean).join(', ')} />
              <SummaryLine label="Nome do convênio" value={patient.plan} />
              <SummaryLine label="Número do convênio" />
            </ul>
          </section>

          <section className="space-y-3 border-b border-slate-200 py-4">
            <h3 className="font-bold text-slate-950">Atendimentos:</h3>
            <ul className="ml-5 list-square">
              <SummaryLine
                label="Primeiro atendimento"
                value={firstAppointment ? `${formatDate(firstAppointment.date || firstAppointment.starts_at)} (${daysAgoText(firstAppointment.date || firstAppointment.starts_at)})` : 'Nenhum atendimento registrado'}
                strong={Boolean(firstAppointment)}
              />
              <SummaryLine
                label="Último atendimento"
                value={lastAppointment ? `${formatDate(lastAppointment.date || lastAppointment.starts_at)} (${daysAgoText(lastAppointment.date || lastAppointment.starts_at)})` : 'Nenhum atendimento registrado'}
                strong={Boolean(lastAppointment)}
              />
            </ul>
          </section>

          <section className="space-y-3 border-b border-slate-200 py-4">
            <h3 className="font-bold text-slate-950">Diagnósticos:</h3>
            <div className="space-y-3">
              {diagnosisGroups.map(group => (
                <div key={group}>
                  <p className="font-medium text-slate-500">{group}</p>
                  <p className="text-slate-700">Não há diagnósticos cadastrados</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 border-b border-slate-200 py-4">
            <h3 className="font-bold text-slate-950">Sumário genético:</h3>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {geneticMarkers.map(marker => (
                <div key={marker} className="ml-5 list-item list-square">
                  <span>{marker}: </span>
                  <span className="font-bold text-slate-950">Não inserido</span>
                </div>
              ))}
            </div>
          </section>

          <section className="pt-4">
            <h3 className="font-bold text-slate-950">Observações:</h3>
            <p className="mt-2 whitespace-pre-wrap text-slate-700">{patient.notes || 'Nenhuma observação cadastrada.'}</p>
          </section>
        </div>
      </section>
    </div>
  );
}

function parseAppointmentDate(appointment: any) {
  const value = appointment?.starts_at || appointment?.date || appointment?.createdAt || appointment?.created_at;
  if (!value) return new Date();
  const date = String(value).includes('T') ? new Date(value) : new Date(`${String(value).slice(0, 10)}T${appointment?.time || '09:00'}:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatTimelineDate(date: Date) {
  return date
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    .replace(' de ', ' DE ')
    .replace(' de ', ', ')
    .toUpperCase();
}

function formatTimelineDateTime(value?: string, fallbackDate?: Date, fallbackTime?: string) {
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  if (fallbackDate) {
    const date = fallbackDate.toLocaleDateString('pt-BR');
    return fallbackTime ? `${date}, ${fallbackTime}` : date;
  }

  return '-';
}

function appointmentModality(appointment: any) {
  if (appointment?.modality) return appointment.modality;
  if (appointment?.isOnline || appointment?.is_online) return 'Teleconsulta';
  if (appointment?.location && String(appointment.location).startsWith('http')) return 'Teleconsulta';
  if (appointment?.location && String(appointment.location).toLowerCase() !== 'consultorio') return appointment.location;
  return 'Presencial';
}

function appointmentEvolutionText(patient: Patient, appointment: any) {
  return (
    appointment?.evolution ||
    appointment?.record ||
    appointment?.clinical_notes ||
    appointment?.notes ||
    patient.notes ||
    'Evolução detalhada ainda não registrada.\n\nUse este histórico para acompanhar anamnese, exame, conduta, prescrições, solicitações, orientações e decisões clínicas vinculadas ao atendimento.'
  );
}

function PatientHistoryTimeline({ patient, appointments }: { patient: Patient; appointments: any[] }) {
  const sortedAppointments = [...appointments].sort((a, b) => parseAppointmentDate(b).getTime() - parseAppointmentDate(a).getTime());
  const events = sortedAppointments.length
    ? sortedAppointments
    : [
        {
          id: 'empty-clinical-record',
          date: patient.updatedAt || patient.createdAt || new Date().toISOString(),
          type: 'Registro inicial',
          status: 'disponível',
          professional: patient.professional || 'Profissional responsável',
          notes: patient.notes || 'Paciente cadastrado. Ainda não há atendimento clínico evoluído neste histórico.',
        },
      ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-slate-950 dark:text-white">Linha do tempo clínica</h3>
          <p className="text-sm text-slate-500 dark:text-slate-300">Histórico visual de atendimentos, evoluções e registros vinculados ao paciente.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-secondary btn-sm">
          <Printer size={14} /> Imprimir histórico
        </button>
      </div>

      <div className="space-y-0">
        {events.map((appointment: any, index) => {
          const date = parseAppointmentDate(appointment);
          const scheduled = formatTimelineDateTime(appointment.starts_at, date, appointment.time);
          const completed = formatTimelineDateTime(appointment.ends_at, date, appointment.endTime);
          const professional = appointment.professional || appointment.professionalName || patient.professional || 'Profissional responsável';
          const status = appointment.status || 'registrado';
          const evolutionType = appointment.type || appointment.appointment_type || 'Evolução ambulatorial';

          return (
            <article key={appointment.id || `${appointment.date}-${index}`} className="relative grid grid-cols-[32px_1fr] gap-4 pb-8 last:pb-0">
              <div className="relative flex justify-center">
                <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm">
                  <Stethoscope size={17} />
                </div>
                {index < events.length - 1 && <div className="absolute top-8 h-full w-px bg-teal-200 dark:bg-teal-800" />}
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-teal-600 dark:text-teal-300">{formatTimelineDate(date)}</p>
                <section className="mt-4 border-l-2 border-slate-200 pl-5 dark:border-slate-700">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">Registro de atendimento clínico</h4>

                  <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-300">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <CalendarClock size={13} className="text-teal-600 dark:text-teal-300" />
                      <span>Agendado para {scheduled}</span>
                      <span>• Iniciado em {scheduled}</span>
                      <span>• Concluído em {completed}</span>
                      <span>• Finalizado em {completed} (UTC-3)</span>
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5">
                      <User size={13} className="text-teal-600 dark:text-teal-300" />
                      <span>Atendido por <strong className="text-slate-700 dark:text-white">{professional}</strong></span>
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-200">{status}</span>
                    </p>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-slate-900 dark:text-slate-100">
                    <p><strong>Modalidade do atendimento:</strong> {appointmentModality(appointment)}</p>
                    <p><strong>Evolução:</strong> {evolutionType}</p>
                  </div>

                  <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                    {appointmentEvolutionText(patient, appointment)}
                  </div>
                </section>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: any; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between bg-teal-700 px-4 py-2 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={17} />
          {title}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[42px] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        active
          ? 'border-teal-300 bg-teal-50 text-teal-800'
          : 'border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50/60'
      }`}
    >
      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
        active ? 'bg-teal-600 text-white' : 'bg-red-100 text-red-600'
      }`}>
        {active ? '✓' : '×'}
      </span>
      {label}
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function HealthContent({ healthTab }: { healthTab: HealthTab }) {
  const [generalSelected, setGeneralSelected] = useState<string[]>(['Hipertensão essencial']);
  const [allergySelected, setAllergySelected] = useState<string[]>([]);
  const [mentalSelected, setMentalSelected] = useState<string[]>([]);
  const [vaccines, setVaccines] = useState<string[]>(['BCG', 'Hepatite B']);
  const toggle = (list: string[], setList: (next: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(value => value !== item) : [...list, item]);
  };

  if (healthTab === 'women') {
    return (
      <div className="space-y-4">
        <Panel title="Saúde da mulher" icon={Baby}>
          <div className="grid gap-3 md:grid-cols-4">
            {['Partos normais', 'Partos cesáreos', 'Abortos', 'Gravidezes'].map(label => (
              <input key={label} className="input" placeholder={label} />
            ))}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {['Gestante', 'Amamentando', 'Menopausa'].map(label => (
              <ToggleChip key={label} label={label} active={false} onClick={() => {}} />
            ))}
          </div>
        </Panel>
        <Panel title="Medicamentos anticoncepcionais utilizados" icon={Pill}>
          <button className="btn-secondary btn-sm"><Plus size={14} /> Adicionar medicamento</button>
          <EmptyState title="Nenhum medicamento adicionado" description="Registre anticoncepcionais, doses e observações relevantes." />
        </Panel>
      </div>
    );
  }

  if (healthTab === 'mental') {
    return (
      <div className="space-y-4">
        <Panel title="Antecedentes de saúde mental" icon={Activity}>
          <div className="grid gap-3 md:grid-cols-3">
            {['Já consultou psiquiatra', 'Já consultou neurologista', 'Já consultou psicólogo', 'Já consultou fonoaudiólogo', 'Internação psiquiátrica prévia'].map(label => (
              <ToggleChip key={label} label={label} active={false} onClick={() => {}} />
            ))}
          </div>
        </Panel>
        <Panel title="Diagnósticos" icon={ClipboardCheck}>
          <div className="grid gap-3 md:grid-cols-4">
            {MENTAL_DIAGNOSES.map(item => (
              <ToggleChip key={item} label={item} active={mentalSelected.includes(item)} onClick={() => toggle(mentalSelected, setMentalSelected, item)} />
            ))}
          </div>
          <button className="btn-secondary btn-sm mt-4"><Plus size={14} /> Adicionar diagnóstico</button>
        </Panel>
        <Panel title="Medicamentos psicotrópicos utilizados" icon={Pill}>
          <button className="btn-secondary btn-sm"><Plus size={14} /> Adicionar medicamento</button>
          <EmptyState title="Nenhum medicamento adicionado" description="Registre psicotrópicos em uso, resposta e efeitos adversos." />
        </Panel>
      </div>
    );
  }

  if (healthTab === 'vaccines') {
    return (
      <div className="space-y-4">
        <Panel title="Histórico de vacinação" icon={Syringe}>
          <div className="grid gap-3 md:grid-cols-5">
            {VACCINES.map(item => (
              <ToggleChip key={item} label={item} active={vaccines.includes(item)} onClick={() => toggle(vaccines, setVaccines, item)} />
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Use este painel como conferência. A conduta final deve seguir calendário oficial, idade, histórico e indicação clínica.
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel title="Diagnósticos" icon={ClipboardCheck}>
        <div className="grid gap-3 md:grid-cols-4">
          {GENERAL_DIAGNOSES.map(item => (
            <ToggleChip key={item} label={item} active={generalSelected.includes(item)} onClick={() => toggle(generalSelected, setGeneralSelected, item)} />
          ))}
        </div>
        <button className="btn-secondary btn-sm mt-4"><Plus size={14} /> Adicionar diagnóstico</button>
      </Panel>
      <Panel title="Medicamentos clínicos utilizados" icon={Pill}>
        <button className="btn-secondary btn-sm"><Plus size={14} /> Adicionar medicamento</button>
        <EmptyState title="Nenhum medicamento adicionado" description="Registre medicamentos de uso contínuo ou recente." />
      </Panel>
      <Panel title="Alergias e intolerâncias" icon={AlertTriangle}>
        <div className="grid gap-3 md:grid-cols-4">
          {ALLERGIES.map(item => (
            <ToggleChip key={item} label={item} active={allergySelected.includes(item)} onClick={() => toggle(allergySelected, setAllergySelected, item)} />
          ))}
        </div>
        <button className="btn-secondary btn-sm mt-4"><Plus size={14} /> Adicionar alergia/intolerância</button>
      </Panel>
      <Panel title="Órteses e próteses" icon={Activity}>
        <button className="btn-secondary btn-sm"><Plus size={14} /> Adicionar órtese/prótese</button>
        <EmptyState title="Nenhum registro adicionado" description="Registre dispositivos, próteses ou limitações funcionais." />
      </Panel>
    </div>
  );
}

function CareContent({ careTab, patient }: { careTab: CareTab; patient: Patient }) {
  const navigate = useNavigate();
  const { data: appointments = [] } = useAppointments();
  const [quickNote, setQuickNote] = useState('');
  const [localItems, setLocalItems] = useState<Record<string, Array<{ id: string; title: string; description: string; meta: string }>>>({});
  const [vitals, setVitals] = useState({ bloodPressure: '', heartRate: '', saturation: '', temperature: '', respiratoryRate: '' });
  const [measurements, setMeasurements] = useState({ weight: '', height: '', waist: '', hip: '' });
  const [prevent, setPrevent] = useState({ age: '', systolic: '', cholesterol: '', diabetes: false, smoker: false });
  const patientAppointments = appointments.filter((appointment: any) =>
    appointment.patient_id === patient.id || appointment.patientName === patient.name || appointment.title === patient.name
  );
  const currentItems = localItems[careTab] ?? [];
  const bmi = Number(measurements.weight) > 0 && Number(measurements.height) > 0
    ? (Number(measurements.weight) / ((Number(measurements.height) / 100) ** 2)).toFixed(1)
    : '';
  const preventScore = [
    Number(prevent.age) >= 65,
    Number(prevent.systolic) >= 140,
    Number(prevent.cholesterol) >= 200,
    prevent.diabetes,
    prevent.smoker,
  ].filter(Boolean).length;
  const documentUrl = (type?: string) => `/care/documents?patient=${patient.id}${type ? `&type=${type}` : ''}`;
  const addLocalItem = (title: string, description: string, meta = 'Registrado agora') => {
    setLocalItems(prev => ({
      ...prev,
      [careTab]: [
        { id: `${careTab}-${Date.now()}`, title, description, meta },
        ...(prev[careTab] ?? []),
      ],
    }));
    setQuickNote('');
  };
  const quickList = (emptyTitle: string, emptyDescription: string) => currentItems.length > 0 ? (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      {currentItems.map(item => (
        <div key={item.id} className="border-b border-slate-100 p-4 last:border-b-0">
          <p className="font-semibold text-slate-800">{item.title}</p>
          <p className="mt-1 text-sm text-slate-600">{item.description}</p>
          <p className="mt-2 text-xs font-semibold text-teal-700">{item.meta}</p>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState title={emptyTitle} description={emptyDescription} />
  );

  if (careTab === 'appointments') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button onClick={() => navigate('/care/schedule')} className="btn-primary btn-sm"><Plus size={14} /> Novo atendimento</button>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm">Estatísticas</button>
            <button className="btn-secondary btn-sm">Filtros</button>
          </div>
        </div>
        {patientAppointments.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {patientAppointments.map((appointment: any) => (
              <div key={appointment.id} className="grid gap-3 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-[1fr_1.5fr_1fr_auto]">
                <div>
                  <p className="font-semibold text-slate-800">{formatDate(appointment.date)} às {appointment.time || '-'}</p>
                  <p className="text-xs text-slate-500">{appointment.professional || patient.professional || 'Profissional'}</p>
                </div>
                <div>
                  <p className="font-semibold text-teal-700">{appointment.type || 'Consulta'}</p>
                  <p className="text-xs text-slate-500">Status: {appointment.status || 'agendado'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-700">{appointment.specialty || patient.specialty || 'Especialidade'}</p>
                  <p className="text-xs text-teal-700">Duração: {appointment.durationMin || 60} minutos</p>
                </div>
                <button onClick={() => navigate(`/care/records?patient=${patient.id}`)} className="btn-secondary btn-sm">Abrir prontuário</button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum atendimento registrado" description="Crie um agendamento ou registre uma evolução para compor a linha clínica." />
        )}
      </div>
    );
  }

  if (careTab === 'prescriptions') {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(documentUrl('prescription'))} className="btn-primary btn-sm"><Plus size={14} /> Nova prescrição</button>
        <EmptyState title="Nenhuma prescrição registrada" description="As receitas e prescrições emitidas para este paciente aparecerão aqui." />
        <Panel title="Medicamentos utilizados" icon={Pill}>
          <EmptyState title="Nenhum medicamento adicionado" description="Use este espaço para acompanhar medicamentos em uso." />
        </Panel>
      </div>
    );
  }

  if (careTab === 'certificates') {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(documentUrl('attestation'))} className="btn-primary btn-sm"><Plus size={14} /> Novo atestado</button>
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">Atestado clínico</p>
              <p className="text-sm text-slate-500">Afastamento, repouso ou recomendação clínica.</p>
              <p className="mt-1 text-xs text-teal-700">Assinatura digital pendente de integração certificadora.</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary btn-sm">Visualizar</button>
              <button className="btn-secondary btn-sm">Imprimir</button>
              <button className="btn-secondary btn-sm">Enviar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (careTab === 'scales') {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(`/care/scales?patient=${patient.id}`)} className="btn-primary btn-sm"><Plus size={14} /> Aplicar escala</button>
        <EmptyState title="Nenhuma escala aplicada" description="Escalas validadas ou licenciadas aparecem aqui após aplicação no paciente." />
      </div>
    );
  }

  if (careTab === 'exams') {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(documentUrl('exam_authorization'))} className="btn-primary btn-sm"><Plus size={14} /> Solicitar exame</button>
        <EmptyState title="Nenhum exame solicitado" description="Guias SP/SADT, solicitações e resultados ficarão vinculados ao paciente." />
      </div>
    );
  }

  if (careTab === 'referrals') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate(documentUrl('service_guide'))} className="btn-primary btn-sm"><Plus size={14} /> Guia de serviço</button>
          <button onClick={() => navigate(documentUrl('consultation_guide'))} className="btn-secondary btn-sm"><FileText size={14} /> Guia de consulta</button>
          <button onClick={() => navigate(documentUrl('sp_sadt_guide'))} className="btn-secondary btn-sm"><FileText size={14} /> SP/SADT</button>
        </div>
        {quickList('Nenhum encaminhamento registrado', 'Encaminhamentos, guias de serviço e autorizações aparecerão aqui.')}
      </div>
    );
  }

  if (careTab === 'reports') {
    return (
      <div className="space-y-4">
        <textarea className="input min-h-[120px]" value={quickNote} onChange={event => setQuickNote(event.target.value)} placeholder="Resumo clínico, evolução ou relatório solicitado..." />
        <button type="button" onClick={() => addLocalItem('Relatório clínico', quickNote.trim() || 'Relatório iniciado sem descrição.')} className="btn-primary btn-sm">
          <Plus size={14} /> Salvar relatório
        </button>
        {quickList('Nenhum relatório registrado', 'Relatórios clínicos salvos nesta ficha aparecerão aqui.')}
      </div>
    );
  }

  if (careTab === 'procedures') {
    return (
      <div className="space-y-4">
        <textarea className="input min-h-[120px]" value={quickNote} onChange={event => setQuickNote(event.target.value)} placeholder="Procedimento realizado, técnica, materiais, intercorrências e orientação..." />
        <button type="button" onClick={() => addLocalItem('Procedimento', quickNote.trim() || 'Procedimento registrado sem detalhes.')} className="btn-primary btn-sm">
          <Plus size={14} /> Registrar procedimento
        </button>
        {quickList('Nenhum procedimento registrado', 'Procedimentos executados ou planejados aparecerão aqui.')}
      </div>
    );
  }

  if (careTab === 'vitals') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <input className="input" value={vitals.bloodPressure} onChange={event => setVitals(prev => ({ ...prev, bloodPressure: event.target.value }))} placeholder="PA ex: 120/80" />
          <input className="input" value={vitals.heartRate} onChange={event => setVitals(prev => ({ ...prev, heartRate: event.target.value }))} placeholder="FC bpm" />
          <input className="input" value={vitals.saturation} onChange={event => setVitals(prev => ({ ...prev, saturation: event.target.value }))} placeholder="SpO2 %" />
          <input className="input" value={vitals.temperature} onChange={event => setVitals(prev => ({ ...prev, temperature: event.target.value }))} placeholder="Temp. °C" />
          <input className="input" value={vitals.respiratoryRate} onChange={event => setVitals(prev => ({ ...prev, respiratoryRate: event.target.value }))} placeholder="FR irpm" />
        </div>
        <button type="button" onClick={() => addLocalItem('Sinais vitais', `PA: ${vitals.bloodPressure || '-'} | FC: ${vitals.heartRate || '-'} | SpO2: ${vitals.saturation || '-'} | Temperatura: ${vitals.temperature || '-'} | FR: ${vitals.respiratoryRate || '-'}`)} className="btn-primary btn-sm">
          <CheckCircle2 size={14} /> Salvar sinais
        </button>
        {quickList('Nenhum sinal vital registrado', 'Pressão, frequência, saturação, temperatura e FR ficarão listadas aqui.')}
      </div>
    );
  }

  if (careTab === 'measurements') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="input" value={measurements.weight} onChange={event => setMeasurements(prev => ({ ...prev, weight: event.target.value }))} placeholder="Peso kg" />
          <input className="input" value={measurements.height} onChange={event => setMeasurements(prev => ({ ...prev, height: event.target.value }))} placeholder="Altura cm" />
          <input className="input" value={measurements.waist} onChange={event => setMeasurements(prev => ({ ...prev, waist: event.target.value }))} placeholder="Cintura cm" />
          <input className="input" value={measurements.hip} onChange={event => setMeasurements(prev => ({ ...prev, hip: event.target.value }))} placeholder="Quadril cm" />
        </div>
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
          IMC calculado: <strong>{bmi || 'preencha peso e altura'}</strong>
        </div>
        <button type="button" onClick={() => addLocalItem('Medidas corporais', `Peso: ${measurements.weight || '-'} kg | Altura: ${measurements.height || '-'} cm | IMC: ${bmi || '-'} | Cintura: ${measurements.waist || '-'} cm | Quadril: ${measurements.hip || '-'} cm`)} className="btn-primary btn-sm">
          <CheckCircle2 size={14} /> Salvar medidas
        </button>
        {quickList('Nenhuma medida registrada', 'Medidas corporais e antropométricas ficarão listadas aqui.')}
      </div>
    );
  }

  if (careTab === 'receipts') {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(`/finance?patient=${patient.id}&tab=receipts`)} className="btn-primary btn-sm"><Printer size={14} /> Abrir recibos no financeiro</button>
        <EmptyState title="Nenhum recibo emitido" description="Recibos de pagamento ficam vinculados ao financeiro e ao paciente." />
      </div>
    );
  }

  if (careTab === 'diagnostic') {
    const suggestions = ['R10.2 Dor pélvica e perineal', 'R07.4 Dor torácica não especificada', 'F41.1 Ansiedade generalizada', 'F32.9 Episódio depressivo'];
    return (
      <div className="space-y-4">
        <textarea className="input min-h-[120px]" value={quickNote} onChange={event => setQuickNote(event.target.value)} placeholder="Digite queixa, achados ou hipótese diagnóstica..." />
        <Panel title="Sugestões de apoio" icon={ShieldCheck}>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(item => (
              <button key={item} type="button" onClick={() => setQuickNote(item)} className="btn-secondary btn-sm">{item}</button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Sugestões de apoio. A decisão clínica e confirmação do CID são sempre do profissional.</p>
        </Panel>
        <button type="button" onClick={() => addLocalItem('Hipótese diagnóstica', quickNote.trim() || 'Hipótese registrada sem descrição.')} className="btn-primary btn-sm">
          <Plus size={14} /> Registrar hipótese
        </button>
        {quickList('Nenhuma hipótese registrada', 'Hipóteses, CIDs e raciocínio clínico ficarão listados aqui.')}
      </div>
    );
  }

  if (careTab === 'diaries') {
    return (
      <div className="space-y-4">
        <textarea className="input min-h-[140px]" value={quickNote} onChange={event => setQuickNote(event.target.value)} placeholder="Registro livre do diário clínico do paciente..." />
        <button type="button" onClick={() => addLocalItem('Diário clínico', quickNote.trim() || 'Diário registrado sem descrição.')} className="btn-primary btn-sm">
          <Plus size={14} /> Salvar diário
        </button>
        {quickList('Nenhum diário registrado', 'Registros livres e observações de acompanhamento aparecerão aqui.')}
      </div>
    );
  }

  if (careTab === 'prevent') {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="input" value={prevent.age} onChange={event => setPrevent(prev => ({ ...prev, age: event.target.value }))} placeholder="Idade" />
          <input className="input" value={prevent.systolic} onChange={event => setPrevent(prev => ({ ...prev, systolic: event.target.value }))} placeholder="PA sistólica" />
          <input className="input" value={prevent.cholesterol} onChange={event => setPrevent(prev => ({ ...prev, cholesterol: event.target.value }))} placeholder="Colesterol total" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPrevent(prev => ({ ...prev, diabetes: !prev.diabetes }))} className={prevent.diabetes ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>Diabetes</button>
            <button type="button" onClick={() => setPrevent(prev => ({ ...prev, smoker: !prev.smoker }))} className={prevent.smoker ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}>Tabagismo</button>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-800">Triagem PREVENT</p>
          <p className="mt-1 text-sm text-slate-600">Indicadores preenchidos: {preventScore}/5. Use como apoio inicial e confirme em protocolo validado.</p>
        </div>
      </div>
    );
  }

  const current = CARE_TABS.find(item => item.id === careTab);
  return (
    <div className="space-y-4">
      <button onClick={() => navigate(documentUrl())} className="btn-primary btn-sm">
        <Plus size={14} /> Novo registro
      </button>
      <EmptyState
        title={`${current?.label ?? 'Registro'} ainda sem itens`}
        description="Esta área já está pronta para receber os próximos documentos e eventos clínicos do paciente."
      />
    </div>
  );
}

export default function PatientProfile() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { data: patients = [], isLoading } = usePatients();
  const { data: appointments = [] } = useAppointments();
  const [mainTab, setMainTab] = useState<MainTab>('care');
  const [careTab, setCareTab] = useState<CareTab>('appointments');
  const [healthTab, setHealthTab] = useState<HealthTab>('general');
  const [showSummary, setShowSummary] = useState(false);
  const [saved, setSaved] = useState(false);
  const [portalInviteLoading, setPortalInviteLoading] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<Array<{ id: string; name: string; size: number; type: string }>>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; body: string; createdAt: string }>>([]);
  const [consents, setConsents] = useState(MOCK_DOCUMENTS);

  const patient = useMemo(() => patients.find(item => item.id === patientId), [patients, patientId]);
  const patientAppointments = useMemo(() => {
    if (!patient) return [];
    return appointments.filter((appointment: any) =>
      appointment.patient_id === patient.id ||
      appointment.patientId === patient.id ||
      appointment.patientName === patient.name ||
      appointment.title === patient.name
    );
  }, [appointments, patient]);

  const inviteToPatientPortal = async () => {
    if (!patient) return;
    if (!patient.email) {
      toast({
        title: 'Cadastre o e-mail do paciente',
        description: 'O convite do Portal do Paciente precisa de um e-mail válido.',
        variant: 'error',
      });
      return;
    }

    setPortalInviteLoading(true);
    const { data, error } = await supabase.functions.invoke('patient-portal-invite', {
      body: { patientId: patient.id },
    });
    setPortalInviteLoading(false);

    if (error || !data?.ok) {
      toast({
        title: 'Não foi possível liberar o portal',
        description: data?.error || error?.message,
        variant: 'error',
      });
      return;
    }

    toast({
      title: data.existingAccount ? 'Acesso do paciente reativado' : 'Convite enviado ao paciente',
      description: data.existingAccount
        ? 'A conta existente já pode acessar o Nucleus Paciente.'
        : `O link de primeiro acesso foi enviado para ${patient.email}.`,
      variant: 'success',
    });
  };

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Carregando paciente...</div>;
  }

  if (!patient) {
    return (
      <div className="p-6">
        <Link to="/care/patients" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
          <ArrowLeft size={16} /> Voltar para pacientes
        </Link>
        <EmptyState title="Paciente não encontrado" description="O paciente pode ter sido removido ou ainda não está vinculado à clínica atual." />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white">
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <button onClick={() => navigate('/care/patients')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-700">
          <ArrowLeft size={16} /> Pacientes
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-700 to-teal-500 text-lg font-bold text-white">
              {initials(patient.name)}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{patient.name}</h1>
              <p className="text-sm text-slate-500">{patient.specialty || 'Paciente'} {patient.plan ? `• ${patient.plan}` : ''}</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <div>
              <p className="font-semibold text-slate-800">{formatDate(patient.dob)} {ageText(patient.dob) ? `(${ageText(patient.dob)})` : ''}</p>
              <p className="text-xs text-slate-400">Sexo: não informado</p>
            </div>
            <div>
              <p className="font-semibold text-slate-800">CPF: {patient.cpf || '-'}</p>
              <p className="text-xs text-slate-400">Prontuário: #{patient.id.slice(0, 6)}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowSummary(true)} className="btn-secondary btn-sm"><User size={14} /> Resumo</button>
              {patient.phone && <a href={`https://wa.me/${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm"><Phone size={14} /> WhatsApp</a>}
              <button onClick={inviteToPatientPortal} disabled={portalInviteLoading} className="btn-secondary btn-sm disabled:opacity-50">
                <Mail size={14} /> {portalInviteLoading ? 'Liberando...' : 'Liberar portal'}
              </button>
              <button onClick={() => navigate(`/care/records?patient=${patient.id}`)} className="btn-secondary btn-sm"><FileText size={14} /> Prontuário</button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-4">
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {MAIN_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                mainTab === id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon size={17} />
              {label}
              {id === 'consents' && <AlertTriangle size={14} className="text-amber-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-0 px-6 py-4 lg:grid-cols-[240px_1fr]">
        {mainTab === 'care' && (
          <aside className="rounded-l-xl border border-r-0 border-slate-200 bg-slate-50">
            {CARE_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setCareTab(id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  careTab === id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </aside>
        )}

        {mainTab === 'health' && (
          <aside className="rounded-l-xl border border-r-0 border-slate-200 bg-slate-50">
            {HEALTH_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setHealthTab(id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors ${
                  healthTab === id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </aside>
        )}

        <main className={`min-h-[620px] border border-slate-200 bg-white p-4 ${mainTab === 'care' || mainTab === 'health' ? 'rounded-r-xl' : 'rounded-xl lg:col-span-2'}`}>
          {mainTab === 'registration' && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['Nome completo', patient.name],
                ['CPF', patient.cpf || '-'],
                ['Data de nascimento', formatDate(patient.dob)],
                ['Telefone', patient.phone || '-'],
                ['E-mail', patient.email || '-'],
                ['Cidade/UF', [patient.city, patient.state].filter(Boolean).join(', ') || '-'],
                ['Especialidade', patient.specialty || '-'],
                ['Plano', patient.plan || '-'],
                ['Profissional responsável', patient.professional || '-'],
                ['Status', patient.status || '-'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
                  <p className="mt-1 font-semibold text-slate-800">{value}</p>
                </div>
              ))}
              <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Observações</p>
                <p className="mt-1 text-sm text-slate-600">{patient.notes || 'Nenhuma observação cadastrada.'}</p>
              </div>
            </div>
          )}

          {mainTab === 'health' && <HealthContent healthTab={healthTab} />}
          {mainTab === 'care' && <CareContent careTab={careTab} patient={patient} />}

          {mainTab === 'attachments' && (
            <div className="space-y-4">
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={event => {
                  const files = Array.from(event.target.files ?? []);
                  if (!files.length) return;
                  setAttachments(prev => [
                    ...files.map(file => ({ id: `${file.name}-${file.lastModified}`, name: file.name, size: file.size, type: file.type || 'Arquivo' })),
                    ...prev,
                  ]);
                  event.target.value = '';
                }}
              />
              <button type="button" onClick={() => attachmentInputRef.current?.click()} className="btn-primary btn-sm"><Plus size={14} /> Anexar arquivo</button>
              {attachments.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {attachments.map(file => (
                    <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-b-0">
                      <div className="flex items-center gap-3">
                        <Paperclip size={18} className="text-teal-700" />
                        <div>
                          <p className="font-semibold text-slate-800">{file.name}</p>
                          <p className="text-xs text-slate-500">{file.type} • {(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setAttachments(prev => prev.filter(item => item.id !== file.id))} className="btn-secondary btn-sm">
                        <Trash2 size={14} /> Remover
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Nenhum anexo enviado" description="Exames, comprovantes, laudos e arquivos do paciente ficarão organizados aqui." />
              )}
            </div>
          )}

          {mainTab === 'consents' && (
            <div className="space-y-3">
              {consents.map(item => (
                <div key={item.title} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <p className="font-semibold text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${item.status === 'Aceito' ? 'badge-green' : 'bg-amber-50 text-amber-700'}`}>{item.status}</span>
                    {item.status !== 'Aceito' && (
                      <button
                        type="button"
                        onClick={() => setConsents(prev => prev.map(consent => consent.title === item.title ? { ...consent, status: 'Aceito' } : consent))}
                        className="btn-secondary btn-sm"
                      >
                        Marcar aceito
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {mainTab === 'messages' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <label className="label">Mensagem para o paciente</label>
                <textarea className="input min-h-[120px]" value={messageDraft} onChange={event => setMessageDraft(event.target.value)} placeholder="Escreva uma orientação, lembrete ou solicitação..." />
                <button
                  type="button"
                  onClick={() => {
                    setMessages(prev => [{ id: `${Date.now()}`, body: messageDraft.trim() || 'Mensagem sem texto enviada para teste.', createdAt: new Date().toLocaleString('pt-BR') }, ...prev]);
                    setMessageDraft('');
                  }}
                  className="btn-primary btn-sm mt-3"
                >
                  <MessageSquare size={14} /> Enviar mensagem
                </button>
              </div>
              {messages.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {messages.map(message => (
                    <div key={message.id} className="border-b border-slate-100 p-4 last:border-b-0">
                      <p className="font-semibold text-slate-800">Mensagem enviada</p>
                      <p className="mt-1 text-sm text-slate-600">{message.body}</p>
                      <p className="mt-2 text-xs font-semibold text-teal-700">{message.createdAt}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="Nenhuma mensagem enviada" description="O histórico de comunicação do paciente aparecerá aqui." />
              )}
            </div>
          )}

          {mainTab === 'history' && (
            <PatientHistoryTimeline patient={patient} appointments={patientAppointments} />
          )}

          {(mainTab === 'health' || mainTab === 'registration') && (
            <div className="mt-5 flex items-center gap-3">
              <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} className="btn-primary btn-sm">
                <CheckCircle2 size={14} /> Salvar
              </button>
              {saved && <span className="text-sm font-semibold text-teal-700">Informações salvas nesta sessão.</span>}
            </div>
          )}

          {mainTab === 'care' && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button onClick={() => navigate('/care/video-call/demo')} className="btn-secondary btn-sm"><Video size={14} /> Chamada</button>
              <button onClick={() => navigate(`/care/documents?patient=${patient.id}`)} className="btn-secondary btn-sm"><FileText size={14} /> Documentos</button>
              <button onClick={() => navigate(`/care/scales?patient=${patient.id}`)} className="btn-secondary btn-sm"><Activity size={14} /> Escalas</button>
              <button onClick={() => navigate(`/care/records?patient=${patient.id}`)} className="btn-primary btn-sm"><CalendarClock size={14} /> Evoluir prontuário</button>
            </div>
          )}
        </main>
      </div>
      {showSummary && <PatientSummaryModal patient={patient} appointments={patientAppointments} onClose={() => setShowSummary(false)} />}
    </div>
  );
}
