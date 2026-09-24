import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Deal } from '../types';

export function useDeals() {
  return useQuery({
    queryKey: ['deals'],
    queryFn: dealsDb.getAll,
    enabled: isSupabaseConfigured,
    staleTime: 30_000,
  });
}

export function useUpsertDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (d: Deal) => dealsDb.upsert(d),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dealsDb.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deals'] }),
  });
}
