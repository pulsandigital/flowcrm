import { supabase } from './supabase';
import type { Contact, Deal, Conversation, ChatMessage, WhatsAppChannel, MessageTemplate, MessageFlow } from '../types';

// ── WhatsApp Channels ─────────────────────────────────────────────────────────
export const channelsDb = {
  async getAll(): Promise<WhatsAppChannel[]> {
    const { clinicId } = await getCurrentClinicId();
    const { data } = await supabase
      .from('whatsapp_channels')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at');
    return (data ?? []).map(r => ({
      id: r.id, name: r.name, number: r.number ?? '',
      status: r.status, color: r.color, assignee: r.assignee ?? '',
      leadsCount: r.leads_count ?? 0, messagesCount: r.messages_count ?? 0,
      createdAt: r.created_at,
    }));
  },
  async upsert(ch: WhatsAppChannel) {
    const { clinicId } = await getCurrentClinicId();
    await supabase.from('whatsapp_channels').upsert({
      id: ch.id, clinic_id: clinicId, name: ch.name, number: ch.number, status: ch.status,
      color: ch.color, assignee: ch.assignee,
      leads_count: ch.leadsCount, messages_count: ch.messagesCount,
      created_at: ch.createdAt,
    });
  },
  async updateStatus(id: string, status: string) {
    const { clinicId } = await getCurrentClinicId();
    await supabase.from('whatsapp_channels').update({ status }).eq('id', id).eq('clinic_id', clinicId);
  },
  async delete(id: string) {
    const { clinicId } = await getCurrentClinicId();
    await supabase.from('whatsapp_channels').delete().eq('id', id).eq('clinic_id', clinicId);
  },
};

// ── Contacts ──────────────────────────────────────────────────────────────────
export const contactsDb = {
  async getAll(): Promise<Contact[]> {
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    return (data ?? []).map(r => ({
      id: r.id, name: r.name, email: r.email ?? '', phone: r.phone ?? '',
      company: r.company ?? '', tags: r.tags ?? [], status: r.status,
      assignee: r.assignee ?? '', createdAt: r.created_at,
      lastActivity: r.last_contact ?? r.created_at, avatar: r.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
    }));
  },
  async upsert(c: Contact) {
    await supabase.from('contacts').upsert({
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      company: c.company, tags: c.tags, status: c.status,
      assignee: c.assignee, created_at: c.createdAt, last_contact: c.lastActivity,
    });
  },
  async delete(id: string) {
    await supabase.from('contacts').delete().eq('id', id);
  },
};

// ── Deals ─────────────────────────────────────────────────────────────────────
export const dealsDb = {
  async getAll(): Promise<Deal[]> {
    const { data } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
    return (data ?? []).map(r => ({
      id: r.id, title: r.title, contactId: r.contact_id ?? '',
      contactName: r.contact_name ?? '', company: r.company ?? '',
      value: r.value ?? 0, stage: r.stage, assignee: r.assignee ?? '',
      probability: r.probability ?? 15, channelId: r.channel_id ?? '',
      createdAt: r.created_at, updatedAt: r.updated_at,
    }));
  },
  async upsert(d: Deal) {
    await supabase.from('deals').upsert({
      id: d.id, title: d.title, contact_id: d.contactId,
      contact_name: d.contactName, company: d.company, value: d.value,
      stage: d.stage, assignee: d.assignee, probability: d.probability,
      channel_id: d.channelId, created_at: d.createdAt, updated_at: d.updatedAt,
    });
  },
  async delete(id: string) {
    await supabase.from('deals').delete().eq('id', id);
  },
};

// ── Conversations ─────────────────────────────────────────────────────────────
export const conversationsDb = {
  async getAll(): Promise<Conversation[]> {
    const { clinicId } = await getCurrentClinicId();
    const { data } = await supabase
      .from('conversations').select('*, messages(*)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    return (data ?? []).map(r => ({
      id: r.id, contact: r.contact, status: r.status,
      channel: r.channel, channelId: r.channel_id ?? '',
      lastMessage: r.last_message ?? '', lastMessageTime: r.last_message_time ?? '',
      unreadCount: r.unread_count ?? 0, tags: r.tags ?? [],
      assignee: r.assignee ?? '', inFlow: false,
      leadSource: r.lead_source, lossReason: r.loss_reason,
      lossReasonNote: r.loss_reason_note,
      messages: (r.messages ?? []).map((m: any) => ({
        id: m.id, content: m.content, sender: m.sender,
        timestamp: m.timestamp, status: m.status ?? 'sent',
        type: m.type ?? 'text', isDeleted: m.is_deleted ?? false,
        isEdited: m.is_edited ?? false, internalAuthor: m.internal_author,
      })),
    }));
  },
  async upsert(c: Conversation) {
    const { clinicId } = await getCurrentClinicId();
    await supabase.from('conversations').upsert({
      id: c.id, clinic_id: clinicId, contact: c.contact, status: c.status,
      channel: c.channel, channel_id: c.channelId,
      last_message: c.lastMessage, last_message_time: c.lastMessageTime,
      unread_count: c.unreadCount, tags: c.tags,
      assignee: c.assignee, lead_source: c.leadSource,
      loss_reason: c.lossReason, loss_reason_note: c.lossReasonNote,
    });
  },
  async updateField(id: string, field: string, value: any) {
    const { clinicId } = await getCurrentClinicId();
    await supabase.from('conversations').update({ [field]: value }).eq('id', id).eq('clinic_id', clinicId);
  },
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messagesDb = {
  async insert(convId: string, msg: ChatMessage) {
    const { clinicId } = await getCurrentClinicId();
    await supabase.from('messages').insert({
      id: msg.id, clinic_id: clinicId, conversation_id: convId, content: msg.content,
      sender: msg.sender, timestamp: msg.timestamp, status: msg.status ?? 'sent',
      type: msg.type ?? 'text', is_deleted: msg.isDeleted ?? false,
      is_edited: msg.isEdited ?? false, internal_author: msg.internalAuthor,
    });
  },
  async update(id: string, fields: Partial<{ content: string; is_deleted: boolean; is_edited: boolean }>) {
    const { clinicId } = await getCurrentClinicId();
    await supabase.from('messages').update(fields).eq('id', id).eq('clinic_id', clinicId);
  },
};

