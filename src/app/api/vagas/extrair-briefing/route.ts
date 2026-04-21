import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeWithTool } from "@/lib/anthropic";
import {
  buildExtractBriefingUser,
  extractBriefingSystem,
  extractBriefingTool,
  type BriefingExtraido,
} from "@/lib/prompts/extract-briefing";

export const maxDuration = 30;

const bodySchema = z.object({
  texto: z.string().min(30, "Texto muito curto (mínimo 30 caracteres)"),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Dados inválidos",
      },
      { status: 400 }
    );
  }

  try {
    const raw = await callClaudeWithTool<BriefingExtraido>({
      system: extractBriefingSystem,
      user: buildExtractBriefingUser(parsed.data.texto),
      tool: extractBriefingTool,
      model: "default",
      maxTokens: 2048,
    });
    return NextResponse.json({ data: raw });
  } catch (err) {
    console.error("[extrair-briefing] error", err);
    return NextResponse.json(
      { error: "Claude falhou ao extrair o briefing" },
      { status: 502 }
    );
  }
}
