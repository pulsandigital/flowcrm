import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsDb } from '../lib/db';
import { supabase } from '../lib/supabase';
import type { Appointment } from '../types';

const STATUS_TO_DB: Record<string, string> = {
  agendado: 'scheduled',
  confirmado: 'confirmed',
  realizado: 'completed',
  cancelado: 'cancelled',
  falta: 'no_show',
};

const STATUS_FROM_DB: Record<string, string> = {
  scheduled: 'agendado',
  confirmed: 'confirmado',
  completed: 'realizado',
  cancelled: 'cancelado',
  no_show: 'falta',
};

async function getCurrentProfile() {
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

  return { userId, clinicId: data.clinic_id as string };
}

const toDate = (value?: string) => value ? value.slice(0, 10) : '';
const toTime = (value?: string) => value ? new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
const mapAppointment = (row: any) => ({
  ...row,
  date: row.date ?? toDate(row.starts_at),
  time: row.time ?? toTime(row.starts_at),
  type: row.type ?? row.appointment_type ?? 'Consulta',
  patientName: row.patientName ?? row.patients?.full_name ?? row.title ?? 'Paciente',
  professional: row.professional ?? row.profiles?.full_name ?? '',
  status: STATUS_FROM_DB[row.status] ?? row.status ?? 'agendado',
  durationMin: row.durationMin ?? (
    row.starts_at && row.ends_at
      ? Math.max(0, Math.round((new Date(row.ends_at).getTime() - new Date(row.starts_at).getTime()) / 60000))
      : 0
  ),
  isOnline: row.isOnline ?? row.is_online ?? false,
  meetingUrl: row.meetingUrl ?? (String(row.location ?? '').startsWith('http') ? row.location : ''),
});

const toAppointmentPayload = async (appointment: any) => {
  const { clinicId, userId } = await getCurrentProfile();
  const startsAt = new Date(`${appointment.date}T${appointment.time || '09:00'}:00`);
  const endsAt = new Date(startsAt.getTime() + Number(appointment.durationMin ?? 60) * 60000);

  return {
    clinic_id: clinicId,
    professional_id: userId,
    title: appointment.patientName || 'Consulta',
    specialty: appointment.specialty || null,
    appointment_type: appointment.type || 'Consulta',
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    location: appointment.isOnline ? 'Online' : 'Consultorio',
    ...(appointment.meetingUrl ? { location: appointment.meetingUrl } : {}),
    is_online: !!appointment.isOnline,
    status: STATUS_TO_DB[appointment.status] ?? appointment.status ?? 'scheduled',
    notes: appointment.notes || null,
  };
};

export function useAppointments() {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { clinicId } = await getCurrentProfile();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      const end = new Date();
      end.setDate(end.getDate() + 90);
      const { data, error } = await supabase
        .from('appointments')
        .select('*, patients(full_name), profiles(full_name)')
        .eq('clinic_id', clinicId)
        .gte('starts_at', start.toISOString())
        .lte('starts_at', end.toISOString())
        .order('starts_at');
      if (error) {
        console.warn('Erro ao carregar agenda:', error.message);
        return [];
      }
      return (data ?? []).map(mapAppointment);
    },
    staleTime: 30_000,
  });
}

export function useInsertAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await appointmentsDb.create(await toAppointmentPayload(a));
      if (error) throw new Error(error.message);
      if ((a as any).isOnline && (data as any)?.id) {
        const { error: calendarError } = await supabase.functions.invoke('google-calendar', {
          body: { appointmentId: (data as any).id, createMeet: true },
        });
        if (calendarError) {
          console.warn('Google Calendar/Meet ainda nao sincronizado:', calendarError.message);
        }
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Appointment> }) => {
      const payload = data.date && data.time ? await toAppointmentPayload(data) : {
        status: STATUS_TO_DB[(data as any).status] ?? (data as any).status,
        notes: (data as any).notes,
      };
      const { clinic_id, professional_id, ...updateData } = payload as any;
      const { data: updated, error } = await appointmentsDb.update(id, updateData);
      if (error) throw new Error(error.message);
      if ((data as any).isOnline) {
        const { error: calendarError } = await supabase.functions.invoke('google-calendar', {
          body: { appointmentId: id, createMeet: true },
        });
        if (calendarError) {
          console.warn('Google Calendar/Meet ainda nao sincronizado:', calendarError.message);
        }
      }
      return updated;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await appointmentsDb.cancel(id);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });
}
