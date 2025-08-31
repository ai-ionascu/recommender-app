import { useEffect, useState } from "react";
import { autocomplete } from "@/api/search";

export default function SearchBar({ onSubmit, placeholder = "Search products..." }) {
  // local UI state
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);

  // fetch suggestions with a small debounce to avoid spamming the server
  useEffect(() => {
    if (!q) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await autocomplete(q, 8);
        setSuggestions(data.items || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const handleSelect = (text) => {
    setQ(text);
    setOpen(false);
    onSubmit?.(text);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setOpen(false);
    onSubmit?.(q);
  };

  return (
    <div className="relative w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="border rounded-lg p-2 flex-1"
        />
        <button className="px-3 py-2 bg-gray-200 rounded-lg" type="submit">
          Search
        </button>
      </form>

      {/* suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 bg-white border rounded-lg mt-1 w-full shadow">
          {suggestions.map((s, i) => {
            const label = s.title || s.name || String(s);
            return (
              <button
                key={i}
                className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                onClick={() => handleSelect(label)}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
