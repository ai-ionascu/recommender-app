// frontend/src/hooks/useFBT.js
import { useEffect, useMemo, useRef, useState } from "react";
import { getFBT } from "@/api/recommendations";

/**
 * Hook: useFBT({ productId, productIds }, { limit, enabled, maxAnchors })
 *
 * - Supports multiple anchors (cart may contain several products).
 * - Fetches FBT per anchor in parallel.
 * - Returns both per-anchor results and a merged, de-duplicated list.
 *
 * Returns:
 * {
 *   anchorIds: number[],
 *   resultsByAnchor: { [anchorId: number]: Array<RecoItem> },
 *   merged: { items: Array<RecoItem>, sourcesMap: Map<RecoId, Set<AnchorId>> },
 *   loading: boolean,
 *   error: string|null,
 *   errorsByAnchor: { [anchorId: number]: string|null }
 * }
 */
export function useFBT(
  { productId = null, productIds = [] } = {},
  { limit = 8, enabled = true, maxAnchors = 3 } = {}
) {
  // Normalize anchors (numbers), unique, respect maxAnchors for perf
  const anchorIds = useMemo(() => {
    const arr = [];
    if (productId != null) arr.push(productId);
    if (Array.isArray(productIds)) arr.push(...productIds);
    const nums = arr
      .filter((v) => v != null && v !== "")
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));
    return Array.from(new Set(nums)).slice(0, Math.max(1, Number(maxAnchors) || 3));
  }, [productId, productIds, maxAnchors]);

  const [resultsByAnchor, setResultsByAnchor] = useState({});
  const [errorsByAnchor, setErrorsByAnchor] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // cache key: `${anchorId}::${limit}`
  const cacheRef = useRef(new Map());

  useEffect(() => {
    if (!enabled || anchorIds.length === 0) {
      setResultsByAnchor({});
      setErrorsByAnchor({});
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setErrorsByAnchor({});

    (async () => {
      const nextResults = {};
      const nextErrors = {};
      try {
        const tasks = anchorIds.map(async (aid) => {
          const key = `${aid}::${limit}`;
          if (cacheRef.current.has(key)) {
            nextResults[aid] = cacheRef.current.get(key);
            return;
          }
          try {
            const { items } = await getFBT(aid, { limit });
            const list = Array.isArray(items) ? items : [];
            cacheRef.current.set(key, list);
            nextResults[aid] = list;
          } catch (e) {
            nextResults[aid] = [];
            nextErrors[aid] = e?.message || "Failed to load FBT";
          }
        });

        await Promise.all(tasks);
      } catch (e) {
        // Unexpected/global
        if (!cancelled) setError(e?.message || "Failed to load recommendations");
      } finally {
        if (!cancelled) {
          setResultsByAnchor(nextResults);
          setErrorsByAnchor(nextErrors);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [anchorIds, limit, enabled]);

  // Build merged, de-duplicated list, and a sources map (which anchors led to each reco)
  const merged = useMemo(() => {
    const uniqById = new Map(); // id -> item
    const sourcesMap = new Map(); // id -> Set(anchorId)

    for (const aid of anchorIds) {
      const list = resultsByAnchor[aid] || [];
      for (const it of list) {
        const id = Number(it?.id ?? it?._id ?? it?.productId);
        if (!Number.isFinite(id)) continue;
        if (!uniqById.has(id)) uniqById.set(id, it);
        if (!sourcesMap.has(id)) sourcesMap.set(id, new Set());
        sourcesMap.get(id).add(aid);
      }
    }

    return {
      items: Array.from(uniqById.values()),
      sourcesMap,
    };
  }, [anchorIds, resultsByAnchor]);

  return {
    anchorIds,
    resultsByAnchor,
    merged,
    loading,
    error,
    errorsByAnchor,
  };
}
