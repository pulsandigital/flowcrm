import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Users, Shield, Settings, Plus, Edit2, Trash2, Check, X,
  Building2, Key, Loader2, AlertCircle,
} from 'lucide-react';

/* ── Fetch profiles from Supabase ─────────────────────────────── */
function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

/* ── Static role/permission config ───────────────────────────── */
const ROLES_PERMS = [
  { role: 'Administrador',         crm: true,  care: true,  finance: true,  marketing: true,  admin: true  },
  { role: 'Profissional de Saúde', crm: true,  care: true,  finance: false, marketing: false, admin: false },
  { role: 'Secretária/Recepção',   crm: true,  care: false, finance: false, marketing: false, admin: false },
  { role: 'Comercial',             crm: true,  care: false, finance: false, marketing: false, admin: false },
  { role: 'Marketing',             crm: false, care: false, finance: false, marketing: true,  admin: false },
  { role: 'Financeiro',            crm: false, care: false, finance: true,  marketing: false, admin: false },
];

const ROLE_COLORS: Record<string, string> = {
  'Administrador':         'badge bg-primary-50 text-primary-700',
  'Profissional de Saúde': 'badge badge-green',
  'Secretária/Recepção':   'badge badge-gray',
  'Marketing':             'badge badge-purple',
  'Comercial':             'badge badge-blue',
  'Financeiro':            'badge badge-gold',
  'admin':                 'badge bg-primary-50 text-primary-700',
  'professional':          'badge badge-green',
  'secretary':             'badge badge-gray',
  'marketing':             'badge badge-purple',
  'commercial':            'badge badge-blue',
  'financial':             'badge badge-gold',
};

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-teal-500',
  'bg-gold-500',   'bg-primary-600', 'bg-rose-500',
];

function PermIcon({ allowed }: { allowed: boolean }) {
  return allowed
    ? <Check size={14} className="text-teal-500 mx-auto" />
    : <X     size={14} className="text-slate-300 mx-auto" />;
}

/* ── Role display helper ─────────────────────────────────────── */
function roleLabel(raw?: string): string {
  if (!raw) return 'Usuário';
  const map: Record<string, string> = {
    admin:        'Administrador',
    professional: 'Profissional de Saúde',
    secretary:    'Secretária/Recepção',
    marketing:    'Marketing',
    commercial:   'Comercial',
    financial:    'Financeiro',
  };
  return map[raw.toLowerCase()] ?? raw;
}

/* ── Avatar initials ──────────────────────────────────────────── */
function initials(name: string) {
  return (name ?? 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Admin() {
  const { data: profiles = [], isLoading, isError } = useProfiles();
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin</h1>
          <p className="text-sm text-slate-500">Nucleus Admin — Usuários, permissões e segurança</p>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem('nucleus_settings_tab', 'users');
            navigate('/settings?tab=users');
          }}
          className="btn-primary btn-sm"
        >
          <Plus size={14} /> Convidar Usuário
        </button>
      </div>

      {/* Clinic Info */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center">
          <Building2 size={28} className="text-primary-600" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-lg">Nucleus Health Platform</h2>
          <p className="text-sm text-slate-500">
            Plano: Nucleus Professional · {profiles.length} usuário{profiles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem('nucleus_settings_tab', 'general');
            navigate('/settings?tab=general&focus=clinic');
          }}
          className="btn-secondary btn-sm ml-auto"
        >
          <Settings size={13} /> Configurar clínica
        </button>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="section-title flex items-center gap-2"><Users size={16} /> Usuários</h2>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 size={24} className="animate-spin text-primary-600" />
          </div>
        )}

        {isError && (
          <div className="p-6 flex items-center gap-3 text-red-600">
            <AlertCircle size={18} />
            <span className="text-sm">Erro ao carregar usuários.</span>
          </div>
        )}

        {!isLoading && !isError && profiles.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhum usuário cadastrado. Convide membros da equipe para começar.
          </div>
        )}

        {!isLoading && profiles.length > 0 && (
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50/50">
              <tr>
                {['Usuário', 'Perfil', 'Especialidade', 'Status', 'Membro desde', ''].map(h => (
                  <th key={h} className="table-head py-3 px-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((u: any, idx: number) => {
                const name     = u.full_name ?? u.name ?? u.email ?? 'Usuário';
                const email    = u.email ?? '—';
                const role     = roleLabel(u.role);
                const spec     = u.specialty ?? '—';
                const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const joined   = u.created_at
                  ? new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—';

                return (
                  <tr key={u.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`avatar-sm ${avatarBg}`}>{initials(name)}</div>
                        <div>
                          <div className="font-semibold text-slate-800">{name}</div>
                          <div className="text-xs text-slate-400">{email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={ROLE_COLORS[u.role ?? ''] ?? ROLE_COLORS[role] ?? 'badge badge-gray'}>
                        {role}
                      </span>
                    </td>
                    <td className="table-cell"><span className="text-sm text-slate-600">{spec}</span></td>
                    <td className="table-cell"><span className="badge-green badge">Ativo</span></td>
                    <td className="table-cell"><span className="text-xs text-slate-500">{joined}</span></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Permissions Matrix */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="section-title flex items-center gap-2"><Shield size={16} /> Matriz de Permissões</h2>
          <p className="text-xs text-slate-500 mt-0.5">Controle quem acessa cada módulo</p>
        </div>
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50/50">
            <tr>
              <th className="table-head py-3 px-4 text-left">Perfil</th>
              {['CRM', 'Care (Prontuário)', 'Financeiro', 'Marketing', 'Admin'].map(h => (
                <th key={h} className="table-head py-3 px-4 text-center">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES_PERMS.map(r => (
              <tr key={r.role} className="table-row">
                <td className="table-cell font-medium text-slate-700">{r.role}</td>
                <td className="table-cell text-center"><PermIcon allowed={r.crm} /></td>
                <td className="table-cell text-center"><PermIcon allowed={r.care} /></td>
                <td className="table-cell text-center"><PermIcon allowed={r.finance} /></td>
                <td className="table-cell text-center"><PermIcon allowed={r.marketing} /></td>
                <td className="table-cell text-center"><PermIcon allowed={r.admin} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Security */}
      <div className="card p-5">
        <h2 className="section-title flex items-center gap-2 mb-4"><Key size={16} /> Segurança</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Supabase Auth',  status: 'Ativo',       ok: true },
            { label: 'RLS Policies',   status: 'Configurado', ok: true },
            { label: 'Backup',         status: 'Automático',  ok: true },
            { label: 'HTTPS',          status: 'Ativo',       ok: true },
          ].map(({ label, status }) => (
            <div key={label} className="p-3 bg-teal-50 rounded-xl border border-teal-100">
              <div className="text-xs font-semibold text-teal-700">{label}</div>
              <div className="flex items-center gap-1.5 mt-1">
                <Check size={12} className="text-teal-500" />
                <span className="text-xs text-teal-600">{status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
