import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaudeWithTool } from "@/lib/anthropic";
import { supabase } from "@/lib/supabase";
import {
  buildCallARefineManualUser,
  callARefineManualSystem,
  callARefineManualTool,
} from "@/lib/prompts/call-a-refine-manual";
import { direcionamentoSchema } from "@/types/api";
import type { Vaga } from "@/types/vaga";

export const maxDuration = 30;

const bodySchema = z.object({
  instrucoes: z
    .string()
    .min(10, "Diga o que refinar em pelo menos 10 caracteres")
    .max(1500),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vagaId } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { instrucoes } = parsed.data;

  const { data: vaga, error: fetchErr } = await supabase
    .from("vagas")
    .select("*")
    .eq("id", vagaId)
    .single<Vaga>();

  if (fetchErr || !vaga) {
    return NextResponse.json({ error: "Vaga não encontrada" }, { status: 404 });
  }
  if (!vaga.icp || !vaga.search_strings) {
    return NextResponse.json(
      { error: "Vaga sem ICP/search strings — gere o direcionamento antes." },
      { status: 409 }
    );
  }

  try {
    const raw = await callClaudeWithTool<unknown>({
      system: callARefineManualSystem,
      user: buildCallARefineManualUser({
        form: {
          jd: vaga.jd,
          keywords: vaga.keywords,
          cargo_senioridade: vaga.cargo_senioridade,
          localizacao: vaga.localizacao,
          modalidade: vaga.modalidade ?? "presencial",
          bons_perfis: vaga.bons_perfis,
          maus_perfis: vaga.maus_perfis,
        },
        icpAtual: vaga.icp,
        searchStringsAtuais: vaga.search_strings,
        modalidade: vaga.modalidade,
        instrucoes,
      }),
      tool: callARefineManualTool,
      model: "default",
      maxTokens: 2048,
    });
    const refined = direcionamentoSchema.parse(raw);

    const { error: updateErr } = await supabase
      .from("vagas")
      .update({
        icp: refined.icp,
        search_strings: refined.search_strings,
      })
      .eq("id", vagaId);

    if (updateErr) {
      console.error("[refinar-briefing] supabase update error", updateErr);
      return NextResponse.json(
        { error: "Falha ao salvar o direcionamento refinado" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { icp: refined.icp, search_strings: refined.search_strings },
    });
  } catch (err) {
    console.error("[refinar-briefing] Claude error", err);
    return NextResponse.json(
      { error: "Claude falhou ao refinar. Tenta de novo com outras instruções." },
      { status: 502 }
    );
  }
}
