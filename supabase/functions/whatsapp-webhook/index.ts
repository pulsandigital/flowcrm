import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method === 'GET') return new Response('whatsapp-webhook ok', { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { event, instance, data } = payload;

    // Only process incoming messages
    if (event !== 'messages.upsert' || !data) {
      return new Response(JSON.stringify({ ignored: true }), { headers: corsHeaders });
    }

    // Skip messages sent by us or group messages
    if (data.key?.fromMe) {
      return new Response(JSON.stringify({ ignored: 'fromMe' }), { headers: corsHeaders });
    }
    const remoteJid: string = data.key?.remoteJid ?? '';
    if (remoteJid.includes('@g.us')) {
      return new Response(JSON.stringify({ ignored: 'group' }), { headers: corsHeaders });
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '');
    const contactName: string = data.pushName ?? phone;
    const messageText: string =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      data.message?.imageMessage?.caption ||
      data.message?.videoMessage?.caption ||
      data.message?.documentMessage?.title ||
      '[Mídia]';

    const messageId: string = data.key?.id ?? `msg_${Date.now()}`;
    const ts = Number(data.messageTimestamp ?? Math.floor(Date.now() / 1000));
    const timestamp = new Date(ts * 1000).toISOString();

    // channelId from instance name: "flowcrm_ch123" → "ch123"
    const channelId: string = (instance ?? '').replace('flowcrm_', '');

    // Find existing conversation (filter by channel + phone inside JSONB contact)
    const { data: convRows } = await supabase
      .from('conversations')
      .select('id, unread_count')
      .eq('channel_id', channelId)
      .eq('contact->>phone', phone)
      .limit(1);

    let convId: string;

    if (convRows && convRows.length > 0) {
      convId = convRows[0].id;
      await supabase.from('conversations').update({
        last_message: messageText,
        last_message_time: timestamp,
        unread_count: (convRows[0].unread_count ?? 0) + 1,
        status: 'open',
      }).eq('id', convId);
    } else {
      convId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const avatar = contactName.split(' ')
        .map((n: string) => n[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase();

      await supabase.from('conversations').insert({
        id: convId,
        contact: {
          id: `c_${phone}`,
          name: contactName,
          phone,
          company: '',
          email: '',
          tags: [],
          status: 'lead',
          assignee: '',
          createdAt: timestamp,
          lastActivity: timestamp,
          avatar,
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
    }

    // Insert message (upsert to avoid duplicates)
    await supabase.from('messages').upsert({
      id: messageId,
      conversation_id: convId,
      content: messageText,
      sender: 'contact',
      timestamp,
      status: 'delivered',
      type: 'text',
      is_deleted: false,
      is_edited: false,
    });

    return new Response(JSON.stringify({ ok: true, convId, phone }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
