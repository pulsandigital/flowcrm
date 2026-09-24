import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelsDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import type { WhatsAppChannel } from '../types';

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: channelsDb.getAll,
    enabled: isSupabaseConfigured,
    staleTime: 30_000,
  });
}

export function useUpsertChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ch: WhatsAppChannel) => channelsDb.upsert(ch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });
}

export function useUpdateChannelStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      channelsDb.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => channelsDb.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] }),
  });
}
