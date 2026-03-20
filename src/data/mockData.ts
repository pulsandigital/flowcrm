import type { Contact, Deal, Conversation, MessageTemplate, WhatsAppChannel, MessageFlow } from '../types';

export const TEAM_MEMBERS = ['Ana Lima', 'Carlos Souza', 'Beatriz Costa', 'Rafael Mendes'];

// All live data is stored in Supabase. These are empty defaults.
export const whatsappChannels: WhatsAppChannel[] = [];
export const contacts: Contact[] = [];
export const deals: Deal[] = [];
export const conversations: Conversation[] = [];
export const templates: MessageTemplate[] = [];

export const messageFlows: MessageFlow[] = [
  {
    id: 'f1', name: 'Boas-vindas Automáticas', description: 'Fluxo inicial para novos contatos via WhatsApp', isActive: true, trigger: 'Primeira mensagem recebida', leadsCount: 0, createdAt: new Date().toISOString().split('T')[0],
    steps: [
      { id: 's1', type: 'message', label: 'Boas-vindas', content: 'Olá! 👋 Obrigado por entrar em contato. Em breve um especialista irá te atender!', nextStepId: 's2' },
      { id: 's2', type: 'wait', label: 'Aguardar 30s', waitTime: 30, nextStepId: 's3' },
      { id: 's3', type: 'action', label: 'Transferir para Humano', content: 'Transferindo para atendente disponível...', nextStepId: 's4' },
      { id: 's4', type: 'end', label: 'Fim do Fluxo' },
    ],
  },
];

export const monthlyData = [
  { month: 'Out', leads: 0, conversions: 0, revenue: 0 },
  { month: 'Nov', leads: 0, conversions: 0, revenue: 0 },
  { month: 'Dez', leads: 0, conversions: 0, revenue: 0 },
  { month: 'Jan', leads: 0, conversions: 0, revenue: 0 },
  { month: 'Fev', leads: 0, conversions: 0, revenue: 0 },
  { month: 'Mar', leads: 0, conversions: 0, revenue: 0 },
];

export const funnelData = [
  { stage: 'Novo Lead', count: 0, color: '#8b5cf6' },
  { stage: 'Qualificando', count: 0, color: '#6d28d9' },
  { stage: 'Proposta', count: 0, color: '#5b21b6' },
  { stage: 'Negociação', count: 0, color: '#4c1d95' },
  { stage: 'Ganho', count: 0, color: '#10b981' },
];
