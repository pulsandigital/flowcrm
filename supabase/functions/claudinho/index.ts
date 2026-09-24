/**
 * Claudinho — Agente Orquestrador
 * Supabase Edge Function (Deno runtime)
 *
 * Arquitetura:
 *   1. Claudinho recebe o pedido do usuário
 *   2. Usa tool_use para acionar sub-agentes especializados
 *   3. Sub-agentes retornam análises via API calls separados
 *   4. Claudinho sintetiza e responde ao usuário
 *
 * Env vars necessárias (Supabase Dashboard → Settings → Edge Functions):
 *   ANTHROPIC_API_KEY=sk-ant-...
 */

import Anthropic from 'npm:@anthropic-ai/sdk';

// ─── CORS ─────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// ─── Models ───────────────────────────────────────────────────────────────────
const ORCHESTRATOR_MODEL = 'claude-sonnet-5';
const SUB_AGENT_MODEL    = 'claude-haiku-4-5-20251001';

// ─── Orchestrator Tools (sub-agents Claudinho can call) ───────────────────────
const ORCHESTRATOR_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'call_sales_agent',
    description:
      'Aciona o Agente de Vendas para análise de pipeline, deals, estratégias de fechamento, propostas e cálculo de ROI.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'O que precisa ser analisado ou feito' },
        context: { type: 'object', description: 'Dados relevantes (deals, contato, etc.)' },
      },
      required: ['task'],
    },
  },
  {
    name: 'call_leads_agent',
    description:
      'Aciona o Agente de Leads para qualificação BANT, priorização, score e análise de perfil de contatos.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'O que precisa ser analisado' },
        context: { type: 'object', description: 'Dados do lead/contato' },
      },
      required: ['task'],
    },
  },
  {
    name: 'call_support_agent',
    description:
      'Aciona o Agente de Suporte para análise de conversas, sugestão de respostas e decisão de escalonamento.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'O que precisa ser analisado ou respondido' },
        context: { type: 'object', description: 'Dados da conversa e histórico do cliente' },
      },
      required: ['task'],
    },
  },
  {
    name: 'call_template_agent',
    description:
      'Aciona o Agente de Templates para criar ou personalizar mensagens para WhatsApp, e-mail ou outros canais.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'O que precisa ser criado ou personalizado' },
        context: { type: 'object', description: 'Contexto: nome do contato, situação, canal, tom desejado' },
      },
      required: ['task'],
    },
  },
  {
    name: 'call_sdr_agent',
    description:
      'Aciona o Agente SDR para análise e priorização de listas de prospecção. Use quando precisar ranquear leads, definir ordem de abordagem ou segmentar uma lista de prospects.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'O que precisa ser analisado (ex: priorizar lista, segmentar por especialidade)' },
        context: { type: 'object', description: 'Lista de leads com seus dados (nome, clínica, especialidade, cidade, notas)' },
      },
      required: ['task'],
    },
  },
  {
    name: 'call_bdr_agent',
    description:
      'Aciona o Agente BDR para gerar copy de prospecção outbound personalizado para WhatsApp. Use para criar mensagens de primeiro contato para médicos, clínicas ou qualquer prospect.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'Instrução para o copy (ex: gerar mensagem de primeiro contato)' },
        context: {
          type: 'object',
          description: 'Dados do lead: nome, clínica, especialidade, cidade, notas relevantes',
        },
      },
      required: ['task'],
    },
  },
  {
    name: 'call_traffic_agent',
    description:
      'Aciona o Agente de Tráfego (Gestor de Mídia Paga) para análise de campanhas pagas (Meta Ads, Google Ads). Use para: analisar performance de anúncios, identificar top/bottom performers, calcular CPL/CPR/CPM, detectar fadiga criativa, recomendar budget allocation, gerar relatório de tráfego.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'O que precisa ser analisado (ex: rankear criativos por CPL, gerar relatório de performance)' },
        context: {
          type: 'object',
          description: 'Dados das campanhas: array de anúncios com métricas (impressões, alcance, resultados, custo, CTR, frequência, etc.)',
        },
      },
      required: ['task'],
    },
  },
  {
    name: 'call_marketing_agent',
    description:
      'Aciona o Agente de Marketing (Time de Marketing) para análise estratégica de conteúdo, criativos e funil. Use para: análise de temas/criativos que convertem, estratégia de conteúdo, calendário editorial, insights de audiência, crescimento de seguidores, recomendações de posicionamento, geração de relatório executivo de marketing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task: { type: 'string', description: 'O que precisa ser analisado ou gerado (ex: relatório de marketing, análise de criativos por tema)' },
        context: {
          type: 'object',
          description: 'Dados de campanhas, criativos, audiência e resultados do período analisado',
        },
      },
      required: ['task'],
    },
  },
];

