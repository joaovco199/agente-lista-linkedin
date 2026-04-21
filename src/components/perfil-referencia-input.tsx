"use client";

import { type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CriarVagaBody } from "@/types/api";

type Campo = "bons_perfis" | "maus_perfis";

type Props = {
  form: UseFormReturn<CriarVagaBody>;
  campo: Campo;
  index: number;
};

export function PerfilReferenciaInput({ form, campo, index }: Props) {
  const urlKey = `${campo}.${index}.url` as const;
  const razaoKey = `${campo}.${index}.razao` as const;
  const urlErr = form.formState.errors[campo]?.[index]?.url?.message;
  const razaoErr = form.formState.errors[campo]?.[index]?.razao?.message;

  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {index + 1}
        </span>
        <Label htmlFor={urlKey} className="text-sm text-muted-foreground">
          Perfil {index + 1}
        </Label>
      </div>
      <Input
        id={urlKey}
        placeholder="https://www.linkedin.com/in/..."
        {...form.register(urlKey)}
      />
      {urlErr && <p className="text-xs text-destructive">{urlErr}</p>}
      <Textarea
        id={razaoKey}
        placeholder={
          campo === "bons_perfis"
            ? "Por que esse perfil encaixa? (ex: 3 anos fechando ticket > R$ 200k na Pipefy)"
            : "Por que esse perfil NÃO encaixa? (ex: só fez SDR inbound, nunca prospectou cold)"
        }
        rows={2}
        {...form.register(razaoKey)}
      />
      {razaoErr && <p className="text-xs text-destructive">{razaoErr}</p>}
    </div>
  );
}
