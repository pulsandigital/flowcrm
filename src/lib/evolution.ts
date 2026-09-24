import { supabase } from './supabase';

type EvolutionAction = 'create_instance' | 'connection_state' | 'send_text' | 'delete_instance';

async function invoke<T>(action: EvolutionAction, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('evolution-proxy', {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || 'Falha ao acessar a integracao do WhatsApp.');
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export const evolutionApi = {
  createInstance(channelId: string) {
    return invoke<{ ok: true; qrCode: string }>('create_instance', { channelId });
  },
  connectionState(channelId: string) {
    return invoke<{ ok: true; state: string }>('connection_state', { channelId });
  },
  sendText(channelId: string, phone: string, text: string) {
    return invoke<{ ok: true; messageId?: string }>('send_text', { channelId, phone, text });
  },
  deleteInstance(channelId: string) {
    return invoke<{ ok: true }>('delete_instance', { channelId });
  },
};
