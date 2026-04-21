"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PerfilReferenciaInput } from "./perfil-referencia-input";
import { criarVagaBodySchema, type CriarVagaBody } from "@/types/api";

const perfilVazio = { url: "", razao: "" };

const defaultValues: CriarVagaBody = {
  jd: "",
  keywords: "",
  cargo_senioridade: "",
  localizacao: "",
  bons_perfis: Array.from({ length: 5 }, () => ({ ...perfilVazio })),
  maus_perfis: Array.from({ length: 5 }, () => ({ ...perfilVazio })),
};

export function FormNovaVaga() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const form = useForm<CriarVagaBody>({
    resolver: zodResolver(criarVagaBodySchema),
    defaultValues,
  });

  async function onSubmit(values: CriarVagaBody) {
    setLoading(true);
    try {
      const resp = await fetch("/api/vagas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
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
            {form.formState.errors.jd && (
              <p className="text-xs text-destructive">
                {form.formState.errors.jd.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="cargo_senioridade">Cargo e senioridade</Label>
              <Input
                id="cargo_senioridade"
                placeholder="ex: Account Executive Sênior"
                {...form.register("cargo_senioridade")}
              />
              {form.formState.errors.cargo_senioridade && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.cargo_senioridade.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                placeholder="ex: São Paulo, Brasil (ou Remoto — Brasil)"
                {...form.register("localizacao")}
              />
              {form.formState.errors.localizacao && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.localizacao.message}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="keywords">Palavras-chave</Label>
            <Input
              id="keywords"
              placeholder="ex: outbound, HubSpot, Salesforce, SaaS B2B"
              {...form.register("keywords")}
            />
            {form.formState.errors.keywords && (
              <p className="text-xs text-destructive">
                {form.formState.errors.keywords.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Perfis de referência</CardTitle>
          <CardDescription>
            5 perfis do LinkedIn que encaixam (bons) e 5 que não (anti-exemplos).
            Para cada um, explique a razão — isso alimenta o ranking final.
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
              />
            ))}
          </section>
          <Separator />
          <section className="grid gap-3">
            <h3 className="text-base font-semibold">
              Perfis a evitar (anti-exemplos)
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
