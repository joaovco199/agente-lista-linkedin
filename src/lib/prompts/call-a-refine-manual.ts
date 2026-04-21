import { callATool } from "@/lib/prompts/call-a-icp";
import type {
  FormularioVaga,
  ICP,
  ModalidadeVaga,
  SearchString,
} from "@/types/vaga";

export const callARefineManualSystem = `Você é um recrutador técnico sênior REFINANDO o briefing de uma vaga com base em instruções manuais do recrutador responsável.

O recrutador já leu o ICP e as search strings gerados na rodada anterior e está pedindo ajustes específicos (em linguagem natural). Você precisa incorporar essas instruções num NOVO ICP + NOVAS search strings, mantendo tudo que continua válido do briefing original.

Diretrizes:
- **As instruções do recrutador são a fonte de verdade imediata**. Se ele pede "foca só em estagiários", titulos devem ser só variações de estagiário. Se pede "exclua sêniors", sinais_evitar e NOT das search strings devem refletir isso.
- **Não invente**: só use skills/cargos/setores que apareçam na JD, keywords, perfis de referência, ICP atual ou nas instruções.
- **Search strings NOVAS**: incorpore as instruções em operadores booleanos (AND, OR, NOT). Se a instrução menciona exclusão ("não queremos analistas"), adicione \`NOT "analista"\`.
- **Mantenha localização e modalidade** (a menos que a instrução peça pra mudar).
- **Responda chamando \`gerar_direcionamento\`** com o schema completo (ICP + 3 search strings).

Português brasileiro em todos os campos.`;

export function buildCallARefineManualUser(params: {
  form: FormularioVaga;
  icpAtual: ICP;
  searchStringsAtuais: SearchString[];
  modalidade: ModalidadeVaga | null;
  instrucoes: string;
}): string {
  const {
    form,
    icpAtual,
    searchStringsAtuais,
    modalidade,
    instrucoes,
  } = params;

  const searchStringsTxt = searchStringsAtuais
    .map((s) => `- [${s.plataforma}] ${s.titulo}: ${s.string}`)
    .join("\n");

  return `# Briefing original
JD: ${form.jd.slice(0, 800)}${form.jd.length > 800 ? "..." : ""}
Cargo: ${form.cargo_senioridade}
Cidade: ${form.localizacao}
Modalidade: ${modalidade ?? "não informada"}
Keywords: ${form.keywords}

# ICP atual
${JSON.stringify(icpAtual, null, 2)}

# Search strings atuais
${searchStringsTxt}

# Instruções do recrutador (aplicar no refinamento)
${instrucoes}

Gere a versão refinada chamando \`gerar_direcionamento\`.`;
}

export const callARefineManualTool = callATool;
