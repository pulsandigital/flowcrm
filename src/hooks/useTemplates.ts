import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templatesDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import type { MessageTemplate } from '../types';

export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: templatesDb.getAll,
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  });
}

export function useUpsertTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (t: MessageTemplate) => templatesDb.upsert(t),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templatesDb.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });
}
