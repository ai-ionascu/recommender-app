import { useState, useEffect, useMemo } from "react";
import { useCartStore } from "@/store/cartStore";
import { Link, useNavigate } from "react-router-dom";
import { checkout } from "@/api/orders";

export default function Cart() {
  const items      = useCartStore(s => s.items);
  const updateQty  = useCartStore(s => s.updateQty);
  const removeItem = useCartStore(s => s.removeItem);
  const clear      = useCartStore(s => s.clear);
  const refreshFromServer = useCartStore(s => s.refreshFromServer);

  const total = useCartStore(
     s => s.items.reduce(
       (sum, it) => sum + Number(it.product?.price ?? 0) * Number(it.qty ?? 0),
       0
     )
   );

  const [qtyDraft, setQtyDraft] = useState({});
  const [ckLoading, setCkLoading] = useState(false);
  const [ckError, setCkError] = useState(null);
  const navigate = useNavigate();

  // Always hydrate the cart from server when this page mounts.
  useEffect(() => {
    // Safe to call: refreshFromServer early-returns if there is no token
    useCartStore.getState().refreshFromServer();
  }, []);

  useEffect(() => {
    const next = {};
    for (const it of items) next[it.productId] = String(it.qty ?? 1);
    setQtyDraft(next);
  }, [items]);

  const commitQty = (productId) => {
    const raw = qtyDraft[productId];
    const q = Math.max(1, parseInt(raw, 10) || 1);
    const current = items.find(i => i.productId === productId)?.qty ?? 0;
    if (q !== Number(current)) updateQty(productId, q);
    setQtyDraft(prev => ({ ...prev, [productId]: String(q) }));
  };

  const handleCheckout = async () => {
    setCkError(null);
    setCkLoading(true);
    try {
      // Create a NEW order from the current server cart.
      const created = await checkout();
      const id = created?.id || created?._id || created?.orderId;
      if (!id) throw new Error("Invalid response from checkout.");

      // backend consumed & cleared the server cart - keep UI in sync now
      await useCartStore.getState().refreshFromServer();

      navigate(`/checkout?orderId=${id}`);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || "Checkout failed";
      setCkError(msg);
    } finally {
      setCkLoading(false);
    }
  };

  // Helper: show warning if user is logged-in but client items have no serverItemId
  const showMovedToCheckoutNotice = useMemo(() => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    
    return (items || []).some(it => !it.serverItemId);
  }, [items]);

  if (!items.length) {
    return (
      <div className="p-6">
        Cart is empty. <Link className="text-blue-600" to="/catalog">Go shopping</Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cart</h1>

      {showMovedToCheckoutNotice && (
        <div className="mb-3 rounded p-2 text-sm bg-yellow-50 text-yellow-800">
          Items shown were not synced with the server. The cart may have been moved to checkout.
          Please re-add products if needed.
        </div>
      )}

      {ckError && <div className="mb-3 bg-red-100 text-red-700 p-2 rounded">{ckError}</div>}

      <ul className="space-y-3">
        {items.map((it) => {
          const img = it.product?.images?.find(i => i.is_main) || it.product?.images?.[0];
          return (
            <li key={it.productId} className="bg-white rounded-xl shadow p-3 flex gap-3">
              <div className="w-20 h-20 rounded overflow-hidden bg-gray-50">
                {img ? (
                  <img src={img.url} alt={it.product?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{it.product?.name ?? `#${it.productId}`}</div>
                <div className="text-sm text-gray-500 mb-2">
                  {(Number(it.product?.price ?? 0)).toFixed(2)} €
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={qtyDraft[it.productId] ?? it.qty}
                    onChange={(e) => setQtyDraft((d) => ({ ...d, [it.productId]: e.target.value }))}
                    onBlur={() => commitQty(it.productId)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    className="w-20 border rounded p-1"
                  />
                  <button
                    className="ml-auto px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                    onClick={() => removeItem(it.productId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between mt-6">
        <div className="text-lg">
          <span className="font-semibold">Total:</span> {total.toFixed(2)} €
        </div>

        <div className="flex items-center gap-3">
          <button className="text-sm underline" onClick={clear}>Empty cart</button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleCheckout}
            disabled={!items.length || ckLoading}
          >
            {ckLoading ? "Preparing..." : "Proceed to checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}
