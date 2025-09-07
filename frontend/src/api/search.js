import { http } from "@/api/http";

/** Convert array to CSV; undefined for empty values */
function toCsv(v) {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.length ? v.join(",") : undefined;
  return v;
}

/**
 * Low-level helper: try /search, then fall back to /products/search.
 * Accepts an optional paramsSerializer for custom query string building.
 */
async function getWithFallback(path, params, paramsSerializer) {
  console.debug("[search] GET", path, params);
  try {
    const { data } = await http.get(path, { params, ...(paramsSerializer ? { paramsSerializer } : {}) });
    console.debug("[search] OK", path, { items: data?.items?.length, facets: !!data?.facets, total: data?.total });
    return data;
  } catch (e1) {
    const status = e1?.response?.status;
    console.warn("[search] FAIL", path, status, e1?.message);

    if (path === "/search") {
      try {
        const alt = "/products/search";
        console.debug("[search] RETRY", alt, params);
        const { data } = await http.get(alt, { params, ...(paramsSerializer ? { paramsSerializer } : {}) });
        console.debug("[search] OK (fallback)", alt, { items: data?.items?.length, facets: !!data?.facets, total: data?.total });
        return data;
      } catch (e2) {
        console.error("[search] FAIL (fallback)", "/products/search", e2?.response?.status, e2?.message);
        throw e2;
      }
    }

    throw e1;
  }
}

/** Dedup helper by id/_id. */
function dedupeItems(arr) {
  const map = new Map();
  for (const it of arr || []) {
    const id = it?.id ?? it?._id;
    if (id == null) continue;
    if (!map.has(id)) map.set(id, it);
  }
  return Array.from(map.values());
}

/** Build request params + serializer from options (without firing the request). */
export function buildParamsAndSerializer(options = {}) {
  const {
    q, sort, page, size,
    category, country, grape, wine_type, beer_style,
    spirit_type, accessory_type, compatible_with_product_type,
    minPrice, maxPrice, inStock,
    year, // optional
  } = options || {};

  const params = {};
  if (q != null && String(q).trim() !== "") params.q = q;
  if (sort) params.sort = sort;
  if (page != null) params.page = Number(page);
  if (size != null) params.size = Number(size);
  if (typeof inStock === "boolean") params.inStock = inStock;
  if (minPrice != null && String(minPrice) !== "") params.minPrice = Number(minPrice);
  if (maxPrice != null && String(maxPrice) !== "") params.maxPrice = Number(maxPrice);
  if (year != null && String(year).trim() !== "") params.year = Number(year);

  // CATEGORY
  if (Array.isArray(category) && category.length) {
    params.category = category.join(",");
  } else if (typeof category === "string" && category.trim()) {
    params.category = category.trim();
  }

  // OTHER FACETS (arrays -> repeated params + CSV companion)
  const facetArrays = {
    country, grape, wine_type, beer_style, spirit_type, accessory_type,
    compatible_with_product_type
  };
  for (const [k, v] of Object.entries(facetArrays)) {
    if (!v) continue;
    const arr = Array.isArray(v) ? v : [v];
    const cleaned = arr.map(String).map(s => s.trim()).filter(Boolean);
    if (!cleaned.length) continue;
    params[k] = cleaned;                    // repeated ?k=v1&k=v2
    params[`${k}_csv`] = cleaned.join(","); // optional CSV
  }
  if (params.country_csv) params.countries = params.country_csv;
  if (params.grape_csv)   params.grapes    = params.grape_csv;

  const paramsSerializer = {
    serialize: (p) => {
      const usp = new URLSearchParams();
      for (const [key, value] of Object.entries(p)) {
        if (value == null || value === "") continue;
        if (Array.isArray(value)) value.forEach(v => usp.append(key, String(v)));
        else usp.append(key, String(value));
      }
      return usp.toString();
    }
  };

  return { params, paramsSerializer };
}

/** Category universe we care about (adjust if you add new ones). */
const CANDIDATE_CATEGORIES = ["wine", "beer", "spirits", "accessories"];

/**
 * Keep only facet keys that make sense for a given category.
 * Shared filters like q / price / inStock / country remain;
 * category-specific ones are pruned if they don’t apply.
 */
function pruneOptionsForCategory(options = {}, cat) {
  const base = {
    q: options.q,
    sort: options.sort,
    page: options.page,
    size: options.size,
    inStock: options.inStock,
    minPrice: options.minPrice,
    maxPrice: options.maxPrice,
    year: options.year,
    // shared facet across categories in your API
    country: options.country,
    category: cat,
  };

  if (cat === "wine") {
    return {
      ...base,
      grape: options.grape,
      wine_type: options.wine_type,
      // nothing beer/spirits/accessories specific
    };
  }
  if (cat === "spirits") {
    return {
      ...base,
      spirit_type: options.spirit_type,
    };
  }
  if (cat === "beer") {
    return {
      ...base,
      beer_style: options.beer_style,
    };
  }
  if (cat === "accessories") {
    return {
      ...base,
      accessory_type: options.accessory_type,
      compatible_with_product_type: options.compatible_with_product_type,
    };
  }
  // unknown category → keep only shared filters
  return base;
}

