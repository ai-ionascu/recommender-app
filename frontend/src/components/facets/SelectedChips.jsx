/**
 * Small chip list that shows current selections and allows removing one.
 * - chips: array of { facet: "country"|"grape"|"price", value: string }
 * - onRemove(facet, value) called when user clicks the "x"
 */
export default function SelectedChips({ chips, onRemove }) {
  if (!chips || chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {chips.map((c, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-2 bg-gray-100 border rounded-full px-3 py-1 text-sm"
          title={`${c.facet}: ${c.value}`}
        >
          <span className="font-medium capitalize">{c.facet}</span>
          <span>•</span>
          <span>{c.value}</span>
          <button
            className="ml-1 text-gray-500 hover:text-gray-700"
            onClick={() => onRemove?.(c.facet, c.value)}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
