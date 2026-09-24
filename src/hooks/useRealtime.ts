import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Sets up a single Supabase Realtime channel that listens to all relevant
 * tables and invalidates React Query caches on changes.
 * Call this once inside the authenticated layout.
 */
export function useRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('app-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, () => {
        queryClient.invalidateQueries({ queryKey: ['deals'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contacts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_channels' }, () => {
        queryClient.invalidateQueries({ queryKey: ['channels'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => {
        queryClient.invalidateQueries({ queryKey: ['templates'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_flows' }, () => {
        queryClient.invalidateQueries({ queryKey: ['flows'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
