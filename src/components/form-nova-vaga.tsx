"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PerfilReferenciaInput } from "./perfil-referencia-input";
import { criarVagaBodySchema } from "@/types/api";

// Tipo do form (aceita slots vazios — diferente do body que o backend valida).
export type FormValues = {
  jd: string;
  keywords: string;
  cargo_senioridade: string;
  localizacao: string;
  bons_perfis: { url: string; razao: string }[];
  maus_perfis: { url: string; razao: string }[];
};

const slotVazio = { url: "", razao: "" };

const defaultValues: FormValues = {
  jd: "",
  keywords: "",
  cargo_senioridade: "",
  localizacao: "",
  bons_perfis: Array.from({ length: 5 }, () => ({ ...slotVazio })),
  maus_perfis: Array.from({ length: 5 }, () => ({ ...slotVazio })),
};

function slotPreenchido(p: { url: string; razao: string }): boolean {
  return p.url.trim() !== "" || p.razao.trim() !== "";
}

export function FormNovaVaga() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<FormValues>({ defaultValues });

  async function onSubmit(values: FormValues) {
    // Filtra slots completamente vazios. Slots parcialmente preenchidos
    // (só URL ou só razão) vão pra validação estrita.
    const payload = {
      ...values,
      bons_perfis: values.bons_perfis.filter(slotPreenchido),
      maus_perfis: values.maus_perfis.filter(slotPreenchido),
    };

    const parsed = criarVagaBodySchema.safeParse(payload);
    if (!parsed.success) {
      const msgs = parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" · ");
      toast.error(msgs || "Dados inválidos");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/vagas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await resp.json();
      if (!resp.ok) {
        const msg =
          typeof json?.error === "string" ? json.error : "Erro desconhecido";
        toast.error(msg);
        return;
      }
      toast.success("Direcionamento gerado. Redirecionando...");
      router.push(`/vaga/${json.data.id}/direcionamento`);
    } catch (err) {
      console.error(err);
      toast.error("Falha de rede ao criar a vaga");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto grid w-full max-w-3xl gap-6 pb-12"
    >
      <Card>
        <CardHeader>
          <CardTitle>Briefing da vaga</CardTitle>
          <CardDescription>
            Preencha a JD, keywords, cargo e localização. Esses dados alimentam o agente Claude.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="jd">Job Description</Label>
            <Textarea
              id="jd"
              rows={8}
              placeholder="Cole a JD completa da vaga..."
              {...form.register("jd")}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cargo_senioridade">Cargo e senioridade</Label>
              <Input
                id="cargo_senioridade"
                placeholder="ex: Account Executive Sênior"
                {...form.register("cargo_senioridade")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                placeholder="ex: São Paulo, Brasil (ou Remoto — Brasil)"
                {...form.register("localizacao")}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="keywords">Palavras-chave</Label>
            <Input
              id="keywords"
              placeholder="ex: outbound, HubSpot, Salesforce, SaaS B2B"
              {...form.register("keywords")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfis de referência</CardTitle>
          <CardDescription>
            Pelo menos <strong>1 bom perfil</strong> é obrigatório. Os demais
            slots (bons e maus) são opcionais — deixe em branco se não quiser
            usar. Quanto mais exemplos com razão, melhor o ranking.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <section className="grid gap-3">
            <h3 className="text-base font-semibold">
              Bons perfis (qualificados)
            </h3>
            {Array.from({ length: 5 }).map((_, i) => (
              <PerfilReferenciaInput
                key={`bom-${i}`}
                form={form}
                campo="bons_perfis"
                index={i}
                obrigatorio={i === 0}
              />
            ))}
          </section>
          <Separator />
          <section className="grid gap-3">
            <h3 className="text-base font-semibold">
              Perfis a evitar (anti-exemplos)
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                todos opcionais
              </span>
            </h3>
            {Array.from({ length: 5 }).map((_, i) => (
              <PerfilReferenciaInput
                key={`mau-${i}`}
                form={form}
                campo="maus_perfis"
                index={i}
              />
            ))}
          </section>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" size="lg" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Gerando direcionamento..." : "Gerar direcionamento"}
        </Button>
      </div>
    </form>
  );
}
