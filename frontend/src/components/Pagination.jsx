export default function Pagination({ page, pageSize, total, onPageChange }) {
  const pages = Math.max(1, Math.ceil((total ?? 0) / (pageSize || 1)));
  const canPrev = page > 1;
  const canNext = page < pages;

  const go = (p) => onPageChange(Math.min(Math.max(1, p), pages));

  if (pages <= 1) return null;

  const numbers = [];
  for (let i = 1; i <= pages; i++) numbers.push(i);

  return (
    <nav className="flex items-center justify-center gap-2 mt-6" aria-label="Pagination">
      <button
        className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
        onClick={() => go(page - 1)}
        disabled={!canPrev}
      >
        ‹ Prev
      </button>

      <ul className="flex items-center gap-1">
        {numbers.map(n => (
          <li key={n}>
            <button
              className={`px-3 py-1 rounded ${n === page ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              onClick={() => go(n)}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          </li>
        ))}
      </ul>

      <button
        className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50"
        onClick={() => go(page + 1)}
        disabled={!canNext}
      >
        Next ›
      </button>
    </nav>
  );
}
