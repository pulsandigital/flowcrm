import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  LogOut,
  Moon,
  Paperclip,
  Sun,
  Upload,
  User,
  XCircle,
  Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../hooks/useToast';

type PortalTab = 'home' | 'appointments' | 'documents' | 'payments' | 'profile';

interface PortalPatient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  dob: string | null;
  gender: string | null;
  health_plan: string | null;
  health_plan_number: string | null;
}

interface PortalClinic {
  id: string;
  name: string;
  brand_name: string | null;
  logo_url: string | null;
  professional_name: string | null;
  professional_photo_url: string | null;
  primary_color: string | null;
  support_email: string | null;
  support_phone: string | null;
  portal_title: string | null;
}

interface PortalAppointment {
  id: string;
  title: string | null;
  specialty: string | null;
  appointment_type: string | null;
  starts_at: string;
  ends_at: string;
  location: string | null;
  is_online: boolean;
  meet_link: string | null;
  status: string;
  patient_response: string | null;
  patient_response_reason: string | null;
  professional_name: string | null;
}

interface PortalInvoice {
  id: string;
  description: string;
  amount: number;
  status: string;
  payment_method: string | null;
  payment_date: string | null;
  due_date: string | null;
  payment_url: string | null;
  pix_payload: string | null;
  pix_qr_code_base64: string | null;
  receipt_document_url: string | null;
}

