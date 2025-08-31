/**
 * Generic checkbox facet:
 * - options: [{ value: "France", count: 12 }, ...]
 * - selected: a Set of selected values
 * - onToggle(value): called when user toggles a checkbox
 */
export default function CheckboxFacet({ title, options, selected, onToggle }) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold mb-2">{title}</h3>
      <div className="space-y-1 max-h-56 overflow-auto pr-1">
        {(options || []).map((opt) => {
          const val = opt.value ?? opt.key ?? String(opt);
          const checked = selected?.has(val);
          const count = opt.count ?? opt.doc_count ?? null;
          return (
            <label key={val} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!checked}
                onChange={() => onToggle?.(val)}
              />
              <span className="flex-1">{val}</span>
              {count != null && (
                <span className="text-gray-400">({count})</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