// ── Templates ─────────────────────────────────────────────────────────────────
export const templatesDb = {
  async getAll(): Promise<MessageTemplate[]> {
    const { data } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
    return (data ?? []).map(r => ({
      id: r.id, name: r.name, content: r.content,
      category: r.category, variables: r.variables ?? [],
      usageCount: r.usage_count ?? 0, createdAt: r.created_at,
    }));
  },
  async upsert(t: MessageTemplate) {
    await supabase.from('templates').upsert({
      id: t.id, name: t.name, content: t.content,
      category: t.category, variables: t.variables,
      usage_count: t.usageCount, created_at: t.createdAt,
    });
  },
  async delete(id: string) {
    await supabase.from('templates').delete().eq('id', id);
  },
};

// ── Message Flows ──────────────────────────────────────────────────────────────
export const flowsDb = {
  async getAll(): Promise<MessageFlow[]> {
    const { data } = await supabase.from('message_flows').select('*').order('created_at', { ascending: false });
    return (data ?? []).map(r => ({
      id: r.id, name: r.name, description: r.description ?? '',
      isActive: r.is_active ?? false, trigger: r.trigger ?? '',
      leadsCount: r.leads_count ?? 0, createdAt: r.created_at,
      steps: r.steps ?? [],
    }));
  },
  async upsert(f: MessageFlow) {
    await supabase.from('message_flows').upsert({
      id: f.id, name: f.name, description: f.description,
      is_active: f.isActive, trigger: f.trigger,
      leads_count: f.leadsCount, steps: f.steps,
      created_at: f.createdAt,
    });
  },
  async delete(id: string) {
    await supabase.from('message_flows').delete().eq('id', id);
  },
  async updateActive(id: string, isActive: boolean) {
    await supabase.from('message_flows').update({ is_active: isActive }).eq('id', id);
  },
};

// ── Medical records ───────────────────────────────────────────────────────
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
    throw new Error('Perfil sem clinica vinculada. Conclua o onboarding do usuario.');
  }

  return { clinicId: data.clinic_id as string, userId };
}

export const medicalRecordsDb = {
  async getByPatient(patientId: string) {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*, profiles(full_name)')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false });

    if (error) {
      console.warn('Erro ao carregar prontuarios:', error.message);
      return [];
    }

    return (data ?? []).map((r: any) => ({
      id: r.id,
      patientId: r.patient_id,
      date: (r.appointment_date ?? r.created_at ?? '').slice(0, 10),
      type: r.appointment_type ?? 'Atendimento',
      complaint: r.chief_complaint ?? '',
      diagnosis: r.clinical_data?.diagnosis ?? '',
      prescription: r.conduct ?? '',
      notes: r.evolution ?? '',
      professional: r.profiles?.full_name ?? '',
      clinicalData: r.clinical_data ?? {},
      createdAt: r.created_at,
    }));
  },

  async insert(record: any) {
    const { clinicId, userId } = await getCurrentClinicId();
    const appointmentDate = record.date
      ? new Date(`${record.date}T12:00:00`).toISOString()
      : new Date().toISOString();

    const { data, error } = await supabase
      .from('medical_records')
      .insert({
        clinic_id: clinicId,
        patient_id: record.patientId,
        professional_id: userId,
        specialty: record.specialty ?? 'Geral',
        appointment_type: record.type ?? 'Atendimento',
        appointment_date: appointmentDate,
        chief_complaint: record.complaint ?? '',
        clinical_data: {
          ...record.clinicalData,
          diagnosis: record.diagnosis ?? '',
        },
        evolution: record.notes ?? '',
        conduct: record.prescription ?? '',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('medical_records').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
};

// ── Re-exports from services (aliases expected by hooks) ──────────────────────
export {
  leadsService as leadsDb,
  patientsService as patientsDb,
  appointmentsService as appointmentsDb,
  invoicesService as financialDb,
  tasksService as tasksDb,
} from './services';