interface PortalDocument {
  id: string;
  name: string;
  type: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

interface PortalHistory {
  id: string;
  appointment_date: string;
  specialty: string;
  appointment_type: string | null;
  evolution: string | null;
  conduct: string | null;
  professional_name: string | null;
}

interface PortalData {
  patient: PortalPatient;
  clinic: PortalClinic;
  appointments: PortalAppointment[];
  invoices: PortalInvoice[];
  documents: PortalDocument[];
  history: PortalHistory[];
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const isExternalUrl = (value: string) => /^https:\/\//i.test(value);

export default function PatientPortal() {
  const [tab, setTab] = useState<PortalTab>('home');
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('nucleus_patient_theme') === 'dark');
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [payingInvoice, setPayingInvoice] = useState<PortalInvoice | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: '', phone: '', dob: '' });

  const loadPortal = async () => {
    setLoading(true);
    const { data: payload, error } = await supabase.rpc('get_patient_portal_bootstrap');
    if (error || !payload?.patient) {
      setFatalError(error?.message || 'Este acesso não está vinculado a um paciente.');
      setLoading(false);
      return;
    }

    const portalData = payload as PortalData;
    setData(portalData);
    setProfileForm({
      email: portalData.patient.email || '',
      phone: portalData.patient.phone || '',
      dob: portalData.patient.dob || '',
    });
    setFatalError('');
    setLoading(false);
  };

  useEffect(() => {
    loadPortal();
  }, []);

  useEffect(() => {
    localStorage.setItem('nucleus_patient_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const nextAppointment = useMemo(
    () => data?.appointments
      .filter(item => new Date(item.starts_at).getTime() >= Date.now() && item.status !== 'cancelled')
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0],
    [data],
  );

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.assign('/');
  };

  const respondToAppointment = async (appointmentId: string, response: 'confirmed' | 'declined', reason?: string) => {
    const { error } = await supabase.rpc('respond_to_patient_appointment', {
      p_appointment_id: appointmentId,
      p_response: response,
      p_reason: reason || null,
    });
    if (error) {
      toast({ title: 'Não foi possível registrar sua resposta', description: error?.message, variant: 'error' });
      return;
    }
    setDecliningId(null);
    setDeclineReason('');
    toast({
      title: response === 'confirmed' ? 'Consulta confirmada' : 'Resposta enviada à clínica',
      variant: 'success',
    });
    await loadPortal();
  };

  const openDocument = async (document: PortalDocument) => {
    if (isExternalUrl(document.file_url)) {
      window.open(document.file_url, '_blank', 'noopener,noreferrer');
      return;
    }
    let lastError = '';
    for (const bucket of ['patient-attachments', 'medical-documents']) {
      const { data: signed, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(document.file_url, 60);
      if (signed?.signedUrl) {
        window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      lastError = error?.message || lastError;
    }
    toast({ title: 'Não foi possível abrir o documento', description: lastError, variant: 'error' });
  };

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !data) return;
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é de 15 MB.', variant: 'error' });
      return;
    }

    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${data.clinic.id}/${data.patient.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from('patient-attachments')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setUploading(false);
      toast({ title: 'Falha ao enviar arquivo', description: uploadError.message, variant: 'error' });
      return;
    }

    const { error: documentError } = await supabase.from('patient_documents').insert({
      clinic_id: data.clinic.id,
      patient_id: data.patient.id,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'exam',
      file_url: path,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: null,
    });

    setUploading(false);
    event.target.value = '';
    if (documentError) {
      await supabase.storage.from('patient-attachments').remove([path]);
      toast({ title: 'Falha ao registrar arquivo', description: documentError.message, variant: 'error' });
      return;
    }
    toast({ title: 'Arquivo enviado com segurança', variant: 'success' });
    await loadPortal();
  };

  const saveProfile = async () => {
    const { error } = await supabase.rpc('update_patient_portal_profile', {
      p_email: profileForm.email,
      p_phone: profileForm.phone,
      p_dob: profileForm.dob || null,
    });
    if (error) {
      toast({ title: 'Não foi possível atualizar seus dados', description: error?.message, variant: 'error' });
      return;
    }
    toast({ title: 'Dados atualizados', variant: 'success' });
    await loadPortal();
  };

  const generatePayment = async (invoice: PortalInvoice, billingType: 'PIX' | 'CREDIT_CARD') => {
    setPaymentLoading(true);
    const { data: result, error } = await supabase.functions.invoke('asaas-payment', {
      body: { invoiceId: invoice.id, billingType },
    });
    setPaymentLoading(false);
    if (error || !result?.ok) {
      toast({
        title: 'Não foi possível gerar o pagamento',
        description: result?.error || error?.message,
        variant: 'error',
      });
      return;
    }
    await loadPortal();
    setPayingInvoice({
      ...invoice,
      pix_payload: result.pixQrCode?.payload || invoice.pix_payload,
      pix_qr_code_base64: result.pixQrCode?.encodedImage || invoice.pix_qr_code_base64,
      payment_url: result.payment?.invoiceUrl || invoice.payment_url,
    });
  };

  const shellClass = darkMode
    ? 'min-h-screen bg-slate-950 text-slate-100'
    : 'min-h-screen bg-slate-50 text-slate-900';
  const panelClass = darkMode
    ? 'border-slate-800 bg-slate-900'
    : 'border-slate-200 bg-white';

  if (loading) {
    return (
      <div className={`${shellClass} flex items-center justify-center`}>
        <div className="flex items-center gap-3 text-sm">
          <Zap className="animate-pulse text-emerald-500" />
          Carregando seu portal...
        </div>
      </div>
    );
  }

  if (fatalError || !data) {
    return (
      <div className={`${shellClass} flex items-center justify-center p-6`}>
        <div className={`max-w-md rounded-lg border p-8 text-center ${panelClass}`}>
          <XCircle className="mx-auto mb-4 text-red-500" size={34} />
          <h1 className="text-xl font-bold">Acesso não liberado</h1>
          <p className="mt-2 text-sm text-slate-500">{fatalError}</p>
          <button onClick={logout} className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  const brandName = data.clinic.portal_title || data.clinic.brand_name || data.clinic.name || 'Nucleus';
  const initials = data.patient.full_name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase();

  return (
    <div className={shellClass}>
      <header className={`sticky top-0 z-30 border-b ${panelClass}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {data.clinic.logo_url ? (
              <img src={data.clinic.logo_url} alt={brandName} className="h-9 w-9 rounded-lg object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white"><Zap size={18} /></div>
            )}
            <div>
              <strong className="block text-sm">{brandName}</strong>
              <span className="text-xs text-slate-500">Portal do Paciente</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(value => !value)} className="rounded-lg p-2 hover:bg-slate-500/10" aria-label="Alternar tema">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={logout} className="rounded-lg p-2 hover:bg-slate-500/10" aria-label="Sair"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
        <section className="rounded-lg bg-emerald-800 p-5 text-white sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-500 text-lg font-bold">{initials}</div>
              <div>
                <h1 className="text-xl font-bold">Olá, {data.patient.full_name.split(' ')[0]}!</h1>
                <p className="text-sm text-emerald-100">{data.patient.health_plan || 'Atendimento particular'}</p>
              </div>
            </div>
            {nextAppointment && (
              <div className="min-w-0 rounded-lg border border-white/20 bg-white/10 p-4">
                <span className="text-xs text-emerald-100">Próxima consulta</span>
                <strong className="block text-sm">{formatDateTime(nextAppointment.starts_at)}</strong>
                <span className="text-xs text-emerald-100">{nextAppointment.professional_name || nextAppointment.specialty}</span>
              </div>
            )}
          </div>
        </section>

        <nav className={`flex gap-1 overflow-x-auto rounded-lg border p-1 ${panelClass}`}>
          {([
            ['home', 'Início', Zap],
            ['appointments', 'Consultas', Calendar],
            ['documents', 'Documentos', FileText],
            ['payments', 'Pagamentos', CreditCard],
            ['profile', 'Meus dados', User],
          ] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                tab === key ? 'bg-emerald-600 text-white' : 'hover:bg-slate-500/10'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        {tab === 'home' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className={`rounded-lg border p-5 ${panelClass}`}>
              <h2 className="mb-4 font-semibold">Próximas consultas</h2>
              <AppointmentList
                appointments={data.appointments.filter(item => new Date(item.starts_at).getTime() >= Date.now())}
                onConfirm={id => respondToAppointment(id, 'confirmed')}
                onDecline={setDecliningId}
              />
            </section>
            <section className={`rounded-lg border p-5 ${panelClass}`}>
              <h2 className="mb-4 font-semibold">Últimos atendimentos</h2>
              {data.history.length === 0 ? (
                <Empty text="Nenhuma evolução assinada disponível." />
              ) : data.history.slice(0, 4).map(item => (
                <div key={item.id} className="border-b border-slate-500/15 py-3 last:border-0">
                  <strong className="text-sm">{formatDateTime(item.appointment_date)}</strong>
                  <p className="text-xs text-slate-500">{item.specialty} · {item.professional_name || 'Profissional responsável'}</p>
                  {item.conduct && <p className="mt-1 text-sm">{item.conduct}</p>}
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'appointments' && (
          <section className={`rounded-lg border p-5 ${panelClass}`}>
            <h2 className="mb-4 font-semibold">Minhas consultas</h2>
            <AppointmentList appointments={data.appointments} onConfirm={id => respondToAppointment(id, 'confirmed')} onDecline={setDecliningId} />
          </section>
        )}

        {tab === 'documents' && (
          <section className={`rounded-lg border p-5 ${panelClass}`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Documentos e exames</h2>
                <p className="text-sm text-slate-500">Arquivos compartilhados entre você e a clínica.</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                {uploading ? <Upload className="animate-pulse" size={16} /> : <Paperclip size={16} />}
                {uploading ? 'Enviando...' : 'Anexar arquivo'}
                <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
              </label>
            </div>
            {data.documents.length === 0 ? <Empty text="Nenhum documento disponível." /> : data.documents.map(document => (
              <button key={document.id} onClick={() => openDocument(document)} className="flex w-full items-center justify-between border-b border-slate-500/15 py-3 text-left last:border-0">
                <span className="flex min-w-0 items-center gap-3">
                  <FileText className="shrink-0 text-emerald-500" size={19} />
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{document.name}</strong>
                    <span className="text-xs text-slate-500">{new Date(document.created_at).toLocaleDateString('pt-BR')}</span>
                  </span>
                </span>
                <Download size={17} />
              </button>
            ))}
          </section>
        )}

        {tab === 'payments' && (
          <section className={`rounded-lg border p-5 ${panelClass}`}>
            <h2 className="mb-4 font-semibold">Cobranças</h2>
            {data.invoices.length === 0 ? <Empty text="Nenhuma cobrança disponível." /> : data.invoices.map(invoice => (
              <div key={invoice.id} className="flex flex-col gap-3 border-b border-slate-500/15 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <strong className="text-sm">{invoice.description}</strong>
                  <p className="text-xs text-slate-500">{invoice.due_date ? `Vencimento: ${new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString('pt-BR')}` : 'Sem vencimento informado'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{formatCurrency(Number(invoice.amount))}</strong>
                  <span className={`rounded-full px-2 py-1 text-xs ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {invoice.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                  {invoice.status !== 'paid' && (
                    <button onClick={() => setPayingInvoice(invoice)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Pagar</button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'profile' && (
          <section className={`rounded-lg border p-5 ${panelClass}`}>
            <h2 className="mb-5 font-semibold">Meus dados</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" value={data.patient.full_name} disabled />
              <Field label="CPF" value={data.patient.cpf || ''} disabled />
              <Field label="E-mail" value={profileForm.email} onChange={value => setProfileForm(form => ({ ...form, email: value }))} />
              <Field label="Telefone" value={profileForm.phone} onChange={value => setProfileForm(form => ({ ...form, phone: value }))} />
              <Field label="Data de nascimento" type="date" value={profileForm.dob} onChange={value => setProfileForm(form => ({ ...form, dob: value }))} />
              <Field label="Plano" value={data.patient.health_plan || 'Particular'} disabled />
            </div>
            <button onClick={saveProfile} className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Salvar alterações</button>
          </section>
        )}
      </main>

      {decliningId && (
        <Modal title="Não poderei comparecer" onClose={() => setDecliningId(null)} darkMode={darkMode}>
          <label className="text-sm font-medium">Motivo</label>
          <select value={declineReason} onChange={event => setDeclineReason(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent p-3 text-sm">
            <option value="">Selecione...</option>
            <option value="Agenda conflitante">Agenda conflitante</option>
            <option value="Indisposição">Indisposição</option>
            <option value="Imprevisto familiar">Imprevisto familiar</option>
            <option value="Outro motivo">Outro motivo</option>
          </select>
          <button disabled={!declineReason} onClick={() => respondToAppointment(decliningId, 'declined', declineReason)} className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            Enviar resposta
          </button>
        </Modal>
      )}

      {payingInvoice && (
        <Modal title="Pagar consulta" onClose={() => setPayingInvoice(null)} darkMode={darkMode}>
          <p className="mb-4 text-sm text-slate-500">{payingInvoice.description} · {formatCurrency(Number(payingInvoice.amount))}</p>
          {payingInvoice.pix_qr_code_base64 ? (
            <div className="text-center">
              <img src={`data:image/png;base64,${payingInvoice.pix_qr_code_base64}`} alt="QR Code PIX" className="mx-auto h-52 w-52" />
              <textarea readOnly value={payingInvoice.pix_payload || ''} className="mt-3 h-20 w-full rounded-lg border border-slate-300 bg-transparent p-2 text-xs" />
              <button onClick={() => navigator.clipboard.writeText(payingInvoice.pix_payload || '')} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Copiar código PIX</button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <button disabled={paymentLoading} onClick={() => generatePayment(payingInvoice, 'PIX')} className="rounded-lg border border-emerald-500 p-4 text-left">
                <strong className="block">PIX</strong><span className="text-xs text-slate-500">QR Code e copia e cola.</span>
              </button>
              <button disabled={paymentLoading} onClick={() => generatePayment(payingInvoice, 'CREDIT_CARD')} className="rounded-lg border border-slate-300 p-4 text-left">
                <strong className="block">Cartão</strong><span className="text-xs text-slate-500">Pagamento pelo ambiente seguro.</span>
              </button>
            </div>
          )}
          {payingInvoice.payment_url && (
            <a href={payingInvoice.payment_url} target="_blank" rel="noreferrer" className="mt-4 block text-center text-sm font-semibold text-emerald-600">Abrir página de pagamento</a>
          )}
        </Modal>
      )}
    </div>
  );
}

function AppointmentList({
  appointments,
  onConfirm,
  onDecline,
}: {
  appointments: PortalAppointment[];
  onConfirm: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  if (appointments.length === 0) return <Empty text="Nenhuma consulta encontrada." />;
  return (
    <div>
      {appointments.map(item => (
        <div key={item.id} className="flex flex-col gap-3 border-b border-slate-500/15 py-4 first:pt-0 last:border-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="text-sm">{formatDateTime(item.starts_at)}</strong>
            <p className="text-xs text-slate-500">{item.appointment_type || item.title || 'Consulta'} · {item.professional_name || item.specialty || 'Profissional responsável'}</p>
            {item.is_online && item.meet_link && <a href={item.meet_link} target="_blank" rel="noreferrer" className="text-xs font-medium text-emerald-600">Entrar na chamada</a>}
          </div>
          <div className="flex items-center gap-2">
            {item.patient_response === 'confirmed' ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} /> Confirmada</span>
            ) : item.patient_response === 'declined' ? (
              <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"><XCircle size={14} /> Não comparecerei</span>
            ) : new Date(item.starts_at).getTime() >= Date.now() ? (
              <>
                <button onClick={() => onConfirm(item.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Confirmar</button>
                <button onClick={() => onDecline(item.id)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white">Não posso</button>
              </>
            ) : (
              <span className="text-xs text-slate-500">{item.status === 'completed' ? 'Concluída' : item.status}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{text}</div>;
}

function Field({ label, value, onChange, disabled, type = 'text' }: { label: string; value: string; onChange?: (value: string) => void; disabled?: boolean; type?: string }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input type={type} value={value} disabled={disabled} onChange={event => onChange?.(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 text-sm disabled:opacity-60" />
    </label>
  );
}

function Modal({ title, onClose, darkMode, children }: { title: string; onClose: () => void; darkMode: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`w-full max-w-lg rounded-lg border p-5 shadow-xl ${darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'}`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-500"><XCircle size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
