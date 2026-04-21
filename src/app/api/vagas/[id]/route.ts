import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 10;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ON DELETE CASCADE cuida dos candidatos_gerados associados.
  const { error } = await supabase.from("vagas").delete().eq("id", id);

  if (error) {
    console.error("[DELETE /api/vagas/:id] supabase error", error);
    return NextResponse.json(
      { error: "Falha ao excluir vaga" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: { id, deleted: true } });
}
