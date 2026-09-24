import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, ShieldCheck, Stethoscope, Upload, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SPECIALTIES } from '../lib/specialties';
import { useCurrentProfile } from '../hooks/useCurrentProfile';

const COLORS = ['#059669', '#0f766e', '#2563eb', '#7c3aed', '#db2777', '#ea580c'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { data: profile, isLoading, isError, error: profileError, refetch } = useCurrentProfile();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    clinicName: '',
    professionalName: '',
    specialty: 'Psicologia',
    crm: '',
    rqe: '',
    councilState: '',
    phone: '',
    address: '',
    primaryColor: '#059669',
  });

  useEffect(() => {
    if (!profile) return;
    setForm(prev => ({
      ...prev,
      clinicName: profile.clinics?.brand_name || profile.clinics?.name || '',
      professionalName: profile.full_name || '',
      specialty: profile.specialty || profile.clinics?.default_specialty || 'Psicologia',
      crm: profile.crm || '',
      rqe: profile.rqe || '',
      councilState: profile.council_state || '',
      primaryColor: profile.clinics?.primary_color || '#059669',
    }));
  }, [profile]);

  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile?.clinic_id) return;
    setError('');

    const required = [form.clinicName, form.professionalName, form.specialty];
    if (required.some(value => !value.trim())) {
      setError('Preencha nome da clínica, nome do profissional e especialidade.');
      return;
    }

    setSaving(true);
    try {
      const clinicPayload = {
        name: form.clinicName.trim(),
        brand_name: form.clinicName.trim(),
        default_specialty: form.specialty,
        primary_color: form.primaryColor,
        address: form.address.trim() || null,
        owner_user_id: profile.id,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: 'completed',
        settings: {
          businessName: form.clinicName.trim(),
          primaryColor: form.primaryColor,
          timezone: 'America/Sao_Paulo',
          language: 'pt-BR',
        },
      };

      const profilePayload = {
        full_name: form.professionalName.trim(),
        specialty: form.specialty,
        crm: form.crm.trim() || null,
        rqe: form.rqe.trim() || null,
        council_state: form.councilState.trim().toUpperCase() || null,
        phone: form.phone.trim() || null,
        role: profile.role || 'admin',
        is_primary_professional: true,
        status: 'active',
      };

      const { error: clinicError } = await supabase.from('clinics').update(clinicPayload).eq('id', profile.clinic_id);
      if (clinicError) throw clinicError;

      const { error: profileError } = await supabase.from('profiles').update(profilePayload).eq('id', profile.id);
      if (profileError) throw profileError;

      await supabase
        .from('clinic_specialties')
        .upsert({ clinic_id: profile.clinic_id, specialty: form.specialty, enabled: true }, { onConflict: 'clinic_id,specialty' });

      await refetch();
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar o onboarding.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 text-center shadow-xl shadow-slate-200/60">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldCheck size={22} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Não foi possível abrir o onboarding</h1>
          <p className="mt-2 text-sm text-slate-500">{(profileError as any)?.message || 'Entre novamente na plataforma para carregar seu perfil.'}</p>
          <button onClick={() => window.location.assign('/')} className="btn-primary mt-5 w-full justify-center">
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center gap-8 px-6 py-10">
        <section className="hidden flex-1 lg:block">
          <div className="rounded-[2rem] bg-gradient-nucleus p-10 text-white shadow-2xl shadow-emerald-950/20">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <Zap size={22} />
              </div>
              <div>
                <div className="text-xl font-bold">Nucleus</div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/55">White label</div>
              </div>
            </div>
            <h1 className="text-3xl font-bold leading-tight">Seu workspace está pronto para configurar.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
              Depois desta etapa, a clínica começa zerada, com pacientes, leads, documentos e prontuários isolados por conta. A especialidade escolhida libera apenas os materiais clínicos correspondentes.
            </p>
            <div className="mt-10 grid gap-3">
              {[
                'Prontuário filtrado pela especialidade do profissional',
                'Marca, cor e dados profissionais aplicados na plataforma',
                'Usuários da equipe adicionados dentro do mesmo workspace',
                'Base pronta para cobrança, agenda e chamada online',
              ].map(item => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/80">
                  <ShieldCheck size={16} className="text-emerald-200" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/60">
          <div className="mb-6">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <Stethoscope size={22} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Configuração inicial</h2>
            <p className="mt-1 text-sm text-slate-500">Preencha os dados do comprador/profissional para liberar a plataforma.</p>
          </div>

          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nome da clínica ou marca *</label>
              <input className="input" value={form.clinicName} onChange={event => set('clinicName', event.target.value)} placeholder="Ex: Clínica Saúde Integrada" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Nome do profissional *</label>
              <input className="input" value={form.professionalName} onChange={event => set('professionalName', event.target.value)} placeholder="Ex: Dra. Ana Martins" />
            </div>
            <div>
              <label className="label">Especialidade principal *</label>
              <select className="input" value={form.specialty} onChange={event => set('specialty', event.target.value)}>
                {SPECIALTIES.map(item => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Telefone profissional</label>
              <input className="input" value={form.phone} onChange={event => set('phone', event.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="label">CRM / Conselho</label>
              <input className="input" value={form.crm} onChange={event => set('crm', event.target.value)} placeholder="Ex: CRM 123456" />
            </div>
            <div>
              <label className="label">RQE</label>
              <input className="input" value={form.rqe} onChange={event => set('rqe', event.target.value)} placeholder="Ex: RQE 12345" />
            </div>
            <div>
              <label className="label">UF do conselho</label>
              <input className="input" value={form.councilState} onChange={event => set('councilState', event.target.value)} placeholder="Ex: CE" maxLength={2} />
            </div>
            <div>
              <label className="label">Cor da plataforma</label>
              <div className="flex items-center gap-2">
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => set('primaryColor', color)}
                    className={`h-10 w-10 rounded-xl border-2 ${form.primaryColor === color ? 'border-slate-900' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Usar cor ${color}`}
                  />
                ))}
                <input className="input h-10 w-28 px-2 text-xs" value={form.primaryColor} onChange={event => set('primaryColor', event.target.value)} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Endereço / local de atendimento</label>
              <input className="input" value={form.address} onChange={event => set('address', event.target.value)} placeholder="Rua, número, cidade/UF" />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <Upload size={16} />
              Logo e foto profissional
            </div>
            <p className="mt-1 text-xs text-slate-500">A estrutura de white label já está pronta. O upload real de arquivos fica conectado ao Storage da Supabase na próxima etapa visual.</p>
          </div>

          <div className="mt-6 flex justify-end">
            <button disabled={saving} className="btn-primary min-w-[180px] justify-center">
              {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : <><Save size={15} /> Concluir configuração</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
