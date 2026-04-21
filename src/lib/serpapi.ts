const SERPAPI_KEY = process.env.SERPAPI_KEY;

if (!SERPAPI_KEY) {
  throw new Error(
    "SERPAPI_KEY precisa estar no .env (e nas Environment Variables da Vercel)."
  );
}

export type SerpResult = {
  index: number;
  title: string;
  url: string;
  snippet: string;
};

type SerpApiOrganic = {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
};

type SerpApiResponse = {
  organic_results?: SerpApiOrganic[];
  error?: string;
};

/**
 * Busca no Google via SerpApi e retorna resultados que apontam pra /in/ do LinkedIn.
 * `query` deve ser uma search string já pronta (com `site:linkedin.com/in ...` se possível).
 */
export async function serpapiSearch(
  query: string,
  numResults = 20,
  { signal }: { signal?: AbortSignal } = {}
): Promise<SerpResult[]> {
  const params = new URLSearchParams({
    q: query,
    api_key: SERPAPI_KEY!,
    engine: "google",
    num: String(numResults),
    hl: "pt-br",
    gl: "br",
  });
  const url = `https://serpapi.com/search.json?${params.toString()}`;

  const resp = await fetch(url, { signal, cache: "no-store" });
  if (!resp.ok) {
    throw new Error(
      `SerpApi retornou HTTP ${resp.status}: ${await resp.text().catch(() => "")}`
    );
  }
  const json = (await resp.json()) as SerpApiResponse;
  if (json.error) {
    throw new Error(`SerpApi error: ${json.error}`);
  }
  const organic = json.organic_results ?? [];

  return organic
    .filter((r): r is Required<Pick<SerpApiOrganic, "link">> & SerpApiOrganic => {
      if (!r.link) return false;
      // Só URLs públicas de perfil (/in/). Pula posts, /pub/, /company/.
      return /^https?:\/\/[^/]*linkedin\.com\/in\//i.test(r.link);
    })
    .map((r, i) => ({
      index: i + 1,
      title: r.title ?? "",
      url: normalizeLinkedinUrl(r.link),
      snippet: r.snippet ?? "",
    }));
}

function normalizeLinkedinUrl(url: string): string {
  try {
    const u = new URL(url);
    // Normaliza host, remove query/fragment
    return `https://${u.hostname.replace(/^www\./, "www.")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}
