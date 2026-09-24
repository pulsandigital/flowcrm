export type Page =
  | 'dashboard'
  | 'pipeline'
  | 'contacts'
  | 'chat'
  | 'templates'
  | 'flow'
  | 'reports'
  | 'channels'
  | 'settings';

export type ChannelStatus = 'connected' | 'disconnected' | 'connecting';
export type LeadSource = 'meta_ads' | 'instagram' | 'google_ads' | 'google_organic' | 'instagram_bio' | 'referral' | 'other';
export type LossReason = 'price' | 'competitor' | 'no_budget' | 'no_interest' | 'no_response' | 'timing' | 'other';
export type MessageType = 'text' | 'image' | 'audio' | 'internal';

export interface WhatsAppChannel {
  id: string;
  name: string;
  number: string;
  status: ChannelStatus;
  color: string;
  assignee: string;
  flowId?: string;
  leadsCount: number;
  messagesCount: number;
  createdAt: string;
}

export type DealStage =
  | 'new'
  | 'qualifying'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export type ContactStatus = 'lead' | 'active' | 'inactive';
export type Channel = 'whatsapp' | 'instagram' | 'email' | 'webchat';
export type ConvStatus = 'open' | 'waiting' | 'resolved';
export type TemplateCategory = 'welcome' | 'followup' | 'proposal' | 'billing' | 'custom';
export type FlowStepType = 'message' | 'wait' | 'condition' | 'action' | 'end';

export interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  tags: string[];
  status: ContactStatus;
  assignee: string;
  createdAt: string;
  lastActivity: string;
  avatar: string;
}

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  contactName: string;
  company: string;
  value: number;
  stage: DealStage;
  assignee: string;
  probability: number;
  createdAt: string;
  updatedAt: string;
  channelId: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'contact' | 'bot' | 'internal';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type?: MessageType;
  imageUrl?: string;
  isDeleted?: boolean;
  isEdited?: boolean;
  scheduledFor?: string;
  internalAuthor?: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: ConvStatus;
  assignee: string;
  channel: Channel;
  channelId: string;
  tags: string[];
  inFlow: boolean;
  messages: ChatMessage[];
  leadSource?: LeadSource;
  lossReason?: LossReason;
  lossReasonNote?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  content: string;
  variables: string[];
  usageCount: number;
  createdAt: string;
}

export interface FlowStep {
  id: string;
  type: FlowStepType;
  label: string;
  content?: string;
  waitTime?: number;
  condition?: string;
  nextStepId?: string;
  nextStepElseId?: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  cpf: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  specialty: string;
  plan: string;
  planFee?: number;
  professional: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  channel: string;
  temperature: string;
  stage: string;
  origin: string;
  tags: string[];
  assignee: string;
  responsible?: string;
  secondaryResponsible?: string;
  flowOwner?: string;
  status?: string;
  city?: string;
  specialty?: string;
  score?: number;
  notes: string;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
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
}

export interface MessageFlow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  trigger: string;
  steps: FlowStep[];
  leadsCount: number;
  createdAt: string;
}
