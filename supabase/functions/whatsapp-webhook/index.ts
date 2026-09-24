import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const encryptionSecret = Deno.env.get('INTEGRATION_ENCRYPTION_KEY') ?? '';
const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function expectedToken(clinicId: string, channelId: string) {
  if (encryptionSecret.length < 32) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY ausente ou insegura.');
  }
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
  if (req.method === 'GET') return json({ ok: true });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    const url = new URL(req.url);
    const channelId = url.searchParams.get('channel') ?? '';
    const token = url.searchParams.get('token') ?? '';
    if (!channelId || !token) return json({ error: 'Webhook nao autenticado.' }, 401);

    const { data: channel, error: channelError } = await supabase
      .from('whatsapp_channels')
      .select('id, clinic_id')
      .eq('id', channelId)
      .single();
    if (channelError || !channel?.clinic_id) return json({ error: 'Canal invalido.' }, 401);
    if (token !== await expectedToken(channel.clinic_id, channelId)) {
      return json({ error: 'Assinatura invalida.' }, 401);
    }

    const payload = await req.json();
    const event = String(payload.event ?? '').replace(/[._-]/g, '').toUpperCase();
    const data = Array.isArray(payload.data) ? payload.data[0] : payload.data;
    if (event !== 'MESSAGESUPSERT' || !data || data.key?.fromMe) return json({ ignored: true });

    const remoteJid = String(data.key?.remoteJid ?? '');
    if (!remoteJid || remoteJid.includes('@g.us')) return json({ ignored: true });

    const phone = remoteJid.replace(/@.+$/, '');
    const contactName = String(data.pushName ?? phone);
    const messageText = String(
      data.message?.conversation
      ?? data.message?.extendedTextMessage?.text
      ?? data.message?.imageMessage?.caption
      ?? data.message?.videoMessage?.caption
      ?? data.message?.documentMessage?.title
      ?? '[Midia]',
    );
    const timestamp = new Date(Number(data.messageTimestamp ?? Date.now() / 1000) * 1000).toISOString();
    const messageId = String(data.key?.id ?? crypto.randomUUID());

    const { data: conversations, error: conversationError } = await supabase
      .from('conversations')
      .select('id, unread_count')
      .eq('clinic_id', channel.clinic_id)
      .eq('channel_id', channelId)
      .eq('contact->>phone', phone)
      .limit(1);
    if (conversationError) throw conversationError;

    let conversationId: string;
    if (conversations?.length) {
      conversationId = conversations[0].id;
      const { error } = await supabase.from('conversations').update({
        last_message: messageText,
        last_message_time: timestamp,
        unread_count: (conversations[0].unread_count ?? 0) + 1,
        status: 'open',
      }).eq('id', conversationId).eq('clinic_id', channel.clinic_id);
      if (error) throw error;
    } else {
      conversationId = crypto.randomUUID();
      const avatar = contactName.split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase();
      const { error } = await supabase.from('conversations').insert({
        id: conversationId,
        clinic_id: channel.clinic_id,
        contact: {
          id: `c_${phone}`, name: contactName, phone, company: '', email: '',
          tags: [], status: 'lead', assignee: '', createdAt: timestamp,
          lastActivity: timestamp, avatar,
        },
        status: 'open',
        channel: 'whatsapp',
        channel_id: channelId,
        last_message: messageText,
        last_message_time: timestamp,
        unread_count: 1,
        tags: [],
        assignee: '',
      });
      if (error) throw error;
    }

    const { error: messageError } = await supabase.from('messages').upsert({
      id: messageId,
      clinic_id: channel.clinic_id,
      conversation_id: conversationId,
      content: messageText,
      sender: 'contact',
      timestamp,
      status: 'delivered',
      type: 'text',
      is_deleted: false,
      is_edited: false,
    });
    if (messageError) throw messageError;

    return json({ ok: true, conversationId });
  } catch (error) {
    console.error('whatsapp-webhook:', error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
