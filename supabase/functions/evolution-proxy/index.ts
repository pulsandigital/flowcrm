import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const encryptionSecret = Deno.env.get('INTEGRATION_ENCRYPTION_KEY') ?? '';
const serviceClient = createClient(supabaseUrl, serviceRoleKey);

type Credentials = Record<string, string>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptionKey() {
  if (encryptionSecret.length < 32) throw new Error('Chave de integracao indisponivel.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encryptionSecret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['decrypt']);
}

async function decryptCredentials(ciphertext?: string | null, iv?: string | null): Promise<Credentials> {
  if (!ciphertext || !iv) return {};
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    await encryptionKey(),
    base64ToBytes(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}

async function requireProfile(req: Request) {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Sessao ausente.');
  const authClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  );
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) throw new Error('Sessao invalida.');
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, clinic_id, role')
    .eq('id', data.user.id)
    .single();
  if (profileError || !profile?.clinic_id) throw new Error('Perfil sem clinica vinculada.');
  return profile;
}

async function getProvider(clinicId: string) {
  const { data, error } = await serviceClient
    .from('clinic_integrations')
    .select('credentials_ciphertext, credentials_iv, status, enabled')
    .eq('clinic_id', clinicId)
    .eq('provider', 'evolution_api')
    .maybeSingle();
  if (error) throw error;
  const credentials = await decryptCredentials(data?.credentials_ciphertext, data?.credentials_iv);
  const apiUrl = String(credentials.apiUrl || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/+$/, '');
  const apiKey = String(credentials.apiKey || Deno.env.get('EVOLUTION_API_KEY') || '');
  if (!apiUrl || !apiKey) throw new Error('Conecte a Evolution API na pagina de Integracoes.');
  return { apiUrl, apiKey };
}

async function getChannel(channelId: string, clinicId: string) {
  const { data, error } = await serviceClient
    .from('whatsapp_channels')
    .select('id, name, number, status, clinic_id')
    .eq('id', channelId)
    .eq('clinic_id', clinicId)
    .single();
  if (error || !data) throw new Error('Canal de WhatsApp nao encontrado.');
  return data;
}

async function payload(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { message: text }; }
}

async function apiFetch(url: string, apiKey: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { apikey: apiKey, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await payload(response);
  if (!response.ok) {
    throw new Error(String(body?.response?.message?.[0] ?? body?.message ?? body?.error ?? `HTTP ${response.status}`));
  }
  return body;
}

async function webhookToken(clinicId: string, channelId: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(encryptionSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${clinicId}:${channelId}`),
  );
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    const profile = await requireProfile(req);
    const body = await req.json();
    const action = String(body.action ?? '');
    const channelId = String(body.channelId ?? '');
    if (!channelId) throw new Error('Canal obrigatorio.');

    await getChannel(channelId, profile.clinic_id);
    const { apiUrl, apiKey } = await getProvider(profile.clinic_id);
    const instanceName = `flowcrm_${channelId}`;

    if (action === 'create_instance') {
      await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: apiKey },
      }).catch(() => null);

      const created = await apiFetch(`${apiUrl}/instance/create`, apiKey, {
        method: 'POST',
        body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
      });

      const token = await webhookToken(profile.clinic_id, channelId);
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook?channel=${encodeURIComponent(channelId)}&token=${token}`;
      await apiFetch(`${apiUrl}/webhook/set/${instanceName}`, apiKey, {
        method: 'POST',
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: true,
          webhook_base64: false,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        }),
      });

      let qr = created?.qrcode?.base64 ?? created?.hash?.base64 ?? created?.base64 ?? '';
      if (!qr) {
        const connected = await apiFetch(`${apiUrl}/instance/connect/${instanceName}`, apiKey);
        qr = connected?.base64 ?? connected?.qrcode?.base64 ?? connected?.code ?? '';
      }
      return json({ ok: true, qrCode: qr });
    }

    if (action === 'connection_state') {
      const state = await apiFetch(`${apiUrl}/instance/connectionState/${instanceName}`, apiKey);
      return json({ ok: true, state: state?.instance?.state ?? state?.state ?? 'unknown' });
    }

    if (action === 'send_text') {
      const phone = String(body.phone ?? '').replace(/\D/g, '');
      const text = String(body.text ?? '').trim();
      if (phone.length < 10) throw new Error('Telefone invalido.');
      if (!text || text.length > 4096) throw new Error('Mensagem invalida.');
      let sent;
      try {
        sent = await apiFetch(`${apiUrl}/message/sendText/${instanceName}`, apiKey, {
          method: 'POST',
          body: JSON.stringify({ number: phone, text }),
        });
      } catch {
        sent = await apiFetch(`${apiUrl}/message/sendText/${instanceName}`, apiKey, {
          method: 'POST',
          body: JSON.stringify({ number: phone, textMessage: { text } }),
        });
      }
      return json({ ok: true, messageId: sent?.key?.id ?? sent?.id ?? null });
    }

    if (action === 'delete_instance') {
      await apiFetch(`${apiUrl}/instance/delete/${instanceName}`, apiKey, { method: 'DELETE' });
      return json({ ok: true });
    }

    return json({ error: 'Acao invalida.' }, 400);
  } catch (error) {
    console.error('evolution-proxy:', error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
