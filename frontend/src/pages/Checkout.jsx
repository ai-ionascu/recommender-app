import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ensurePaymentIntent, getOrder, checkout as checkoutOrder } from "@/api/orders";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCartStore } from "@/store/cartStore";

// mici utilitare de bani
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

async function waitForPaid(orderId, { tries = 12, delay = 900 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const data = await getOrder(orderId);
      if (data?.status === "paid") return data;
    } catch {}
    await new Promise(r => setTimeout(r, delay));
  }
  return null;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

/** Stripe payment form (confirmă doar clientSecret-ul primit) */
function PaymentForm({ clientSecret, onProcessingChange, onSuccess, onError, disabled }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret || processing) return;

    onError?.(null);
    setProcessing(true);
    onProcessingChange?.(true);

    try {
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Card element not found");

      const res = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } });
      const status = res?.paymentIntent?.status;

      if (status === "succeeded") {
        setProcessing(false);
        onProcessingChange?.(false);
        onSuccess();
        return;
      }

      if (res?.error) {
        try {
          const pi = await stripe.retrievePaymentIntent(clientSecret);
          if (pi?.paymentIntent?.status === "succeeded") {
            setProcessing(false);
            onProcessingChange?.(false);
            onSuccess();
            return;
          }
        } catch {}
        throw new Error(res.error.message || "Payment failed.");
      }

      throw new Error("Payment not completed. Status: " + (status || "unknown"));
    } catch (err) {
      onError?.(err?.message || "Payment failed.");
      setProcessing(false);
      onProcessingChange?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div className="px-3 py-2 border rounded bg-white">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      <button
        type="submit"
        className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        disabled={!stripe || processing || disabled}
      >
        {processing ? "Confirming order..." : "Pay"}
      </button>
    </form>
  );
}

/** Cartolină read-only cu adresa de livrare */
function ReadonlyShippingCard({ shipping, onEdit }) {
  if (!shipping) return null;
  const rows = [
    shipping.full_name ?? shipping.name,
    shipping.line1 ?? shipping.address1,
    shipping.line2 ?? shipping.address2,
    [shipping.zip, shipping.city].filter(Boolean).join(" "),
    shipping.country,
    shipping.phone ? `Phone: ${shipping.phone}` : null,
  ].filter(Boolean);

  return (
    <div className="bg-gray-50 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Shipping address</div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-sm underline"
            title="Edit shipping address"
          >
            Edit shipping address
          </button>
        ) : null}
      </div>
      <div className="text-sm mt-1 whitespace-pre-line leading-6">
        {rows.join("\n")}
      </div>
    </div>
  );
}

