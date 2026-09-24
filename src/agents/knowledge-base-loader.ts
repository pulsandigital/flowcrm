// ─── Knowledge Base Loader ────────────────────────────────────────────────────
// Imports all .md files as raw strings (Vite ?raw feature — zero config needed).
// Edit the .md files in src/knowledge-base/ to teach the agents about your company.

import sobreEmpresa from '../knowledge-base/empresa/sobre-a-empresa.md?raw';
import produtosServicos from '../knowledge-base/empresa/produtos-e-servicos.md?raw';
import precos from '../knowledge-base/empresa/precos.md?raw';
import faq from '../knowledge-base/empresa/perguntas-frequentes.md?raw';
import playbookVendas from '../knowledge-base/vendas/playbook-de-vendas.md?raw';
import qualificacaoLeads from '../knowledge-base/vendas/qualificacao-de-leads.md?raw';
import objecoesRespostas from '../knowledge-base/vendas/objecoes-e-respostas.md?raw';
import politicasAtendimento from '../knowledge-base/suporte/politicas-de-atendimento.md?raw';

function section(title: string, content: string) {
  return `## ${title}\n\n${content.trim()}`;
}

/** Full knowledge base — used by Claudinho and for general context */
export function loadKnowledgeBase(): string {
  return [
    '# BASE DE CONHECIMENTO',
    section('EMPRESA', sobreEmpresa),
    section('PRODUTOS E SERVIÇOS', produtosServicos),
    section('PREÇOS E PLANOS', precos),
    section('PERGUNTAS FREQUENTES', faq),
    section('PLAYBOOK DE VENDAS', playbookVendas),
    section('QUALIFICAÇÃO DE LEADS', qualificacaoLeads),
    section('OBJEÇÕES E RESPOSTAS', objecoesRespostas),
    section('POLÍTICAS DE ATENDIMENTO', politicasAtendimento),
  ].join('\n\n---\n\n');
}

/** Focused KB for the Sales Agent */
export function loadSalesKnowledge(): string {
  return [
    section('PRODUTOS E PREÇOS', produtosServicos + '\n\n' + precos),
    section('PLAYBOOK DE VENDAS', playbookVendas),
    section('QUALIFICAÇÃO DE LEADS', qualificacaoLeads),
    section('OBJEÇÕES E RESPOSTAS', objecoesRespostas),
  ].join('\n\n---\n\n');
}

/** Focused KB for the Leads Agent */
export function loadLeadsKnowledge(): string {
  return [
    section('SOBRE A EMPRESA', sobreEmpresa),
    section('QUALIFICAÇÃO DE LEADS', qualificacaoLeads),
    section('PLAYBOOK DE VENDAS', playbookVendas),
  ].join('\n\n---\n\n');
}

/** Focused KB for the Support Agent */
export function loadSupportKnowledge(): string {
  return [
    section('SOBRE A EMPRESA', sobreEmpresa),
    section('PRODUTOS E SERVIÇOS', produtosServicos),
    section('PERGUNTAS FREQUENTES', faq),
    section('POLÍTICAS DE ATENDIMENTO', politicasAtendimento),
  ].join('\n\n---\n\n');
}

/** Focused KB for the Template Agent */
export function loadTemplateKnowledge(): string {
  return [
    section('EMPRESA E PRODUTOS', sobreEmpresa + '\n\n' + produtosServicos),
    section('PLAYBOOK DE VENDAS', playbookVendas),
    section('OBJEÇÕES E RESPOSTAS', objecoesRespostas),
  ].join('\n\n---\n\n');
}
