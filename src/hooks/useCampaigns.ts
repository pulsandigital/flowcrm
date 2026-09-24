import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsService } from '../lib/services';
import { supabase } from '../lib/supabase';

async function getCurrentClinicId() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Usuario nao autenticado.');

  const { data, error } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', userId)
    .single();

  if (error || !data?.clinic_id) {
    throw new Error('Perfil sem clinica vinculada.');
  }

  return data.clinic_id as string;
}

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const clinicId = await getCurrentClinicId();
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

export function useInsertCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: any) => {
      const clinicId = await getCurrentClinicId();
      const { data, error } = await campaignsService.create({ ...c, clinic_id: clinicId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await campaignsService.update(id, data);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}
