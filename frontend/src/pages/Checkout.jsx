import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ensurePaymentIntent, getOrder } from "@/api/orders";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCartStore } from "@/store/cartStore";

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

// Confirm only the provided clientSecret (doesn't hit /:id/pay here).
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

      // Fallback: if Stripe returns an error but PI is actually 'succeeded', proceed.
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
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <CardElement options={{ hidePostalCode: true }} />
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

  // Anti StrictMode – ensure we only request a PI once.
  const createdOnceRef = useRef(false);

  const displayStatus = order?.status ?? status;

  useEffect(() => {
    if (!orderId) return;
    let ignore = false;

    (async () => {
      try {
        setError(null);
        setStatus("loading");

        // 1) Fetch order
        const data = await getOrder(orderId);
        if (ignore) return;

        setOrder(data);
        setStatus(data.status || "pending_payment");

        // Already paid → sync cart & stop showing form
        if (data.status === "paid") {
          await useCartStore.getState().refreshFromServer();
          setClientSecret(null);
          setIntentId(null);
          setStatus("paid");
          return;
        }

        // 2) Ensure PaymentIntent ONCE
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
        // If backend returns 409 "Order already paid"
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
        createdOnceRef.current = false; // allow retry via page refresh
      }
    })();

    return () => { ignore = true; };
  }, [orderId]);

  // After Stripe confirm: do not set local "paid" unless server says so.
  // Hide the form (clear clientSecret), refresh cart, and wait for the server.
  const handlePaid = async () => {
    try {
      setStatus("finalizing");

      // Remove the form so the user cannot try to pay again (payment already confirmed on Stripe)
      setClientSecret(null);
      setIntentId(null);

      // Refresh cart UI (server should have consumed cart on success path)
      try { await useCartStore.getState().refreshFromServer(); } catch {}

      // Poll the backend for the REAL order status
      const updated = await waitForPaid(orderId, { tries: 15, delay: 800 });
      if (updated?.status === "paid") {
        setOrder(updated);
        setStatus("paid");

        // clear local cart (zustand store + persisted guest cart)
        try { await useCartStore.getState().clear(); } catch (e) { console.warn('[checkout] clear store failed', e); }
        try { localStorage.removeItem("cart"); } catch (e) { console.warn('[checkout] remove local cart failed', e); }

        return;
      }

      setStatus("awaiting_confirmation");
    } catch {
      // Even if something goes wrong while polling, do not flip to "paid" locally.
      console.warn('[checkout] handlePaid error', err);
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
            {Number(order.totalAmount ?? order.total ?? order?.totals?.grandTotal ?? 0).toFixed(2)}{" "}
            {order.currency ?? "EUR"}
          </div>
        )}

        {/* Show the payment form only when we have a clientSecret and the order isn't paid */}
        {clientSecret && displayStatus !== "paid" && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              onProcessingChange={setIsProcessing}
              onSuccess={handlePaid}
              onError={setError}
              disabled={displayStatus === "paid"}
            />
          </Elements>
        )}

        {stripeTestInfo}

        {/* Back to cart – visible only on the actual payment screen; disabled while processing */}
        {clientSecret && displayStatus !== "paid" && (
          <div className="flex gap-3 mt-4">
            <button
              className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              onClick={() => navigate("/cart")}
              disabled={isProcessing}
            >
              Back to cart
            </button>
          </div>
        )}

        {displayStatus === "paid" && (
          <div className="mt-4 p-3 rounded bg-green-50 text-green-700">
            Payment received. Your order is confirmed.
          </div>
        )}
      </div>
    </div>
  );
}
