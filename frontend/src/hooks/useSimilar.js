// frontend/src/hooks/useSimilar.js
import { useEffect, useMemo, useRef, useState } from "react";
import { getSimilar } from "@/api/recommendations";

/**
 * Hook: useSimilar(productId, { limit, enabled })
 * - Caches results by (productId, limit) in a ref Map
 * - Returns { items, loading, error }
 */
export function useSimilar(productId, { limit = 8, enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cacheRef = useRef(new Map());
  const key = useMemo(() => `${productId || "none"}::${limit}`, [productId, limit]);

  useEffect(() => {
    if (!enabled || !productId) return;

    if (cacheRef.current.has(key)) {
      setItems(cacheRef.current.get(key));
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { items: data } = await getSimilar(productId, { limit });
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          cacheRef.current.set(key, list);
          setItems(list);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load similar products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [productId, limit, enabled, key]);

  return { items, loading, error };
}
