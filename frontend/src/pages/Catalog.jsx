import { useEffect, useMemo, useState } from "react";
import { searchProducts } from "@/api/search";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import MultiSelectFacet from "@/components/facets/MultiSelectFacet";
import PriceFacet from "@/components/facets/PriceFacet";
import SelectedChips from "@/components/facets/SelectedChips";
import { useCartStore } from "@/store/cartStore";
import { getProductById } from "@/api/products";
import Pagination from "@/components/Pagination";
import { useLocation, useNavigate } from "react-router-dom";

/** Normalize various facet item shapes to { value, count } */
function normalizeFacetList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (typeof item === "string") return { value: item, count: null };
    if (item?.value) return item;
    if (item?.key) return { value: item.key, count: item.count ?? item.doc_count ?? null };
    return { value: String(item), count: null };
  });
}

async function enrichWithImages(items) {
  const need = items.filter(i => !(Array.isArray(i.images) && i.images.length > 0));
  if (need.length === 0) return items;
  await Promise.all(need.map(async (it) => {
    try {
      const prod = await getProductById(it.id ?? it._id);
      if (prod) {
        it.images = prod.images ?? prod.images ?? [];
      }
    } catch (e) {
      // ignore fail — rămâne fallback vizual
      console.warn('[catalog] failed to enrich product', it.id ?? it._id, e?.message);
    }
  }));
  return items;
}

