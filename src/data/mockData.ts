import type { Contact, Deal, Conversation, MessageTemplate, MessageFlow } from '../types';

export const TEAM_MEMBERS = ['Ana Lima', 'Carlos Souza', 'Beatriz Costa', 'Rafael Mendes'];

export const contacts: Contact[] = [
  {
    id: 'c1', name: 'Mariana Oliveira', company: 'Tech Solutions Ltda', phone: '(11) 99876-5432',
    email: 'mariana@techsolutions.com.br', tags: ['VIP', 'Indicação'], status: 'active',
    assignee: 'Ana Lima', createdAt: '2024-01-15', lastActivity: '2024-03-10', avatar: 'MO',
  },
  {
    id: 'c2', name: 'João Pedro Santos', company: 'StartUp Digital', phone: '(21) 98765-1234',
    email: 'joao@startupdigital.com', tags: ['Quente'], status: 'lead',
    assignee: 'Carlos Souza', createdAt: '2024-02-20', lastActivity: '2024-03-12', avatar: 'JP',
  },
  {
    id: 'c3', name: 'Fernanda Rocha', company: 'Rocha Consultoria', phone: '(31) 97654-3210',
    email: 'fernanda@rochaconsult.com.br', tags: ['Follow-up'], status: 'lead',
    assignee: 'Beatriz Costa', createdAt: '2024-02-28', lastActivity: '2024-03-11', avatar: 'FR',
  },
  {
    id: 'c4', name: 'Ricardo Alves', company: 'Alves & Associados', phone: '(41) 96543-2109',
    email: 'ricardo@alvesassoc.com', tags: ['Contrato Ativo'], status: 'active',
    assignee: 'Rafael Mendes', createdAt: '2023-11-05', lastActivity: '2024-03-09', avatar: 'RA',
  },
  {
    id: 'c5', name: 'Camila Ferreira', company: 'Ferreira Marketing', phone: '(51) 95432-1098',
    email: 'camila@ferreiramarketing.com', tags: ['Novo'], status: 'lead',
    assignee: 'Ana Lima', createdAt: '2024-03-01', lastActivity: '2024-03-13', avatar: 'CF',
  },
  {
    id: 'c6', name: 'Thiago Barbosa', company: 'Barbosa Group', phone: '(61) 94321-0987',
    email: 'thiago@barbosagroup.com.br', tags: ['VIP', 'Renovação'], status: 'active',
    assignee: 'Carlos Souza', createdAt: '2023-09-18', lastActivity: '2024-03-08', avatar: 'TB',
  },
  {
    id: 'c7', name: 'Letícia Nunes', company: 'Nunes E-commerce', phone: '(71) 93210-9876',
    email: 'leticia@nunes-ecom.com', tags: ['Frio'], status: 'inactive',
    assignee: 'Beatriz Costa', createdAt: '2024-01-22', lastActivity: '2024-02-15', avatar: 'LN',
  },
  {
    id: 'c8', name: 'Bruno Castro', company: 'Castro Engenharia', phone: '(81) 92109-8765',
    email: 'bruno@castroeng.com.br', tags: ['Proposta Enviada'], status: 'lead',
    assignee: 'Rafael Mendes', createdAt: '2024-02-10', lastActivity: '2024-03-12', avatar: 'BC',
  },
];

