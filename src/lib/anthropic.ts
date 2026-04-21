import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton — evita validar env vars no top-level (que quebraria o
// `next build` quando a Vercel coleta page data).
let _anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY precisa estar no .env (e nas Environment Variables da Vercel em produção)."
    );
  }
  _anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return _anthropic;
}

// Modelos usados no pipeline. Centralizado aqui pra facilitar trocas.
export const MODELS = {
  // Sonnet 4.6 — rápido e mais barato. Usado nas chamadas do pipeline.
  default: "claude-sonnet-4-6",
  // Opus 4.7 — qualidade máxima. Disponível caso queiramos subir um Call depois.
  heavy: "claude-opus-4-7",
} as const;

export type ModelKey = keyof typeof MODELS;

type ToolInputSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type ClaudeTool = {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
};

type CallClaudeWithToolParams = {
  system: string;
  user: string;
  tool: ClaudeTool;
  model?: ModelKey;
  maxTokens?: number;
};

/**
 * Chama o Claude forçando o uso de uma única tool. Retorna o `input` da tool parseado.
 */
export async function callClaudeWithTool<T>({
  system,
  user,
  tool,
  model = "default",
  maxTokens = 4096,
}: CallClaudeWithToolParams): Promise<T> {
  const response = await getClient().messages.create({
    model: MODELS[model],
    max_tokens: maxTokens,
    system,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: user }],
  });

  const toolUseBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUseBlock) {
    throw new Error(
      `Claude não retornou tool_use block. stop_reason=${response.stop_reason}`
    );
  }

  return toolUseBlock.input as T;
}
