import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────
export type Lead = {
  id: string;
  clinic_id: string;
  name: string;
  email?: string;
  phone?: string;
  origin?: string;
  channel: string;
  temperature: 'hot' | 'warm' | 'cold';
  stage: string;
  score: number;
  assigned_to?: string;
  tags: string[];
  notes?: string;
  value?: number;
  created_at: string;
  updated_at: string;
};

export type Patient = {
  id: string;
  clinic_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  dob?: string;
  gender?: string;
  health_plan?: string;
  allergies?: string;
  status: string;
  created_at: string;
};

export type Appointment = {
  id: string;
  clinic_id: string;
  patient_id?: string;
  professional_id?: string;
  title?: string;
  specialty?: string;
  appointment_type: string;
  starts_at: string;
  ends_at: string;
  location?: string;
  is_online: boolean;
  status: string;
  notes?: string;
};

export type MedicalRecord = {
  id: string;
  patient_id: string;
  professional_id?: string;
  specialty: string;
  appointment_type: string;
  appointment_date: string;
  chief_complaint?: string;
  clinical_data: Record<string, any>;
  evolution?: string;
  conduct?: string;
  created_at: string;
};

export type Invoice = {
  id: string;
  patient_id?: string;
  description: string;
  amount: number;
  status: string;
  payment_method?: string;
  due_date?: string;
  payment_date?: string;
  created_at: string;
};

export type Task = {
  id: string;
  lead_id?: string;
  patient_id?: string;
  assigned_to?: string;
  title: string;
  description?: string;
  module: string;
  priority: string;
  status: string;
  due_date?: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  from_me: boolean;
  content: string;
  type: string;
  status: string;
  edited: boolean;
  deleted: boolean;
  created_at: string;
};

export type Campaign = {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget?: number;
  spent: number;
  leads: number;
  conversions: number;
  cpl?: number;
  roas?: number;
  created_at: string;
};

// ─── LEADS ────────────────────────────────────────────────────
export const leadsService = {
  async getAll(filters?: { stage?: string; assigned_to?: string }) {
    let q = supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (filters?.stage) q = q.eq('stage', filters.stage);
    if (filters?.assigned_to) q = q.eq('assigned_to', filters.assigned_to);
    return q;
  },

  async create(data: Partial<Lead>) {
    return supabase.from('leads').insert(data).select().single();
  },

  async update(id: string, data: Partial<Lead>) {
    return supabase.from('leads').update(data).eq('id', id).select().single();
  },

  async updateStage(id: string, stage: string) {
    return supabase.from('leads').update({ stage }).eq('id', id);
  },

  async delete(id: string) {
    return supabase.from('leads').delete().eq('id', id);
  },
};

// ─── PATIENTS ─────────────────────────────────────────────────
export const patientsService = {
  async getAll(search?: string) {
    let q = supabase.from('patients').select('*').order('full_name');
    if (search) q = q.ilike('full_name', `%${search}%`);
    return q;
  },

  async getById(id: string) {
    return supabase.from('patients').select('*').eq('id', id).single();
  },

  async create(data: Partial<Patient>) {
    return supabase.from('patients').insert(data).select().single();
  },

  async update(id: string, data: Partial<Patient>) {
    return supabase.from('patients').update(data).eq('id', id).select().single();
  },

  async delete(id: string) {
    return supabase.from('patients').delete().eq('id', id);
  },
};

// ─── APPOINTMENTS ─────────────────────────────────────────────
export const appointmentsService = {
  async getByWeek(startDate: string, endDate: string) {
    return supabase
      .from('appointments')
      .select('*, patients(full_name), profiles(full_name)')
      .gte('starts_at', startDate)
      .lte('starts_at', endDate)
      .order('starts_at');
  },

  async create(data: Partial<Appointment>) {
    return supabase.from('appointments').insert(data).select().single();
  },

  async update(id: string, data: Partial<Appointment>) {
    return supabase.from('appointments').update(data).eq('id', id).select().single();
  },

  async cancel(id: string) {
    return supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
  },
};