export const deals: Deal[] = [
  { id: 'd1', title: 'Gestão de Redes Sociais', contactId: 'c1', contactName: 'Mariana Oliveira', company: 'Tech Solutions Ltda', value: 4800, stage: 'negotiation', assignee: 'Ana Lima', probability: 75, createdAt: '2024-02-01', updatedAt: '2024-03-10' },
  { id: 'd2', title: 'Criação de Site Institucional', contactId: 'c2', contactName: 'João Pedro Santos', company: 'StartUp Digital', value: 8500, stage: 'proposal', assignee: 'Carlos Souza', probability: 50, createdAt: '2024-02-15', updatedAt: '2024-03-12' },
  { id: 'd3', title: 'Consultoria de Marketing Digital', contactId: 'c3', contactName: 'Fernanda Rocha', company: 'Rocha Consultoria', value: 3200, stage: 'qualifying', assignee: 'Beatriz Costa', probability: 30, createdAt: '2024-03-01', updatedAt: '2024-03-11' },
  { id: 'd4', title: 'Campanha Google Ads', contactId: 'c4', contactName: 'Ricardo Alves', company: 'Alves & Associados', value: 6000, stage: 'won', assignee: 'Rafael Mendes', probability: 100, createdAt: '2024-01-10', updatedAt: '2024-03-09' },
  { id: 'd5', title: 'Branding Completo', contactId: 'c5', contactName: 'Camila Ferreira', company: 'Ferreira Marketing', value: 12000, stage: 'new', assignee: 'Ana Lima', probability: 15, createdAt: '2024-03-01', updatedAt: '2024-03-13' },
  { id: 'd6', title: 'Email Marketing Mensal', contactId: 'c6', contactName: 'Thiago Barbosa', company: 'Barbosa Group', value: 2400, stage: 'negotiation', assignee: 'Carlos Souza', probability: 80, createdAt: '2024-02-20', updatedAt: '2024-03-08' },
  { id: 'd7', title: 'SEO e Conteúdo', contactId: 'c7', contactName: 'Letícia Nunes', company: 'Nunes E-commerce', value: 3600, stage: 'lost', assignee: 'Beatriz Costa', probability: 0, createdAt: '2024-01-25', updatedAt: '2024-02-28' },
  { id: 'd8', title: 'Tráfego Pago Meta + Google', contactId: 'c8', contactName: 'Bruno Castro', company: 'Castro Engenharia', value: 5500, stage: 'proposal', assignee: 'Rafael Mendes', probability: 45, createdAt: '2024-02-12', updatedAt: '2024-03-12' },
  { id: 'd9', title: 'Automação de Marketing', contactId: 'c1', contactName: 'Mariana Oliveira', company: 'Tech Solutions Ltda', value: 7200, stage: 'qualifying', assignee: 'Ana Lima', probability: 35, createdAt: '2024-03-05', updatedAt: '2024-03-13' },
  { id: 'd10', title: 'Produção de Vídeos', contactId: 'c4', contactName: 'Ricardo Alves', company: 'Alves & Associados', value: 9800, stage: 'new', assignee: 'Rafael Mendes', probability: 20, createdAt: '2024-03-10', updatedAt: '2024-03-13' },
];

const makeMessages = (contactName: string) => [
  { id: 'm1', content: `Olá! Gostaria de saber mais sobre os serviços de vocês.`, sender: 'contact' as const, timestamp: '14:20', status: 'read' as const },
  { id: 'm2', content: `Olá, ${contactName.split(' ')[0]}! Tudo bem? Claro, ficarei feliz em ajudar! Qual serviço te interessa?`, sender: 'user' as const, timestamp: '14:22', status: 'read' as const },
  { id: 'm3', content: 'Estou pensando em gestão de redes sociais. Qual é o valor?', sender: 'contact' as const, timestamp: '14:25', status: 'read' as const },
  { id: 'm4', content: 'Nossos planos começam a partir de R$ 1.500/mês. Posso te enviar uma proposta completa. Qual o melhor horário para uma call?', sender: 'user' as const, timestamp: '14:27', status: 'delivered' as const },
];

