import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const asaasKey = Deno.env.get('ASAAS_API_KEY') ?? '';
const asaasEnvironment = Deno.env.get('ASAAS_ENVIRONMENT') ?? 'production';
const asaasBaseUrl = asaasEnvironment === 'sandbox'
  ? 'https://api-sandbox.asaas.com/v3'
  : 'https://api.asaas.com/v3';

const serviceClient = createClient(supabaseUrl, serviceRoleKey);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) throw new Error('Sessao ausente.');

  const userClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new Error('Sessao invalida.');

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, clinic_id, role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.clinic_id) {
    return {
      user: data.user,
      access: {
        type: 'staff' as const,
        clinicId: profile.clinic_id,
        patientId: null,
        profileId: profile.id,
      },
    };
  }

  const { data: portalAccount } = await serviceClient
    .from('patient_portal_accounts')
    .select('clinic_id, patient_id, active')
    .eq('auth_user_id', data.user.id)
    .eq('active', true)
    .maybeSingle();

  if (!portalAccount?.clinic_id || !portalAccount.patient_id) {
    throw new Error('Conta sem acesso a esta cobranca.');
  }

  return {
    user: data.user,
    access: {
      type: 'patient' as const,
      clinicId: portalAccount.clinic_id,
      patientId: portalAccount.patient_id,
      profileId: null,
    },
  };
}

async function asaasFetch(path: string, init: RequestInit = {}) {
  if (!asaasKey) throw new Error('ASAAS_API_KEY nao configurada no Supabase.');
  const response = await fetch(`${asaasBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: asaasKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = payload?.errors?.[0]?.description || payload?.message || `Asaas HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    const { access } = await requireUser(req);
    const body = await req.json();
    const invoiceId = String(body.invoiceId ?? '');
    const billingType = String(body.billingType ?? 'PIX').toUpperCase();

    if (!invoiceId) return json({ error: 'invoiceId e obrigatorio.' }, 400);
    if (!['PIX', 'CREDIT_CARD', 'BOLETO'].includes(billingType)) {
      return json({ error: 'Forma de pagamento invalida.' }, 400);
    }

    const { data: invoice, error: invoiceError } = await serviceClient
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('clinic_id', access.clinicId)
      .single();
    if (invoiceError || !invoice) {
      const { data: anyInvoice } = await serviceClient
        .from('invoices')
        .select('id, clinic_id')
        .eq('id', invoiceId)
        .maybeSingle();

      if (anyInvoice?.clinic_id && anyInvoice.clinic_id !== access.clinicId) {
        throw new Error('Esta cobranca pertence a outra clinica. Atualize a pagina e tente novamente.');
      }

      throw new Error('Cobranca nao encontrada. Atualize a pagina e tente novamente.');
    }

    if (
      access.type === 'patient'
      && (
        invoice.patient_id !== access.patientId
        || invoice.patient_portal_visible !== true
      )
    ) {
      throw new Error('Esta cobranca nao esta disponivel no seu portal.');
    }

    let { data: patient } = invoice.patient_id
      ? await serviceClient
          .from('patients')
          .select('id, full_name, email, phone, cpf')
          .eq('id', invoice.patient_id)
          .maybeSingle()
      : { data: null };

    if (!patient?.cpf) {
      const patientNameFromNotes = String(invoice.notes ?? '').match(/Paciente\/descricao:\s*([^\n]+)/i)?.[1]?.trim();
      const searchName = patientNameFromNotes || invoice.description;
      if (searchName) {
        const { data: matchedPatient } = await serviceClient
          .from('patients')
          .select('id, full_name, email, phone, cpf')
          .eq('clinic_id', access.clinicId)
          .ilike('full_name', `%${searchName}%`)
          .limit(1)
          .maybeSingle();
        if (matchedPatient) patient = matchedPatient;
      }
    }

    if (!patient?.cpf) {
      throw new Error('Para criar esta cobranca no Asaas, vincule um paciente com CPF/CNPJ cadastrado.');
    }

    const customer = await asaasFetch('/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: patient?.full_name || invoice.description || 'Paciente Nucleus',
        email: patient?.email || undefined,
        cpfCnpj: patient?.cpf || undefined,
        mobilePhone: patient?.phone || undefined,
        externalReference: patient?.id || invoice.patient_id || undefined,
      }),
    });

    const payment = await asaasFetch('/payments', {
      method: 'POST',
      body: JSON.stringify({
        customer: customer.id,
        billingType,
        value: Number(invoice.amount),
        dueDate: invoice.due_date || new Date().toISOString().slice(0, 10),
        description: invoice.description,
        externalReference: invoice.id,
      }),
    });

    let pixQrCode = null;
    if (billingType === 'PIX') {
      pixQrCode = await asaasFetch(`/payments/${payment.id}/pixQrCode`);
    }

    const updatePayload = {
      provider: 'asaas',
      provider_status: payment.status ?? 'PENDING',
      external_id: payment.id,
      payment_method: billingType === 'PIX' ? 'pix' : billingType === 'BOLETO' ? 'boleto' : 'credit_card',
      payment_url: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
      invoice_url: payment.invoiceUrl ?? payment.bankSlipUrl ?? invoice.invoice_url ?? null,
      pix_payload: pixQrCode?.payload ?? null,
      pix_qr_code_base64: pixQrCode?.encodedImage ?? null,
      pix_expires_at: pixQrCode?.expirationDate ?? null,
      patient_portal_visible: true,
      notes: [
        invoice.notes ?? '',
        `Asaas payment ID: ${payment.id}`,
        payment.invoiceUrl ? `Link de pagamento: ${payment.invoiceUrl}` : '',
      ].filter(Boolean).join('\n'),
    };

    const { error: updateError } = await serviceClient
      .from('invoices')
      .update(updatePayload)
      .eq('id', invoice.id);
    if (updateError) throw updateError;

    await serviceClient.from('notifications').insert({
      clinic_id: access.clinicId,
      type: 'payment_created',
      title: 'Cobranca enviada ao Portal do Paciente',
      message: `${invoice.description} - R$ ${Number(invoice.amount).toFixed(2)}`,
      invoice_id: invoice.id,
      patient_id: invoice.patient_id,
      metadata: { provider: 'asaas', paymentId: payment.id, billingType },
    });

    return json({ ok: true, payment, pixQrCode });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 200);
  }
});
