# Pitch — agente-lista-linkedin

> 2 minutos cronometrados. Minimal Club · Bootcamp Claude Code.

## Problema (20s)

O time de liderança da Minimal Club perde **2-3 horas toda vez que abre uma vaga** montando lista de candidatos no LinkedIn. O processo é manual, sem critério padronizado, e depende do esforço individual de quem tá buscando. Resultado: recrutamento lento, inconsistente entre vagas, e ineficaz quando precisa acelerar.

## Solução (40s)

Um agente de IA que recebe o briefing da vaga + 1 exemplo de bom perfil + razões, e em ~30 segundos entrega:

1. **Um ICP estruturado** (títulos-alvo, skills must/nice, senioridade, setores, sinais a evitar)
2. **3 search strings prontas pra colar** no LinkedIn/Google, com operadores booleanos e filtro por cidade + modalidade (presencial/híbrido/remoto)
3. **Uma lista ranqueada de até 10 candidatos reais** do LinkedIn com score 1-5, justificativa citando trechos do perfil, e link direto

**Stack**: Next.js 15 + Vercel + Supabase + Claude Sonnet 4.6 + SerpApi (busca no Google). **Custo por vaga gerada: ~US$ 0,02.**

Feedback loop: aprovação/rejeição de cada candidato alimenta a próxima geração — quanto mais você usa, melhor fica.

## Demo (50s)

- **URL Vercel**: https://agente-lista-linkedin.vercel.app
- **Passo 1**: Abre a landing, clica em "+ Nova vaga"
- **Passo 2**: Preenche JD + cargo + cidade + modalidade + 1 bom perfil de referência
- **Passo 3**: Recebe ICP + 3 search strings → clica "Gerar lista"
- **Passo 4**: Revisa 10 candidatos ranqueados, aceita/rejeita com razão, clica "Gerar mais"

## Próximos passos (10s)

- **v2 — enrichment de perfil** via Apify ou scraper legal (hoje usa só snippet do Google)
- **v3 — automatização de outreach** (conexão, primeira mensagem, link de agendamento)
- **Go-to-market**: rodar piloto com o time de Receita da Minimal Club na próxima vaga aberta

---

## Métricas do dia

- **Tokens Anthropic**: ~8k de input / ~1k de output por vaga completa (ICP + ranking)
- **Custo por demo**: ~US$ 0,02 (Claude Sonnet 4.6) + SerpApi free tier
- **Commits**: 20 (até o momento)
- **Arquitetura**: 1 repo GitHub, 1 projeto Vercel, 1 projeto Supabase (2 tabelas)

## Diferencial técnico pro bootcamp

- **Tool-use forçado** nas 3 chamadas do Claude (resposta 100% JSON válido, sem parser frágil)
- **Filtro de localização em camadas**: SerpApi `gl=br` + subdomínio (`br.linkedin.com`) + regra no prompt
- **Preserva decisões**: ao "gerar mais", aprovados/rejeitados ficam intactos e viram contexto adicional pro próximo ranking — feedback loop real
- **Falha graceful**: se SerpApi rejeita `location`, retry sem o param; se Proxycurl descontinua, pipeline trabalha só com snippet
