import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsDb, messagesDb } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Conversation, ChatMessage } from '../types';

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsDb.getAll,
    enabled: isSupabaseConfigured,
    staleTime: 10_000,
  });
}

export function useUpsertConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (c: Conversation) => conversationsDb.upsert(c),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useUpdateConversationField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: unknown }) =>
      conversationsDb.updateField(id, field, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useInsertMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ convId, msg }: { convId: string; msg: ChatMessage }) =>
      messagesDb.insert(convId, msg),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<{ content: string; is_deleted: boolean; is_edited: boolean }>;
    }) => messagesDb.update(id, fields),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] }),
  });
}
