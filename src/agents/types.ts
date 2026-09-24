// ─── Agent Types ──────────────────────────────────────────────────────────────

export type AgentRole = 'claudinho' | 'sales' | 'leads' | 'support' | 'template' | 'sdr' | 'bdr' | 'traffic' | 'marketing';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** CRM data passed to agents for context-aware responses */
export interface CRMContext {
  contacts?: Array<{ id: string; name: string; company: string; status: string; assignee: string }>;
  deals?: Array<{ id: string; title: string; contactName: string; value: number; stage: string; assignee: string }>;
  conversations?: Array<{ id: string; contact: { name: string }; status: string; channel: string; lastMessage: string }>;
  templates?: Array<{ id: string; name: string; category: string; content: string }>;
  channels?: Array<{ id: string; name: string; number: string; status: string }>;
  /** Current user/operator name */
  operatorName?: string;
}

/** Request body sent to the Claudinho Edge Function */
export interface ClaudinhoRequest {
  message: string;
  context: CRMContext;
  knowledgeBase: string;
  conversationHistory: AgentMessage[];
}

/** Response from any agent */
export interface AgentResponse {
  agent: AgentRole;
  content: string;
  /** Suggested CRM actions the operator can execute */
  suggestedActions?: AgentAction[];
}

/** A concrete action the agent recommends performing in the CRM */
export interface AgentAction {
  type:
    | 'create_contact'
    | 'create_deal'
    | 'update_deal_stage'
    | 'send_message'
    | 'suggest_template'
    | 'schedule_followup'
    | 'send_prospecting_message'
    | 'prioritize_leads';
  label: string;
  payload: Record<string, unknown>;
}

/** A prospect lead imported from a spreadsheet */
export interface ProspectLead {
  id: string;
  nome: string;
  clinica: string;
  telefone: string;
  whatsapp: string;
  especialidade: string;
  cidade: string;
  estagio: string;
  dataContato: string;
  proximoFollowup: string;
  notas: string;
  responsavel: string;
  copyStatus: 'pendente' | 'gerando' | 'aguardando_aprovacao' | 'aprovado' | 'enviando' | 'enviado' | 'erro';
  generatedCopy: string;
  approvedCopy: string;
  sdrPriority: 'alta' | 'media' | 'baixa' | '';
}

/** Internal sub-agent invocation (used by Claudinho's tool loop) */
export interface SubAgentCall {
  agentName: Exclude<AgentRole, 'claudinho'>;
  task: string;
  context: Record<string, unknown>;
}
