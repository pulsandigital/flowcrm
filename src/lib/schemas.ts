import { z } from 'zod';

export const contactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.union([z.string().email('Email inválido'), z.literal('')]),
  phone: z.string(),
  company: z.string(),
  status: z.enum(['lead', 'active', 'inactive']),
  assignee: z.string(),
  tags: z.array(z.string()),
});
export type ContactFormData = z.infer<typeof contactSchema>;

export const dealSchema = z.object({
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  contactName: z.string().min(2, 'Nome do contato obrigatório'),
  company: z.string().optional().default(''),
  value: z.coerce.number().min(0, 'Valor não pode ser negativo'),
  stage: z.enum(['new', 'qualifying', 'proposal', 'negotiation', 'won', 'lost']),
  assignee: z.string().optional().default(''),
  probability: z.coerce.number().min(0).max(100).optional().default(15),
  channelId: z.string().optional().default(''),
});
export type DealFormData = z.infer<typeof dealSchema>;

export const channelSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  number: z.string().min(10, 'Número de telefone inválido'),
  color: z.string().optional().default('#7c3aed'),
  assignee: z.string().optional().default(''),
});
export type ChannelFormData = z.infer<typeof channelSchema>;

export const templateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  content: z.string().min(5, 'Conteúdo muito curto'),
  category: z.enum(['welcome', 'followup', 'proposal', 'billing', 'custom']),
});
export type TemplateFormData = z.infer<typeof templateSchema>;

export const messageFlowSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional().default(''),
  trigger: z.string().min(1, 'Selecione um gatilho'),
});
export type MessageFlowFormData = z.infer<typeof messageFlowSchema>;
