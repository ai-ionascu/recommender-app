import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Multi-select facet rendered as a button that opens a popover with checkboxes.
 * - options: [{ value: "France", count: 12 }, ...] (flexible: accepts {key, doc_count} too)
 * - selected: Set of selected values (controlled from parent)
 * - onChange(nextSet): called on Apply with the new Set of values
 */
export default function MultiSelectFacet({
  title,
  options,
  selected,
  onChange,
  placeholder = "Search option...",
  buttonClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [temp, setTemp] = useState(() => new Set(selected ?? [])); // temp selection while popover is open
  const ref = useRef(null);

  // normalize options to { value, count }
  const list = useMemo(() => {
    const src = Array.isArray(options) ? options : [];
    return src.map((o) => {
      if (typeof o === "string") return { value: o, count: null };
      if (o?.value) return o;
      if (o?.key) return { value: o.key, count: o.count ?? o.doc_count ?? null };
      return { value: String(o), count: null };
    });
  }, [options]);

  // filtered options by search text
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((x) => x.value.toLowerCase().includes(q));
  }, [list, filter]);

  // open → clone current selection to temp; close → reset filter
  useEffect(() => {
    if (open) setTemp(new Set(selected ?? []));
    else setFilter("");
  }, [open, selected]);

  // click outside closes popover
  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // helpers
  const countSelected = selected?.size ?? 0;
  const toggleTemp = (val) => {
    setTemp((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  };
  const apply = () => {
    onChange?.(new Set(temp));
    setOpen(false);
  };
  const clear = () => {
    onChange?.(new Set());
    setOpen(false);
  };

  return (
    <div className="mb-4 relative" ref={ref}>
      {/* trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full justify-between items-center border rounded-xl px-3 py-2 hover:bg-gray-50 flex ${buttonClassName}`}
      >
        <span className="font-medium">{title}</span>
        <span className="text-sm text-gray-500">
          {countSelected ? `${countSelected} selected` : "All"}
          <span className="ml-2">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {/* popover */}
      {open && (
        <div className="absolute z-20 mt-2 w-full bg-white border rounded-xl shadow-lg p-3">
          {/* search inside popover */}
          <input
            type="text"
            placeholder={placeholder}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full border rounded-lg px-2 py-1 mb-2"
          />

          {/* options list */}
          <div className="max-h-56 overflow-auto pr-1 space-y-1">
            {filtered.length === 0 && (
              <div className="text-sm text-gray-400 px-1 py-2">No options</div>
            )}
            {filtered.map((opt) => {
              const checked = temp.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center justify-between gap-2 px-1 py-1 rounded hover:bg-gray-50 cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()} // keep focus in popover
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTemp(opt.value)}
                    />
                    <span>{opt.value}</span>
                  </div>
                  {opt.count != null && (
                    <span className="text-xs text-gray-400">({opt.count})</span>
                  )}
                </label>
              );
            })}
          </div>

          {/* footer actions */}
          <div className="flex justify-between gap-2 mt-3">
            <button
              type="button"
              onClick={clear}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={apply}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