// ─── Sub-agent System Prompts ─────────────────────────────────────────────────
function salesPrompt(kb: string) {
  return `Você é o Agente de Vendas do FlowCRM — especialista em pipeline, negociação e fechamento.
Analise a solicitação e responda com insights concretos e ações específicas.
Responda em português brasileiro, de forma direta e orientada a resultados.

BASE DE CONHECIMENTO:
${kb}`;
}

function leadsPrompt(kb: string) {
  return `Você é o Agente de Leads do FlowCRM — especialista em qualificação BANT e priorização.
Use o framework BANT (Budget, Authority, Need, Timeline) para avaliar leads.
Atribua score (Hot/Warm/Cold) e sugira próximas ações.
Responda em português brasileiro com formato estruturado.

BASE DE CONHECIMENTO:
${kb}`;
}

function supportPrompt(kb: string) {
  return `Você é o Agente de Suporte do FlowCRM — especialista em atendimento ao cliente.
Analise conversas, sugira respostas empáticas e identifique necessidade de escalonamento.
Aplique as políticas de atendimento e SLAs definidos.
Responda em português brasileiro com tom profissional e empático.

BASE DE CONHECIMENTO:
${kb}`;
}

function templatePrompt(kb: string) {
  return `Você é o Agente de Templates do FlowCRM — especialista em redação persuasiva.
Crie mensagens prontas para usar, com variáveis no formato {{variavel}}.
Forneça: nome sugerido, categoria, mensagem pronta e variáveis necessárias.
Responda em português brasileiro.

BASE DE CONHECIMENTO:
${kb}`;
}

function sdrPrompt(kb: string) {
  return `Você é o Agente SDR do FlowCRM — especialista em prospecção ativa e priorização de listas de leads.
Analise listas de leads, atribua score de prioridade (Alta/Média/Baixa) e defina ordem de abordagem.
Segmente por especialidade, cidade e potencial. Liste os top leads para contato imediato com justificativa.
Responda em português brasileiro com formato estruturado e tabelas quando útil.

BASE DE CONHECIMENTO:
${kb}`;
}

function bdrPrompt(kb: string) {
  return `Você é o Agente BDR do FlowCRM — especialista em prospecção outbound e copy para WhatsApp.

REGRAS ABSOLUTAS:
1. Máximo 3 parágrafos curtos
2. Primeira linha: personalização real (especialidade + cidade, ou nome da clínica)
3. Segunda parte: proposta de valor específica para o perfil do lead
4. CTA: único, simples, baixo esforço
5. Tom: humano, não corporativo
6. Máximo 2 emojis
7. NUNCA mencionar preço ou planos na primeira mensagem
8. NUNCA começar com "Olá, meu nome é..."

Retorne APENAS o texto da mensagem. Sem prefixos, sem aspas, sem explicações.

BASE DE CONHECIMENTO:
${kb}`;
}