export const conversations: Conversation[] = [
  { id: 'cv1', contact: contacts[0], lastMessage: 'Nossos planos começam a partir de R$ 1.500/mês...', lastMessageTime: '14:27', unreadCount: 0, status: 'open', assignee: 'Ana Lima', channel: 'whatsapp', tags: ['Quente', 'VIP'], inFlow: false, messages: makeMessages(contacts[0].name) },
  { id: 'cv2', contact: contacts[1], lastMessage: 'Oi, vi o post de vocês no Instagram e me interessei!', lastMessageTime: '13:45', unreadCount: 3, status: 'waiting', assignee: 'Carlos Souza', channel: 'instagram', tags: ['Novo Lead'], inFlow: true, messages: [{ id: 'm1', content: 'Oi, vi o post de vocês no Instagram e me interessei!', sender: 'contact', timestamp: '13:45', status: 'delivered' }] },
  { id: 'cv3', contact: contacts[2], lastMessage: 'Perfeito! Aguardo a proposta por email.', lastMessageTime: 'Ontem', unreadCount: 1, status: 'open', assignee: 'Beatriz Costa', channel: 'whatsapp', tags: ['Follow-up'], inFlow: false, messages: [{ id: 'm1', content: 'Perfeito! Aguardo a proposta por email.', sender: 'contact', timestamp: 'Ontem', status: 'read' }] },
  { id: 'cv4', contact: contacts[3], lastMessage: 'Ótimo trabalho este mês! Renovo sim.', lastMessageTime: 'Ontem', unreadCount: 0, status: 'resolved', assignee: 'Rafael Mendes', channel: 'whatsapp', tags: ['Renovação', 'VIP'], inFlow: false, messages: [{ id: 'm1', content: 'Ótimo trabalho este mês! Renovo sim.', sender: 'contact', timestamp: 'Ontem', status: 'read' }] },
  { id: 'cv5', contact: contacts[4], lastMessage: 'Qual o prazo para entrega do branding?', lastMessageTime: '10:15', unreadCount: 2, status: 'open', assignee: 'Ana Lima', channel: 'webchat', tags: ['Novo'], inFlow: true, messages: [{ id: 'm1', content: 'Qual o prazo para entrega do branding?', sender: 'contact', timestamp: '10:15', status: 'delivered' }] },
  { id: 'cv6', contact: contacts[5], lastMessage: 'Vamos marcar uma reunião na próxima semana?', lastMessageTime: '09:30', unreadCount: 0, status: 'waiting', assignee: 'Carlos Souza', channel: 'whatsapp', tags: ['VIP'], inFlow: false, messages: [{ id: 'm1', content: 'Vamos marcar uma reunião na próxima semana?', sender: 'contact', timestamp: '09:30', status: 'read' }] },
];

export const templates: MessageTemplate[] = [
  { id: 't1', name: 'Boas-vindas Padrão', category: 'welcome', content: 'Olá, {{nome}}! 👋 Seja bem-vindo(a) à nossa agência! Sou {{atendente}} e estou aqui para te ajudar. Como posso te auxiliar hoje?', variables: ['nome', 'atendente'], usageCount: 142, createdAt: '2024-01-10' },
  { id: 't2', name: 'Follow-up 24h', category: 'followup', content: 'Oi, {{nome}}! Tudo bem? Estou entrando em contato para saber se você teve a oportunidade de analisar nossa proposta de {{servico}}. Fico à disposição para esclarecer qualquer dúvida! 😊', variables: ['nome', 'servico'], usageCount: 87, createdAt: '2024-01-15' },
  { id: 't3', name: 'Envio de Proposta', category: 'proposal', content: 'Olá, {{nome}}! 🎯 Conforme conversamos, segue em anexo a proposta personalizada para {{empresa}}.\n\n✅ Serviço: {{servico}}\n💰 Investimento: {{valor}}\n📅 Prazo: {{prazo}}\n\nEstou disponível para uma call de apresentação. Qual o melhor horário para você?', variables: ['nome', 'empresa', 'servico', 'valor', 'prazo'], usageCount: 56, createdAt: '2024-01-20' },
  { id: 't4', name: 'Cobrança Amigável', category: 'billing', content: 'Olá, {{nome}}! Espero que esteja tudo bem. 😊 Passando para lembrar que temos uma fatura referente a {{mes}} no valor de {{valor}} com vencimento em {{vencimento}}. Precisa de alguma ajuda?', variables: ['nome', 'mes', 'valor', 'vencimento'], usageCount: 34, createdAt: '2024-02-01' },
  { id: 't5', name: 'Reativação de Lead', category: 'followup', content: 'Oi, {{nome}}! Faz um tempo que não conversamos e queria retomar o contato. 🚀 Temos novidades que podem ser perfeitas para {{empresa}}. Posso te apresentar?', variables: ['nome', 'empresa'], usageCount: 29, createdAt: '2024-02-10' },
  { id: 't6', name: 'Confirmação de Reunião', category: 'custom', content: 'Olá, {{nome}}! ✅ Confirmando nossa reunião:\n\n📅 Data: {{data}}\n⏰ Horário: {{horario}}\n📍 Local/Link: {{local}}\n\nAté lá! Qualquer dúvida, estou à disposição.', variables: ['nome', 'data', 'horario', 'local'], usageCount: 68, createdAt: '2024-02-15' },
];

