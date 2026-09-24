import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const googleRefreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN') ?? '';
const googleCalendarId = Deno.env.get('GOOGLE_CALENDAR_ID') ?? 'primary';
const encryptionSecret = Deno.env.get('INTEGRATION_ENCRYPTION_KEY') ?? '';

const serviceClient = createClient(supabaseUrl, serviceRoleKey);
type Credentials = Record<string, string>;

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

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('id, clinic_id, role')
    .eq('id', data.user.id)
    .single();
  if (profileError || !profile?.clinic_id) throw new Error('Perfil sem clinica vinculada.');
  return { user: data.user, profile };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptionKey() {
  if (!encryptionSecret || encryptionSecret.length < 32) {
    throw new Error('A proteção das integrações ainda não foi configurada.');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(encryptionSecret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptCredentials(credentials: Credentials) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(),
    new TextEncoder().encode(JSON.stringify(credentials)),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
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

async function loadGoogleIntegration(clinicId: string) {
  const { data, error } = await serviceClient
    .from('clinic_integrations')
    .select('id, public_config, credentials_ciphertext, credentials_iv')
    .eq('clinic_id', clinicId)
    .eq('provider', 'google_calendar')
    .eq('enabled', true)
    .eq('status', 'connected')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Conecte sua Agenda Google antes de criar a videochamada.');
  return data;
}

async function getAccessToken(clinicId: string) {
  const integration = await loadGoogleIntegration(clinicId);
  const credentials = await decryptCredentials(
    integration.credentials_ciphertext,
    integration.credentials_iv,
  );
  const refreshToken = credentials.refreshToken || googleRefreshToken;
  const storedAccessToken = credentials.accessToken || '';

  if (!refreshToken) {
    if (storedAccessToken) {
      return {
        accessToken: storedAccessToken,
        calendarId: String(integration.public_config?.calendarId || credentials.calendarId || googleCalendarId),
      };
    }
    throw new Error('Reconecte sua Agenda Google para renovar a autorização.');
  }

  if (!googleClientId || !googleClientSecret) {
    if (storedAccessToken) {
      return {
        accessToken: storedAccessToken,
        calendarId: String(integration.public_config?.calendarId || credentials.calendarId || googleCalendarId),
      };
    }
    throw new Error('A conexão com o Google está temporariamente indisponível.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error_description ?? payload.error ?? 'Falha ao autenticar no Google.');

  const updatedCredentials = {
    ...credentials,
    accessToken: String(payload.access_token),
    refreshToken,
  };
  const encrypted = await encryptCredentials(updatedCredentials);
  await serviceClient
    .from('clinic_integrations')
    .update({
      credentials_ciphertext: encrypted.ciphertext,
      credentials_iv: encrypted.iv,
      last_checked_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', integration.id);

  return {
    accessToken: String(payload.access_token),
    calendarId: String(integration.public_config?.calendarId || credentials.calendarId || googleCalendarId),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    const { profile } = await requireUser(req);
    const body = await req.json();
    const appointmentId = String(body.appointmentId ?? '');
    const createMeet = Boolean(body.createMeet ?? true);
    if (!appointmentId) return json({ error: 'appointmentId e obrigatorio.' }, 400);

    const { data: appointment, error } = await serviceClient
      .from('appointments')
      .select('*, patients(full_name, email, phone), profiles(full_name, email)')
      .eq('id', appointmentId)
      .eq('clinic_id', profile.clinic_id)
      .single();
    if (error || !appointment) throw new Error('Agendamento nao encontrado.');

    const patient = Array.isArray(appointment.patients) ? appointment.patients[0] : appointment.patients;
    const professional = Array.isArray(appointment.profiles) ? appointment.profiles[0] : appointment.profiles;
    const googleConnection = await getAccessToken(profile.clinic_id);
    const accessToken = googleConnection.accessToken;
    const calendarId = googleConnection.calendarId;

    const eventBody: Record<string, unknown> = {
      summary: appointment.title || `Consulta - ${patient?.full_name ?? 'Paciente'}`,
      description: [
        appointment.specialty ? `Especialidade: ${appointment.specialty}` : '',
        appointment.appointment_type ? `Tipo: ${appointment.appointment_type}` : '',
        appointment.notes ?? '',
      ].filter(Boolean).join('\n'),
      start: { dateTime: appointment.starts_at, timeZone: 'America/Sao_Paulo' },
      end: { dateTime: appointment.ends_at, timeZone: 'America/Sao_Paulo' },
      attendees: [
        patient?.email ? { email: patient.email, displayName: patient.full_name } : null,
        professional?.email ? { email: professional.email, displayName: professional.full_name } : null,
      ].filter(Boolean),
    };

    if (createMeet || appointment.is_online) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: `nucleus-${appointment.id}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      },
    );
    const googleEvent = await response.json();
    if (!response.ok) throw new Error(googleEvent.error?.message ?? 'Falha ao criar evento no Google Calendar.');

    const meetLink = googleEvent.hangoutLink ?? googleEvent.conferenceData?.entryPoints?.find((entry: any) => entry.entryPointType === 'video')?.uri ?? null;
    const { error: updateError } = await serviceClient
      .from('appointments')
      .update({
        google_event_id: googleEvent.id,
        google_calendar_id: calendarId,
        google_html_link: googleEvent.htmlLink ?? null,
        meet_link: meetLink,
        location: meetLink ?? appointment.location,
        is_online: Boolean(meetLink || appointment.is_online),
      })
      .eq('id', appointment.id);
    if (updateError) throw updateError;

    await serviceClient.from('notifications').insert({
      clinic_id: profile.clinic_id,
      patient_id: appointment.patient_id,
      appointment_id: appointment.id,
      type: 'appointment_synced',
      title: meetLink ? 'Consulta online sincronizada com Google Meet' : 'Consulta sincronizada com Google Calendar',
      message: appointment.title ?? patient?.full_name ?? 'Agendamento',
      metadata: { googleEventId: googleEvent.id, meetLink },
    });

    return json({ ok: true, googleEvent, meetLink });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
