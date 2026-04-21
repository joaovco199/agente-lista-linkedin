import Link from "next/link";
import { FormNovaVaga } from "@/components/form-nova-vaga";

export const metadata = {
  title: "Nova vaga — Agente Lista LinkedIn",
};

export default function NovaVagaPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <header className="mb-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar
        </Link>
        <h1 className="mt-2 text-3xl font-bold">Nova vaga</h1>
        <p className="mt-1 text-muted-foreground">
          Preencha o briefing e o agente gera o ICP + search strings em segundos.
        </p>
      </header>
      <FormNovaVaga />
    </main>
  );
}
