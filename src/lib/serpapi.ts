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

export type SerpSearchOptions = {
  signal?: AbortSignal;
  /** Localização passada ao Google (ex: "São Paulo, Brazil"). Biases geo. */
  location?: string;
  /** Country code ISO 3166-1 alpha-2 (ex: "br"). Default "br". */
  gl?: string;
};

/**
 * Busca no Google via SerpApi e retorna resultados que apontam pra /in/ do LinkedIn.
 */
export async function serpapiSearch(
  query: string,
  numResults = 20,
  { signal, location, gl = "br" }: SerpSearchOptions = {}
): Promise<SerpResult[]> {
  const params = new URLSearchParams({
    q: query,
    api_key: SERPAPI_KEY!,
    engine: "google",
    num: String(numResults),
    hl: "pt-br",
    gl,
    google_domain: gl === "br" ? "google.com.br" : "google.com",
  });
  if (location) params.set("location", location);

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
    return `https://${u.hostname.replace(/^www\./, "www.")}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
}

// -------- Filtros de localização --------

/**
 * Extrai o country code do subdomínio do LinkedIn (ex: `br.linkedin.com` → "br").
 * Retorna null se não houver subdomínio específico (ex: `www.linkedin.com`).
 */
export function extractLinkedinCountry(url: string): string | null {
  const match = url.match(/^https?:\/\/([a-z]{2})\.linkedin\.com\//i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Mapa simples cidade/país → country code do LinkedIn.
 * Expandir conforme a Moon contratar em mais países.
 */
const COUNTRY_KEYWORDS: Record<string, string[]> = {
  br: [
    "brasil",
    "brazil",
    "são paulo",
    "rio de janeiro",
    "belo horizonte",
    "curitiba",
    "porto alegre",
    "recife",
    "salvador",
    "fortaleza",
    "brasilia",
    "brasília",
  ],
  pt: ["portugal", "lisboa", "porto"],
  us: [
    "united states",
    "usa",
    "new york",
    "san francisco",
    "los angeles",
    "chicago",
    "austin",
    "boston",
  ],
  uk: ["united kingdom", "london", "manchester"],
  ar: ["argentina", "buenos aires"],
  mx: ["mexico", "méxico", "mexico city"],
};

/**
 * Descobre o country code do LinkedIn esperado a partir do texto de localização
 * que o usuário digitou. Retorna null se não conseguir inferir.
 */
export function inferCountryFromLocation(loc: string): string | null {
  const normalized = loc.toLowerCase();
  for (const [cc, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some((k) => normalized.includes(k))) return cc;
  }
  return null;
}

/**
 * Filtra resultados, removendo perfis cujo subdomínio do LinkedIn é de país diferente.
 * Mantém URLs sem subdomínio (www/raw) pois são ambíguas.
 */
export function filterByCountry(
  results: SerpResult[],
  desiredCountry: string | null
): SerpResult[] {
  if (!desiredCountry) return results;
  return results.filter((r) => {
    const urlCountry = extractLinkedinCountry(r.url);
    if (!urlCountry) return true; // www.linkedin.com/in/... — mantém
    return urlCountry === desiredCountry;
  });
}
