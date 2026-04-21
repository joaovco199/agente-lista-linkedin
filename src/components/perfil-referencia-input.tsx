"use client";

import { type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { FormValues } from "./form-nova-vaga";

type Campo = "bons_perfis" | "maus_perfis";

type Props = {
  form: UseFormReturn<FormValues>;
  campo: Campo;
  index: number;
  obrigatorio?: boolean;
};

export function PerfilReferenciaInput({
  form,
  campo,
  index,
  obrigatorio = false,
}: Props) {
  const urlKey = `${campo}.${index}.url` as const;
  const razaoKey = `${campo}.${index}.razao` as const;

  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={urlKey} className="flex items-center gap-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {index + 1}
          </span>
          <span className="text-muted-foreground">
            {campo === "bons_perfis" ? "Bom perfil" : "Perfil a evitar"}{" "}
            {index + 1}
          </span>
        </Label>
        {obrigatorio ? (
          <Badge variant="default" className="text-[10px]">
            Obrigatório
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            Opcional
          </Badge>
        )}
      </div>
      <Input
        id={urlKey}
        placeholder="https://www.linkedin.com/in/..."
        {...form.register(urlKey)}
      />
      <Textarea
        id={razaoKey}
        placeholder={
          campo === "bons_perfis"
            ? "Por que encaixa? (ex: 3 anos fechando ticket > R$ 200k na Pipefy)"
            : "Por que NÃO encaixa? (ex: só fez SDR inbound, nunca prospectou cold)"
        }
        rows={2}
        {...form.register(razaoKey)}
      />
    </div>
  );
}
