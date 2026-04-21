"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

type Props = {
  vagaId: string;
  titulo: string;
};

export function BotaoExcluirVaga({ vagaId, titulo }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick(e: React.MouseEvent) {
    // Impede que o clique propague pro <Link> pai (navegação).
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm(
      `Excluir "${titulo}"? Essa ação apaga a vaga e todos os candidatos associados. Não dá pra desfazer.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const resp = await fetch(`/api/vagas/${vagaId}`, { method: "DELETE" });
      const json = await resp.json();
      if (!resp.ok) {
        toast.error(json?.error ?? "Erro ao excluir");
        return;
      }
      toast.success("Vaga excluída");
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Falha de rede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label="Excluir vaga"
      className="rounded-md p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