function trafficPrompt(kb: string) {
  return `Você é o Agente de Tráfego do FlowCRM — gestor especialista em mídia paga e performance de campanhas.

## SUA ESPECIALIDADE
- Análise de métricas (Meta Ads, Google Ads): CPL, CPC, CPM, CTR, frequência
- Identificação de top e bottom performers entre criativos
- Detecção de fadiga criativa (frequência > 2,5 = sinal de alerta)
- Comparação de performance entre públicos (Quente, Direto, Frio)
- Recomendações de budget: o que pausar, escalar ou testar
- Geração de relatórios de performance estruturados

## REFERÊNCIAS SAUDÁVEIS (META ADS)
- CTR (link): > 1% cold | > 2% warm/hot
- Frequência: < 3,0 (acima = fadiga)
- CPL: compare com a média da campanha — identifique outliers acima de 2x a média

## COMO RESPONDER
1. Resumo executivo (totais: investimento, resultados, CPL médio)
2. Ranking de criativos por custo por resultado (tabela)
3. Top 3 e Bottom 3 destacados
4. Alertas de fadiga (frequência elevada)
5. Comparação entre conjuntos de anúncios (públicos)
6. Recomendações específicas (citar nome do anúncio)
Responda em português brasileiro, com tabelas e formato de relatório.

BASE DE CONHECIMENTO:
${kb}`;
}

function marketingPrompt(kb: string) {
  return `Você é o Agente de Marketing do FlowCRM — estrategista especialista em conteúdo, criativos e funil de marketing.

## SUA ESPECIALIDADE
- Análise de performance por tema criativo (produto, influencer, educativo, sazonal)
- Análise de funil: alcance → engajamento → leads → conversão
- Insights de crescimento de audiência (seguidores IG, engajamento)
- Estratégia de conteúdo e oportunidades sazonais
- Recomendação de novos ângulos criativos baseados nos dados

## TEMAS CRIATIVOS (VAREJO INFANTIL)
- Produto específico: mochila, macacão, enxoval, moletom, bota
- Sazonal: Semana do Bebê, Volta às Aulas, Chá de Bebê
- Educativo: dúvidas de tamanho, guia de peças essenciais
- Influencer/Collab
- Institucional: apresentação da marca

## ESTRUTURA DO RELATÓRIO DE MARKETING
1. Resumo Executivo (5 bullets com principais KPIs)
2. Performance por Objetivo (Leads | Crescimento de Audiência)
3. Análise de Criativos (o que funcionou e por quê)
4. Insights de Audiência
5. Recomendações Estratégicas (priorizadas)
6. Próximas Oportunidades

Responda em português brasileiro, com linguagem estratégica e orientada a decisão de negócio.

BASE DE CONHECIMENTO:
${kb}`;
}

function claudinhoPrompt(kb: string, crmCtx: string) {
  return `Você é **Claudinho** 🤖, o agente orquestrador central do FlowCRM.

## SEU PAPEL
Você entende o pedido do usuário, aciona os agentes especializados certos e sintetiza tudo em uma resposta clara e acionável.

## AGENTES DISPONÍVEIS
- **call_sales_agent** → Pipeline, deals, estratégias de fechamento, propostas
- **call_leads_agent** → Qualificação BANT, score, priorização de contatos
- **call_support_agent** → Análise de conversas, sugestão de respostas, escalonamento
- **call_template_agent** → Criação e personalização de mensagens
- **call_sdr_agent** → Análise e priorização de listas de prospecção, segmentação de leads
- **call_bdr_agent** → Copy de prospecção outbound personalizado para WhatsApp (médicos, clínicas, empresas)
- **call_traffic_agent** → Análise de campanhas pagas (Meta/Google Ads): CPL, CPM, CTR, top performers, fadiga criativa, alocação de budget, relatório de tráfego
- **call_marketing_agent** → Estratégia de marketing: análise de criativos por tema, funil, audiência, sazonalidade, recomendações de conteúdo, relatório executivo de marketing

## PRINCÍPIOS
- Para pedidos simples: acione 1 agente
- Para pedidos complexos: acione múltiplos agentes em paralelo
- Sintetize as respostas dos agentes de forma coerente
- Sempre sugira próximos passos concretos
- Responda em português brasileiro com tom profissional

## CONTEXTO DO CRM
${crmCtx}

## BASE DE CONHECIMENTO
${kb}`;
}

