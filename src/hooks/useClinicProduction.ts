import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface ClinicProductionSettings {
  id: string;
  name: string;
  brand_name: string;
  primary_color: string;
  logo_url: string;
  professional_name: string;
  professional_photo_url: string;
  portal_title: string;
  portal_domain: string;
  custom_domain: string;
  custom_domain_status: string;
  support_email: string;
  support_phone: string;
  terms_url: string;
  privacy_url: string;
  production_status: string;
  production_notes: string;
}

export interface ClinicIntegration {
  id?: string;
  provider: string;
  status: string;
  enabled: boolean;
  public_config: Record<string, any>;
  last_checked_at?: string | null;
}

async function getClinicId() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Usuario nao autenticado.');

  const { data, error } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', userId)
    .single();

  if (error || !data?.clinic_id) throw new Error('Perfil sem clinica vinculada.');
  return data.clinic_id as string;
}

export function useClinicProduction() {
  return useQuery({
    queryKey: ['clinic-production'],
    queryFn: async () => {
      const clinicId = await getClinicId();
      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', clinicId)
        .single();
      if (clinicError) throw new Error(clinicError.message);

      const { data: integrations, error: integrationsError } = await supabase
        .from('clinic_integrations')
        .select('id, provider, status, enabled, public_config, last_checked_at')
        .eq('clinic_id', clinicId)
        .order('provider');

      if (integrationsError && !/clinic_integrations/i.test(integrationsError.message)) {
        throw new Error(integrationsError.message);
      }

      return {
        clinicId,
        settings: normalizeClinic(clinic),
        integrations: (integrations ?? []).map(normalizeIntegration),
      };
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function useUpdateClinicProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<ClinicProductionSettings>) => {
      const clinicId = await getClinicId();
      const payload = {
        name: settings.name,
        brand_name: settings.brand_name,
        primary_color: settings.primary_color,
        logo_url: settings.logo_url,
        professional_name: settings.professional_name,
        professional_photo_url: settings.professional_photo_url,
        portal_title: settings.portal_title,
        portal_domain: settings.portal_domain,
        custom_domain: settings.custom_domain,
        custom_domain_status: settings.custom_domain_status,
        support_email: settings.support_email,
        support_phone: settings.support_phone,
        terms_url: settings.terms_url,
        privacy_url: settings.privacy_url,
        production_status: settings.production_status,
        production_notes: settings.production_notes,
      };

      const { error } = await supabase.from('clinics').update(payload).eq('id', clinicId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic-production'] }),
  });
}

export function useUpsertClinicIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (integration: ClinicIntegration) => {
      const clinicId = await getClinicId();
      const { error } = await supabase.from('clinic_integrations').upsert({
        clinic_id: clinicId,
        provider: integration.provider,
        status: integration.status,
        enabled: integration.enabled,
        public_config: integration.public_config ?? {},
        last_checked_at: new Date().toISOString(),
      }, { onConflict: 'clinic_id,provider' });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinic-production'] }),
  });
}

function normalizeClinic(row: any): ClinicProductionSettings {
  return {
    id: row.id,
    name: row.name ?? '',
    brand_name: row.brand_name ?? row.name ?? '',
    primary_color: row.primary_color ?? '#059669',
    logo_url: row.logo_url ?? row.settings?.logoUrl ?? '',
    professional_name: row.professional_name ?? row.settings?.professionalName ?? '',
    professional_photo_url: row.professional_photo_url ?? row.settings?.professionalPhotoUrl ?? '',
    portal_title: row.portal_title ?? row.settings?.portalTitle ?? 'Portal do Paciente',
    portal_domain: row.portal_domain ?? '',
    custom_domain: row.custom_domain ?? '',
    custom_domain_status: row.custom_domain_status ?? 'not_configured',
    support_email: row.support_email ?? '',
    support_phone: row.support_phone ?? '',
    terms_url: row.terms_url ?? '',
    privacy_url: row.privacy_url ?? '',
    production_status: row.production_status ?? 'draft',
    production_notes: row.production_notes ?? '',
  };
}

function normalizeIntegration(row: any): ClinicIntegration {
  return {
    id: row.id,
    provider: row.provider,
    status: row.status ?? 'not_configured',
    enabled: Boolean(row.enabled),
    public_config: row.public_config ?? {},
    last_checked_at: row.last_checked_at,
  };
}