export const messageFlows: MessageFlow[] = [
  {
    id: 'f1', name: 'Boas-vindas Automáticas', description: 'Fluxo inicial para novos contatos via WhatsApp', isActive: true, trigger: 'Primeira mensagem recebida', leadsCount: 234, createdAt: '2024-01-05',
    steps: [
      { id: 's1', type: 'message', label: 'Boas-vindas', content: 'Olá! 👋 Obrigado por entrar em contato com nossa agência. Em breve um de nossos especialistas irá te atender!', nextStepId: 's2' },
      { id: 's2', type: 'wait', label: 'Aguardar', waitTime: 30, nextStepId: 's3' },
      { id: 's3', type: 'message', label: 'Menu de Opções', content: 'Enquanto isso, me conta: o que você está buscando?\n\n1️⃣ Gestão de Redes Sociais\n2️⃣ Criação de Site\n3️⃣ Tráfego Pago\n4️⃣ Outros serviços', nextStepId: 's4' },
      { id: 's4', type: 'condition', label: 'Verificar Resposta', condition: 'Resposta contém número', nextStepId: 's5', nextStepElseId: 's5' },
      { id: 's5', type: 'action', label: 'Transferir para Humano', content: 'Transferindo para atendente disponível...', nextStepId: 's6' },
      { id: 's6', type: 'end', label: 'Fim do Fluxo' },
    ],
  },
  {
    id: 'f2', name: 'Qualificação de Lead', description: 'Coleta informações do lead antes do atendimento', isActive: true, trigger: 'Lead criado manualmente', leadsCount: 89, createdAt: '2024-01-20',
    steps: [
      { id: 's1', type: 'message', label: 'Pergunta Empresa', content: 'Olá! Para te atender melhor, poderia me dizer o nome da sua empresa?', nextStepId: 's2' },
      { id: 's2', type: 'wait', label: 'Aguardar Resposta', waitTime: 0, nextStepId: 's3' },
      { id: 's3', type: 'message', label: 'Pergunta Serviço', content: 'Perfeito! E qual serviço você tem interesse?', nextStepId: 's4' },
      { id: 's4', type: 'wait', label: 'Aguardar Resposta', waitTime: 0, nextStepId: 's5' },
      { id: 's5', type: 'action', label: 'Salvar Dados', content: 'Salvando informações no CRM...', nextStepId: 's6' },
      { id: 's6', type: 'end', label: 'Fim do Fluxo' },
    ],
  },
  {
    id: 'f3', name: 'Follow-up Pós-Proposta', description: 'Acompanhamento automático após envio de proposta', isActive: false, trigger: 'Tag "Proposta Enviada" adicionada', leadsCount: 45, createdAt: '2024-02-01',
    steps: [
      { id: 's1', type: 'wait', label: 'Aguardar 24h', waitTime: 1440, nextStepId: 's2' },
      { id: 's2', type: 'message', label: 'Follow-up D+1', content: 'Oi! Tudo bem? 😊 Passando para saber se teve a chance de ver nossa proposta. Posso esclarecer alguma dúvida?', nextStepId: 's3' },
      { id: 's3', type: 'condition', label: 'Respondeu?', condition: 'Contato respondeu', nextStepId: 's6', nextStepElseId: 's4' },
      { id: 's4', type: 'wait', label: 'Aguardar 48h', waitTime: 2880, nextStepId: 's5' },
      { id: 's5', type: 'message', label: 'Follow-up D+3', content: 'Olá, {{nome}}! 🚀 Ainda pensando? Nossa proposta tem validade. Posso reservar uma call rápida de 15 minutos para conversar?', nextStepId: 's6' },
      { id: 's6', type: 'end', label: 'Fim do Fluxo' },
    ],
  },
];

export const monthlyData = [
  { month: 'Set', leads: 28, conversions: 8, revenue: 24000 },
  { month: 'Out', leads: 35, conversions: 11, revenue: 31500 },
  { month: 'Nov', leads: 42, conversions: 14, revenue: 38200 },
  { month: 'Dez', leads: 31, conversions: 9, revenue: 27800 },
  { month: 'Jan', leads: 48, conversions: 15, revenue: 44500 },
  { month: 'Fev', leads: 53, conversions: 18, revenue: 52100 },
  { month: 'Mar', leads: 61, conversions: 21, revenue: 63400 },
];

export const funnelData = [
  { stage: 'Novo Lead', count: 61, color: '#8b5cf6' },
  { stage: 'Qualificando', count: 38, color: '#6d28d9' },
  { stage: 'Proposta', count: 22, color: '#5b21b6' },
  { stage: 'Negociação', count: 14, color: '#4c1d95' },
  { stage: 'Ganho', count: 9, color: '#10b981' },
];
