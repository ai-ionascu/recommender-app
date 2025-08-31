// frontend/src/store/cartStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getProductById } from "@/api/products";
import {
  getCart as apiGetCart,
  addToCart as apiAddToCart,
  updateCartItem as apiUpdateCartItem,
  removeCartItem as apiRemoveCartItem,
  clearCart as apiClearCart,
} from "@/api/orders";
import { CART_STORAGE_KEY } from "./cartPersistence";

/** transformă răspunsul serverului în [{productId, product, qty, serverItemId}] */
function mapServerCart(serverCart) {
  const sItems = Array.isArray(serverCart) ? serverCart : (serverCart?.items || []);
  return sItems
    .map((it) => {
      const productId =
        it.productId ?? it.product?.id ?? it.product?._id ?? it.product_id ?? it._id;
      return {
        productId,
        product: it.product || null,
        qty: Number(it.qty ?? it.quantity ?? 1),
        serverItemId: it.id ?? it._id ?? it.itemId,
      };
    })
    .filter((x) => x.productId);
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],            // [{ productId, product, qty, serverItemId? }]
      lastGuestUpdate: 0,

      /** ===== Helpers ===== */

      /** Citește din server și pune în store (folosit pe login și refresh). */
      async refreshFromServer() {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    console.log("[cart] refreshFromServer → calling getCart()");
    const serverCart = await apiGetCart();
    console.log("[cart] refreshFromServer ← got:", serverCart);
    await get().setFromServer(serverCart);
  } catch (e) {
    console.warn("[cart] refreshFromServer failed", e?.response?.status, e?.message);
  }
},

      /** Set direct din payload server (opțional async pentru fill-in produse lipsă) */
      setFromServer: async (serverCart) => {
        const mapped = mapServerCart(serverCart);
        console.log("[cart] setFromServer mapped items:", mapped.length, mapped);
        const items = await Promise.all(
          mapped.map(async (it) => {
            if (it.product) return it;
            try {
              const p = await getProductById(it.productId);
              return { ...it, product: p };
            } catch {
              return {
                ...it,
                product: { id: it.productId, name: `Product ${it.productId}`, price: 0, images: [] },
              };
            }
          })
        );
        set({ items });
      },

      /** ===== Public API (invitat + logat) ===== */

      addItem: async (productId, qty = 1) => {
        if (!productId) return;
        const token = localStorage.getItem("token");

        if (!token) {
          // INVITAT → adaugă local
          const items = [...get().items];
          const ix = items.findIndex((i) => i.productId === productId);
          if (ix >= 0) items[ix].qty += qty;
          else {
            let product = null;
            try { product = await getProductById(productId); } catch { /* noop */ }
            if (!product) product = { id: productId, name: `Product ${productId}`, price: 0, images: [] };
            items.push({ productId, product, qty });
          }
          set({ items, lastGuestUpdate: Date.now() });
          return;
        }

        // LOGAT → server + refresh
        await apiAddToCart({ productId, qty });
        await get().refreshFromServer();
      },

      updateQty: async (productId, qty) => {
        qty = Math.max(1, Number(qty) || 1);
        const token = localStorage.getItem("token");

        if (!token) {
          // INVITAT
          set({
            items: get().items.map((i) => (i.productId === productId ? { ...i, qty } : i)),
            lastGuestUpdate: Date.now(),
          });
          return;
        }

        // LOGAT
        const item = get().items.find((i) => i.productId === productId);
        if (!item?.serverItemId) {
          // fallback: doar local, apoi refresh
          set({ items: get().items.map((i) => (i.productId === productId ? { ...i, qty } : i)) });
          await get().refreshFromServer();
          return;
        }
        await apiUpdateCartItem(item.serverItemId, qty);
        await get().refreshFromServer();
      },

      removeItem: async (productId) => {
        const token = localStorage.getItem("token");

        if (!token) {
          // INVITAT
          set({
            items: get().items.filter((i) => i.productId !== productId),
            lastGuestUpdate: Date.now(),
          });
          return;
        }

        // LOGAT
        const item = get().items.find((i) => i.productId === productId);
        if (!item?.serverItemId) {
          set({ items: get().items.filter((i) => i.productId !== productId) });
          // ensure persisted guest cart is wiped as well
          try { clearCartPersistence(); } catch (e) { console.warn('[cart] clear persistence failed', e); }
          await get().refreshFromServer();
          return;
        }
        await apiRemoveCartItem(item.serverItemId);
        await get().refreshFromServer();
      },

      clear: async () => {
        const token = localStorage.getItem("token");

        // Optimistic: șterge instant din UI
        set({ items: [], lastGuestUpdate: Date.now() });

        if (!token) {
          // invitat: persist va fi suprascris cu lista goală
          return;
        }

        // logat: goliți și pe server, apoi resinc
        try {
          await apiClearCart();            // DELETE /api/cart
        } catch (e) {
          console.warn("[cart] clear (server) failed", e?.response?.status, e?.message);
        }
        await get().refreshFromServer();   // readuce din server (acum gol)
      },
    }),
    {
      name: CART_STORAGE_KEY,
      version: 3,
      onRehydrateStorage: () => (state) => {
        try {
          const token = localStorage.getItem("token");
          if (token) {
            return { ...state, items: [] };
          }
          // expire guest cart after 1 hour optionally
          if (!token && state?.lastGuestUpdate && Date.now() - state.lastGuestUpdate > 3600_000) {
            return { ...state, items: [] };
          }
        } catch (e) {
          console.warn("[cart] onRehydrateStorage error", e);
        }
        return state;
      },
      partialize: (state) => ({
        items: state.items,
        lastGuestUpdate: state.lastGuestUpdate,
      }),
      // dacă există token -> ignoră complet ce vine din localStorage
      merge: (persisted, current) => {
        const token = localStorage.getItem("token");
        const base = { ...current, ...(persisted || {}) };
        if (token) return { ...base, items: [] }; // nu ținem nimic local când ești logat
        // guest: expiră după 1h
        if (base?.lastGuestUpdate && Date.now() - base.lastGuestUpdate > 3600_000) {
          return { ...base, items: [] };
        }
        return base;
      },
    }
  )
);

/** Așteaptă ca persist (hydration) să se termine, pentru efecte care depind de items. */
export function waitUntilCartHydrated() {
  return new Promise((resolve) => {
    const api = useCartStore.persist;
    if (api?.hasHydrated?.()) return resolve();
    const unsub = api?.onFinishHydration?.(() => {
      unsub?.();
      resolve();
    });
    if (!unsub) resolve();
  });
}
