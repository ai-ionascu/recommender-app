import { useEffect, useMemo, useState, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import { useAuth } from "@/context/AuthContext";
import {
  getCart, addToCart, updateCartItem, removeCartItem, clearCart as apiClearCart
} from "@/api/orders";

/**
 * Unified cart API:
 * - guest: keeps local store only
 * - logged in: mirrors actions to order-service and refreshes local store from server
 */
export function useCart() {
  const { token } = useAuth();

  // Select only what<s needed, not the whole object
  const setFromServer = useCartStore((s) => s.setFromServer);
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);

  const [loading, setLoading] = useState(!!token);
  const [error, setError]     = useState(null);

  // guard against double run in StrictMode
  const didInit = useRef(false);

  useEffect(() => {
    // logout - reset gard
    if (!token) { didInit.current = false; setLoading(false); setError(null); return; }

    if (didInit.current) return;   // <- do not re run in StrictMode
    didInit.current = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const serverCart = await getCart();   // GET /api/orders/cart
        setFromServer(serverCart);           
      } catch (e) {
        const code = e?.response?.status;

        if (code !== 404 && code !== 500) setError(e.message || "Failed to load cart");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Add item
  const addItem = async (product, qty = 1) => {
    if (!token) {
      useCartStore.getState().addLocal(product, qty);
      return;
    }
    const productId = product.id ?? product._id;
    await addToCart({ productId, qty });
    const fresh = await getCart();
    useCartStore.getState().setFromServer(fresh);
  };

  // Update qty (server needs itemId; local uses productId)
  const updateQty = async (productId, qty) => {
    if (!token) {
      useCartStore.getState().updateLocal(productId, qty);
      return;
    }
    const s = useCartStore.getState();
    const item = s.items.find(i => i.productId === productId);

    if (!item?.serverItemId) {
      const fresh = await getCart();
      useCartStore.getState().setFromServer(fresh);
      const again = useCartStore.getState().items.find(i => i.productId === productId);
      if (!again?.serverItemId) return;
      await updateCartItem(again.serverItemId, qty);
    } else {
      await updateCartItem(item.serverItemId, qty);
    }
    const fresh = await getCart();
    useCartStore.getState().setFromServer(fresh);
  };

  // Remove item
  const removeItem = async (productId) => {
    if (!token) {
      useCartStore.getState().removeLocal(productId);
      return;
    }
    const item = useCartStore.getState().items.find(i => i.productId === productId);
    if (item?.serverItemId) {
      await removeCartItem(item.serverItemId);
    }
    const fresh = await getCart();
    useCartStore.getState().setFromServer(fresh);
  };

  // Clear cart
  const clear = async () => {
    if (!token) {
      useCartStore.getState().clear();
      return;
    }
    await apiClearCart();
    const fresh = await getCart();
    useCartStore.getState().setFromServer(fresh);
  };

  return { items, loading, error, total };
}
