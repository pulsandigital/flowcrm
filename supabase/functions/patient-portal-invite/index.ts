import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const siteUrl = Deno.env.get('SITE_URL') ?? 'https://usenucleus.com.br';
const serviceClient = createClient(supabaseUrl, serviceRoleKey);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireStaff(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) throw new Error('Sessao ausente.');

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error('Sessao invalida.');

  const { data: profile, error } = await serviceClient
    .from('profiles')
    .select('id, clinic_id, role')
    .eq('id', userData.user.id)
    .single();

  if (error || !profile?.clinic_id) throw new Error('Perfil sem clinica vinculada.');
  if (!['admin', 'owner', 'doctor', 'secretary', 'staff'].includes(String(profile.role))) {
    throw new Error('Voce nao possui permissao para liberar o portal.');
  }
  return profile;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    const profile = await requireStaff(req);
    const body = await req.json().catch(() => ({}));
    const patientId = String(body.patientId ?? '');

    const { data: patient, error: patientError } = await serviceClient
      .from('patients')
      .select('id, clinic_id, full_name, email')
      .eq('id', patientId)
      .eq('clinic_id', profile.clinic_id)
      .single();
    if (patientError || !patient) throw new Error('Paciente nao encontrado.');
    if (!patient.email) throw new Error('Cadastre o e-mail do paciente antes de liberar o portal.');

    const metadata = {
      account_type: 'patient',
      patient_id: patient.id,
      clinic_id: patient.clinic_id,
      full_name: patient.full_name,
    };

    const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
      patient.email,
      {
        redirectTo: `${siteUrl}/reset-password`,
        data: metadata,
      },
    );

    if (inviteError) {
      const { data: users } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = users?.users?.find(user => user.email?.toLowerCase() === patient.email.toLowerCase());
      if (!existing) throw inviteError;

      await serviceClient.auth.admin.updateUserById(existing.id, { user_metadata: metadata });
      const { error: mappingError } = await serviceClient
        .from('patient_portal_accounts')
        .upsert({
          auth_user_id: existing.id,
          patient_id: patient.id,
          clinic_id: patient.clinic_id,
          active: true,
          invited_by: profile.id,
          updated_at: new Date().toISOString(),
        });
      if (mappingError) throw mappingError;
      return json({ ok: true, existingAccount: true });
    }

    if (!invited.user?.id) throw new Error('Nao foi possivel criar o acesso do paciente.');

    const { error: mappingError } = await serviceClient
      .from('patient_portal_accounts')
      .upsert({
        auth_user_id: invited.user.id,
        patient_id: patient.id,
        clinic_id: patient.clinic_id,
        active: true,
        invited_by: profile.id,
        updated_at: new Date().toISOString(),
      });
    if (mappingError) throw mappingError;

    return json({ ok: true, existingAccount: false });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 200);
  }
});
