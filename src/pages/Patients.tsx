import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Filter, Phone, Mail, MapPin,
  FileText, Trash2, Edit2, X, Loader2, AlertCircle,
  UserPlus, Activity, Eye,
} from 'lucide-react';
import { usePatients, useInsertPatient, useUpdatePatient, useDeletePatient } from '../hooks/usePatients';
import { supabase } from '../lib/supabase';
import { useCurrentProfile } from '../hooks/useCurrentProfile';
import { SPECIALTIES as ALL_SPECIALTIES, allowedSpecialtiesForProfile } from '../lib/specialties';
import type { Patient } from '../types';

const SPECIALTIES = ALL_SPECIALTIES;

const PLANS = [
  'Particular', 'Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil',
  'Hapvida NotreDame Intermédica', 'Porto Saúde', 'Omint', 'Care Plus',
  'Prevent Senior', 'Cassi', 'Saúde Caixa', 'Geap', 'Golden Cross', 'Outro',
];

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const FALLBACK_CITIES: Record<string, string[]> = {
  SP: ['São Paulo', 'Campinas', 'Guarulhos', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'Ribeirão Preto', 'Sorocaba', 'Santos'],
  RJ: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'Nova Iguaçu', 'São Gonçalo', 'Petrópolis'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros'],
  CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral'],
  PR: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna'],
  PE: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina'],
  GO: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia'],
  DF: ['Brasília'],
};

const AVATAR_COLORS = [
  'bg-violet-500','bg-blue-500','bg-teal-500','bg-indigo-500',
  'bg-rose-500','bg-gold-500','bg-emerald-500','bg-cyan-500',
];

const STATUS_CLS: Record<string, string> = {
  ativo: 'badge-green',
  inativo: 'badge-gray',
  arquivado: 'badge bg-red-50 text-red-600',
};

const BLANK: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  dob: '',
  cpf: '',
  phone: '',
  email: '',
  city: '',
  state: '',
  specialty: '',
  plan: 'Particular',
  professional: '',
  status: 'ativo',
  notes: '',
};

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

interface FormProps {
  initial: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>;
  onSave: (p: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  loading: boolean;
  error?: string;
  isEdit?: boolean;
}

function PatientForm({ initial, onSave, onClose, loading, error, isEdit }: FormProps) {
  const { data: currentProfile } = useCurrentProfile();
  const specialtyOptions = allowedSpecialtiesForProfile(currentProfile);
  const visibleSpecialties = specialtyOptions.length > 0 ? specialtyOptions : SPECIALTIES;
  const [form, setForm] = useState(initial);
  const [cities, setCities] = useState<string[]>(initial.state ? FALLBACK_CITIES[initial.state] ?? [] : []);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [professionals, setProfessionals] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const set = (k: keyof typeof form, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    supabase
      .from('profiles')
      .select('full_name,email')
      .order('full_name')
      .then(({ data }) => {
        const names = (data ?? [])
          .map((p: any) => p.full_name || p.email)
          .filter(Boolean);
        setProfessionals(Array.from(new Set(names)));
      });

  }, []);

