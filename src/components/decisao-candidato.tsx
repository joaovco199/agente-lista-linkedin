"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { DecisaoCandidato as Decisao } from "@/types/candidato";

type Props = {
  candidatoId: string;
  decisaoAtual: Decisao | null;
  razaoAtual: string | null;
};

type UIState = "idle" | "escolhendo_aceito" | "escolhendo_rejeitado";

export function DecisaoCandidato({
  candidatoId,
  decisaoAtual,
  razaoAtual,
}: Props) {
  const router = useRouter();
  const [uiState, setUiState] = useState<UIState>("idle");
  const [razao, setRazao] = useState(razaoAtual ?? "");
  const [loading, setLoading] = useState(false);

  async function salvar(decisao: Decisao) {
    setLoading(true);
    try {
      const resp = await fetch(`/api/candidatos/${candidatoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisao, razao: razao.trim() || null }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        toast.error(json?.error ?? "Erro ao salvar");
        return;
      }
      toast.success(decisao === "aceito" ? "Aceito ✓" : "Rejeitado ✗");
      setUiState("idle");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Falha de rede");
    } finally {
      setLoading(false);
    }
  }

  async function resetar() {
    setLoading(true);
    try {
      const resp = await fetch(`/api/candidatos/${candidatoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisao: null, razao: null }),
      });
      if (!resp.ok) {
        toast.error("Falha ao resetar");
        return;
      }
      setRazao("");
      setUiState("idle");
      router.refresh();
    } catch {
      toast.error("Falha de rede");
    } finally {
      setLoading(false);
    }
  }

  // Estado 1: já tem decisão — mostra badge + razão + botão alterar.
  if (decisaoAtual && uiState === "idle") {
    return (
      <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
        <Badge
          variant={decisaoAtual === "aceito" ? "default" : "destructive"}
          className="flex items-center gap-1 text-xs"
        >
          {decisaoAtual === "aceito" ? (
            <Check className="h-3 w-3" />
          ) : (
            <X className="h-3 w-3" />
          )}
          {decisaoAtual === "aceito" ? "Aceito" : "Rejeitado"}
        </Badge>
        <div className="flex-1 text-sm">
          {razaoAtual ? (
            <p className="italic text-muted-foreground">
              &ldquo;{razaoAtual}&rdquo;
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Sem razão</p>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={resetar}
          disabled={loading}
          className="text-xs"
        >
          <Pencil className="mr-1 h-3 w-3" />
          Reabrir
        </Button>
      </div>
    );
  }

  // Estado 2: escolheu "aceitar" ou "rejeitar" — pedindo razão.
  if (uiState === "escolhendo_aceito" || uiState === "escolhendo_rejeitado") {
    const destino: Decisao =
      uiState === "escolhendo_aceito" ? "aceito" : "rejeitado";
    const label = destino === "aceito" ? "Aceitar" : "Rejeitar";
    return (
      <div className="grid gap-2 rounded-md border border-border bg-muted/30 p-3">
        <Textarea
          rows={2}
          placeholder={
            destino === "aceito"
              ? "Por que aceitar? (opcional — ex: 'Fit com o stack e senioridade')"
              : "Por que rejeitar? (opcional — ex: 'Experiência só em B2C')"
          }
          value={razao}
          onChange={(e) => setRazao(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setUiState("idle");
              setRazao(razaoAtual ?? "");
            }}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            variant={destino === "aceito" ? "default" : "destructive"}
            onClick={() => salvar(destino)}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            {label}
          </Button>
        </div>
      </div>
    );
  }

  // Estado 0 (idle, sem decisão): 2 botões lado a lado.
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setUiState("escolhendo_aceito")}
        disabled={loading}
        className="flex-1"
      >
        <Check className="mr-1 h-4 w-4 text-emerald-600" />
        Aceitar
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setUiState("escolhendo_rejeitado")}
        disabled={loading}
        className="flex-1"
      >
        <X className="mr-1 h-4 w-4 text-destructive" />
        Rejeitar
      </Button>
    </div>
  );
}
