import { useState, useEffect } from "react";

/**
 * Price facet with min/max inputs and an Apply button.
 * - valueMin/valueMax are the current filters from parent
 * - onApply({ min, max }) is called when user clicks Apply
 * - Optional: you can pass suggestedMin/suggestedMax to prefill placeholders
 */
export default function PriceFacet({
  title = "Price",
  valueMin,
  valueMax,
  suggestedMin,
  suggestedMax,
  onApply,
}) {
  const [min, setMin] = useState(valueMin ?? "");
  const [max, setMax] = useState(valueMax ?? "");

  // keep inputs in sync if parent changes (e.g., when clearing filters)
  useEffect(() => { setMin(valueMin ?? ""); }, [valueMin]);
  useEffect(() => { setMax(valueMax ?? ""); }, [valueMax]);

  const apply = () => {
    const m = min === "" ? undefined : Number(min);
    const M = max === "" ? undefined : Number(max);
    onApply?.({ min: m, max: M });
  };

  const clear = () => {
    setMin("");
    setMax("");
    onApply?.({ min: undefined, max: undefined });
  };

  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="flex items-center gap-2">
        <input
          type="number"
          className="border rounded p-1 w-24"
          placeholder={suggestedMin != null ? String(suggestedMin) : "min"}
          value={min}
          onChange={(e) => setMin(e.target.value)}
        />
        <span>–</span>
        <input
          type="number"
          className="border rounded p-1 w-24"
          placeholder={suggestedMax != null ? String(suggestedMax) : "max"}
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
      </div>
      <div className="flex gap-2 mt-2">
        <button className="px-2 py-1 bg-gray-200 rounded" onClick={apply}>Apply</button>
        <button className="px-2 py-1 bg-gray-100 rounded" onClick={clear}>Clear</button>
      </div>
    </div>
  );
}