export default function Catalog() {
  // Query state
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const location = useLocation();
  const navigate = useNavigate();

  // Read q from URL on mount and when the URL changes (e.g., from Navbar/SearchBar)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get("q") || "";
    setQ(qParam);
    // optionally, reset page to 1 when query changes
    setPage(1);
  }, [location.search]);

  // Facet selections
  const [selCategories, setSelCategories] = useState(() => new Set());
  const [selCountries, setSelCountries] = useState(() => new Set());
  const [selGrapes, setSelGrapes] = useState(() => new Set());
  const [selWineTypes, setSelWineTypes] = useState(() => new Set());
  const [selBeerStyles, setSelBeerStyles] = useState(() => new Set());
  const [minPrice, setMinPrice] = useState(undefined);
  const [maxPrice, setMaxPrice] = useState(undefined);

  // Data & facets
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [facets, setFacets] = useState({
    category: [],
    country: [],
    grape: [],
    wine_type: [],
    beer_style: [],
    price: [],
  });

  // UI/aux state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fallbackNote, setFallbackNote] = useState(null);
  const [facetCache, setFacetCache] = useState({
    category: new Set(),
    country: new Set(),
    grape: new Set(),
    wine_type: new Set(),
    beer_style: new Set(),
  });

  // Live metadata hydrated from product-service (source of truth)
  const [liveStock, setLiveStock] = useState({});
  const [liveGrapes, setLiveGrapes] = useState(new Set());

  const addItem = useCartStore((s) => s.addItem);

  // Sort options
  const sortOptions = useMemo(() => {
    if (!q) return [
      { value: "price_asc", label: "Price ↑" },
      { value: "price_desc", label: "Price ↓" },
      { value: "newest", label: "Newest" },
      { value: "popularity", label: "Popularity" },
    ];
    return [
      { value: "relevance", label: "Relevance" },
      { value: "price_asc", label: "Price ↑" },
      { value: "price_desc", label: "Price ↓" },
      { value: "newest", label: "Newest" },
      { value: "popularity", label: "Popularity" },
    ];
  }, [q]);

  /** Coerce any Set<any> -> Set<string> of normalized, trimmed values */
  const toValueSet = (input) => {
    const arr = Array.from(input instanceof Set ? input : new Set(input));
    return new Set(
      arr
        .map(x => (x && typeof x === "object" ? (x.value ?? x.key ?? "") : x))
        .map(v => (v == null ? "" : String(v)))
        .map(s => s.trim())
        .filter(Boolean)
    );
  };

  // Arrays for chips & API
  const categoryArr = useMemo(() => Array.from(selCategories).filter(Boolean), [selCategories]);
  const countryArr  = useMemo(() => Array.from(selCountries).filter(Boolean),  [selCountries]);
  const grapeArr    = useMemo(() => Array.from(selGrapes).filter(Boolean),    [selGrapes]);
  const wineTypeArr = useMemo(() => Array.from(selWineTypes).filter(Boolean),  [selWineTypes]);
  const beerStyleArr= useMemo(() => Array.from(selBeerStyles).filter(Boolean), [selBeerStyles]);

  // Chips model
  const chips = useMemo(() => {
    const cat = categoryArr.map((v) => ({ facet: "category", value: v }));
    const c = countryArr.map((v) => ({ facet: "country", value: v }));
    const g = grapeArr.map((v) => ({ facet: "grape", value: v }));
    const w = wineTypeArr.map((v) => ({ facet: "wine_type", value: v }));
    const b = beerStyleArr.map((v) => ({ facet: "beer_style", value: v }));
    const p = (minPrice != null || maxPrice != null)
      ? [{ facet: "price", value: `${minPrice ?? "min"}–${maxPrice ?? "max"}` }]
      : [];
    return [...cat, ...c, ...g, ...w, ...b, ...p];
  }, [categoryArr, countryArr, grapeArr, wineTypeArr, beerStyleArr, minPrice, maxPrice]);

  // Remove chip
  const removeChip = (facet, value) => {
    if (facet === "category") {
      setSelCategories(prev => { const n = new Set(prev); n.delete(value); return n; });
      if (value === "wine") setSelWineTypes(new Set());
      if (value === "beer") setSelBeerStyles(new Set());
    } else if (facet === "country") {
      setSelCountries(prev => { const n = new Set(prev); n.delete(value); return n; });
    } else if (facet === "grape") {
      setSelGrapes(prev => { const n = new Set(prev); n.delete(value); return n; });
    } else if (facet === "wine_type") {
      setSelWineTypes(prev => { const n = new Set(prev); n.delete(value); return n; });
    } else if (facet === "beer_style") {
      setSelBeerStyles(prev => { const n = new Set(prev); n.delete(value); return n; });
    } else if (facet === "price") {
      setMinPrice(undefined); setMaxPrice(undefined);
    }
    setPage(1);
  };

  // Facet change handlers
  const changeCategories = (nextSet) => {
    const sanitized = toValueSet(nextSet);
    setSelCategories(sanitized);
    const hasWine = sanitized.has("wine");
    const hasBeer = sanitized.has("beer");
    if (!hasWine) setSelWineTypes(new Set());
    if (!hasBeer) setSelBeerStyles(new Set());
    setPage(1);
  };
  const changeCountries = (nextSet) => { setSelCountries(toValueSet(nextSet)); setPage(1); };
  const changeGrapes    = (nextSet) => { setSelGrapes(toValueSet(nextSet));    setPage(1); };
  const changeWineTypes = (nextSet) => { setSelWineTypes(toValueSet(nextSet)); setPage(1); };
  const changeBeerStyles= (nextSet) => { setSelBeerStyles(toValueSet(nextSet));setPage(1); };
  const applyPrice = ({ min, max }) => { setMinPrice(min); setMaxPrice(max); setPage(1); };

  // Main fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFallbackNote(null);

    (async () => {
      try {
        const data = await searchProducts({
          q: q || undefined,
          sort: (!q && sort === "relevance") ? "newest" : sort,
          page,
          size: limit,
          category:  categoryArr,
          country:   countryArr,
          grape:     grapeArr,
          wine_type: wineTypeArr,
          beer_style:beerStyleArr,
          minPrice,
          maxPrice,
        });

        if (!cancelled) {
          const itemsWithImages = await enrichWithImages(data.items ?? data);
          setItems(itemsWithImages);
          setTotal(Number.isFinite(data?.total) ? Number(data.total) : null);

          // local counters (fallback) from current items
          const countBy = (arr, getter) => {
            const m = new Map();
            for (const it of arr) {
              const v = getter(it);
              if (!v) continue;
              m.set(v, (m.get(v) || 0) + 1);
            }
            return m;
          };
          const counts = {
            category:  countBy(itemsWithImages, it => it.category),
            country:   countBy(itemsWithImages, it => it.country),
            grape:     countBy(itemsWithImages, it =>
              it.grape ??
              it.wines?.grape_variety ??
              it.wines?.grapeVariety ??
              it.details?.grape_variety ??
              it.details?.grapeVariety ??
              it.variety
            ),
            wine_type: countBy(itemsWithImages, it => it.wines?.wine_type || it.wines?.wineType),
            beer_style:countBy(itemsWithImages, it => it.beers?.style || it.beers?.beer_style),
          };

          // Facet extraction
          const extractBuckets = (node) => {
            if (!node) return [];
            if (Array.isArray(node)) return node;
            if (Array.isArray(node.buckets)) return node.buckets;
            return [];
          };
          const getFacetArray = (data, name) => {
            const f = data?.facets ?? {};
            const aggs = data?.aggregations ?? data?.aggs ?? {};
            const candidates = [name, `${name}s`, `${name}_variety`, `${name}Variety`, "variety", "varieties"];
            const pick = (obj) => {
              for (const k of candidates) if (obj?.[k]) return obj[k];
              return null;
            };
            const fromFacets = pick(f);
            const fromAggs = (() => {
              for (const k of candidates) {
                const node = aggs?.[k];
                if (node?.buckets) return node.buckets;
              }
              return null;
            })();
            const raw = fromFacets ?? fromAggs ?? [];
            return normalizeFacetList(raw);
          };

          // Base facets
          let categoryOpts = getFacetArray(data, "category");
          let countryOpts  = getFacetArray(data, "country");
          let grapeOpts    = getFacetArray(data, "grape");

          // Nested facets
          let wineTypeOpts =
            getFacetArray(data, "wine_type").length
              ? getFacetArray(data, "wine_type")
              : normalizeFacetList(
                  (data?.aggregations?.["wines.wine_type"]?.buckets) ||
                  (data?.aggs?.["wines.wine_type"]?.buckets) || []
                );

          let beerStyleOpts =
            getFacetArray(data, "beer_style").length
              ? getFacetArray(data, "beer_style")
              : normalizeFacetList(
                  (data?.aggregations?.["beers.style"]?.buckets) ||
                  (data?.aggs?.["beers.style"]?.buckets) || []
                );

          // Fallbacks from items
          if (!categoryOpts.length) {
            const uniq = Array.from(new Set(itemsWithImages.map(it => it.category).filter(Boolean)));
            categoryOpts = uniq.map(v => ({ value: v, count: null }));
          }
          if (!countryOpts.length) {
            const uniq = Array.from(new Set(itemsWithImages.map(it => it.country).filter(Boolean)));
            countryOpts = uniq.map(v => ({ value: v, count: null }));
          }
          if (!grapeOpts.length) {
            const uniq = Array.from(new Set(
              itemsWithImages
                .map(it =>
                  it.grape ??
                  it.wines?.grape_variety ??
                  it.wines?.grapeVariety ??
                  it.details?.grape_variety ??
                  it.details?.grapeVariety ??
                  it.variety
                )
                .filter(Boolean)
            ));
            grapeOpts = uniq.map(v => ({ value: v, count: null }));
          }
          if (!wineTypeOpts.length) {
            const uniq = Array.from(new Set(
              itemsWithImages.map(it => it.wines?.wine_type || it.wines?.wineType).filter(Boolean)
            ));
            wineTypeOpts = uniq.map(v => ({ value: v, count: null }));
          }
          if (!beerStyleOpts.length) {
            const uniq = Array.from(new Set(
              itemsWithImages.map(it => it.beers?.style || it.beers?.beer_style).filter(Boolean)
            ));
            beerStyleOpts = uniq.map(v => ({ value: v, count: null }));
          }

          // Apply local per-page counts when server doesn't provide doc_count
          const applyLocalCounts = (opts, map) =>
            (opts || []).map(o => ({
              value: o.value,
              count: (o.count ?? o.doc_count ?? null) ?? (map.get(o.value) || 0),
            }));
          categoryOpts  = applyLocalCounts(categoryOpts,  counts.category);
          countryOpts   = applyLocalCounts(countryOpts,   counts.country);
          grapeOpts     = applyLocalCounts(grapeOpts,     counts.grape);
          wineTypeOpts  = applyLocalCounts(wineTypeOpts,  counts.wine_type);
          beerStyleOpts = applyLocalCounts(beerStyleOpts, counts.beer_style);

          // Always union with hydrated grapes (DB truth)
          if (liveGrapes.size) {
            const map = new Map(grapeOpts.map(o => [o.value, { value: o.value, count: o.count ?? 0 }]));
            for (const v of Array.from(liveGrapes)) if (v && !map.has(v)) map.set(v, { value: v, count: 0 });
            grapeOpts = Array.from(map.values());
          }

          // Cache + union with selected/cached values so they don't disappear
          const nextCache = {
            category: new Set(facetCache.category || []),
            country:  new Set(facetCache.country  || []),
            grape:    new Set(facetCache.grape    || []),
            wine_type:new Set(facetCache.wine_type|| []),
            beer_style:new Set(facetCache.beer_style|| []),
          };
          categoryOpts.forEach(o => o?.value && nextCache.category.add(o.value));
          countryOpts.forEach(o => o?.value && nextCache.country.add(o.value));
          grapeOpts.forEach(o => o?.value && nextCache.grape.add(o.value));
          wineTypeOpts.forEach(o => o?.value && nextCache.wine_type.add(o.value));
          beerStyleOpts.forEach(o => o?.value && nextCache.beer_style.add(o.value));
          setFacetCache(nextCache);

          const unionWith = (opts, selectedArr, cachedSet) => {
            const map = new Map((opts || []).map(o => [o.value, { value: o.value, count: o.count ?? o.doc_count ?? 0 }]));
            for (const v of (selectedArr || [])) if (v && !map.has(v)) map.set(v, { value: v, count: 0 });
            for (const v of Array.from(cachedSet || [])) if (v && !map.has(v)) map.set(v, { value: v, count: 0 });
            return Array.from(map.values());
          };

          setFacets({
            category:  unionWith(categoryOpts,  categoryArr,  nextCache.category),
            country:   unionWith(countryOpts,   countryArr,   nextCache.country),
            grape:     unionWith(grapeOpts,     grapeArr,     nextCache.grape),
            wine_type: unionWith(wineTypeOpts,  wineTypeArr,  nextCache.wine_type),
            beer_style:unionWith(beerStyleOpts, beerStyleArr, nextCache.beer_style),
            price:     data?.facets?.price || [],
          });
        }
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [
    q, sort, page, limit,
    categoryArr, countryArr, grapeArr, wineTypeArr, beerStyleArr,
    minPrice, maxPrice,
  ]);

  // Hydrate live stock (and grape) for displayed items
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const toHydrate = (items || [])
        .map(p => ({ id: p.id ?? p._id }))
        .filter(x => x.id != null);
      if (!toHydrate.length) return;

      try {
        const pairs = await Promise.all(
          toHydrate.map(async ({ id }) => {
            try {
              const full = await getProductById(id);
              const s = Number(full?.stock ?? full?.inventory ?? full?.in_stock ?? 0);
              const grape =
                full?.grape ??
                full?.details?.grape_variety ??
                full?.details?.grapeVariety ??
                full?.variety ??
                null;
              return [String(id), Number.isFinite(s) ? s : 0, grape];
            } catch {
              return [String(id), 0, null];
            }
          })
        );
        if (cancelled) return;

        setLiveStock(prev => {
          const next = { ...prev };
          for (const [id, s] of pairs) next[id] = s;
          return next;
        });

        setLiveGrapes(prev => {
          const next = new Set(prev);
          for (const [, , grape] of pairs) {
            const v = typeof grape === "string" ? grape.trim() : "";
            if (v) next.add(v);
          }
          return next;
        });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [items]);

  // Helpers
  const isOutOfStock = (p) => {
    const id = p.id ?? p._id;
    const s = liveStock[String(id)] ?? (p.stock ?? p.inventory);
    return Number(s ?? 0) <= 0;
  };

  const handleSearch = (text) => {
    const t = (text || "").trim();
    setQ(t);
    setPage(1);
    if (t && sort !== "relevance") setSort("relevance");
    if (!t && sort === "relevance") setSort("newest");
  };

  const clearAll = () => {
    setSelCategories(new Set());
    setSelCountries(new Set());
    setSelGrapes(new Set());
    setSelWineTypes(new Set());
    setSelBeerStyles(new Set());
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setQ("");
    setSort("newest");
    setPage(1);
  };

  // Pagination guards (fallback)
  const canPrev = page > 1;
  const canNext = total ? page * limit < total : items.length === limit;

  if (loading) return <div className="p-6">Loading...</div>;
  if (error)   return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Catalog</h1>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <SearchBar onSubmit={handleSearch} placeholder="Search wines, grapes, countries..." />

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by</label>
          <select
            className="border rounded-lg p-2"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={clearAll}
          className="px-3 py-2 bg-gray-100 rounded-lg ml-auto"
          title="Clear all filters"
        >
          Clear all
        </button>
      </div>

      {(fallbackNote || q || selCategories.size || selCountries.size || selGrapes.size ||
        selWineTypes.size || selBeerStyles.size || minPrice != null || maxPrice != null) && (
        <p className="text-sm text-gray-500 mb-2">
          {fallbackNote ? <>{fallbackNote} · </> : null}
        </p>
      )}

      {/* Current selection chips */}
      <SelectedChips chips={chips} onRemove={removeChip} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left side: facets */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow p-4 space-y-4">
            <MultiSelectFacet
              title="Category"
              options={facets.category}
              selected={selCategories}
              onChange={changeCategories}
              placeholder="Search categories..."
            />
            <MultiSelectFacet
              title="Country"
              options={facets.country}
              selected={selCountries}
              onChange={changeCountries}
              placeholder="Search countries..."
            />
            <MultiSelectFacet
              title="Grape"
              options={facets.grape}
              selected={selGrapes}
              onChange={changeGrapes}
              placeholder="Search grapes..."
            />
            {selCategories.has("wine") && (
              <MultiSelectFacet
                title="Wine type"
                options={facets.wine_type}
                selected={selWineTypes}
                onChange={changeWineTypes}
                placeholder="Search wine types..."
              />
            )}
            {selCategories.has("beer") && (
              <MultiSelectFacet
                title="Beer style"
                options={facets.beer_style}
                selected={selBeerStyles}
                onChange={changeBeerStyles}
                placeholder="Search beer styles..."
              />
            )}
            <PriceFacet
              title="Price"
              valueMin={minPrice}
              valueMax={maxPrice}
              suggestedMin={facets.price?.min}
              suggestedMax={facets.price?.max}
              onApply={applyPrice}
            />
          </div>
        </aside>

        {/* Right side: results */}
        <section className="lg:col-span-9">
          {items.length === 0 ? (
            <div className="text-gray-500">No products found.</div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              {items.map((p) => (
                <ProductCard
                  key={p.id || p._id}
                  product={p}
                  onAddToCart={() => {
                    if (isOutOfStock(p)) return;
                    addItem(p.id ?? p._id, 1);
                  }}
                  disabled={isOutOfStock(p)}
                />
              ))}
            </div>
          )}

          {/* Pagination: prefer numeric if we know total; fallback to simple prev/next */}
          {items.length > 0 && (
            total ? (
              <Pagination
                page={page}
                pageSize={limit}
                total={total}
                onPageChange={setPage}
              />
            ) : (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  className="px-3 py-2 rounded bg-gray-200 disabled:opacity-50"
                  onClick={() => setPage((x) => Math.max(1, x - 1))}
                  disabled={!canPrev}
                >
                  Prev
                </button>
                <span>Page {page}</span>
                <button
                  className="px-3 py-2 rounded bg-gray-200 disabled:opacity-50"
                  onClick={() => setPage((x) => x + 1)}
                  disabled={!canNext}
                >
                  Next
                </button>
              </div>
            )
          )}
        </section>
      </div>
    </div>
  );
}
