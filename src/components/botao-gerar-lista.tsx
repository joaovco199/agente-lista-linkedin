"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  vagaId: string;
  statusAtual: string;
};

export function BotaoGerarLista({ vagaId, statusAtual }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const jaGerou = statusAtual === "lista_gerada";

  async function onClick() {
    setLoading(true);
    toast.loading("Gerando lista... isso pode levar 45-75s.", { id: "gerar-lista" });
    try {
      const resp = await fetch(`/api/vagas/${vagaId}/gerar-lista`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await resp.json();
      if (!resp.ok) {
        toast.error(json?.error ?? "Erro desconhecido", { id: "gerar-lista" });
        return;
      }
      toast.success(
        `Lista gerada! ${json.data.total_ranqueados} candidatos.`,
        { id: "gerar-lista" }
      );
      router.push(`/vaga/${vagaId}/resultado`);
    } catch (err) {
      console.error(err);
      toast.error("Falha de rede ao gerar lista", { id: "gerar-lista" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={onClick}
      size="lg"
      disabled={loading}
      variant={jaGerou ? "outline" : "default"}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading
        ? "Gerando..."
        : jaGerou
          ? "Gerar mais candidatos"
          : "Gerar lista de candidatos"}
    </Button>
  );
}
