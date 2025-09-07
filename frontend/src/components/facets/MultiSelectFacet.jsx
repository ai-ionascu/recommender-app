// frontend/src/components/facets/MultiSelectFacet.jsx
import { useMemo, useState } from "react";

/**
 * Compact, searchable multi-select facet.
 * - Accepts { title, options, selected:Set<string>, onChange(nextSet), placeholder, dense }
 * - options items may be: { value, count } | { key, doc_count } | string
 */
export default function MultiSelectFacet({
  title,
  options = [],
  selected = new Set(),
  onChange,
  placeholder = "Search...",
  dense = false,
}) {
  // normalize options to { value, count }
  const norm = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((o) => {
      if (typeof o === "string") return { value: o, count: null };
      if (o?.value) return { value: String(o.value), count: o.count ?? o.doc_count ?? null };
      if (o?.key)   return { value: String(o.key),   count: o.count ?? o.doc_count ?? null };
      return { value: String(o), count: null };
    });
  };


  const [term, setTerm] = useState("");

  const items = useMemo(() => {
    const base = norm(Array.isArray(options) ? options : []);
    if (!term.trim()) return base;
    const t = term.toLowerCase();
    return base.filter((i) => i.value.toLowerCase().includes(t));
  }, [options, term]);

  const toggle = (value) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange?.(next);
  };

  const cls = {
    wrap: dense ? "space-y-2" : "space-y-3",
    title: dense ? "text-xs font-semibold mb-1" : "text-sm font-semibold mb-2",
    input: dense
      ? "w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
      : "w-full rounded-lg border border-gray-200 px-3 py-2",
    list: dense ? "mt-2 max-h-40 overflow-auto text-sm" : "mt-2 max-h-60 overflow-auto",
    row: "flex items-center justify-between gap-2 py-1",
    checkbox:
      "h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-0 focus:outline-none cursor-pointer",
    badge:
      "ml-2 inline-flex min-w-6 justify-center rounded-md bg-gray-100 px-1.5 text-[11px] leading-5 text-gray-600",
    itemBtn:
      "flex-1 text-left truncate hover:text-gray-900 cursor-pointer text-gray-700",
  };

  return (
    <div className={cls.wrap}>
      <div className={cls.title}>{title}</div>
      <input
        className={cls.input}
        placeholder={placeholder}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <div className={cls.list}>
        {items.map(({ value, count }) => {
          const checked = selected?.has?.(value);
          return (
            <div key={value} className={cls.row}>
              <input
                type="checkbox"
                className={cls.checkbox}
                checked={!!checked}
                onChange={() => toggle(value)}
              />
              <button
                type="button"
                className={cls.itemBtn}
                onClick={() => toggle(value)}
                title={value}
              >
                {value}
              </button>
              {Number.isFinite(count) ? <span className={cls.badge}>{count}</span> : null}
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="py-2 text-xs text-gray-500">No options</div>
        )}
      </div>
    </div>
  );
}
