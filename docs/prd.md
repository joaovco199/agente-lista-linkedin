# PRD — agente-lista-linkedin

> Esqueleto criado pelo `/startup`. Completar em 15min às 13h, ANTES de abrir o Claude pra codar.
> **Regra**: Claude deve ler este arquivo antes de propor qualquer código.

## Problema

O time de liderança da Minimal Club (Grupo Moon Ventures) perde horas toda vez que abre uma vaga, pois a construção de listas de candidatos no LinkedIn é feita manualmente, sem critérios padronizados e sem processo replicável. O resultado é um recrutamento lento, dependente de esforço individual e inconsistente entre vagas — atrasando a capacidade de contratar com velocidade.

## Usuário

**Quem vai usar essa ferramenta?** (preencher às 13h)

*Ex: "Analistas do time de assinatura que hoje abrem 3 planilhas por dia pra conferir status de remessa."*

**O que o usuário faz hoje pra resolver isso (manual/workaround)?** (preencher às 13h)

## Objetivo

Um agente de IA que, dado um briefing de vaga, exemplos de perfis bons, perfis a evitar e palavras-chave relevantes, gera automaticamente uma lista de perfis ideais de candidatos no LinkedIn — reduzindo de horas para minutos o tempo de montagem de lista, com output padronizado e replicável por qualquer pessoa do time.

## Requisitos (o que PRECISA ter pra funcionar)

*Preencher às 13h. Máximo 5 — se passou disso, cortar escopo.*

- [ ] Requisito crítico 1
- [ ] Requisito crítico 2
- [ ] Requisito crítico 3

## Fora do escopo (o que NÃO vai ter hoje)

*Preencher às 13h. Ser explícito. Cada item aqui é 1h salva.*

- Login social (Google/GitHub) — usar só email/senha ou Supabase magic link
- Mobile responsivo polido — ok se quebrar no celular
- Integrações com sistemas reais (TOTVS, HubSpot) — simular com mock
- Testes automatizados
- <adicione os seus>

## Métrica de sucesso

**Como você vai saber que funciona?** 1 frase concreta com ação + resultado.

*Ex: "Ana abre a URL, filtra por 'renovação cancelada', vê os 12 casos atuais, clica em 1 e marca como resolvido — e isso reflete no Supabase."*

## Stack

- **Hosting**: Vercel
- **Banco + auth**: Supabase
- **Linguagem/framework**: _____ (preencher quando decidir — sugestão: Next.js + TypeScript)
- **Outras libs**: _____ (preencher conforme for usando)

## Decisões de arquitetura (append ao longo do dia)

*Use essa seção pra registrar escolhas técnicas importantes à medida que aparecem.*

- <ex: "decidi usar Supabase Auth em vez de rolar JWT próprio — economiza 2h">
