export type Page =
  | 'dashboard'
  | 'pipeline'
  | 'contacts'
  | 'chat'
  | 'templates'
  | 'flow'
  | 'reports'
  | 'settings';

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
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'contact' | 'bot';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
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
  tags: string[];
  inFlow: boolean;
  messages: ChatMessage[];
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
