import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Contact } from '../types';

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: contactsDb.getAll,
    enabled: isSupabaseConfigured,
    staleTime: 30_000,
  });
}

export function useUpsertContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (c: Contact) => contactsDb.upsert(c),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsDb.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });
}
