import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsDb } from '../lib/db';
import { supabase } from '../lib/supabase';
import type { Lead } from '../types';

const STAGE_TO_DB: Record<string, string> = {
  'Novo lead': 'new',
  'Primeiro contato': 'contacted',
  'Em atendimento': 'contacted',
  'Qualificação': 'qualified',
  'Proposta enviada': 'proposal',
  'Follow-up': 'negotiation',
  'Fechado ganho': 'won',
  'Fechado perdido': 'lost',
};

const STAGE_FROM_DB: Record<string, string> = {
  new: 'Novo lead',
  contacted: 'Em atendimento',
  qualified: 'Qualificação',
  proposal: 'Proposta enviada',
  negotiation: 'Follow-up',
  won: 'Fechado ganho',
  lost: 'Fechado perdido',
};

const normalizeStage = (value?: string) => {
  if (!value) return 'Novo lead';
  return STAGE_FROM_DB[value] ?? value;
};

const readNoteMeta = (notes: string | null | undefined, key: string) => {
  const match = String(notes ?? '').match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
  return match?.[1]?.trim() ?? '';
};

const cleanNotes = (notes: string | null | undefined) =>
  String(notes ?? '')
    .split('\n')
    .filter(line => !/^(Cidade|Especialidade|Responsavel|Responsável secundário|Fluxo WhatsApp|Valor de fechamento):/i.test(line.trim()))
    .join('\n')
    .trim();

const buildLeadNotes = (lead: any) => [
  cleanNotes(lead.notes),
  lead.city ? `Cidade: ${lead.city}` : '',
  lead.specialty ? `Especialidade: ${lead.specialty}` : '',
  lead.responsible ? `Responsavel: ${lead.responsible}` : '',
  lead.secondaryResponsible ? `Responsável secundário: ${lead.secondaryResponsible}` : '',
  lead.flowOwner ? `Fluxo WhatsApp: ${lead.flowOwner}` : '',
  lead.value ? `Valor de fechamento: ${Number(lead.value)}` : '',
].filter(Boolean).join('\n') || null;

const CHANNEL_TO_DB: Record<string, string> = {
  WhatsApp: 'whatsapp',
  Instagram: 'instagram',
  Facebook: 'facebook',
  Site: 'site',
  Anúncio: 'google',
  Indicação: 'referral',
  Orgânico: 'site',
  Outro: 'manual',
};

async function getCurrentProfile() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Usuario nao autenticado.');

  const { data, error } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', userId)
    .single();

  if (error || !data?.clinic_id) {
    throw new Error('Perfil sem clinica vinculada. Saia e entre novamente.');
  }

  return { userId, clinicId: data.clinic_id as string };
}

const mapLead = (row: any): Lead => ({
  id: row.id,
  name: row.name ?? '',
  phone: row.phone ?? '',
  email: row.email ?? '',
  channel: row.channel ?? row.origin ?? 'Outro',
  temperature: row.temperature ?? 'warm',
  stage: normalizeStage(row.status ?? row.stage),
  origin: row.origin ?? row.channel ?? 'Outro',
  tags: row.tags ?? [],
  assignee: row.assignee ?? row.assigned_to ?? '',
  status: normalizeStage(row.status ?? row.stage),
  city: row.city ?? readNoteMeta(row.notes, 'Cidade'),
  specialty: row.specialty ?? readNoteMeta(row.notes, 'Especialidade'),
  score: Number(row.score ?? 0),
  responsible: row.responsible || readNoteMeta(row.notes, 'Responsavel') || row.assignee || '',
  secondaryResponsible: row.secondary_responsible || readNoteMeta(row.notes, 'Responsável secundário'),
  flowOwner: row.flow_owner || readNoteMeta(row.notes, 'Fluxo WhatsApp'),
  notes: cleanNotes(row.notes),
  value: Number(row.value ?? String(row.notes ?? '').match(/Valor de fechamento:\s*([0-9.,]+)/)?.[1]?.replace(',', '.') ?? 0),
  createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? row.updatedAt ?? row.created_at ?? new Date().toISOString(),
});

const toLeadPayload = async (lead: any) => {
  const { clinicId, userId } = await getCurrentProfile();
  return {
    clinic_id: clinicId,
    name: lead.name,
    email: lead.email || null,
    phone: lead.phone || null,
    origin: lead.origin || 'manual',
    channel: CHANNEL_TO_DB[lead.origin] ?? CHANNEL_TO_DB[lead.channel] ?? 'manual',
    temperature: lead.temperature ?? 'warm',
    status: STAGE_TO_DB[lead.status] ?? STAGE_TO_DB[lead.stage] ?? 'new',
    score: Number(lead.score ?? 0),
    assigned_to: userId,
    tags: lead.tags ?? [],
    notes: buildLeadNotes(lead),
    value: lead.value ? Number(lead.value) : null,
  };
};

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { clinicId } = await getCurrentProfile();
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn('Erro ao carregar leads:', error.message);
        return [];
      }
      return (data ?? []).map(mapLead);
    },
    staleTime: 30_000,
  });
}

export function useInsertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) => leadsDb.create(await toLeadPayload(l)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      const payload: Record<string, any> = {};
      const requestedStage = (data.status ?? data.stage) as string | undefined;

      if (requestedStage) payload.status = STAGE_TO_DB[requestedStage] ?? requestedStage;
      if (data.name !== undefined) payload.name = data.name;
      if (data.email !== undefined) payload.email = data.email || null;
      if (data.phone !== undefined) payload.phone = data.phone || null;
      if (data.origin !== undefined || data.channel !== undefined) {
        payload.origin = data.origin ?? data.channel;
        payload.channel = CHANNEL_TO_DB[data.origin as string] ?? CHANNEL_TO_DB[data.channel as string] ?? data.channel;
      }
      if (data.temperature !== undefined) payload.temperature = data.temperature;
      if (data.score !== undefined) payload.score = Number(data.score ?? 0);
      if (data.tags !== undefined) payload.tags = data.tags ?? [];
      if (
        data.notes !== undefined ||
        (data as any).city !== undefined ||
        (data as any).specialty !== undefined ||
        (data as any).responsible !== undefined ||
        (data as any).secondaryResponsible !== undefined ||
        (data as any).flowOwner !== undefined
      ) {
        payload.notes = buildLeadNotes(data);
      }
      if (data.value !== undefined) {
        payload.notes = buildLeadNotes(data);
      }

      let { data: updatedLead, error } = await leadsDb.update(id, payload);

      if (error && requestedStage && STAGE_TO_DB[requestedStage]) {
        const fallbackPayload = { ...payload, status: STAGE_TO_DB[requestedStage] };
        const fallback = await leadsDb.update(id, fallbackPayload);
        updatedLead = fallback.data;
        error = fallback.error;
      }

      if (error) throw new Error(error.message);
      return updatedLead;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadsDb.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
