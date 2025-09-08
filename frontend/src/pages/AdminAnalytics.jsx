import { useEffect, useMemo, useState } from "react";
import { getAnalyticsSummary, getSalesDaily, getTopProducts, getTopCustomers } from "@/api/analytics";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";

function Stat({ label, value, suffix = "" }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}{suffix}
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [range, setRange] = useState(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 3600 * 1000);
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { from: fmt(from), to: fmt(to) };
  });

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [error, setError] = useState(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [s, d, tp, tc] = await Promise.all([
        getAnalyticsSummary(range),
        getSalesDaily(range),
        getTopProducts({ ...range, limit: 8 }),
        getTopCustomers({ ...range, limit: 8 })
      ]);
      setSummary(s);
      setDaily(d);
      setTopProducts(tp);
      setTopCustomers(tc);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */}, []);

  const aov = useMemo(() => summary ? (summary.aov || 0) : 0, [summary]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-end gap-3">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <label className="text-gray-500">From</label>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((s) => ({ ...s, from: e.target.value }))}
            className="rounded border px-2 py-1"
          />
          <label className="text-gray-500">To</label>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((s) => ({ ...s, to: e.target.value }))}
            className="rounded border px-2 py-1"
          />
          <button
            onClick={refresh}
            className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Revenue (EUR)" value={summary?.revenue?.toFixed?.(2) ?? 0} />
        <Stat label="Orders" value={summary?.orders ?? 0} />
        <Stat label="Items sold" value={summary?.items ?? 0} />
        <Stat label="Average order value" value={aov.toFixed(2)} suffix=" €" />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold">Revenue by day</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold">Top products (revenue)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600">
            {topProducts.map((p) => (
              <div key={p.productId} className="flex justify-between">
                <span className="truncate">{p.name}</span>
                <span>{Number(p.revenue || 0).toFixed(2)} €</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm md:col-span-2">
          <div className="mb-2 text-sm font-semibold">Top customers</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="userEmail" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600">
            {topCustomers.map((c) => (
              <div key={c.userEmail} className="flex justify-between">
                <span className="truncate">{c.userEmail}</span>
                <span>{Number(c.revenue || 0).toFixed(2)} € ({c.orders} orders)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="mt-6 text-sm text-gray-500">Loading analytics…</div>}
    </div>
  );
}
