import { createContext, useContext, useState, useEffect } from "react";
import { authHttp, setAuthToken } from "@/api/http";
import { useCartStore, waitUntilCartHydrated } from "@/store/cartStore";
import { clearCartPersistence } from "@/store/cartPersistence";

const AuthCtx = createContext(null);

const firstDefined = (...vals) => vals.find(v => v !== undefined && v !== null);
const toBoolean = (v) => {
  if (typeof v === 'string') return ['true','t','1','yes'].includes(v.toLowerCase());
  if (typeof v === 'number') return v === 1;
  return !!v;
};
const normalizeUser = (raw) => ({
  ...raw,
  roles: Array.isArray(raw?.roles) ? raw.roles : (raw?.role ? [raw.role] : []),
  is_verified: toBoolean(firstDefined(raw?.is_verified, raw?.isVerified, raw?.verified)),
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setAuthToken(token || null);

    if (!token) {
      if (mounted) {
        setUser(null);
        setLoading(false);
      }
      return () => { mounted = false; };
    }

    (async () => {
      try {
        const { data } = await authHttp.get("/profile");
        if (mounted) setUser(normalizeUser(data));
      } catch (e) {
        // orice eroare => token invalid sau user inexistent; curățăm zgomotul
        const status = e?.response?.status;
        if (status === 401 || status === 404 || status === 403) {
          localStorage.removeItem("token");
          setAuthToken(null);
        } else {
          console.warn("[auth] profile fetch failed", status, e?.message);
        }
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [token]);


  const login = async (email, password, captchaToken) => {
    const { data } = await authHttp.post("/login", { email, password, captchaToken });
    localStorage.setItem("token", data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser({
      ...data.user,
      roles: Array.isArray(data.user?.roles) ? data.user.roles : (data.user?.role ? [data.user.role] : []),
    });

    // phase 1: no merge — empty guest and attempt strictly online
    await waitUntilCartHydrated();
    useCartStore.getState().clear(); // clear the store-ul
    clearCartPersistence();          // clear localStorage guest
    await useCartStore.getState().refreshFromServer(); // online cart in store

    return data;
  };

  const logout = async () => {
    localStorage.removeItem("token");
    setAuthToken(null);
    setToken(null);

    // empty guest cart and persistence
    useCartStore.getState().clear();
    clearCartPersistence();

    setUser(null);
  };

  const value = { token, user, loading, isAdmin: !!user?.roles?.map(r => r?.toLowerCase()).includes("admin"), login, logout };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);