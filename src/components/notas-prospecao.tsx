"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  valorInicial: string;
};

export function NotasProspecao({ valorInicial }: Props) {
  const [valor, setValor] = useState(valorInicial);
  const [valorSalvo, setValorSalvo] = useState(valorInicial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValor(valorInicial);
    setValorSalvo(valorInicial);
  }, [valorInicial]);

  const sujo = valor.trim() !== valorSalvo.trim();

  async function onSalvar() {
    setLoading(true);
    try {
      const resp = await fetch("/api/configuracoes/notas-prospecao", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor: valor.trim() }),
      });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}));
        toast.error(json?.error ?? "Erro ao salvar");
        return;
      }
      setValorSalvo(valor.trim());
      toast.success("Notas salvas. Serão usadas em todas as próximas buscas.");
    } catch (err) {
      console.error(err);
      toast.error("Falha de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="h-4 w-4" />
          Notas globais de prospecção
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-xs text-muted-foreground">
          Contexto que se aplica a TODAS as vagas (ex: preferências da Moon,
          tipos de empresa a evitar, critérios que sempre valem). O Claude lê
          isso em cada geração.
        </p>
        <Textarea
          rows={3}
          placeholder="ex: Preferimos candidatos com experiência em SaaS B2B brasileiro. Evitamos perfis que já fizeram processo seletivo na Moon nos últimos 6 meses. Priorizamos quem teve progressão de cargo em pelo menos 2 anos."
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {sujo ? "Alterações não salvas" : "Sincronizado"}
          </span>
          <Button
            size="sm"
            variant={sujo ? "default" : "outline"}
            onClick={onSalvar}
            disabled={!sujo || loading}
          >
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {loading ? "Salvando..." : "Salvar notas"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
