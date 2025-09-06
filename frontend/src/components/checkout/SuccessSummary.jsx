function parseMinorFromAny(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    return v > 1000 ? Math.round(v) : Math.round(v * 100);
  }
  if (typeof v === "string") {
    const m = v.match(/[\d,.]+/);
    if (!m) return null;
    const num = parseFloat(m[0].replace(",", "."));
    if (!Number.isFinite(num)) return null;
    return Math.round(num * 100);
  }
  return null;
}
function computeOrderTotalCents(order) {
  if (!order) return 0;
  const direct =
    order.subtotalCents ??
    order.totalCents ??
    order.paidAmountCents ??
    order.totals?.subtotalCents ??
    order.totals?.grandTotalCents ??
    parseMinorFromAny(order.subtotal) ??
    parseMinorFromAny(order.total) ??
    parseMinorFromAny(order.amount) ??
    parseMinorFromAny(order.totals?.grandTotal);
  if (direct != null) return direct;

  let sum = 0;
  const items = order.items ?? order.lines ?? order.cart?.items ?? [];
  if (Array.isArray(items)) {
    for (const it of items) {
      const qty = it.qty ?? it.quantity ?? 1;
      const unitMinor =
        it.priceCents ??
        parseMinorFromAny(it.unitPrice) ??
        parseMinorFromAny(it.price) ??
        0;
      sum += unitMinor * qty;
    }
  }
  return sum;
}
function formatOrderTotal(order) {
  const totalCents = computeOrderTotalCents(order);
  const currency = (order?.currency ?? "EUR").toUpperCase();
  const value = (totalCents ?? 0) / 100;
  return `${value.toFixed(2)} ${currency}`;
}

import ReadonlyShippingCard from "./ReadonlyShippingCard";

export default function SuccessSummary({ order, shipping }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <div className="p-3 rounded border border-green-200 bg-green-50 text-green-800">
        Payment received. Your order is confirmed.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold mb-2">Order</h3>
          <div className="text-sm space-y-1">
            <div><span className="text-gray-500">Order ID:</span> <span className="font-mono">{order?._id || order?.id}</span></div>
            <div><span className="text-gray-500">Status:</span> {order?.status ?? "paid"}</div>
            <div><span className="text-gray-500">Total:</span> {formatOrderTotal(order)}</div>
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Shipping address</h3>
          <ReadonlyShippingCard shipping={shipping} />
        </div>
      </div>

      <div className="pt-2">
        <a href="/catalog" className="text-sm underline">Back to catalog</a>
      </div>
    </div>
  );
}
