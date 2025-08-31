import { useEffect, useMemo, useState } from "react";
import { getProducts } from "@/api/products";
import { searchProducts } from "@/api/search";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import MultiSelectFacet from "@/components/facets/MultiSelectFacet";
import PriceFacet from "@/components/facets/PriceFacet";
import SelectedChips from "@/components/facets/SelectedChips";
import { useCartStore } from "@/store/cartStore";

function normalizeFacetList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    if (typeof item === "string") return { value: item, count: null };
    if (item?.value) return item;
    if (item?.key) return { value: item.key, count: item.count ?? item.doc_count ?? null };
    return { value: String(item), count: null };
  });
}

export default function Catalog() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit] = useState(8);

  const [selCountries, setSelCountries] = useState(() => new Set());
  const [selGrapes, setSelGrapes] = useState(() => new Set());
  const [minPrice, setMinPrice] = useState(undefined);
  const [maxPrice, setMaxPrice] = useState(undefined);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [facets, setFacets] = useState({ country: [], grape: [], price: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fallbackNote, setFallbackNote] = useState(null); // show when we use /products fallback
  const [facetCache, setFacetCache] = useState({ country: new Set(), grape: new Set() });

  const addItem = useCartStore((s) => s.addItem);
  const handleAdd = (p) => addItem(p, 1);

  // Build sort options depending on q (hide "relevance" without a query)
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

  // helper: coerce Set<any> -> Set<string> (doar value/key/string), fără valori vide
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

  const countryCsv = useMemo(
    () => (selCountries.size ? Array.from(selCountries).filter(Boolean).join(",") : undefined),
    [selCountries]
  );
  const grapeCsv = useMemo(
    () => (selGrapes.size ? Array.from(selGrapes).filter(Boolean).join(",") : undefined),
    [selGrapes]
  );

    // convert selected sets → arrays for chips
  const countryArr = useMemo(() => Array.from(selCountries).filter(Boolean), [selCountries]);
  const grapeArr   = useMemo(() => Array.from(selGrapes).filter(Boolean),   [selGrapes]);

     // chips data
    const chips = useMemo(() => {
        const c = countryArr.map((v) => ({ facet: "country", value: v }));
        const g = grapeArr.map((v) => ({ facet: "grape", value: v }));
        const p = (minPrice != null || maxPrice != null)
        ? [{ facet: "price", value: `${minPrice ?? "min"}–${maxPrice ?? "max"}` }]
        : [];
        return [...c, ...g, ...p];
    }, [countryArr, grapeArr, minPrice, maxPrice]);

    // remove a single chip
    const removeChip = (facet, value) => {
        if (facet === "country") {
        setSelCountries(prev => {
            const next = new Set(prev); next.delete(value); return next;
        });
        } else if (facet === "grape") {
        setSelGrapes(prev => {
            const next = new Set(prev); next.delete(value); return next;
        });
        } else if (facet === "price") {
        setMinPrice(undefined); setMaxPrice(undefined);
        }
        setPage(1);
    };

    // handlers for facets - Set normalized to strings
  const changeCountries = (nextSet) => {
    const sanitized = toValueSet(nextSet);
    setSelCountries(sanitized);
    setPage(1);
  };
  const changeGrapes = (nextSet) => {
    const sanitized = toValueSet(nextSet);
    setSelGrapes(sanitized);
    setPage(1);
  };
  const applyPrice = ({ min, max }) => { setMinPrice(min); setMaxPrice(max); setPage(1); };

  // main fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFallbackNote(null);
    console.debug("[catalog] params", { countryCsv, grapeCsv, minPrice, maxPrice, sort, q });

    (async () => {
      try {
        const data = await searchProducts({
          q: q || undefined,
          sort: (!q && sort === "relevance") ? "newest" : sort,
          page,
          size: limit,
          country: countryCsv,
          grape: grapeCsv,
          minPrice,
          maxPrice,
        });

        if (!cancelled) {
          setItems(data.items || []);
          setTotal(data?.total ?? null);

          const countryOpts = normalizeFacetList(data?.facets?.country);
          const grapeOpts   = normalizeFacetList(data?.facets?.grape);

          // cache + union
          const nextCache = {
            country: new Set(facetCache.country),
            grape:   new Set(facetCache.grape),
          };
          countryOpts.forEach(o => o?.value && nextCache.country.add(o.value));
          grapeOpts.forEach(o => o?.value && nextCache.grape.add(o.value));
          setFacetCache(nextCache);

          const unionWith = (opts, selectedArr, cachedSet) => {
            const map = new Map((opts || []).map(o => [o.value, { value: o.value, count: o.count ?? o.doc_count ?? 0 }]));
            for (const v of (selectedArr || [])) if (v && !map.has(v)) map.set(v, { value: v, count: 0 });
            for (const v of Array.from(cachedSet || [])) if (v && !map.has(v)) map.set(v, { value: v, count: 0 });
            return Array.from(map.values());
          };

          setFacets({
            country: unionWith(countryOpts, countryArr, nextCache.country),
            grape:   unionWith(grapeOpts,   grapeArr,   nextCache.grape),
            price:   data?.facets?.price || [],
          });
        }
      } catch (err) {
        console.log(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [q, sort, page, limit, countryCsv, grapeCsv, minPrice, maxPrice]);

  const handleSearch = (text) => {
    const t = (text || "").trim();
    setQ(t);
    setPage(1);
    if (t && sort !== "relevance") setSort("relevance");
    if (!t && sort === "relevance") setSort("newest");
  };

  const clearAll = () => {
    setSelCountries(new Set());
    setSelGrapes(new Set());
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setQ("");
    setSort("newest");
    setPage(1);
  };

  const canPrev = page > 1;
  const canNext = total ? page * limit < total : items.length === limit;

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

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

      {(fallbackNote || q || selCountries.size || selGrapes.size || minPrice != null || maxPrice != null) && (
        <p className="text-sm text-gray-500 mb-2">
          {fallbackNote ? <>{fallbackNote} · </> : null}
        </p>
      )}

      {/* chips for current filters */}
      <SelectedChips chips={chips} onRemove={removeChip} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* left: facets */}
        <aside className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow p-4 space-y-4">
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

        <section className="lg:col-span-9">
          {items.length === 0 ? (
            <div className="text-gray-500">No products found.</div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              {items.map((p) => (
                <ProductCard
                  key={p.id || p._id}
                  product={p}
                  onAddToCart={() => addItem(p.id, 1)}
                />
              ))}
            </div>
          )}

          {items.length > 0 && (
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
          )}
        </section>
      </div>
    </div>
  );
}
