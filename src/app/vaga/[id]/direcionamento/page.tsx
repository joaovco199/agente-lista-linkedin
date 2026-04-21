import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BotaoGerarLista } from "@/components/botao-gerar-lista";
import type { Vaga } from "@/types/vaga";

export const dynamic = "force-dynamic";

export default async function DirecionamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data, error } = await supabase
    .from("vagas")
    .select("*")
    .eq("id", id)
    .single<Vaga>();

  if (error || !data) return notFound();

  const { icp, search_strings, cargo_senioridade, status } = data;

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{cargo_senioridade}</h1>
          <p className="text-sm text-muted-foreground">
            {data.localizacao}
            {data.modalidade ? ` · ${data.modalidade}` : ""} · direcionamento
            gerado
          </p>
        </div>
        <Badge variant={status === "lista_gerada" ? "default" : "secondary"}>
          {status}
        </Badge>
      </header>

      {icp ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>ICP</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div>
              <strong>Títulos alvo:</strong>{" "}
              {icp.titulos.join(" · ")}
            </div>
            <div>
              <strong>Senioridade:</strong> {icp.senioridade}
            </div>
            <div>
              <strong>Skills obrigatórias:</strong>{" "}
              {icp.skills_must.join(", ")}
            </div>
            <div>
              <strong>Skills desejáveis:</strong>{" "}
              {icp.skills_nice.join(", ")}
            </div>
            <div>
              <strong>Setores:</strong> {icp.setores.join(", ")}
            </div>
            <div>
              <strong>Sinais a evitar:</strong>{" "}
              <span className="text-destructive">
                {icp.sinais_evitar.join("; ")}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum ICP ainda.
          </CardContent>
        </Card>
      )}

      {search_strings && search_strings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search strings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {search_strings.map((s, i) => (
              <div
                key={i}
                className="rounded-md border border-border p-3 text-sm"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{s.titulo}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {s.plataforma}
                  </Badge>
                </div>
                <code className="block break-all rounded bg-muted p-2 font-mono text-xs">
                  {s.string}
                </code>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex items-center justify-between gap-4 rounded-md border border-border bg-muted/30 p-4">
        <div className="text-sm">
          <p className="font-medium">Pronto pra gerar a lista?</p>
          <p className="text-muted-foreground">
            Executa SerpApi (descoberta) + Proxycurl (enriquecimento) + ranking
            do Claude. Leva ~45-75s.
          </p>
          {status === "lista_gerada" && (
            <Link
              href={`/vaga/${id}/resultado`}
              className="mt-1 inline-block text-primary hover:underline"
            >
              Ver lista atual →
            </Link>
          )}
        </div>
        <BotaoGerarLista vagaId={id} statusAtual={status} />
      </div>
    </main>
  );
}
