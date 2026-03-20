import { supabase } from './supabase';
import type { Contact, Deal, Conversation, ChatMessage, WhatsAppChannel, MessageTemplate } from '../types';

// ── WhatsApp Channels ─────────────────────────────────────────────────────────
export const channelsDb = {
  async getAll(): Promise<WhatsAppChannel[]> {
    const { data } = await supabase.from('whatsapp_channels').select('*').order('created_at');
    return (data ?? []).map(r => ({
      id: r.id, name: r.name, number: r.number ?? '',
      status: r.status, color: r.color, assignee: r.assignee ?? '',
      leadsCount: r.leads_count ?? 0, messagesCount: r.messages_count ?? 0,
      createdAt: r.created_at,
    }));
  },
  async upsert(ch: WhatsAppChannel) {
    await supabase.from('whatsapp_channels').upsert({
      id: ch.id, name: ch.name, number: ch.number, status: ch.status,
      color: ch.color, assignee: ch.assignee,
      leads_count: ch.leadsCount, messages_count: ch.messagesCount,
      created_at: ch.createdAt,
    });
  },
  async updateStatus(id: string, status: string) {
    await supabase.from('whatsapp_channels').update({ status }).eq('id', id);
  },
  async delete(id: string) {
    await supabase.from('whatsapp_channels').delete().eq('id', id);
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
    const { data } = await supabase
      .from('conversations').select('*, messages(*)')
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
    await supabase.from('conversations').upsert({
      id: c.id, contact: c.contact, status: c.status,
      channel: c.channel, channel_id: c.channelId,
      last_message: c.lastMessage, last_message_time: c.lastMessageTime,
      unread_count: c.unreadCount, tags: c.tags,
      assignee: c.assignee, lead_source: c.leadSource,
      loss_reason: c.lossReason, loss_reason_note: c.lossReasonNote,
    });
  },
  async updateField(id: string, field: string, value: any) {
    await supabase.from('conversations').update({ [field]: value }).eq('id', id);
  },
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messagesDb = {
  async insert(convId: string, msg: ChatMessage) {
    await supabase.from('messages').insert({
      id: msg.id, conversation_id: convId, content: msg.content,
      sender: msg.sender, timestamp: msg.timestamp, status: msg.status ?? 'sent',
      type: msg.type ?? 'text', is_deleted: msg.isDeleted ?? false,
      is_edited: msg.isEdited ?? false, internal_author: msg.internalAuthor,
    });
  },
  async update(id: string, fields: Partial<{ content: string; is_deleted: boolean; is_edited: boolean }>) {
    await supabase.from('messages').update(fields).eq('id', id);
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
