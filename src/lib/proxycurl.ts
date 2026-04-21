import type { PerfilEnriquecido, PerfilProxycurl } from "@/types/candidato";

const PROXYCURL_API_KEY = process.env.PROXYCURL_API_KEY;

if (!PROXYCURL_API_KEY) {
  throw new Error(
    "PROXYCURL_API_KEY precisa estar no .env (e nas Environment Variables da Vercel)."
  );
}

const ENDPOINT = "https://nubela.co/proxycurl/api/v2/linkedin";
const TIMEOUT_MS = 15_000;

/**
 * Busca perfil enriquecido no Proxycurl por URL do LinkedIn.
 * Retorna `null` em timeout ou erro — o caller decide descartar do ranking.
 */
export async function proxycurlGetPerson(
  linkedinUrl: string
): Promise<PerfilEnriquecido | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      url: linkedinUrl,
      use_cache: "if-present",
      fallback_to_cache: "on-error",
    });
    const resp = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${PROXYCURL_API_KEY}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!resp.ok) {
      console.warn(
        `[proxycurl] HTTP ${resp.status} para ${linkedinUrl}: ${await resp
          .text()
          .catch(() => "")}`
      );
      return null;
    }
    const data = (await resp.json()) as PerfilProxycurl;
    return { linkedin_url: linkedinUrl, dados: data };
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      console.warn(`[proxycurl] timeout 15s em ${linkedinUrl}`);
    } else {
      console.warn(`[proxycurl] erro em ${linkedinUrl}:`, err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Busca N perfis em paralelo com Promise.allSettled (nenhum request pode derrubar o batch).
 */
export async function proxycurlBatch(
  linkedinUrls: string[]
): Promise<PerfilEnriquecido[]> {
  const settled = await Promise.allSettled(linkedinUrls.map(proxycurlGetPerson));
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<PerfilEnriquecido> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

/**
 * Extrai campos de topo do perfil pro insert Supabase (nome, cargo, empresa).
 */
export function resumoPerfil(p: PerfilEnriquecido): {
  nome: string | null;
  cargo: string | null;
  empresa: string | null;
} {
  const d = p.dados;
  const nome = d.full_name ?? null;
  const cargo = d.occupation ?? d.headline ?? null;
  const empresa = d.experiences?.[0]?.company ?? null;
  return { nome, cargo, empresa };
}
