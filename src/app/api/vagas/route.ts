import { NextResponse } from "next/server";
import { callClaudeWithTool } from "@/lib/anthropic";
import { supabase } from "@/lib/supabase";
import {
  buildCallAUser,
  callASystem,
  callATool,
} from "@/lib/prompts/call-a-icp";
import {
  criarVagaBodySchema,
  direcionamentoSchema,
} from "@/types/api";
import type { DirecionamentoOutput } from "@/types/vaga";

export const maxDuration = 60;

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body inválido (JSON esperado)" },
      { status: 400 }
    );
  }

  const parsed = criarVagaBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const form = parsed.data;

  // 1) Persiste a vaga com status rascunho.
  const { data: vagaRow, error: insertErr } = await supabase
    .from("vagas")
    .insert({
      jd: form.jd,
      keywords: form.keywords,
      cargo_senioridade: form.cargo_senioridade,
      localizacao: form.localizacao,
      bons_perfis: form.bons_perfis,
      maus_perfis: form.maus_perfis,
      status: "rascunho",
    })
    .select("id")
    .single();

  if (insertErr || !vagaRow) {
    console.error("[POST /api/vagas] supabase insert error", insertErr);
    return NextResponse.json(
      { error: "Falha ao salvar a vaga no Supabase" },
      { status: 500 }
    );
  }
  const vagaId = vagaRow.id as string;

  // 2) Chama o Claude (Call A) com tool-use forçado.
  let direcionamento;
  try {
    const raw = await callClaudeWithTool<unknown>({
      system: callASystem,
      user: buildCallAUser(form),
      tool: callATool,
      model: "default",
      maxTokens: 2048,
    });
    direcionamento = direcionamentoSchema.parse(raw);
  } catch (err) {
    console.error("[POST /api/vagas] Claude Call A error", err);
    await supabase.from("vagas").update({ status: "erro" }).eq("id", vagaId);
    return NextResponse.json(
      {
        error: "Claude não conseguiu gerar o direcionamento. Tente de novo.",
        vagaId,
      },
      { status: 502 }
    );
  }

  // 3) Atualiza a vaga com o direcionamento e status direcionamento_ok.
  const { error: updateErr } = await supabase
    .from("vagas")
    .update({
      icp: direcionamento.icp,
      search_strings: direcionamento.search_strings,
      status: "direcionamento_ok",
    })
    .eq("id", vagaId);

  if (updateErr) {
    console.error("[POST /api/vagas] supabase update error", updateErr);
    return NextResponse.json(
      { error: "Falha ao salvar o direcionamento no Supabase", vagaId },
      { status: 500 }
    );
  }

  const response: { data: { id: string } & DirecionamentoOutput } = {
    data: {
      id: vagaId,
      icp: direcionamento.icp,
      search_strings: direcionamento.search_strings,
    },
  };
  return NextResponse.json(response, { status: 201 });
}
