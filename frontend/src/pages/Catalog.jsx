import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { searchProducts } from "@/api/search";
import { getProductById } from "@/api/products";

import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";
import MultiSelectFacet from "@/components/facets/MultiSelectFacet";
import PriceFacet from "@/components/facets/PriceFacet";
import SelectedChips from "@/components/facets/SelectedChips";
import Pagination from "@/components/Pagination";
import { useCartStore } from "@/store/cartStore";

/* ----------------------------- helpers (safe) ----------------------------- */

function normOpt(x) {
  if (!x && x !== 0) return null;
  if (typeof x === "string") return { value: x, count: null };
  if (typeof x === "number") return { value: String(x), count: null };
  if (x.value != null) return { value: String(x.value), count: x.count ?? x.doc_count ?? null };
  if (x.key != null) return { value: String(x.key), count: x.count ?? x.doc_count ?? null };
  return null;
}

function normalizeFacetList(list) {
  if (!list) return [];
  const arr = Array.isArray(list) ? list : (list.buckets || []);
  return arr.map(normOpt).filter(Boolean);
}

function toSet(input) {
  if (!input) return new Set();
  const src = input instanceof Set ? Array.from(input) : (Array.isArray(input) ? input : [input]);
  const values = src
    .map(v => (v && typeof v === "object" ? (v.value ?? v.key ?? "") : v))
    .map(v => (v == null ? "" : String(v)))
    .map(s => s.trim())
    .filter(Boolean);
  return new Set(values);
}

function countBy(items, getter) {
  const m = new Map();
  for (const it of items || []) {
    const v = getter(it);
    if (!v) continue;
    m.set(v, (m.get(v) || 0) + 1);
  }
  return m;
}

/* ---------------------------------- page ---------------------------------- */

