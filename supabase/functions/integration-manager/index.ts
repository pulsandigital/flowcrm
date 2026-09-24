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
    throw new Error('INTEGRATION_ENCRYPTION_KEY deve ter pelo menos 32 caracteres.');
  }
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(encryptionSecret),
  );
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptCredentials(credentials: Credentials) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(JSON.stringify(credentials)),
  );
  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

async function decryptCredentials(ciphertext?: string | null, iv?: string | null): Promise<Credentials> {
  if (!ciphertext || !iv) return {};
  const key = await encryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
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
  return profile;
}

function requireAdmin(role?: string | null) {
  if (!['admin', 'owner', 'administrator'].includes(String(role ?? '').toLowerCase())) {
    throw new Error('Somente administradores podem alterar integracoes.');
  }
}

async function responsePayload(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function checkedFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await responsePayload(response);
  if (!response.ok) {
    const message = payload?.error?.message
      ?? payload?.errors?.[0]?.description
      ?? payload?.message
      ?? payload?.error_description
      ?? `HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return payload;
}

async function googleAccessToken(refreshToken: string) {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth ainda nao esta configurado por completo.');
  }
  const payload = await checkedFetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  return String(payload.access_token);
}

async function testProvider(provider: string, credentials: Credentials) {
  if (provider === 'asaas') {
    const apiKey = Deno.env.get('ASAAS_API_KEY') ?? '';
    const environment = Deno.env.get('ASAAS_ENVIRONMENT') ?? 'production';
    if (!apiKey) throw new Error('ASAAS_API_KEY nao configurada.');
    const base = environment === 'sandbox'
      ? 'https://api-sandbox.asaas.com/v3'
      : 'https://api.asaas.com/v3';
    await checkedFetch(`${base}/finance/getCurrentBalance`, {
      headers: { access_token: apiKey },
    });
    return { environment };
  }

  if (provider === 'google_calendar') {
    const refreshToken = credentials.refreshToken || Deno.env.get('GOOGLE_REFRESH_TOKEN') || '';
    const accessToken = credentials.accessToken || await googleAccessToken(refreshToken);
    await checkedFetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return { calendarId: credentials.calendarId || Deno.env.get('GOOGLE_CALENDAR_ID') || 'primary' };
  }

  if (provider === 'evolution_api') {
    const apiUrl = String(credentials.apiUrl ?? '').replace(/\/+$/, '');
    const apiKey = String(credentials.apiKey ?? '');
    if (!apiUrl || !apiKey) throw new Error('Informe a URL e a chave da Evolution API.');
    const payload = await checkedFetch(`${apiUrl}/instance/fetchInstances`, {
      headers: { apikey: apiKey },
    });
    const instances = Array.isArray(payload) ? payload : payload.instances ?? [];
    return {
      apiUrl,
      instanceName: credentials.instanceName ?? '',
      instances: instances.map((item: any) => ({
        name: item.name ?? item.instance?.instanceName ?? item.instanceName ?? '',
        state: item.connectionStatus ?? item.instance?.state ?? item.state ?? 'unknown',
      })).slice(0, 20),
    };
  }

  if (provider === 'meta_ads') {
    const accessToken = String(credentials.accessToken ?? '');
    const adAccountId = String(credentials.adAccountId ?? '').replace(/^act_/, '');
    if (!accessToken || !adAccountId) throw new Error('Informe o token e o ID da conta de anuncios.');
    const graphVersion = String(credentials.graphVersion || 'v22.0');
    const account = await checkedFetch(
      `https://graph.facebook.com/${graphVersion}/act_${encodeURIComponent(adAccountId)}?fields=id,name,account_status,currency&access_token=${encodeURIComponent(accessToken)}`,
    );
    return { adAccountId, accountName: account.name ?? '', accountStatus: account.account_status };
  }

  if (provider === 'google_ads') {
    const developerToken = String(credentials.developerToken ?? Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') ?? '');
    const refreshToken = String(credentials.refreshToken ?? '');
    if (!developerToken || !refreshToken) throw new Error('Informe o developer token e o refresh token.');
    const accessToken = await googleAccessToken(refreshToken);
    const payload = await checkedFetch('https://googleads.googleapis.com/v19/customers:listAccessibleCustomers', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    });
    return {
      customerId: String(credentials.customerId ?? '').replace(/\D/g, ''),
      resourceNames: payload.resourceNames ?? [],
    };
  }

  if (provider === 'google_analytics') {
    const propertyId = String(credentials.propertyId ?? '').replace(/^properties\//, '');
    const refreshToken = String(credentials.refreshToken ?? '');
    if (!propertyId || !refreshToken) throw new Error('Informe o ID da propriedade e o refresh token.');
    const accessToken = await googleAccessToken(refreshToken);
    const property = await checkedFetch(
      `https://analyticsadmin.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return { propertyId, displayName: property.displayName ?? '' };
  }

  if (provider === 'tiktok_ads') {
    const accessToken = String(credentials.accessToken ?? '');
    const advertiserId = String(credentials.advertiserId ?? '');
    if (!accessToken || !advertiserId) throw new Error('Informe o token e o advertiser ID.');
    const payload = await checkedFetch(
      `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=${encodeURIComponent(JSON.stringify([advertiserId]))}`,
      { headers: { 'Access-Token': accessToken } },
    );
    if (payload.code && payload.code !== 0) throw new Error(payload.message || 'TikTok recusou as credenciais.');
    return { advertiserId };
  }

  throw new Error('Provedor ainda nao suportado.');
}

async function loadIntegration(clinicId: string, provider: string) {
  const { data, error } = await serviceClient
    .from('clinic_integrations')
    .select('id, clinic_id, provider, status, enabled, public_config, last_checked_at, connected_at, last_error, credentials_ciphertext, credentials_iv')
    .eq('clinic_id', clinicId)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405);

  try {
    const profile = await requireUser(req);
    const body = await req.json();
    const action = String(body.action ?? 'list');
    const provider = String(body.provider ?? '');

    if (action === 'list') {
      const { data, error } = await serviceClient
        .from('clinic_integrations')
        .select('provider, status, enabled, public_config, last_checked_at, connected_at, last_error')
        .eq('clinic_id', profile.clinic_id)
        .order('provider');
      if (error) throw error;

      const integrations = new Map((data ?? []).map((row: any) => [row.provider, row]));
      for (const systemProvider of ['asaas', 'google_calendar']) {
        if (!integrations.has(systemProvider)) {
          integrations.set(systemProvider, {
            provider: systemProvider,
            status: 'not_configured',
            enabled: false,
            public_config: {},
            last_checked_at: null,
            connected_at: null,
            last_error: null,
          });
        }
      }
      return json({ integrations: Array.from(integrations.values()) });
    }

    if (!provider) return json({ error: 'provider e obrigatorio.' }, 400);

    if (action === 'disconnect') {
      requireAdmin(profile.role);
      const { error } = await serviceClient
        .from('clinic_integrations')
        .delete()
        .eq('clinic_id', profile.clinic_id)
        .eq('provider', provider);
      if (error) throw error;
      return json({ ok: true });
    }

    const current = await loadIntegration(profile.clinic_id, provider);
    const suppliedCredentials = (body.credentials ?? {}) as Credentials;
    const currentCredentials = await decryptCredentials(
      current?.credentials_ciphertext,
      current?.credentials_iv,
    );
    const credentials = { ...currentCredentials, ...suppliedCredentials };

    if (action === 'connect') requireAdmin(profile.role);
    if (!['connect', 'test'].includes(action)) return json({ error: 'Acao invalida.' }, 400);

    try {
      const publicConfig = await testProvider(provider, credentials);
      const encrypted = Object.keys(credentials).length
        ? await encryptCredentials(credentials)
        : { ciphertext: null, iv: null };
      const now = new Date().toISOString();
      const payload = {
        clinic_id: profile.clinic_id,
        provider,
        status: 'connected',
        enabled: true,
        public_config: publicConfig,
        credentials_ciphertext: encrypted.ciphertext,
        credentials_iv: encrypted.iv,
        last_checked_at: now,
        connected_at: current?.connected_at ?? now,
        last_error: null,
      };
      const { error } = await serviceClient
        .from('clinic_integrations')
        .upsert(payload, { onConflict: 'clinic_id,provider' });
      if (error) throw error;
      return json({ ok: true, integration: { ...payload, credentials_ciphertext: undefined, credentials_iv: undefined } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (current?.id) {
        await serviceClient
          .from('clinic_integrations')
          .update({
            status: 'error',
            enabled: false,
            last_checked_at: new Date().toISOString(),
            last_error: message,
          })
          .eq('id', current.id);
      }
      throw error;
    }
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
