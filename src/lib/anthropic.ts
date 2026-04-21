import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error(
    "ANTHROPIC_API_KEY precisa estar no .env (e nas Environment Variables da Vercel em produção)."
  );
}

export const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// Modelos usados no pipeline. Centralizado aqui pra facilitar trocas.
export const MODELS = {
  // Sonnet 4.6 — rápido e mais barato. Usado nas 3 chamadas do pipeline.
  default: "claude-sonnet-4-6",
  // Opus 4.7 — qualidade máxima. Disponível caso queiramos subir o Call C depois.
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
 * Lança erro se o modelo não usar a tool (nunca deveria acontecer com tool_choice forçado).
 */
export async function callClaudeWithTool<T>({
  system,
  user,
  tool,
  model = "default",
  maxTokens = 4096,
}: CallClaudeWithToolParams): Promise<T> {
  const response = await anthropic.messages.create({
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