export default function Catalog() {
  /* -------- query / pagination / quick filters -------- */
  const location = useLocation();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  /* -------- selections (applied) -------- */
  const [selCategories, setSelCategories] = useState(new Set()); // wine/spirits/beer/accessories
  const [selCountries, setSelCountries] = useState(new Set());
  const [selGrapes, setSelGrapes] = useState(new Set());
  const [selWineTypes, setSelWineTypes] = useState(new Set());
  const [selBeerStyles, setSelBeerStyles] = useState(new Set());
  const [selSpiritTypes, setSelSpiritTypes] = useState(new Set());
  const [selAccTypes, setSelAccTypes] = useState(new Set());
  const [selAccCompat, setSelAccCompat] = useState(new Set());
  const [minPrice, setMinPrice] = useState(undefined);
  const [maxPrice, setMaxPrice] = useState(undefined);

  /* -------- pending (checkbox UI) + Apply/Clear per card -------- */
  const [pendGrapes, setPendGrapes] = useState(new Set());
  const [pendWineTypes, setPendWineTypes] = useState(new Set());
  const [pendWineCountries, setPendWineCountries] = useState(new Set());

  const [pendSpiritTypes, setPendSpiritTypes] = useState(new Set());
  const [pendSpiritCountries, setPendSpiritCountries] = useState(new Set());

  const [pendBeerStyles, setPendBeerStyles] = useState(new Set());
  const [pendBeerCountries, setPendBeerCountries] = useState(new Set());

  const [pendAccTypes, setPendAccTypes] = useState(new Set());
  const [pendAccCompat, setPendAccCompat] = useState(new Set());

  /* -------- data & facets -------- */
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);

  // Snapshot global (stabil) — NU se schimbă când filtrezi alte categorii.
  const [facetsBase, setFacetsBase] = useState({
    category: [],
    country_wine: [],
    country_spirits: [],
    country_beer: [],
    grape: [],
    wine_type: [],
    beer_style: [],
    spirit_type: [],
    accessory_type: [],
    compatible_with_product_type: [],
  });

  // Ce afișăm efectiv în UI
  const [facetsShown, setFacetsShown] = useState(facetsBase);

  /* -------- meta live (stock/grape hydration) -------- */
  const [liveStock, setLiveStock] = useState({});
  const [liveGrapes, setLiveGrapes] = useState(new Set());

  /* -------- other -------- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const addItem = useCartStore(s => s.addItem);
  const firstLoad = useRef(true);

  /* read q from URL */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qParam = params.get("q") || "";
    setQ(qParam);
    setPage(1);
  }, [location.search]);

  /* 1) Fetch FACETS BASE o singură dată (snapshot complet, independent de filtre) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/search?size=0"); // backend-ul tău returnează .facets + .aggregations
        const data = await resp.json();

        const aggs = data?.aggregations || data?.aggs || {};
        const f = data?.facets || {};

        const base = {
          category: normalizeFacetList(f.category || aggs.category),
          grape: normalizeFacetList(f.grape || aggs.by_grape || aggs["wines.grape_variety"]),
          wine_type: normalizeFacetList(f.wine_type || aggs.by_wtype || aggs["wines.wine_type"]),
          beer_style: normalizeFacetList(f.beer_style || aggs.by_bstyle || aggs["beers.style"]),
          spirit_type: normalizeFacetList(f.spirit_type || aggs.by_stype || aggs["spirits.spirit_type"]),
          accessory_type: normalizeFacetList(f.accessory_type || aggs.by_atype || aggs["accessories.accessory_type"]),
          compatible_with_product_type: normalizeFacetList(
            f.compatible_with_product_type || aggs.by_acompat || aggs["accessories.compatible_with_product_type"]
          ),
          country_wine: normalizeFacetList(f.country_wine || aggs.country_wine || aggs["country_wine"]),
          country_spirits: normalizeFacetList(f.country_spirits || aggs.country_spirits || aggs["country_spirits"]),
          country_beer: normalizeFacetList(f.country_beer || aggs.country_beer || aggs["country_beer"]),
        };

        if (!cancelled) {
          setFacetsBase(base);
          // inițial arată exact baza
          setFacetsShown(base);
        }
      } catch {
        // dacă eșuează, lăsăm facetsBase gol; UI-ul tot merge (se va popula după primul search)
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* sort options */
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

  /* chips */
  const chips = useMemo(() => {
    const out = [];
    for (const v of selCategories) out.push({ facet: "category", value: v });
    for (const v of selCountries) out.push({ facet: "country", value: v });
    for (const v of selGrapes) out.push({ facet: "grape", value: v });
    for (const v of selWineTypes) out.push({ facet: "wine_type", value: v });
    for (const v of selBeerStyles) out.push({ facet: "beer_style", value: v });
    for (const v of selSpiritTypes) out.push({ facet: "spirit_type", value: v });
    for (const v of selAccTypes) out.push({ facet: "accessory_type", value: v });
    for (const v of selAccCompat) out.push({ facet: "compatible_with_product_type", value: v });
    if (minPrice != null || maxPrice != null) {
      out.push({ facet: "price", value: `${minPrice ?? "min"}–${maxPrice ?? "max"}` });
    }
    return out;
  }, [selCategories, selCountries, selGrapes, selWineTypes, selBeerStyles, selSpiritTypes, selAccTypes, selAccCompat, minPrice, maxPrice]);

  /* 2) Fetch REZULTATE (items) — NU folosim rezultatul ca să „tăiem” opțiunile altor categorii */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await searchProducts({
          q: q || undefined,
          sort: (!q && sort === "relevance") ? "newest" : sort,
          page,
          size: limit,
          inStock: inStockOnly,
          featured: featuredOnly,

          category: Array.from(selCategories),
          country: Array.from(selCountries),

          grape: Array.from(selGrapes),
          wine_type: Array.from(selWineTypes),

          beer_style: Array.from(selBeerStyles),

          spirit_type: Array.from(selSpiritTypes),

          accessory_type: Array.from(selAccTypes),
          compatible_with_product_type: Array.from(selAccCompat),

          minPrice, maxPrice,
        });

        if (cancelled) return;

        const itemsRaw = Array.isArray(data?.items) ? data.items : [];
        // best-effort hydrate images
        const need = itemsRaw.filter(i => !(Array.isArray(i.images) && i.images.length));
        if (need.length) {
          await Promise.all(need.map(async it => {
            try {
              const full = await getProductById(it.id ?? it._id);
              if (full?.images) it.images = full.images;
            } catch {}
          }));
        }
        setItems(itemsRaw);
        setTotal(Number.isFinite(data?.total) ? Number(data.total) : null);

        // 2.a) Category counts = dinamice (din rezultate)
        const catCounts = countBy(itemsRaw, it => it.category);
        const categoryFacetDynamic =
          (facetsBase.category.length ? facetsBase.category : ["wine","spirits","beer","accessories"].map(v => ({ value: v })))
            .map(o => ({ value: o.value, count: catCounts.get(o.value) || 0 }));

        // 2.b) Country lists: NUMAI lista categoriei „active” se restrânge; celelalte rămân baza
        const withCounts = (baseOpts, countsMap) =>
          (baseOpts || []).map(o => ({ value: o.value, count: countsMap.get(o.value) || 0 }));

        const wineActive = selGrapes.size > 0 || selWineTypes.size > 0;
        const spiritsActive = selSpiritTypes.size > 0;
        const beerActive = selBeerStyles.size > 0;

        const countsWineCountries    = countBy(itemsRaw.filter(it => it.category === "wine"),    it => it.country);
        const countsSpiritsCountries = countBy(itemsRaw.filter(it => it.category === "spirits"), it => it.country);
        const countsBeerCountries    = countBy(itemsRaw.filter(it => it.category === "beer"),    it => it.country);

        const country_wine    = wineActive    ? withCounts(facetsBase.country_wine, countsWineCountries)       : facetsBase.country_wine;
        const country_spirits = spiritsActive ? withCounts(facetsBase.country_spirits, countsSpiritsCountries) : facetsBase.country_spirits;
        const country_beer    = beerActive    ? withCounts(facetsBase.country_beer, countsBeerCountries)       : facetsBase.country_beer;

        // 2.c) Toate CELELALTE liste (grape/spirit_type/beer_style/accessories) = din snapshotul de bază
        const shown = {
          ...facetsBase,
          category: categoryFacetDynamic,
          country_wine,
          country_spirits,
          country_beer,
          // restul rămân exact din baza stabilă (nu dispar niciodată)
        };

        setFacetsShown(shown);
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [
    q, sort, page, limit,
    inStockOnly, featuredOnly,
    // applied selections (nu pending)
    selCategories, selCountries,
    selGrapes, selWineTypes, selBeerStyles, selSpiritTypes,
    selAccTypes, selAccCompat,
    minPrice, maxPrice,
    // important: facetsBase NU e recalculat aici; îl folosim ca ancoră stabilă
  ]);

  /* hydrate stock & grapes for visible items (best-effort) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = items.map(p => p.id ?? p._id).filter(Boolean);
      if (!ids.length) return;
      try {
        const pairs = await Promise.all(ids.map(async id => {
          try {
            const full = await getProductById(id);
            const s = Number(full?.stock ?? full?.inventory ?? 0);
            const grape = full?.details?.grape_variety ?? full?.variety ?? null;
            return [String(id), (Number.isFinite(s) ? s : 0), grape];
          } catch {
            return [String(id), 0, null];
          }
        }));
        if (cancelled) return;
        setLiveStock(prev => {
          const next = { ...prev };
          for (const [id, s] of pairs) next[id] = s;
          return next;
        });
        setLiveGrapes(prev => {
          const next = new Set(prev);
          for (const [, , grape] of pairs) if (typeof grape === "string" && grape.trim()) next.add(grape.trim());
          return next;
        });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [items]);

  /* ------------------------------- handlers ------------------------------- */

  const applyWine = () => {
    setSelGrapes(toSet(pendGrapes));
    setSelWineTypes(toSet(pendWineTypes));
    setSelCountries(toSet(pendWineCountries)); // countries for wine only
    if (pendGrapes.size || pendWineTypes.size || pendWineCountries.size) {
      setSelCategories(prev => new Set(prev).add("wine"));
    }
    setPage(1);
  };
  const clearWine = () => {
    setPendGrapes(new Set());
    setPendWineTypes(new Set());
    setPendWineCountries(new Set());
    setSelGrapes(new Set());
    setSelWineTypes(new Set());
    // scoatem auto-Category doar dacă nu mai există alte filtre pe wine
    setSelCategories(prev => {
      const next = new Set(prev);
      // păstrăm category dacă mai sunt alte selecții în alte secțiuni
      next.delete("wine");
      return next;
    });
    setPage(1);
  };

  const applySpirits = () => {
    setSelSpiritTypes(toSet(pendSpiritTypes));
    const chosen = toSet(pendSpiritCountries);
    if (chosen.size) {
      setSelCountries(prev => {
        const next = new Set(prev);
        chosen.forEach(v => next.add(v));
        return next;
      });
    }
    if (pendSpiritTypes.size || pendSpiritCountries.size) {
      setSelCategories(prev => new Set(prev).add("spirits"));
    }
    setPage(1);
  };
  const clearSpirits = () => {
    setPendSpiritTypes(new Set());
    setPendSpiritCountries(new Set());
    setSelSpiritTypes(new Set());
    setSelCategories(prev => { const n = new Set(prev); n.delete("spirits"); return n; });
    setPage(1);
  };

  const applyBeers = () => {
    setSelBeerStyles(toSet(pendBeerStyles));
    const chosen = toSet(pendBeerCountries);
    if (chosen.size) {
      setSelCountries(prev => {
        const next = new Set(prev);
        chosen.forEach(v => next.add(v));
        return next;
      });
    }
    if (pendBeerStyles.size || pendBeerCountries.size) {
      setSelCategories(prev => new Set(prev).add("beer"));
    }
    setPage(1);
  };
  const clearBeers = () => {
    setPendBeerStyles(new Set());
    setPendBeerCountries(new Set());
    setSelBeerStyles(new Set());
    setSelCategories(prev => { const n = new Set(prev); n.delete("beer"); return n; });
    setPage(1);
  };

  const applyAcc = () => {
    setSelAccTypes(toSet(pendAccTypes));
    setSelAccCompat(toSet(pendAccCompat));
    if (pendAccTypes.size || pendAccCompat.size) {
      setSelCategories(prev => new Set(prev).add("accessories"));
    }
    setPage(1);
  };
  const clearAcc = () => {
    setPendAccTypes(new Set());
    setPendAccCompat(new Set());
    setSelAccTypes(new Set());
    setSelAccCompat(new Set());
    setSelCategories(prev => { const n = new Set(prev); n.delete("accessories"); return n; });
    setPage(1);
  };

  const clearAll = () => {
    setQ("");
    setSort("newest");
    setPage(1);
    setInStockOnly(false);
    setFeaturedOnly(false);
    setMinPrice(undefined);
    setMaxPrice(undefined);

    setSelCategories(new Set());
    setSelCountries(new Set());
    setSelGrapes(new Set());
    setSelWineTypes(new Set());
    setSelBeerStyles(new Set());
    setSelSpiritTypes(new Set());
    setSelAccTypes(new Set());
    setSelAccCompat(new Set());

    setPendGrapes(new Set());
    setPendWineTypes(new Set());
    setPendWineCountries(new Set());
    setPendSpiritTypes(new Set());
    setPendSpiritCountries(new Set());
    setPendBeerStyles(new Set());
    setPendBeerCountries(new Set());
    setPendAccTypes(new Set());
    setPendAccCompat(new Set());

    // readucem facet-urile afișate la snapshotul de bază
    setFacetsShown(facetsBase);
  };

  const removeChip = (facet, value) => {
    const rm = v => { const n = new Set(v); n.delete(value); return n; };
    switch (facet) {
      case "category": setSelCategories(rm); break;
      case "country": setSelCountries(rm); break;
      case "grape": setSelGrapes(rm); break;
      case "wine_type": setSelWineTypes(rm); break;
      case "beer_style": setSelBeerStyles(rm); break;
      case "spirit_type": setSelSpiritTypes(rm); break;
      case "accessory_type": setSelAccTypes(rm); break;
      case "compatible_with_product_type": setSelAccCompat(rm); break;
      case "price": setMinPrice(undefined); setMaxPrice(undefined); break;
    }
    setPage(1);
  };

  const handleSearch = (text) => {
    const t = (text || "").trim();
    setQ(t);
    setPage(1);
    if (t && sort !== "relevance") setSort("relevance");
    if (!t && sort === "relevance") setSort("newest");
  };

  /* ------------------------------ UI derived ------------------------------ */

  const isOutOfStock = (p) => {
    const id = String(p.id ?? p._id);
    const s = liveStock[id] ?? (p.stock ?? p.inventory);
    return Number(s ?? 0) <= 0;
  };

  const categoryFacet = facetsShown.category;              // dinamic
  const wineCountryFacet = facetsShown.country_wine;       // poate fi restrâns
  const spiritsCountryFacet = facetsShown.country_spirits; // poate fi restrâns
  const beerCountryFacet = facetsShown.country_beer;       // poate fi restrâns

  // celelalte liste – strict din snapshotul stabil (nu dispar)
  const grapeFacet = facetsBase.grape;
  const wineTypeFacet = facetsBase.wine_type;
  const spiritTypeFacet = facetsBase.spirit_type;
  const beerStyleFacet = facetsBase.beer_style;
  const accTypeFacet = facetsBase.accessory_type;
  const accCompatFacet = facetsBase.compatible_with_product_type;

  /* -------------------------------- render -------------------------------- */

  if (loading && firstLoad.current) {
    firstLoad.current = false;
    return <div className="p-6">Loading...</div>;
  }
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <SearchBar onSubmit={handleSearch} placeholder="Search wines, regions, grapes..." />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by</label>
          <select
            className="border rounded-lg p-2"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
          >
            {sortOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <button className="px-3 py-2 bg-gray-100 rounded-lg ml-auto" onClick={clearAll}>
          Clear all
        </button>
      </div>

      <SelectedChips chips={chips} onRemove={removeChip} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* left: facets */}
        <aside className="lg:col-span-3">
          <div className="sticky top-4 space-y-3">
            {/* quick */}
            <div className="bg-white rounded-xl shadow p-3">
              <h3 className="text-xs font-semibold mb-1">Quick filters</h3>
              <div className="space-y-1.5">
                <Toggle checked={featuredOnly} onChange={v => { setFeaturedOnly(v); setPage(1); }} label="Featured" />
                <Toggle checked={inStockOnly}  onChange={v => { setInStockOnly(v);  setPage(1); }} label="In stock" />
              </div>
            </div>

            {/* category (dynamic counts) */}
            <div className="bg-white rounded-xl shadow p-3">
              <MultiSelectFacet
                title="Category"
                options={categoryFacet}
                selected={selCategories}
                onChange={(next) => setSelCategories(toSet(next))}
                onApply={() => setPage(1)}
                onClear={() => { setSelCategories(new Set()); setPage(1); }}
                placeholder="Search categories..."
                dense
                showApply
              />
            </div>

            {/* price */}
            <div className="bg-white rounded-xl shadow p-3">
              <PriceFacet
                title="Price"
                valueMin={minPrice}
                valueMax={maxPrice}
                onApply={({min,max}) => { setMinPrice(min); setMaxPrice(max); setPage(1); }}
                onClear={() => { setMinPrice(undefined); setMaxPrice(undefined); setPage(1); }}
                dense
                showApply
              />
            </div>

            {/* wines */}
            <div className="bg-white rounded-xl shadow p-3">
              <div className="text-xs font-semibold mb-1">Wines</div>
              <div className="space-y-2">
                <MultiSelectFacet
                  title="Grape"
                  options={grapeFacet}
                  selected={pendGrapes}
                  onChange={(s) => setPendGrapes(toSet(s))}
                  placeholder="Search grapes..."
                  dense
                />
                <MultiSelectFacet
                  title="Country"
                  options={wineCountryFacet}
                  selected={pendWineCountries}
                  onChange={(s) => setPendWineCountries(toSet(s))}
                  placeholder="Search countries..."
                  dense
                />
                <div className="flex gap-2 pt-1">
                  <button className="px-3 py-1.5 rounded bg-gray-900 text-white" onClick={applyWine}>Apply</button>
                  <button className="px-3 py-1.5 rounded bg-gray-100" onClick={clearWine}>Clear</button>
                </div>
              </div>
            </div>

            {/* spirits */}
            <div className="bg-white rounded-xl shadow p-3">
              <div className="text-xs font-semibold mb-1">Spirits</div>
              <div className="space-y-2">
                <MultiSelectFacet
                  title="Spirit type"
                  options={spiritTypeFacet}
                  selected={pendSpiritTypes}
                  onChange={(s) => setPendSpiritTypes(toSet(s))}
                  placeholder="Search spirit types..."
                  dense
                />
                <MultiSelectFacet
                  title="Country"
                  options={spiritsCountryFacet}
                  selected={pendSpiritCountries}
                  onChange={(s) => setPendSpiritCountries(toSet(s))}
                  placeholder="Search countries..."
                  dense
                />
                <div className="flex gap-2 pt-1">
                  <button className="px-3 py-1.5 rounded bg-gray-900 text-white" onClick={applySpirits}>Apply</button>
                  <button className="px-3 py-1.5 rounded bg-gray-100" onClick={clearSpirits}>Clear</button>
                </div>
              </div>
            </div>

            {/* beers */}
            <div className="bg-white rounded-xl shadow p-3">
              <div className="text-xs font-semibold mb-1">Beers</div>
              <div className="space-y-2">
                <MultiSelectFacet
                  title="Beer style"
                  options={beerStyleFacet}
                  selected={pendBeerStyles}
                  onChange={(s) => setPendBeerStyles(toSet(s))}
                  placeholder="Search beer styles..."
                  dense
                />
                <MultiSelectFacet
                  title="Country"
                  options={beerCountryFacet}
                  selected={pendBeerCountries}
                  onChange={(s) => setPendBeerCountries(toSet(s))}
                  placeholder="Search countries..."
                  dense
                />
                <div className="flex gap-2 pt-1">
                  <button className="px-3 py-1.5 rounded bg-gray-900 text-white" onClick={applyBeers}>Apply</button>
                  <button className="px-3 py-1.5 rounded bg-gray-100" onClick={clearBeers}>Clear</button>
                </div>
              </div>
            </div>

            {/* accessories */}
            <div className="bg-white rounded-xl shadow p-3">
              <div className="text-xs font-semibold mb-1">Accessories</div>
              <div className="space-y-2">
                <MultiSelectFacet
                  title="Type"
                  options={accTypeFacet}
                  selected={pendAccTypes}
                  onChange={(s) => setPendAccTypes(toSet(s))}
                  placeholder="Search types..."
                  dense
                />
                <MultiSelectFacet
                  title="Compatible with"
                  options={accCompatFacet}
                  selected={pendAccCompat}
                  onChange={(s) => setPendAccCompat(toSet(s))}
                  placeholder="wine, spirits, beer, all..."
                  dense
                />
                <div className="flex gap-2 pt-1">
                  <button className="px-3 py-1.5 rounded bg-gray-900 text-white" onClick={applyAcc}>Apply</button>
                  <button className="px-3 py-1.5 rounded bg-gray-100" onClick={clearAcc}>Clear</button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* right: results */}
        <section className="lg:col-span-9">
          {items.length === 0 ? (
            <div className="text-gray-500">No products found.</div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              {items.map(p => (
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

          {items.length > 0 && (
            total ? (
              <Pagination page={page} pageSize={limit} total={total} onPageChange={setPage} />
            ) : (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  className="px-3 py-2 rounded bg-gray-200 disabled:opacity-50"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Prev
                </button>
                <span>Page {page}</span>
                <button
                  className="px-3 py-2 rounded bg-gray-200"
                  onClick={() => setPage(p => p + 1)}
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

/* ---- small local component ---- */
function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between text-sm py-0.5">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${checked ? "bg-gray-900" : "bg-gray-200"}`}
        aria-pressed={checked}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </label>
  );
}
