import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus } from "lucide-react";
import type { Vaga } from "@/types/vaga";

export const dynamic = "force-dynamic";

type VagaListItem = Pick<
  Vaga,
  | "id"
  | "created_at"
  | "cargo_senioridade"
  | "localizacao"
  | "modalidade"
  | "status"
>;

const STATUS_LABEL: Record<Vaga["status"], string> = {
  rascunho: "rascunho",
  direcionamento_ok: "direcionamento pronto",
  lista_gerada: "lista pronta",
  erro: "erro",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HomePage() {
  const { data: vagas } = await supabase
    .from("vagas")
    .select("id, created_at, cargo_senioridade, localizacao, modalidade, status")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<VagaListItem[]>();

  const lista = vagas ?? [];

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <header className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            Minimal Club · Recrutamento
          </div>
          <h1 className="mt-2 text-3xl font-bold">Agente Lista LinkedIn</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Gere listas qualificadas de candidatos do LinkedIn a partir de um
            briefing de vaga. O agente define ICP, busca no Google e ranqueia
            perfis reais em segundos.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/nova-vaga">
            <Plus className="mr-1 h-4 w-4" />
            Nova vaga
          </Link>
        </Button>
      </header>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Vagas recentes</h2>
          <span className="text-xs text-muted-foreground">
            {lista.length === 0
              ? "nenhuma ainda"
              : `${lista.length} ${lista.length === 1 ? "vaga" : "vagas"}`}
          </span>
        </div>

        {lista.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Ainda não há vagas. Clique em &ldquo;Nova vaga&rdquo; pra criar a primeira.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {lista.map((v) => (
              <Link
                key={v.id}
                href={
                  v.status === "lista_gerada"
                    ? `/vaga/${v.id}/resultado`
                    : `/vaga/${v.id}/direcionamento`
                }
                className="group"
              >
                <Card className="transition hover:border-primary/60">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-medium">
                        {v.cargo_senioridade}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{v.localizacao}</span>
                        {v.modalidade && (
                          <>
                            <span>·</span>
                            <span>{v.modalidade}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{formatDate(v.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          v.status === "lista_gerada"
                            ? "default"
                            : v.status === "erro"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {STATUS_LABEL[v.status]}
                      </Badge>
                      <span className="text-muted-foreground transition group-hover:text-foreground">
                        →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
        Bootcamp Claude Code · Moon Ventures 2026 · João Vicente
      </footer>
    </main>
  );
}
