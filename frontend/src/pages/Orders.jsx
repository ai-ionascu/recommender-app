// frontend/src/pages/Orders.jsx
import { useEffect, useMemo, useState } from "react";
import { listOrders as listOrdersRaw } from "@/api/orders";
import Pagination from "@/components/Pagination";

/** sume în EUR */
const fmtMoney = (n) => (Number(n ?? 0)).toFixed(2) + " EUR";
/** dată/ora locală */
const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleString(); } catch { return iso || ""; }
};

/** Normalizare răspuns ca {items, total} */
const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return { items: data, total: data.length };
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: Number.isFinite(data?.total) ? Number(data.total) : (Array.isArray(data?.items) ? data.items.length : 0),
  };
};

export default function Orders() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /** Reîncarcă lista când se schimbă pagina/mărimea */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // IMPORTANT: folosim limit/offset pentru backend
        const raw = await listOrdersRaw({
          limit: size,
          offset: (page - 1) * size,
        });
        const { items: list, total: t } = normalizeListResponse(raw);
        if (cancelled) return;
        setItems(list);
        setTotal(t);
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.error || e?.message || "Failed to load orders.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, size]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / (size || 1))),
    [total, size]
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold">My Orders</h1>
          <div className="text-sm text-gray-500 mt-1">Total orders: {total}</div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Per page:</label>
          <select
            className="border rounded px-2 py-1"
            value={size}
            onChange={(e) => { setPage(1); setSize(Number(e.target.value)); }}
          >
            {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Order</th>
              <th className="text-left px-3 py-2">User</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Subtotal</th>
              <th className="text-left px-3 py-2">Created</th>
              <th className="text-right px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Loading…</td></tr>
            )}
            {(!loading && error) && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-red-600">{error}</td></tr>
            )}
            {(!loading && !error && items.length === 0) && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No orders.</td></tr>
            )}

            {(!loading && !error) && items.map((o) => (
              <tr key={o._id} className="border-t">
                <td className="px-3 py-2 font-mono">{o._id}</td>
                <td className="px-3 py-2">{o.userEmail || o.userId || "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "px-2 py-1 rounded text-xs " +
                      (o.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : o.status === "pending_payment"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700")
                    }
                  >
                    {o.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{fmtMoney(o.subtotal)}</td>
                <td className="px-3 py-2">{fmtDate(o.createdAt)}</td>
                <td className="px-3 py-2 text-right">
                  <a className="px-3 py-1 rounded bg-black text-white text-xs" href={`/orders/${o._id}`}>
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="p-3">
            <Pagination
              page={page}
              pageSize={size}
              total={total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
