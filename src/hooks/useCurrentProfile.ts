import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface CurrentProfile {
  id: string;
  clinic_id: string | null;
  full_name: string;
  email: string;
  role: string;
  specialty?: string | null;
  crm?: string | null;
  rqe?: string | null;
  council_state?: string | null;
  is_primary_professional?: boolean | null;
  clinics?: {
    id: string;
    name: string;
    brand_name?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    onboarding_completed?: boolean | null;
    subscription_status?: string | null;
    default_specialty?: string | null;
  } | null;
}

export function useCurrentProfile() {
  return useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Usuário não autenticado.');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();

      if (error) throw error;

      let clinic = null;
      if (profile?.clinic_id) {
        const { data: clinicData, error: clinicError } = await supabase
          .from('clinics')
          .select('*')
          .eq('id', profile.clinic_id)
          .single();
        if (!clinicError) clinic = clinicData;
      }

      return { ...profile, clinics: clinic } as CurrentProfile;
    },
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
