import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientsDb } from '../lib/db';
import { supabase } from '../lib/supabase';
import type { Patient } from '../types';

const mapPatient = (row: any): Patient => ({
  id: row.id,
  name: row.name ?? row.full_name ?? '',
  dob: row.dob ?? '',
  cpf: row.cpf ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  city: row.city ?? '',
  state: row.state ?? '',
  specialty: row.specialty ?? '',
  plan: row.plan ?? row.health_plan ?? '',
  professional: row.professional ?? '',
  status: row.status === 'active' ? 'ativo' : row.status === 'inactive' ? 'inativo' : row.status ?? 'ativo',
  notes: row.notes ?? '',
  createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? row.updatedAt ?? row.created_at ?? new Date().toISOString(),
});

async function getCurrentClinicId() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Usuario nao autenticado.');

  const { data, error } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', userId)
    .single();

  if (error || !data?.clinic_id) {
    throw new Error('Perfil sem clinica vinculada. Saia e entre novamente.');
  }

  return data.clinic_id as string;
}

const toDbStatus = (status?: string) => {
  if (status === 'ativo') return 'active';
  if (status === 'inativo') return 'inactive';
  if (status === 'arquivado') return 'archived';
  return status ?? 'active';
};

const toPatientInsert = async (patient: Partial<Patient>) => {
  const clinicId = await getCurrentClinicId();
  const address = [patient.city, patient.state].filter(Boolean).join(' - ');

  return {
    clinic_id: clinicId,
    name: patient.name,
    full_name: patient.name,
    email: patient.email || null,
    phone: patient.phone || null,
    cpf: patient.cpf || null,
    dob: patient.dob || null,
    city: patient.city || null,
    state: patient.state || null,
    address: address || null,
    specialty: patient.specialty || null,
    health_plan: patient.plan || null,
    plan: patient.plan || null,
    professional: patient.professional || null,
    notes: patient.notes || null,
    status: toDbStatus(patient.status),
  };
};

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const clinicId = await getCurrentClinicId();
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('full_name');
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapPatient);
    },
    staleTime: 30_000,
  });
}

export function useInsertPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await patientsDb.create(await toPatientInsert(p));
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Patient> }) => {
      const { data: updated, error } = await patientsDb.update(id, await toPatientInsert(data));
      if (error) throw new Error(error.message);
      return updated;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patientsDb.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });
}
