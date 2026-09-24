# Guia: Como Adicionar Conteúdo à Base de Conhecimento

Esta pasta contém todo o conhecimento que os agentes de IA do FlowCRM usam para responder com inteligência sobre sua empresa.

## Estrutura das Pastas

```
knowledge-base/
├── empresa/              ← Informações gerais da sua empresa
│   ├── sobre-a-empresa.md
│   ├── produtos-e-servicos.md
│   ├── precos.md
│   └── perguntas-frequentes.md
├── vendas/               ← Estratégias e processos de vendas
│   ├── playbook-de-vendas.md
│   ├── qualificacao-de-leads.md
│   └── objecoes-e-respostas.md
└── suporte/              ← Políticas e procedimentos de suporte
    └── politicas-de-atendimento.md
```

## Como Editar o Conteúdo

1. Abra qualquer arquivo `.md` desta pasta
2. Substitua os textos entre `[colchetes]` com as informações reais da sua empresa
3. Salve o arquivo — os agentes usarão o conteúdo atualizado na próxima chamada

## Como Adicionar Novas Seções

1. Crie um novo arquivo `.md` dentro da pasta adequada
2. Abra `src/agents/knowledge-base-loader.ts`
3. Adicione o import do novo arquivo e inclua-o na função de carregamento correspondente

## Boas Práticas

- Use linguagem clara e objetiva
- Inclua exemplos reais (preços, produtos, scripts)
- Mantenha as informações atualizadas
- Quanto mais detalhado, melhor a resposta dos agentes
- Use títulos (`##`) para separar seções dentro de cada arquivo

## O que cada Agente lê

| Agente         | Lê de                                          |
|----------------|------------------------------------------------|
| Claudinho      | Tudo (visão geral)                             |
| Agente Vendas  | vendas/, empresa/precos.md, empresa/produtos.md |
| Agente Leads   | vendas/qualificacao.md, empresa/sobre.md       |
| Agente Suporte | suporte/, empresa/faq.md                       |
| Agente Templates | empresa/, vendas/                            |
