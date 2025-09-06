// frontend/src/App.jsx
import { Routes, Route } from "react-router-dom";

import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";

import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import Profile from "@/pages/auth/Profile";

import Orders from "@/pages/Orders";
import OrderDetails from "@/pages/OrderDetails";
import Product from "@/pages/Product";

import ProtectedRoute from "@/layout/ProtectedRoute";
import Layout from "@/layout/Layout";           // admin shell
import SiteLayout from "@/layout/SiteLayout";   // public global shell (Navbar + Footer)

import AdminDashboard from "@/pages/AdminDashboard";
import UsersPanel from "@/pages/UsersPanel";

import AuthVerify from "@/pages/auth/AuthVerify";
import AuthResetRequest from "@/pages/auth/AuthResetRequest";
import AuthReset from "@/pages/auth/AuthReset";

import About from "@/pages/About";
import Contact from "@/pages/Contact";
import FAQ from "@/pages/FAQ";
import ShippingReturns from "@/pages/ShippingReturns";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      {/* SiteLayout WRAPS EVERYTHING → Navbar everywhere */}
      <Route element={<SiteLayout />}>
        {/* Public */}
        <Route index element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/product/:id" element={<Product />} />
        <Route path="/cart" element={<Cart />} />

        {/* Auth public pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/verify" element={<AuthVerify />} />
        <Route path="/auth/reset-request" element={<AuthResetRequest />} />
        <Route path="/auth/reset" element={<AuthReset />} />

        {/* Filling */}
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/shipping-returns" element={<ShippingReturns />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />

        {/* Protected (sub același SiteLayout, deci cu Navbar) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
          <Route path="/checkout" element={<Checkout />} />
        </Route>

        {/* Admin (și el sub SiteLayout; are și header-ul lui intern) */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<Layout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminDashboard />} />
            <Route path="users" element={<UsersPanel />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
