// src/pages/OrderDetails.jsx
import { useEffect, useState } from "react";
import { getOrder } from "@/api/orders";
import { useParams, Link } from "react-router-dom";

function fmtAmount(n, c = "EUR") {
  const v = Number(n ?? 0);
  return `${v.toFixed(2)} ${String(c).toUpperCase()}`;
}

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const data = await getOrder(id);
        if (ignore) return;
        setOrder(data);
      } catch (e) {
        setErr(e?.response?.data?.error || e.message || "Failed to load order.");
      } finally {
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [id]);

  if (loading) return <div className="p-6">Loading order…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!order) return <div className="p-6">Order not found.</div>;

  const subtotal = order.subtotal ?? order.totalAmount ?? 0;
  const currency = order.currency ?? "EUR";
  const shipping = order.shipping || {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order #{order._id}</h1>
        <Link to="/orders" className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">Back to list</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Items</h2>
          {!order.items?.length ? (
            <p className="text-gray-600">No items.</p>
          ) : (
            <div className="space-y-3">
              {order.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-3">
                    {it.image ? (
                      <img src={it.image} alt="" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-100" />
                    )}
                    <div>
                      <div className="font-medium">{it.name || `Product ${it.productId}`}</div>
                      <div className="text-xs text-gray-500">ID: {it.productId}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">Qty: {it.qty}</div>
                    <div className="text-sm">{fmtAmount(it.price, currency)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end mt-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Subtotal</div>
              <div className="text-lg font-semibold">{fmtAmount(subtotal, currency)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Status</span>
              <span className="px-2 py-0.5 rounded bg-gray-100">{order.status}</span>
            </div>
            <div className="flex justify-between">
              <span>Created</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Updated</span>
              <span>{new Date(order.updatedAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Total</span>
              <span className="font-semibold">{fmtAmount(subtotal, currency)}</span>
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-5 mb-2">Shipping</h3>
          <div className="text-sm space-y-1">
            <div>{shipping.name}</div>
            <div>{shipping.phone}</div>
            <div>{shipping.address1}{shipping.address2 ? `, ${shipping.address2}` : ""}</div>
            <div>{shipping.city}, {shipping.zip}</div>
            <div>{shipping.country}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
