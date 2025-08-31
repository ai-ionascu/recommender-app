// frontend/src/store/cartPersistence.js
export const CART_STORAGE_KEY = "cart_v3";

/** Golește strict persistența guest (fără a atinge store-ul în memorie). */
export function clearCartPersistence() {
  try {
    localStorage.removeItem("cart");
    localStorage.removeItem("cart_v2");
    const empty = { state: { items: [], lastGuestUpdate: Date.now() }, version: 3 };
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(empty));
    console.log("[cart:persist] cleared");
  } catch (e) {
    console.warn("[cart:persist] clear error", e);
  }
}

/** Citește din localStorage (fără store). Util când vom introduce merge. */
export function loadGuestItemsFromStorage() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    return Array.isArray(obj?.state?.items) ? obj.state.items : [];
  } catch {
    return [];
  }
}
