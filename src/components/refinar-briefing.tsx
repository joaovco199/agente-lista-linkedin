"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Props = {
  vagaId: string;
};

const EXEMPLOS = [
  "Foca só em estagiários reais, rejeita quem já virou pleno ou sênior",
  "Aceita também candidatos de cidades vizinhas a BH (Contagem, Nova Lima)",
  "Prioriza quem trabalha em e-commerce de moda, não só B2B genérico",
  "Exclua perfis de engenharia/TI — queremos só comercial/operações",
];

export function RefinarBriefing({ vagaId }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [instrucoes, setInstrucoes] = useState("");
  const [loading, setLoading] = useState(false);

  async function onRefinar() {
    if (instrucoes.trim().length < 10) {
      toast.error("Diga o que refinar em pelo menos 10 caracteres.");
      return;
    }
    setLoading(true);
    toast.loading("Refinando direcionamento com Claude...", {
      id: "refinar",
    });
    try {
      const resp = await fetch(`/api/vagas/${vagaId}/refinar-briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrucoes: instrucoes.trim() }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        toast.error(json?.error ?? "Erro ao refinar", { id: "refinar" });
        return;
      }
      toast.success("ICP e search strings atualizados.", { id: "refinar" });
      setInstrucoes("");
      setAberto(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Falha de rede", { id: "refinar" });
    } finally {
      setLoading(false);
    }
  }

  if (!aberto) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAberto(true)}
        className="gap-2"
      >
        <Wand2 className="h-4 w-4" />
        Refinar briefing
      </Button>
    );
  }

  return (
    <div className="grid gap-3 rounded-md border border-primary/40 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <Wand2 className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">Refinar briefing</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Escreva em linguagem natural o que ajustar. O Claude vai reescrever o
        ICP e gerar 3 novas search strings incorporando suas instruções.
      </p>
      <Textarea
        rows={4}
        placeholder="Ex: 'Foca só em estagiários, exclua perfis já com promoção a analista pleno. Prioriza quem trabalha em varejo de moda.'"
        value={instrucoes}
        onChange={(e) => setInstrucoes(e.target.value)}
        disabled={loading}
      />
      <div className="grid gap-1 text-[11px] text-muted-foreground">
        <span>Exemplos de boas instruções:</span>
        <ul className="list-inside list-disc pl-1">
          {EXEMPLOS.map((ex) => (
            <li key={ex}>{ex}</li>
          ))}
        </ul>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAberto(false);
            setInstrucoes("");
          }}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button size="sm" onClick={onRefinar} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Refinando..." : "Aplicar refinamento"}
        </Button>
      </div>
    </div>
  );
}
