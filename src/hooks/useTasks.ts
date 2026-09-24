import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksDb } from '../lib/db';
import { supabase } from '../lib/supabase';

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

const toDbPriority = (priority?: string) => {
  if (priority === 'urgente') return 'urgent';
  if (priority === 'alta') return 'high';
  if (priority === 'media') return 'medium';
  if (priority === 'baixa') return 'low';
  return priority ?? 'medium';
};

const fromDbPriority = (priority?: string) => {
  if (priority === 'urgent') return 'urgente';
  if (priority === 'high') return 'alta';
  if (priority === 'medium') return 'media';
  if (priority === 'low') return 'baixa';
  return priority ?? 'media';
};

const toDbStatus = (status?: string) => {
  if (status === 'pendente') return 'todo';
  if (status === 'em_progresso') return 'in_progress';
  if (status === 'concluida') return 'done';
  if (status === 'cancelada') return 'cancelled';
  return status ?? 'todo';
};

const fromDbStatus = (status?: string) => {
  if (status === 'todo') return 'pendente';
  if (status === 'in_progress') return 'em_progresso';
  if (status === 'done') return 'concluida';
  if (status === 'cancelled') return 'cancelada';
  return status ?? 'pendente';
};

const mapTask = (row: any) => ({
  id: row.id,
  title: row.title ?? '',
  description: row.description ?? '',
  status: fromDbStatus(row.status),
  priority: fromDbPriority(row.priority),
  dueDate: row.due_date ? row.due_date.slice(0, 10) : '',
  assignee: row.profiles?.full_name ?? row.assignee ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? row.created_at,
});

const toTaskInsert = async (task: any) => {
  const { clinicId, userId } = await getCurrentProfile();
  return {
    clinic_id: clinicId,
    title: task.title,
    description: task.description || null,
    module: 'crm',
    priority: toDbPriority(task.priority),
    status: toDbStatus(task.status),
    due_date: task.dueDate ? new Date(`${task.dueDate}T12:00:00`).toISOString() : null,
    assigned_to: userId,
    created_by: userId,
  };
};

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { clinicId } = await getCurrentProfile();
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(mapTask);
    },
    staleTime: 30_000,
  });
}
export function useInsertTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: any) => {
      const { data, error } = await tasksDb.create(await toTaskInsert(task));
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const dbData = await toTaskInsert(data);
      const { clinic_id, created_by, ...updateData } = dbData;
      const { data: updated, error } = await tasksDb.update(id, updateData);
      if (error) throw new Error(error.message);
      return updated;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: tasksDb.complete, onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }) });
}