  useEffect(() => {
    if (!form.state) {
      setCities([]);
      return;
    }

    let cancelled = false;
    setCitiesLoading(true);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.state}/municipios?orderBy=nome`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((items: Array<{ nome: string }>) => {
        if (!cancelled) setCities(items.map(item => item.nome));
      })
      .catch(() => {
        if (!cancelled) setCities(FALLBACK_CITIES[form.state] ?? []);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });

    return () => { cancelled = true; };
  }, [form.state]);

  const requiredMissing = [
    form.name.trim(),
  ].some(v => !v);

  const invalid = (value: string | undefined, required = false) => required && submitted && !String(value ?? '').trim();
  const inputClass = (value: string | undefined, required = false) =>
    `input ${invalid(value, required) ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100' : ''}`;

  const handleProfessionalChange = (professional: string) => {
    set('professional', professional);
  };

  const handleSave = () => {
    setSubmitted(true);
    if (requiredMissing) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
              <UserPlus size={18} className="text-primary-600" />
            </div>
            <h2 className="font-semibold text-slate-900">
              {isEdit ? 'Editar Paciente' : 'Novo Paciente'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="label">Nome completo *</label>
            <input className={inputClass(form.name, true)} value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Ex: Sofia Lima" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Data de nascimento</label>
              <input type="date" className={inputClass(form.dob)} value={form.dob}
                onChange={e => set('dob', e.target.value)} />
            </div>
            <div>
              <label className="label">CPF</label>
              <input className={inputClass(form.cpf)} value={form.cpf}
                onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefone</label>
              <input className={inputClass(form.phone)} value={form.phone}
                onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-0000" />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input type="email" className={inputClass(form.email)} value={form.email}
                onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estado</label>
              <select
                className={inputClass(form.state)}
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value, city: '' }))}
              >
                <option value="">Selecione...</option>
                {STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cidade</label>
              <select className={inputClass(form.city)} value={form.city} onChange={e => set('city', e.target.value)} disabled={!form.state}>
                <option value="">{citiesLoading ? 'Carregando cidades...' : 'Selecione...'}</option>
                {form.city && !cities.includes(form.city) && <option value={form.city}>{form.city}</option>}
                {cities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Especialidade</label>
              <select className={inputClass(form.specialty)} value={form.specialty} onChange={e => set('specialty', e.target.value)}>
                <option value="">Selecione...</option>
                {visibleSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Plano</label>
              <select className={inputClass(form.plan)} value={form.plan} onChange={e => set('plan', e.target.value)}>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Profissional responsável</label>
              <select className="input" value={form.professional} onChange={e => handleProfessionalChange(e.target.value)}>
                <option value="">Selecione...</option>
                {form.professional && !professionals.includes(form.professional) && (
                  <option value={form.professional}>{form.professional}</option>
                )}
                {professionals.map(name => <option key={name} value={name}>{name}</option>)}
                <option value="A definir">A definir</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea className="input resize-none" rows={3} value={form.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Informações adicionais..." />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary min-w-[140px] justify-center"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
              : isEdit ? 'Salvar alterações' : 'Cadastrar paciente'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-red-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 text-center mb-1">Excluir paciente</h3>
        <p className="text-sm text-slate-500 text-center mb-5">
          Tem certeza que deseja excluir <strong>{name}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all disabled:opacity-60">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Patients() {
  const navigate = useNavigate();
  const { data: patients = [], isLoading, isError } = usePatients();
  const insertMut = useInsertPatient();
  const updateMut = useUpdatePatient();
  const deleteMut = useDeletePatient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState<Patient | null>(null);
  const [formError, setFormError] = useState('');

  const filtered = patients.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone ?? '').includes(search) || (p.email ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleInsert = async (form: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    setFormError('');
    try {
      await insertMut.mutateAsync(form);
      setShowForm(false);
    } catch (e: any) {
      setFormError(e.message ?? 'Erro ao salvar. Tente novamente.');
    }
  };

  const handleUpdate = async (form: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editing) return;
    setFormError('');
    try {
      await updateMut.mutateAsync({ id: editing.id, data: form });
      setEditing(null);
    } catch (e: any) {
      setFormError(e.message ?? 'Erro ao salvar. Tente novamente.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      setDeleting(null);
    } catch { /* ignore */ }
  };

  const total = patients.length;
  const ativos = patients.filter(p => p.status === 'ativo').length;
  const inativos = patients.filter(p => p.status === 'inativo').length;

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pacientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading ? 'Carregando...' : `${total} pacientes cadastrados`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm"><Filter size={14} /> Filtros</button>
          <button className="btn-primary btn-sm" onClick={() => { setShowForm(true); setFormError(''); }}>
            <Plus size={14} /> Novo Paciente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: total, color: 'text-primary-600 bg-primary-50' },
          { label: 'Ativos', value: ativos, color: 'text-teal-600 bg-teal-50' },
          { label: 'Inativos', value: inativos, color: 'text-slate-600 bg-slate-100' },
          { label: 'Hoje', value: 0, color: 'text-gold-600 bg-gold-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card px-4 py-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
              <Activity size={15} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por nome, telefone ou e-mail..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {['todos', 'ativo', 'inativo'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                ${statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} />
          Erro ao carregar pacientes. Verifique a conexão com o banco.
        </div>
      )}

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <Loader2 size={28} className="animate-spin" />
            <span className="text-sm">Carregando pacientes...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <UserPlus size={24} className="text-slate-400" />
            </div>
            <p className="font-medium text-slate-700 mb-1">
              {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            </p>
            <p className="text-sm text-slate-400 mb-4">
              {search ? 'Tente outros termos de busca' : 'Comece cadastrando o primeiro paciente'}
            </p>
            {!search && (
              <button className="btn-primary btn-sm" onClick={() => setShowForm(true)}>
                <Plus size={14} /> Cadastrar paciente
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50/50">
              <tr>
                {['Paciente', 'Contato', 'Especialidade', 'Plano', 'Status', ''].map(h => (
                  <th key={h} className="table-head py-3 px-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="table-row cursor-pointer" onClick={() => navigate(`/care/patients/${p.id}`)}>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className={`avatar-sm ${avatarColor(p.name)}`}>{initials(p.name)}</div>
                      <div>
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.dob || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="space-y-0.5">
                      {p.phone && <div className="flex items-center gap-1 text-xs text-slate-600"><Phone size={10} />{p.phone}</div>}
                      {p.city && <div className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={10} />{p.city}{p.state ? `, ${p.state}` : ''}</div>}
                      {p.email && <div className="flex items-center gap-1 text-xs text-slate-400"><Mail size={10} />{p.email}</div>}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-slate-700">{p.specialty || '-'}</span>
                    {p.professional && <div className="text-xs text-slate-400 mt-0.5">{p.professional}</div>}
                  </td>
                  <td className="table-cell"><span className="text-sm text-slate-600">{p.plan}</span></td>
                  <td className="table-cell"><span className={`badge ${STATUS_CLS[p.status] ?? 'badge-gray'}`}>{p.status}</span></td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button title="Ficha do paciente" onClick={(event) => { event.stopPropagation(); navigate(`/care/patients/${p.id}`); }} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                        <Eye size={13} />
                      </button>
                      <button title="Prontuário" onClick={(event) => { event.stopPropagation(); navigate(`/care/records?patient=${p.id}`); }} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                        <FileText size={13} />
                      </button>
                      <button title="Editar" onClick={(event) => { event.stopPropagation(); setEditing(p); setFormError(''); }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button title="Excluir" onClick={(event) => { event.stopPropagation(); setDeleting(p); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <PatientForm initial={BLANK} onSave={handleInsert} onClose={() => setShowForm(false)} loading={insertMut.isPending} error={formError} />
      )}

      {editing && (
        <PatientForm
          isEdit
          initial={{
            name: editing.name,
            dob: editing.dob ?? '',
            cpf: editing.cpf ?? '',
            phone: editing.phone ?? '',
            email: editing.email ?? '',
            city: editing.city ?? '',
            state: editing.state ?? '',
            specialty: editing.specialty ?? '',
            plan: editing.plan || 'Particular',
            professional: editing.professional ?? '',
            status: editing.status,
            notes: editing.notes ?? '',
          }}
          onSave={handleUpdate}
          onClose={() => setEditing(null)}
          loading={updateMut.isPending}
          error={formError}
        />
      )}

      {deleting && (
        <ConfirmDelete name={deleting.name} onConfirm={handleDelete} onCancel={() => setDeleting(null)} loading={deleteMut.isPending} />
      )}
    </div>
  );
}
