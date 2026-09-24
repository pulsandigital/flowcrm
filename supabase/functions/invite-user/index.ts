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

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) throw new Error('Sessão ausente.');

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) throw new Error('Sessão inválida.');

  const { data: profile, error } = await serviceClient
    .from('profiles')
    .select('id, clinic_id, role')
    .eq('id', userData.user.id)
    .single();

  if (error || !profile?.clinic_id) throw new Error('Perfil sem clínica vinculada.');
  if (!['admin', 'staff'].includes(String(profile.role))) throw new Error('Apenas administradores podem convidar usuários.');
  return profile;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const profile = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();
    const role = String(body.role ?? 'staff').trim() || 'staff';
    const specialty = String(body.specialty ?? '').trim() || null;

    if (!email || !email.includes('@')) throw new Error('Informe um e-mail válido.');

    const { data: invite, error: inviteError } = await serviceClient
      .from('team_invites')
      .insert({
        clinic_id: profile.clinic_id,
        email,
        role,
        specialty,
        invited_by: profile.id,
        status: 'pending',
      })
      .select()
      .single();
    if (inviteError) throw inviteError;

    const { data: invitedUser, error: authError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
      data: {
        clinic_id: profile.clinic_id,
        role,
        specialty,
        invite_id: invite.id,
      },
    });
    if (authError) throw authError;

    await serviceClient
      .from('team_invites')
      .update({ auth_user_id: invitedUser.user?.id ?? null })
      .eq('id', invite.id);

    return json({ ok: true, inviteId: invite.id });
  } catch (err: any) {
    return json({ ok: false, error: err.message ?? 'Erro ao enviar convite.' }, 200);
  }
});
