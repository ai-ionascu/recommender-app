// frontend/src/App.jsx
import { Routes, Route } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import Layout from "./layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Profile from "./pages/auth/Profile";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCartStore } from "@/store/cartStore";
import UsersPanel from "@/pages/UsersPanel";

function App() {
  const { token } = useAuth();

  const refreshFromServer = useCartStore(s => s.refreshFromServer);
  const clearCart         = useCartStore(s => s.clear);

  // Doar sincron minim: dacă ai token -> ia server cart; dacă nu ai -> golește store-ul
  useEffect(() => {
    if (token) {
      refreshFromServer();
    } else {
      clearCart();
    }
  }, [token, refreshFromServer, clearCart]);

  // (opțional) acces în consola dev
  useEffect(() => {
    if (import.meta.env.DEV) {
      window.cartStore = useCartStore;
    }
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/catalog" element={<Catalog />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="/cart" element={<Cart />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/checkout" element={<Checkout />} />
      </Route>
      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<Layout />}>
          <Route index element={<AdminDashboard />} />          {/* /admin -> products */}
          <Route path="products" element={<AdminDashboard />} />{/* /admin/products */}
          <Route path="users" element={<UsersPanel />} />       {/* /admin/users */}
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