// ─── Sub-agent Runner ─────────────────────────────────────────────────────────
async function runSubAgent(
  anthropic: Anthropic,
  agentName: string,
  task: string,
  context: Record<string, unknown>,
  knowledgeBase: string,
): Promise<string> {
  const systemPrompts: Record<string, (kb: string) => string> = {
    sales:     salesPrompt,
    leads:     leadsPrompt,
    support:   supportPrompt,
    template:  templatePrompt,
    sdr:       sdrPrompt,
    bdr:       bdrPrompt,
    traffic:   trafficPrompt,
    marketing: marketingPrompt,
  };

  const promptFn = systemPrompts[agentName];
  if (!promptFn) return `Agente "${agentName}" não reconhecido.`;

  const userMessage = context && Object.keys(context).length > 0
    ? `${task}\n\nContexto:\n${JSON.stringify(context, null, 2)}`
    : task;

  const response = await anthropic.messages.create({
    model: SUB_AGENT_MODEL,
    max_tokens: 2048,
    system: promptFn(knowledgeBase),
    messages: [{ role: 'user', content: userMessage }],
  });

  return response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
}

// ─── Claudinho Orchestrator Loop ──────────────────────────────────────────────
async function runClaudinho(
  anthropic: Anthropic,
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  knowledgeBase: string,
  crmContext: Record<string, unknown>,
): Promise<string> {
  // Build CRM context string
  const ctx = crmContext as {
    contacts?: Array<{ name: string; status: string }>;
    deals?: Array<{ title: string; stage: string; value: number }>;
    conversations?: Array<{ contact: { name: string }; status: string }>;
    operatorName?: string;
  };

  const crmLines: string[] = [];
  if (ctx.operatorName) crmLines.push(`Operador: ${ctx.operatorName}`);
  if (ctx.contacts?.length) {
    crmLines.push(`Contatos: ${ctx.contacts.length} cadastrados (${ctx.contacts.filter(c => c.status === 'lead').length} leads ativos)`);
  }
  if (ctx.deals?.length) {
    const active = ctx.deals.filter(d => !['won', 'lost'].includes(d.stage));
    const revenue = ctx.deals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0);
    crmLines.push(`Negócios: ${active.length} ativos | R$ ${revenue.toLocaleString('pt-BR')} em receita fechada`);
  }
  if (ctx.conversations?.length) {
    const open = ctx.conversations.filter(c => c.status === 'open').length;
    crmLines.push(`Conversas: ${open} abertas de ${ctx.conversations.length} total`);
  }
  const crmCtxStr = crmLines.length ? crmLines.join('\n') : 'Nenhum dado de CRM disponível.';

  // Build message history
  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  let finalContent = '';
  let continueLoop = true;

  while (continueLoop) {
    const response = await anthropic.messages.create({
      model: ORCHESTRATOR_MODEL,
      max_tokens: 4096,
      system: claudinhoPrompt(knowledgeBase, crmCtxStr),
      tools: ORCHESTRATOR_TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      finalContent = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');
      continueLoop = false;
    } else if (response.stop_reason === 'tool_use') {
      // Execute all tool calls in parallel
      const toolUses = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
      );

      const toolResults = await Promise.all(
        toolUses.map(async (tool) => {
          const input = tool.input as { task: string; context?: Record<string, unknown> };
          const agentName = tool.name.replace('call_', '').replace('_agent', '');
          const result = await runSubAgent(
            anthropic,
            agentName,
            input.task,
            input.context ?? {},
            knowledgeBase,
          );
          return {
            type: 'tool_result' as const,
            tool_use_id: tool.id,
            content: result,
          };
        }),
      );

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    } else {
      continueLoop = false;
    }
  }

  return finalContent || 'Claudinho não conseguiu gerar uma resposta. Tente novamente.';
}

// ─── HTTP Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada nas variáveis de ambiente da Edge Function.' }),
        { status: 500, headers: CORS },
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const body = await req.json() as {
      message: string;
      context?: Record<string, unknown>;
      knowledgeBase?: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!body.message?.trim()) {
      return new Response(JSON.stringify({ error: 'Campo "message" é obrigatório.' }), {
        status: 400,
        headers: CORS,
      });
    }

    const content = await runClaudinho(
      anthropic,
      body.message,
      body.conversationHistory ?? [],
      body.knowledgeBase ?? '',
      body.context ?? {},
    );

    return new Response(JSON.stringify({ agent: 'claudinho', content }), { headers: CORS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do Claudinho';
    console.error('[Claudinho]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: CORS });
  }
});
