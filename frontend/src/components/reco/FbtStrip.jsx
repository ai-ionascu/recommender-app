// frontend/src/components/reco/FbtStrip.jsx
import React, { useMemo, useState } from "react";
import { useFBT } from "@/hooks/useFBT";
import { useCartStore } from "@/store/cartStore";

/**
 * Horizontal strip for "Frequently bought together".
 * - Supports multiple anchors (cart has many products).
 * - Chips: "All" (merged) + each anchor. Clicking a chip filters to that anchor’s FBT.
 *
 * Props:
 * - productId?: number
 * - productIds?: number[]
 * - limit?: number (per anchor)
 * - title?: string (for the merged view)
 * - anchorName?: string (explicit name for single-anchor use)
 * - nameById?: (id:number) => string|null  (resolver used to print chip labels & headings)
 * - titleWhenAnchored?: (name:string) => string  (custom per-anchor heading)
 * - showEmpty?: boolean (default true) — if no anchors or results, show a friendly message
 * - className?: string
 * - defaultView?: "all" | "first" (default "all") — initial tab selection
 */
export default function FbtStrip({
  productId = null,
  productIds = [],
  limit = 8,
  title = "Frequently bought together",
  anchorName = null,
  nameById = null,
  titleWhenAnchored,
  showEmpty = true,
  className = "",
  defaultView = "all",
}) {
  const { anchorIds, resultsByAnchor, merged, loading, error } = useFBT(
    { productId, productIds },
    { limit, maxAnchors: 5 }
  );
  const addItem = useCartStore((s) => s.addItem);

  // Selection: "all" or one of the anchor ids
  const initialSelection =
    defaultView === "first"
      ? (anchorIds[0] ?? "all")
      : "all";

  const [selection, setSelection] = useState(initialSelection);

  // Ensure selection remains valid if anchors change
  React.useEffect(() => {
    if (selection !== "all" && !anchorIds.includes(selection)) {
      setSelection(anchorIds[0] ?? "all");
    }
  }, [anchorIds, selection]);

  // Heading logic
  const resolvedAnchorName = useMemo(() => {
    if (selection === "all") return null;
    const fromResolver = typeof nameById === "function" ? nameById(selection) : null;
    return fromResolver || anchorName || null;
  }, [selection, nameById, anchorName]);

  const heading =
    selection === "all" || !resolvedAnchorName
      ? title
      : (typeof titleWhenAnchored === "function"
          ? titleWhenAnchored(resolvedAnchorName)
          : `Customers who bought ${resolvedAnchorName} also bought`);

  // Items to render
  const items = useMemo(() => {
    if (selection === "all") return merged.items;
    return resultsByAnchor[selection] || [];
  }, [selection, merged.items, resultsByAnchor]);

  // Early exits / empty states
  if (!anchorIds.length) {
    if (!showEmpty) return null;
    return (
      <section className={`mt-6 ${className}`.trim()}>
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <div className="text-sm opacity-70">No recommendations yet.</div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className={`mt-6 ${className}`.trim()}>
        <h2 className="text-lg font-semibold mb-3">{heading}</h2>
        <div className="text-sm opacity-70">Loading recommendations…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`mt-6 ${className}`.trim()}>
        <h2 className="text-lg font-semibold mb-3">{heading}</h2>
        <div className="text-sm text-red-600">Could not load recommendations.</div>
      </section>
    );
  }

  // Top chips: All + each anchor
  const Chip = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={[
        "text-xs px-2 py-1 rounded-full border",
        active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
      ].join(" ")}
    >
      {children}
    </button>
  );

  return (
    <section className={`mt-6 ${className}`.trim()}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{heading}</h2>

        {/* Anchor chips (only if more than one anchor) */}
        {anchorIds.length > 1 && (
          <div className="flex items-center gap-2">
            <Chip active={selection === "all"} onClick={() => setSelection("all")}>
              All ({merged.items.length})
            </Chip>
            {anchorIds.map((aid) => {
              const label =
                (typeof nameById === "function" ? nameById(aid) : null) ??
                String(aid);
              const count = (resultsByAnchor[aid] || []).length;
              return (
                <Chip key={aid} active={selection === aid} onClick={() => setSelection(aid)}>
                  {label} ({count})
                </Chip>
              );
            })}
          </div>
        )}
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-sm opacity-70">No recommendations yet.</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {items.map((it) => (
            <MiniCard key={it.id ?? it._id ?? it.productId} item={it} onAdd={(p) => addItem(p.id ?? p._id ?? p.productId ?? p, 1)} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------ mini card UI ------------------------------ */
function MiniCard({ item, onAdd }) {
  const [busy, setBusy] = useState(false);
  const img = item?.image || item?.main_image_url || item?.image_url || "";

  return (
    <div className="min-w-[180px] w-[180px] flex-shrink-0 border rounded-xl p-3">
      <div className="w-full h-28 bg-gray-100 rounded-lg overflow-hidden mb-2">
        {img ? (
          <img src={img} alt={item?.name || "product"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs opacity-60">No image</div>
        )}
      </div>
      <div className="text-sm font-medium line-clamp-2">{item?.name}</div>
      <div className="text-sm opacity-80 mt-1">
        {item?.price != null ? `${Number(item.price).toFixed(2)} €` : ""}
      </div>
      <button
        disabled={busy}
        onClick={async () => {
          try {
            setBusy(true);
            await onAdd(item);
          } finally {
            setBusy(false);
          }
        }}
        className="mt-2 w-full text-sm rounded-lg px-3 py-1.5 border hover:bg-gray-50 disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add to cart"}
      </button>
    </div>
  );
}
