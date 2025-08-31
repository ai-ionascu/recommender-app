// frontend/src/api/search.js
import { http } from "@/api/http";

/** Convert array to CSV; undefined for empty values */
function toCsv(v) {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.length ? v.join(",") : undefined;
  return v;
}

/** Low-level helper: try /search, then fall back to /products/search */
async function getWithFallback(path, params) {
  // helpful debug in console
  console.debug("[search] GET", path, params);
  try {
    const { data } = await http.get(path, { params });
    console.debug("[search] OK", path, { items: data?.items?.length, facets: !!data?.facets });
    return data;
  } catch (e1) {
    const status = e1?.response?.status;
    console.warn("[search] FAIL", path, status, e1?.message);

    // If first try was '/search', attempt '/products/search'
    if (path === "/search") {
      try {
        const alt = "/products/search";
        console.debug("[search] RETRY", alt, params);
        const { data } = await http.get(alt, { params });
        console.debug("[search] OK (fallback)", alt, { items: data?.items?.length, facets: !!data?.facets });
        return data;
      } catch (e2) {
        console.error("[search] FAIL (fallback)", "/products/search", e2?.response?.status, e2?.message);
        throw e2;
      }
    }

    throw e1;
  }
}

/** Full-text search with filters; returns { total, items, facets? } */
export async function searchProducts(params = {}) {
  const {
    q, sort, page = 1, size = 12,
    country, grape, minPrice, maxPrice,
    inStock, category, year,
  } = params;

  // send both singular and plural keys in case backend expects one or the other
  const csvCountry = toCsv(country);
  const csvGrape = toCsv(grape);

  const query = {
    q: q || undefined,
    sort: sort || undefined,
    page,
    size,
    // filters (try both names so it works regardless of backend naming)
    country: csvCountry,
    countries: csvCountry,
    grape: csvGrape,
    grapes: csvGrape,
    minPrice: minPrice ?? undefined,
    maxPrice: maxPrice ?? undefined,
    inStock: typeof inStock === "boolean" ? inStock : undefined,
    category: category || undefined,
    year: year || undefined,
  };

  // first try /search then fallback to /products/search
  return await getWithFallback("/search", query);
}

/** Autocomplete suggestions; returns { items: [...] } */
export async function autocomplete(q, size = 8) {
  const params = { q, size };
  console.debug("[autocomplete] GET /search/autocomplete", params);
  try {
    const { data } = await http.get("/search/autocomplete", { params });
    return data;
  } catch (e1) {
    // fallback to /products/search/autocomplete
    try {
      const alt = "/products/search/autocomplete";
      console.debug("[autocomplete] RETRY", alt, params);
      const { data } = await http.get(alt, { params });
      return data;
    } catch (e2) {
      console.error("[autocomplete] FAIL", e2?.response?.status, e2?.message);
      throw e2;
    }
  }
}
