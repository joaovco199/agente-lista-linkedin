import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { decisaoCandidatoBodySchema } from "@/types/api";

export const maxDuration = 10;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = decisaoCandidatoBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { decisao, razao } = parsed.data;

  const { data, error } = await supabase
    .from("candidatos_gerados")
    .update({
      decisao,
      decisao_razao: razao,
      decisao_at: decisao ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id, decisao, decisao_razao, decisao_at")
    .single();

  if (error || !data) {
    console.error("[PATCH /api/candidatos/:id] supabase error", error);
    return NextResponse.json(
      { error: "Falha ao atualizar candidato" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}
