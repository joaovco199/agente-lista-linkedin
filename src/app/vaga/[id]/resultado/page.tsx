import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DecisaoCandidato } from "@/components/decisao-candidato";
import type { Vaga } from "@/types/vaga";
import type { Candidato, Highlight } from "@/types/candidato";

export const dynamic = "force-dynamic";

function scoreColor(score: number | null): string {
  if (!score) return "bg-muted";
  if (score >= 5) return "bg-emerald-600 text-white";
  if (score === 4) return "bg-emerald-500 text-white";
  if (score === 3) return "bg-amber-500 text-white";
  if (score === 2) return "bg-orange-500 text-white";
  return "bg-red-600 text-white";
}

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [{ data: vaga }, { data: candidatos }] = await Promise.all([
    supabase.from("vagas").select("*").eq("id", id).single<Vaga>(),
    supabase
      .from("candidatos_gerados")
      .select("*")
      .eq("vaga_id", id)
      .order("score", { ascending: false })
      .returns<Candidato[]>(),
  ]);

  if (!vaga) return notFound();

  const lista = candidatos ?? [];

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Link
            href={`/vaga/${id}/direcionamento`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Direcionamento
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{vaga.cargo_senioridade}</h1>
          <p className="text-sm text-muted-foreground">
            {lista.length} candidatos ranqueados · {vaga.localizacao}
          </p>
        </div>
        <Badge variant={vaga.status === "lista_gerada" ? "default" : "secondary"}>
          {vaga.status}
        </Badge>
      </header>

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum candidato salvo ainda.
            <br />
            Volte no direcionamento e clique em &quot;Gerar lista&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {lista.map((c, i) => (
            <Card key={c.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-base font-bold ${scoreColor(c.score)}`}
                    title={`Score: ${c.score}/5`}
                  >
                    {c.score ?? "?"}
                  </span>
                  <div>
                    <CardTitle className="text-base">
                      {c.nome ?? `Candidato ${i + 1}`}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {c.cargo ?? "sem cargo"}
                      {c.empresa ? ` · ${c.empresa}` : ""}
                    </p>
                  </div>
                </div>
                <a
                  href={c.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Abrir no LinkedIn ↗
                </a>
              </CardHeader>
              <CardContent className="space-y-3">
                {c.justificativa && (
                  <p className="text-sm leading-relaxed">{c.justificativa}</p>
                )}
                {Array.isArray(c.highlights) && c.highlights.length > 0 && (
                  <div className="grid gap-2">
                    {(c.highlights as Highlight[]).map((h, hi) => (
                      <div
                        key={hi}
                        className="rounded-md border-l-2 border-border bg-muted/50 px-3 py-2 text-xs italic"
                      >
                        <Badge
                          variant="outline"
                          className="mb-1 text-[10px] uppercase"
                        >
                          {h.fonte}
                        </Badge>
                        <p className="not-italic">&ldquo;{h.trecho}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                )}
                <DecisaoCandidato
                  candidatoId={c.id}
                  decisaoAtual={c.decisao}
                  razaoAtual={c.decisao_razao}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
