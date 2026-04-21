import { supabase } from "@/lib/supabase";

const CHAVE_NOTAS_PROSPECAO = "notas_prospecao_global";

/**
 * Lê as notas globais de prospecção (texto livre com contexto que se aplica
 * a todas as vagas). Retorna string vazia se ainda não existir.
 */
export async function getNotasProspecao(): Promise<string> {
  const { data } = await supabase
    .from("configuracoes")
    .select("valor")
    .eq("chave", CHAVE_NOTAS_PROSPECAO)
    .maybeSingle();
  return (data?.valor ?? "").trim();
}

/**
 * Salva as notas globais. Faz UPSERT — cria se não existir, atualiza se existir.
 */
export async function salvarNotasProspecao(valor: string): Promise<void> {
  await supabase
    .from("configuracoes")
    .upsert(
      {
        chave: CHAVE_NOTAS_PROSPECAO,
        valor,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "chave" }
    );
}