// ─── MEDICAL RECORDS ──────────────────────────────────────────
export const recordsService = {
  async getByPatient(patientId: string) {
    return supabase
      .from('medical_records')
      .select('*, profiles(full_name)')
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false });
  },

  async create(data: Partial<MedicalRecord>) {
    return supabase.from('medical_records').insert(data).select().single();
  },

  async update(id: string, data: Partial<MedicalRecord>) {
    return supabase.from('medical_records').update(data).eq('id', id).select().single();
  },
};

// ─── MESSAGES ─────────────────────────────────────────────────
export const messagesService = {
  async getByConversation(conversationId: string) {
    return supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at');
  },

  async send(conversationId: string, clinicId: string, content: string, senderId?: string) {
    return supabase.from('messages').insert({
      conversation_id: conversationId,
      clinic_id: clinicId,
      from_me: true,
      sender_id: senderId,
      content,
      type: 'text',
      status: 'sent',
    }).select().single();
  },

  async edit(id: string, content: string) {
    return supabase.from('messages').update({ content, edited: true }).eq('id', id);
  },

  async delete(id: string) {
    return supabase.from('messages').update({ deleted: true }).eq('id', id);
  },
};

// ─── INVOICES ─────────────────────────────────────────────────
export const invoicesService = {
  async getAll(status?: string) {
    let q = supabase
      .from('invoices')
      .select('*, patients(full_name)')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    return q;
  },

  async create(data: Partial<Invoice>) {
    return supabase.from('invoices').insert(data).select().single();
  },

  async markAsPaid(id: string, method: string) {
    return supabase.from('invoices').update({
      status: 'paid',
      payment_method: method,
      payment_date: new Date().toISOString().split('T')[0],
    }).eq('id', id);
  },

  async delete(id: string) {
    return supabase.from('invoices').delete().eq('id', id);
  },

  async getSummary() {
    const { data } = await supabase.from('invoices').select('amount, status');
    if (!data) return { total: 0, paid: 0, pending: 0, overdue: 0 };
    return {
      total:   data.reduce((s, r) => s + Number(r.amount), 0),
      paid:    data.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0),
      pending: data.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0),
      overdue: data.filter(r => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0),
    };
  },
};

// ─── TASKS ────────────────────────────────────────────────────
export const tasksService = {
  async getAll(filters?: { status?: string; assigned_to?: string }) {
    let q = supabase.from('tasks').select('*, profiles(full_name)').order('due_date');
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.assigned_to) q = q.eq('assigned_to', filters.assigned_to);
    return q;
  },

  async create(data: Partial<Task>) {
    return supabase.from('tasks').insert(data).select().single();
  },

  async complete(id: string) {
    return supabase.from('tasks').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', id);
  },

  async update(id: string, data: Partial<Task>) {
    return supabase.from('tasks').update(data).eq('id', id);
  },
};

// ─── CAMPAIGNS ────────────────────────────────────────────────
export const campaignsService = {
  async getAll() {
    return supabase.from('campaigns').select('*').order('created_at', { ascending: false });
  },

  async create(data: Partial<Campaign>) {
    return supabase.from('campaigns').insert(data).select().single();
  },

  async update(id: string, data: Partial<Campaign>) {
    return supabase.from('campaigns').update(data).eq('id', id);
  },
};

// ─── REALTIME subscriptions ───────────────────────────────────
export const subscribeToConversations = (clinicId: string, cb: () => void) =>
  supabase
    .channel('conversations')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'conversations',
      filter: `clinic_id=eq.${clinicId}`,
    }, cb)
    .subscribe();

export const subscribeToMessages = (conversationId: string, cb: (msg: Message) => void) =>
  supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, payload => cb(payload.new as Message))
    .subscribe();
