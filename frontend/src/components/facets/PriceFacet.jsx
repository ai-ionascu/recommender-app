// frontend/src/components/facets/PriceFacet.jsx
import { useState, useEffect } from "react";

/**
 * Compact price facet with min/max inputs and Apply/Clear buttons.
 * Props: { title, valueMin, valueMax, onApply({min,max}), dense }
 */
export default function PriceFacet({
  title = "Price",
  valueMin,
  valueMax,
  onApply,
  dense = true,
}) {
  const [min, setMin] = useState(valueMin ?? "");
  const [max, setMax] = useState(valueMax ?? "");

  useEffect(() => setMin(valueMin ?? ""), [valueMin]);
  useEffect(() => setMax(valueMax ?? ""), [valueMax]);

  const inputCls = dense
    ? "w-full rounded-md border border-gray-200 px-2 py-1 text-sm"
    : "w-full rounded-lg border border-gray-200 px-3 py-2";
  const btnCls = "px-2 py-1 text-sm rounded-md bg-gray-100 hover:bg-gray-200";

  return (
    <div className={dense ? "space-y-2" : "space-y-3"}>
      <div className={dense ? "text-xs font-semibold mb-1" : "text-sm font-semibold mb-2"}>
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          placeholder="min"
          className={inputCls}
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <input
          type="number"
          placeholder="max"
          className={inputCls}
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnCls}
          onClick={() => onApply?.({ min: min === "" ? undefined : Number(min), max: max === "" ? undefined : Number(max) })}
        >
          Apply
        </button>
        <button
          type="button"
          className={btnCls}
          onClick={() => { setMin(""); setMax(""); onApply?.({ min: undefined, max: undefined }); }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
