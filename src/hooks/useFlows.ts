import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flowsDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import type { MessageFlow } from '../types';

export function useFlows() {
  return useQuery({
    queryKey: ['flows'],
    queryFn: flowsDb.getAll,
    enabled: isSupabaseConfigured,
    staleTime: 60_000,
  });
}

export function useUpsertFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (f: MessageFlow) => flowsDb.upsert(f),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flows'] }),
  });
}

export function useDeleteFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => flowsDb.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flows'] }),
  });
}

export function useToggleFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      flowsDb.updateActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['flows'] }),
  });
}
