import { callATool } from "@/lib/prompts/call-a-icp";
import type {
  FormularioVaga,
  ICP,
  ModalidadeVaga,
  SearchString,
} from "@/types/vaga";

export const callARefineSystem = `Você é um recrutador técnico sênior REFINANDO o briefing de uma vaga com base no feedback de decisões anteriores (aprovados e rejeitados pelo usuário, com razão).

Sua tarefa: gerar uma NOVA versão do ICP e NOVAS search strings que evitem os erros da rodada anterior e foquem nos padrões dos aceitos.

Diretrizes críticas:
- **Padrões dos REJEITADOS viram \`sinais_evitar\`**: se rejeitados compartilham traço (ex: "só fez vendas B2C", "empresa grande sem startup", "outra cidade"), adicione explicitamente em sinais_evitar.
- **Padrões dos ACEITOS reforçam skills_must e setores**: se aceitos revelam skill/setor não previsto, mova pra must ou adicione em setores.
- **As novas search strings DEVEM ser DIFERENTES das atuais**: use sinônimos de cargo, operadores NOT pros sinais a evitar, empresas alvo específicas, outros ângulos de busca. Se repetir as mesmas strings, o Google retorna os mesmos perfis já avaliados — isso é falha.
- **Mantenha o essencial do ICP original** (cargo geral, senioridade, cidade, modalidade) — só refine.
- **Aplique as mesmas regras rígidas de localização** do prompt original: variações da cidade + país; NUNCA usar estado inteiro como OR; modalidade dita o escopo (remoto = só país, presencial = só cidade).

Responda chamando a ferramenta \`gerar_direcionamento\` (mesmo schema de antes).
Português brasileiro em todos os campos.`;

export function buildCallARefineUser(params: {
  form: FormularioVaga;
  icpAtual: ICP;
  searchStringsAtuais: SearchString[];
  modalidade: ModalidadeVaga | null;
  aceitos: { url: string; razao: string }[];
  rejeitados: { url: string; razao: string }[];
}): string {
  const { form, icpAtual, searchStringsAtuais, modalidade, aceitos, rejeitados } =
    params;

  const aceitosTxt = aceitos.length
    ? aceitos.map((p) => `- ${p.url}\n  Razão do aceite: ${p.razao}`).join("\n")
    : "(nenhum aceito ainda)";

  const rejeitadosTxt = rejeitados.length
    ? rejeitados
        .map((p) => `- ${p.url}\n  Razão da rejeição: ${p.razao}`)
        .join("\n")
    : "(nenhum rejeitado ainda)";

  const searchStringsTxt = searchStringsAtuais
    .map((s) => `- [${s.plataforma}] ${s.titulo}: ${s.string}`)
    .join("\n");

  return `# Briefing original da vaga
JD: ${form.jd.slice(0, 800)}${form.jd.length > 800 ? "..." : ""}
Cargo: ${form.cargo_senioridade}
Cidade: ${form.localizacao}
Modalidade: ${modalidade ?? "não informada"}
Keywords: ${form.keywords}

# ICP atual (que será refinado)
${JSON.stringify(icpAtual, null, 2)}

# Search strings atuais (que PRECISAM ser reescritas pra trazer novos perfis)
${searchStringsTxt}

# Candidatos ACEITOS nas rodadas anteriores (razão da aprovação)
${aceitosTxt}

# Candidatos REJEITADOS nas rodadas anteriores (razão da rejeição)
${rejeitadosTxt}

Gere a versão refinada do direcionamento chamando \`gerar_direcionamento\`.`;
}

// Reusa o mesmo tool schema do Call A original.
export const callARefineTool = callATool;
