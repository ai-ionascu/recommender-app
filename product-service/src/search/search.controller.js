// search.controller.js
// Exposes: search(req,res) and autocomplete(req,res)

import { es } from "../search/esClient.js";

// Small helper: safe number
const N = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// Build ES query from request
function buildQuery(req) {
  const {
    q,
    sort,
    page = 1,
    size = 12,
    inStock,
    minPrice,
    maxPrice,
    year,

    // facets
    category,
    country, grape, wine_type, beer_style,
    spirit_type, accessory_type, compatible_with_product_type,
  } = req.query;

  // pagination
  const from = (N(page, 1) - 1) * N(size, 12);
  const sizeNum = N(size, 12);

  // normalize helpers: each can be sent as ?k=v1&k=v2 OR comma CSV
  const normArr = (v, csvAltKey) => {
    const a = Array.isArray(v) ? v : (typeof v === "string" ? v.split(",") : []);
    const b = Array.isArray(req.query[csvAltKey]) ? req.query[csvAltKey] : (req.query[csvAltKey] || "").split(",");
    const merged = [...a, ...b].map(String).map(s => s.trim()).filter(Boolean);
    return Array.from(new Set(merged));
  };

  const must = [];
  const filter = [];

  if (q && String(q).trim()) {
    must.push({
      multi_match: {
        query: q,
        fields: [
          "name^4",
          "description^2",
          "highlight^3",
          "country^3",
          "region^2",
          "search_blob",
        ],
        type: "best_fields",
        operator: "and",
      }
    });
  }

  const cat = normArr(category, "categories");
  if (cat.length) filter.push({ terms: { category: cat } });

  const countries  = normArr(country, "countries");
  const grapes     = normArr(grape, "grapes");
  const wineTypes  = normArr(wine_type);
  const beerStyles = normArr(beer_style);
  const spiritTypes= normArr(spirit_type);
  const accTypes   = normArr(accessory_type);
  const accCompat  = normArr(compatible_with_product_type);

  if (countries.length)  filter.push({ terms: { country: countries } });
  if (grapes.length)     filter.push({ terms: { "wines.grape_variety": grapes } });
  if (wineTypes.length)  filter.push({ terms: { "wines.wine_type": wineTypes } });
  if (beerStyles.length) filter.push({ terms: { "beers.style": beerStyles } });
  if (spiritTypes.length)filter.push({ terms: { "spirits.spirit_type": spiritTypes } });
  if (accTypes.length)   filter.push({ terms: { "accessories.accessory_type": accTypes } });
  if (accCompat.length)  filter.push({ terms: { "accessories.compatible_with_product_type": accCompat } });

  if (inStock === "true" || inStock === true) {
    filter.push({ range: { stock: { gt: 0 } } });
  }
  if (minPrice != null || maxPrice != null) {
    const r = {};
    if (minPrice != null && String(minPrice) !== "") r.gte = N(minPrice, 0);
    if (maxPrice != null && String(maxPrice) !== "") r.lte = N(maxPrice, 999999);
    filter.push({ range: { price: r } });
  }
  if (year != null && String(year).trim() !== "") {
    filter.push({ term: { year: N(year, 0) } });
  }

  // sort
  let sortClause = [{ _score: "desc" }];
  if (sort === "price_asc")  sortClause = [{ price: "asc" }];
  if (sort === "price_desc") sortClause = [{ price: "desc" }];
  if (sort === "newest")     sortClause = [{ created_at: "desc" }];
  if (sort === "popularity") sortClause = [{ popularity: "desc" }];

  // aggregations — NOTE: they are computed on the *filtered* set
  // (React keeps full option lists client-side via caching);
  // category counts stay dynamic which you asked for.
  const aggs = {
    category: { terms: { field: "category", size: 20 } },
    grape:    { terms: { field: "wines.grape_variety", size: 100 } },
    wine_type:{ terms: { field: "wines.wine_type", size: 50 } },
    beer_style:{ terms: { field: "beers.style", size: 50 } },
    spirit_type:{ terms: { field: "spirits.spirit_type", size: 50 } },
    accessory_type:{ terms: { field: "accessories.accessory_type", size: 50 } },
    compatible_with_product_type:{ terms: { field: "accessories.compatible_with_product_type", size: 10 } },

    // country split by category (for the three drink categories)
    country_wine:    { terms: { field: "country", size: 100 } },
    country_spirits: { terms: { field: "country", size: 100 } },
    country_beer:    { terms: { field: "country", size: 100 } },
  };

  // We’ll post-filter per category for country_* using a filter agg,
  // it keeps counts relevant without losing other categories.
  const rootQuery = {
    bool: {
      must,
      filter,
    }
  };

  return {
    from,
    size: sizeNum,
    track_total_hits: true,
    query: rootQuery,
    sort: sortClause,
    aggs: {
      ...aggs,
      country_wine: {
        filter: { term: { category: "wine" } },
        aggs:   { buckets: { terms: { field: "country", size: 100 } } }
      },
      country_spirits: {
        filter: { term: { category: "spirits" } },
        aggs:   { buckets: { terms: { field: "country", size: 100 } } }
      },
      country_beer: {
        filter: { term: { category: "beer" } },
        aggs:   { buckets: { terms: { field: "country", size: 100 } } }
      },
    }
  };
}

export async function search(req, res) {
  try {
    const body = buildQuery(req);
    const r = await es.search({ index: "products", body });

    const items = (r.hits?.hits || []).map(h => ({ _id: h._id, ...h._source }));
    const total = r.hits?.total?.value ?? items.length;

    const a = r.aggregations || {};
    const facets = {
      category: (a.category?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),
      grape: (a.grape?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),
      wine_type: (a.wine_type?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),
      beer_style: (a.beer_style?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),
      spirit_type: (a.spirit_type?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),
      accessory_type: (a.accessory_type?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),
      compatible_with_product_type: (a.compatible_with_product_type?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),

      // pull inner agg buckets we defined above
      country_wine: (a.country_wine?.buckets?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),
      country_spirits: (a.country_spirits?.buckets?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),
      country_beer: (a.country_beer?.buckets?.buckets || []).map(b => ({ key: b.key, doc_count: b.doc_count })),
    };

    res.json({ total, items, facets, aggregations: r.aggregations });
  } catch (err) {
    console.error("[search] error", err?.meta?.body || err);
    res.status(500).json({ error: "Search failed" });
  }
}

export async function autocomplete(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const size = N(req.query.size, 8);

    if (!q) return res.json({ items: [] });

    const r = await es.search({
      index: "products",
      body: {
        size,
        _source: ["id", "name", "slug", "category"],
        query: {
          multi_match: {
            query: q,
            fields: ["name^3", "grape^2", "country^2", "search_blob"],
            type: "best_fields",
          }
        }
      }
    });

    const items = (r.hits?.hits || []).map(h => h._source);
    res.json({ items });
  } catch (err) {
    console.error("[autocomplete] error", err?.meta?.body || err);
    res.status(500).json({ error: "Autocomplete failed" });
  }
}
