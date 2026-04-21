import { NextResponse } from "next/server";
import { z } from "zod";
import { getNotasProspecao, salvarNotasProspecao } from "@/lib/configuracoes";

export const maxDuration = 10;

export async function GET() {
  const valor = await getNotasProspecao();
  return NextResponse.json({ data: { valor } });
}

const bodySchema = z.object({ valor: z.string().max(5000) });

export async function PATCH(request: Request) {
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
  await salvarNotasProspecao(parsed.data.valor.trim());
  return NextResponse.json({ data: { ok: true } });
}
