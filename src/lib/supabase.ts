import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — evita validar env vars no top-level (que quebraria o
// `next build` quando a Vercel coleta page data sem env exposta no passo).
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_URL e SUPABASE_ANON_KEY precisam estar no .env (e nas Environment Variables da Vercel em produção)."
    );
  }

  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  return _client;
}

/**
 * Proxy que só cria o cliente Supabase na primeira chamada.
 * Uso: `supabase.from('tabela').select(...)` funciona como antes.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