/** Probe totals per category using the same filters (except category). */
async function probeCategoryTotals(baseOptions) {
  const probes = [];
  for (const cat of CANDIDATE_CATEGORIES) {
    const pruned = pruneOptionsForCategory(
      { ...baseOptions, page: 1, size: 1 },
      cat
    );
    const { params: p1, paramsSerializer: s1 } = buildParamsAndSerializer(pruned);
   
    delete p1.categories;

    probes.push(
      getWithFallback("/search", p1, s1)
        .then((d) => ({ value: cat, count: Number(d?.total ?? 0) }))
        .catch(() => ({ value: cat, count: 0 }))
    );
  }
  return Promise.all(probes);
}

/**
 * searchProducts — robust:
 * 1) încearcă query-ul „natural”
 * 2) dacă ai 2+ categorii și total === 0 → fallback client-side (OR):
 *    - per-category fetch (page=1, size=pageUI*sizeUI), union + dedupe
 *    - paginare locală
 *    - facets.category din totalurile per-categorie
 * 3) în cazurile normale (0 sau 1 categorie selectată), dacă serverul NU dă facets.category,
 *    probăm rapid totalurile pentru toate categoriile și le populăm corect.
 */
export async function searchProducts(options = {}) {
  const { params, paramsSerializer } = buildParamsAndSerializer(options);

  // 1) normal server search (cu fallback intern la /products/search)
  const data = await getWithFallback("/search", params, paramsSerializer);

  const rawCategory = options.category;
  const isMultiCat = Array.isArray(rawCategory) && rawCategory.length > 1;

  // 2) client-side OR fallback numai dacă serverul dă 0 rezultate
  if (isMultiCat && (Number(data?.total ?? 0) === 0 || (Array.isArray(data?.items) && data.items.length === 0))) {
    console.warn("[search] multi-category server returned 0; using client-side OR merge");

    const pageUI = Number(options.page ?? 1);
    const sizeUI = Number(options.size ?? 12);
    const needCount = Math.max(sizeUI, pageUI * sizeUI);

    const perCatResults = [];
    for (const cat of rawCategory) {
      const pruned = pruneOptionsForCategory(
        { ...options, page: 1, size: needCount },
        cat
      );
      const { params: p1, paramsSerializer: s1 } = buildParamsAndSerializer(pruned);
      delete p1.categories;

      try {
        const d = await getWithFallback("/search", p1, s1);
        perCatResults.push({ cat, data: d });
      } catch (e) {
        console.warn("[search] per-category request failed", cat, e?.response?.status || e?.message);
      }
    }

    const union = dedupeItems(perCatResults.flatMap(r => r.data?.items || []));
    const start = Math.max(0, (pageUI - 1) * sizeUI);
    const end = start + sizeUI;
    const sliced = union.slice(start, end);

    // Facets: category din totalurile fiecărei categorii din probe
    const categoryFacet = perCatResults.map(({ cat, data: r }) => ({
      value: cat,
      count: Number(r?.total ?? (Array.isArray(r?.items) ? r.items.length : 0)),
    }));

    const baseFacets =
      perCatResults.find(r => r.data?.facets && Object.keys(r.data.facets).length)?.data.facets
      ?? data?.facets
      ?? {};

    const facets = { ...baseFacets, category: categoryFacet };

    return { total: union.length, items: sliced, facets };
  }

  // 3) Caz normal: dacă nu avem facets.category din server,
  //    calculăm noi corect prin probe (cu aceleași filtre).
  const hasServerCategoryFacet =
    !!data?.facets?.category &&
    Array.isArray(data.facets.category) &&
    data.facets.category.some((x) => x && (x.count != null || x.doc_count != null));

  if (!hasServerCategoryFacet) {
    // Scoatem categoria din opțiuni pentru a calcula corect universul per-cat
    const { category, ...rest } = options || {};
    try {
      const categoryFacet = await probeCategoryTotals(rest);
      const facets = { ...(data?.facets || {}), category: categoryFacet };
      return { ...(data || {}), facets };
    } catch {
      // Dacă probing-ul eșuează, întoarcem răspunsul original
      return data;
    }
  }

  return data;
}

/** Autocomplete suggestions; returns { items: [...] } */
export async function autocomplete(q, size = 8) {
  const params = { q, size };
  console.debug("[autocomplete] GET /search/autocomplete", params);
  try {
    const { data } = await http.get("/search/autocomplete", { params });
    return data;
  } catch (e1) {
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
