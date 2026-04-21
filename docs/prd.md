# PRD — agente-lista-linkedin

> Esqueleto criado pelo `/startup`. Completar em 15min às 13h, ANTES de abrir o Claude pra codar.
> **Regra**: Claude deve ler este arquivo antes de propor qualquer código.

## Problema

O time de liderança da Minimal Club (Grupo Moon Ventures) perde horas toda vez que abre uma vaga, pois a construção de listas de candidatos no LinkedIn é feita manualmente, sem critérios padronizados e sem processo replicável. O resultado é um recrutamento lento, dependente de esforço individual e inconsistente entre vagas — atrasando a capacidade de contratar com velocidade.

O maior gargalo no processo de contratação está justamente na geração de lista, processo demorado, manual que depende do trabalho e da análise do próprio recrutador.

## Usuário

**Quem vai usar essa ferramenta?**

Líderes do time de receita da Minimal Club que estão contratando novas pessoas para seus times.

**O que o usuário faz hoje pra resolver isso (manual/workaround)?**

Basicamente abre o LinkedIn, pensa em termos para serem usados na barra de busca, abre perfil por perfil, analisa o fit com a vaga, manda solicitação de conexão. Quando o candidato aceita, manda mensagem convidando para um bate-papo. Quando o candidato responde, se aceita, manda um link de agendamento e realiza a reunião.

## Objetivo

Um agente de IA que, dado um briefing de vaga, exemplos de perfis bons, perfis a evitar e palavras-chave relevantes, gera automaticamente uma lista de perfis ideais de candidatos no LinkedIn — reduzindo de horas para minutos o tempo de montagem de lista, com output padronizado e replicável por qualquer pessoa do time.

## Requisitos (o que PRECISA ter pra funcionar)

1. Interface para enviar a job description da vaga
2. Campo para palavras-chave importantes para a vaga
3. Campo para cargo e senioridade
4. Campo para localização do candidato
5. Campo para colar 5 bons perfis de referência com a razão de serem qualificados
6. Campo para colar 5 perfis a evitar com a razão de serem desqualificados
7. Pipeline de descoberta + enrichment de perfis LinkedIn — **descoberta** via SerpApi (busca `site:linkedin.com/in` no Google) e **enrichment** via Proxycurl (retorna Sobre, experiência completa, skills, educação e certificações de cada perfil)
8. Agente Claude que gera: (a) ICP estruturado, (b) search strings prontas para copiar no LinkedIn, (c) ranking final dos 10 candidatos com score 1-5 e justificativa baseada nos dados enriquecidos e nos exemplos bons/maus

## Fora do escopo (o que NÃO vai ter hoje)

- Login social (Google/GitHub) — usar só email/senha ou Supabase magic link
- Mobile responsivo polido — ok se quebrar no celular
- Integrações com sistemas reais (TOTVS, HubSpot) — simular com mock
- Testes automatizados
- **Scraping direto do LinkedIn** — viola ToS, cai em anti-bot. Usamos SerpApi (Google) + Proxycurl (API oficial) no lugar
- Automação de outreach: o agente gera a lista, mas não envia conexões, mensagens ou links de agendamento no LinkedIn — isso continua manual
- Integração com ATS (Greenhouse, Lever, etc.): nenhuma sincronização com sistemas de gestão de vagas
- Gestão de pipeline pós-lista: acompanhamento de status de candidatos (contactado, respondeu, agendou) está fora
- Multi-vaga simultânea: o agente opera sobre uma vaga por vez — não há dashboard de múltiplas buscas rodando em paralelo
- Monitoramento recorrente: não há alerta de "novo perfil que se encaixa" — operação é on-demand

## Métrica de sucesso

João abre a URL, preenche o Job Description + 5 bons perfis com razões + 5 perfis a evitar com razões, aperta "Gerar direcionamento" e recebe o ICP + search strings pra validar. Confirma, aperta "Gerar lista" e o sistema busca perfis reais (SerpApi) + enriquece (Proxycurl). Em seguida recebe uma interface com 10 candidatos ranqueados, cada um com score de fit (1-5), trechos do "Sobre" e da experiência que pesaram na decisão, e link direto pro LinkedIn. João abre conexão ou descarta — tempo total: < 5 minutos vs. 2-3 horas do processo atual.

## Stack

- **Hosting**: Vercel
- **Banco + auth**: Supabase (tabela `vagas` + tabela `candidatos_gerados` pro histórico)
- **Linguagem/framework**: Next.js 15 + TypeScript + App Router (deploy Vercel nativo)
- **UI**: Tailwind CSS + shadcn/ui (componentes prontos, baixo custo de tempo)
- **LLM**: Claude via Anthropic API (chave bootcamp, limite US$ 20)
- **Descoberta de perfis**: SerpApi (Google `site:linkedin.com/in`) — free tier 100 buscas/mês
- **Enrichment de perfis**: Proxycurl (API oficial de dados LinkedIn) — US$ 10 trial, ~US$ 0,05/lookup

## Decisões de arquitetura (append ao longo do dia)

- **Não fazer scraping direto do LinkedIn**: usamos SerpApi pra descoberta (Google indexa perfis públicos) + Proxycurl pra enrichment (API oficial, legal). Evita ban de conta, CAPTCHA e violação de ToS.
- **Pipeline em 2 camadas**: Camada 1 (descoberta barata via SerpApi, retorna ~20 URLs) → Camada 2 (enrichment caro via Proxycurl só nos top 10 pré-filtrados pelo Claude com base no snippet). Economiza ~50% do custo.
- **Agente Claude chamado em 3 momentos**: (a) gera ICP + search strings, (b) pré-filtra URLs da SerpApi antes do enrichment, (c) ranking final com dados enriquecidos. Cada chamada com prompt específico — nada de "agente conversacional genérico".
- **Persistência Supabase**: cada vaga gera uma row em `vagas` + N rows em `candidatos_gerados` com o JSON do perfil enriquecido. Permite revisitar buscas antigas sem gastar crédito de API.
