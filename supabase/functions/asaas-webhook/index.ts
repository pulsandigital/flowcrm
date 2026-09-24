import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const webhookToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-token, asaas-access-token',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function mapStatus(event: string, paymentStatus?: string) {
  if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_CREDITED'].includes(event)) return 'paid';
  if (event === 'PAYMENT_OVERDUE' || paymentStatus === 'OVERDUE') return 'overdue';
  if (['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS'].includes(event)) return 'cancelled';
  return 'pending';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method === 'GET') return json({ ok: true, service: 'asaas-webhook' });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    if (webhookToken) {
      const receivedToken =
        req.headers.get('x-webhook-token') ||
        req.headers.get('asaas-access-token') ||
        new URL(req.url).searchParams.get('token');
      if (receivedToken !== webhookToken) return json({ error: 'Webhook nao autorizado.' }, 401);
    }

    const payload = await req.json();
    const event = String(payload.event ?? '');
    const payment = payload.payment ?? {};
    const externalReference = payment.externalReference ?? '';
    const asaasPaymentId = payment.id ?? '';
    if (!externalReference && !asaasPaymentId) return json({ ignored: true });

    const status = mapStatus(event, payment.status);
    const paidAt = status === 'paid'
      ? (payment.paymentDate ?? payment.clientPaymentDate ?? new Date().toISOString().slice(0, 10))
      : null;

    let query = supabase.from('invoices').update({
      status,
      provider: 'asaas',
      provider_status: payment.status ?? event,
      external_id: asaasPaymentId || undefined,
      payment_date: paidAt,
      invoice_url: payment.invoiceUrl ?? undefined,
      payment_url: payment.invoiceUrl ?? undefined,
    });
    query = externalReference ? query.eq('id', externalReference) : query.eq('external_id', asaasPaymentId);

    const { data: updatedRows, error } = await query.select('id, clinic_id, patient_id, description, amount').limit(1);
    if (error) throw error;
    const invoice = updatedRows?.[0];

    if (invoice) {
      await supabase.from('notifications').insert({
        clinic_id: invoice.clinic_id,
        patient_id: invoice.patient_id,
        invoice_id: invoice.id,
        type: status === 'paid' ? 'payment_paid' : 'payment_updated',
        title: status === 'paid' ? 'Pagamento confirmado' : 'Cobranca atualizada',
        message: `${invoice.description} - R$ ${Number(invoice.amount).toFixed(2)}`,
        metadata: { provider: 'asaas', event, payment },
      });
    }

    return json({ ok: true, status, invoiceId: invoice?.id ?? null });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