/** Rezumatul de „Success” mai aspectuos */
function SuccessSummary({ order, shipping }) {
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

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const orderId = params.get("orderId");

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const [clientSecret, setClientSecret] = useState(null);
  const [intentId, setIntentId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // shipping local (folosit la creare comandă, dar și ca fallback pentru afișare)
  const [shipping, setShipping] = useState({
    name: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    zip: "",
    country: "FR"
  });
  const [submittingShipping, setSubmittingShipping] = useState(false);

  const createdOnceRef = useRef(false);
  const displayStatus = order?.status ?? status;

  // 1) Dacă avem orderId în URL → citim comanda și ne asigurăm de PaymentIntent
  useEffect(() => {
    if (!orderId) return;
    let ignore = false;

    (async () => {
      try {
        setError(null);
        setStatus("loading");

        const data = await getOrder(orderId);
        if (ignore) return;

        setOrder(data);
        setStatus(data.status || "pending_payment");

        if (data.status === "paid") {
          await useCartStore.getState().refreshFromServer();
          setClientSecret(null);
          setIntentId(null);
          setStatus("paid");
          return;
        }

        if (createdOnceRef.current) {
          setStatus("ready");
          return;
        }
        createdOnceRef.current = true;

        const { client_secret, intent_id } = await ensurePaymentIntent(orderId);
        if (!client_secret) throw new Error("No client_secret from server");

        setClientSecret(client_secret);
        setIntentId(intent_id);
        setStatus("ready");
      } catch (e) {
        if (e?.response?.status === 409) {
          try {
            const data = await getOrder(orderId);
            setOrder(data);
            setStatus(data.status || "paid");
            setClientSecret(null);
            setIntentId(null);
            await useCartStore.getState().refreshFromServer();
            return;
          } catch {}
        }
        setError(e?.response?.data?.message || e.message || "Checkout failed");
        setStatus("error");
        createdOnceRef.current = false;
      }
    })();

    return () => { ignore = true; };
  }, [orderId]);

  // 2) Nu avem încă orderId → creăm comanda din cart, trimițând adresa
  const handleCreateOrderWithShipping = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmittingShipping(true);
    try {
      const data = await checkoutOrder({
        full_name: shipping.name,
        phone: shipping.phone,
        line1: shipping.address1,
        line2: shipping.address2,
        city: shipping.city,
        zip: shipping.zip,
        country: shipping.country,
      });
      const newOrderId = data?.orderId || data?.order?._id;
      const cs = data?.clientSecret;

      if (!newOrderId) throw new Error("Order creation failed.");

      const search = new URLSearchParams({ orderId: newOrderId }).toString();
      navigate(`/checkout?${search}`, { replace: true });

      if (cs) {
        setClientSecret(cs);
        setIntentId(null);
        setStatus("ready");
      } else {
        createdOnceRef.current = false;
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to create order.");
    } finally {
      setSubmittingShipping(false);
    }
  };

  const onShippingChange = (e) => {
    const { name, value } = e.target;
    setShipping(s => ({ ...s, [name]: value }));
  };

  // 3) După confirmarea Stripe → nu setăm local „paid” decât după ce serverul raportează asta
  const handlePaid = async () => {
    try {
      setStatus("finalizing");
      setClientSecret(null);
      setIntentId(null);
      try { await useCartStore.getState().refreshFromServer(); } catch {}

      const updated = await waitForPaid(orderId, { tries: 15, delay: 800 });
      if (updated?.status === "paid") {
        setOrder(updated);
        setStatus("paid");
        try { await useCartStore.getState().clear(); } catch {}
        try { localStorage.removeItem("cart"); } catch {}
        return;
      }
      setStatus("awaiting_confirmation");
    } catch (err) {
      console.warn("[checkout] handlePaid error", err);
      setStatus("awaiting_confirmation");
    }
  };

  const stripeTestInfo = (
    <div className="mt-3 p-3 bg-yellow-50 rounded text-sm">
      <p className="font-semibold mb-1">Stripe test mode</p>
      <ul className="list-disc ml-5 space-y-1">
        <li>Card: <code>4242 4242 4242 4242</code></li>
        <li>Any future date, any CVC</li>
      </ul>
    </div>
  );

  // sursa de adevăr pt afișarea adresei pe Payment: server > local fallback
  const shippingForDisplay = order?.shipping || shipping;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>

      {error && <div className="mb-3 bg-red-100 text-red-700 p-2 rounded">{error}</div>}

      <div className="bg-white rounded-xl shadow p-4 space-y-2">
        <p><span className="font-semibold">Status:</span> {displayStatus}</p>
        {orderId && <p><span className="font-semibold">Order ID:</span> {orderId}</p>}
        {intentId && <p><span className="font-semibold">Payment Intent:</span> {intentId}</p>}
        {order && (
          <div className="mb-2">
            <span className="font-semibold">Total:</span>{" "}
            {formatOrderTotal(order)}
          </div>
        )}

        {/* STEP 1: shipping form (când NU există orderId) */}
        {!orderId && (
          <form onSubmit={handleCreateOrderWithShipping} className="space-y-3 mt-2">
            <h2 className="text-lg font-semibold">Shipping address</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">Full name</label>
                <input name="name" value={shipping.name} onChange={onShippingChange}
                  className="w-full border rounded p-2" required />
              </div>
              <div>
                <label className="block text-sm mb-1">Phone</label>
                <input name="phone" value={shipping.phone} onChange={onShippingChange}
                  className="w-full border rounded p-2" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Address line 1</label>
                <input name="address1" value={shipping.address1} onChange={onShippingChange}
                  className="w-full border rounded p-2" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Address line 2 (optional)</label>
                <input name="address2" value={shipping.address2} onChange={onShippingChange}
                  className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block text-sm mb-1">City</label>
                <input name="city" value={shipping.city} onChange={onShippingChange}
                  className="w-full border rounded p-2" required />
              </div>
              <div>
                <label className="block text-sm mb-1">ZIP</label>
                <input name="zip" value={shipping.zip} onChange={onShippingChange}
                  className="w-full border rounded p-2" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Country</label>
                <input name="country" value={shipping.country} onChange={onShippingChange}
                  className="w-full border rounded p-2" required />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
              disabled={submittingShipping}
            >
              {submittingShipping ? "Saving address..." : "Save address & continue"}
            </button>
          </form>
        )}

        {/* STEP 2: PAYMENT – când avem clientSecret */}
        {clientSecret && displayStatus !== "paid" && (
          <>
            {/* cartolină cu adresa + butonul de edit */}
            <ReadonlyShippingCard
              shipping={shippingForDisplay}
              onEdit={() => navigate("/checkout")} // revenire la pasul de shipping
            />

            <div className="mt-3">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <PaymentForm
                  clientSecret={clientSecret}
                  onProcessingChange={setIsProcessing}
                  onSuccess={handlePaid}
                  onError={setError}
                  disabled={displayStatus === "paid"}
                />
              </Elements>
            </div>

            {stripeTestInfo}

            <div className="flex gap-3 mt-4">
              <button
                className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                onClick={() => navigate("/cart")}
                disabled={isProcessing}
              >
                Back to cart
              </button>
            </div>
          </>
        )}

        {/* STEP 3: SUCCESS (confirmare) */}
        {displayStatus === "paid" && (
          <div className="mt-4">
            <SuccessSummary order={order} shipping={order?.shipping || shipping} />
          </div>
        )}
      </div>
    </div>
  );
}
