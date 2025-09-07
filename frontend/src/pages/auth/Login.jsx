// frontend/src/pages/auth/Login.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  (typeof window !== "undefined" ? window.__RECAPTCHA_SITE_KEY__ : "");
  const HAS_SITE_KEY = Boolean(SITE_KEY);

export default function Login() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [captchaOk, setCaptchaOk] = useState(false);

  const captchaTokenRef = useRef("");
  const widgetIdRef = useRef(null);
  const scriptAddedRef = useRef(false);
  const containerRef = useRef(null);
  const ONLOAD_CB = "__onRecaptchaLoad__";

  const getRecaptchaScriptEl = () =>
    document.querySelector('script[src*="www.google.com/recaptcha/api.js"]');

  const renderWidget = () => {
    if (!HAS_SITE_KEY) return;
    if (!window.grecaptcha || typeof window.grecaptcha.render !== "function") return;
    if (widgetIdRef.current != null) return; // already rendered
    if (!containerRef.current) return;
    widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token) => {
        captchaTokenRef.current = token;
        setCaptchaOk(!!token);
      },
      "expired-callback": () => {
        captchaTokenRef.current = "";
        setCaptchaOk(false);
      },
      "error-callback": () => {
        captchaTokenRef.current = "";
        setCaptchaOk(false);
      },
    });
  };

  useEffect(() => {
    if (!window[ONLOAD_CB]) {
      window[ONLOAD_CB] = () => {
        // grecaptcha.ready asigură că API-ul e pregătit
        if (window.grecaptcha && typeof window.grecaptcha.ready === "function") {
          window.grecaptcha.ready(() => renderWidget());
        } else {
          renderWidget();
        }
      };
    }

    // captcha script not exists - add once
    let scriptEl = getRecaptchaScriptEl();
    if (!scriptAddedRef.current && !scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = "recaptcha-script"; // id generic
      scriptEl.src = `https://www.google.com/recaptcha/api.js?onload=${ONLOAD_CB}&render=explicit`;
      scriptEl.async = true;
      scriptEl.defer = true;
      document.body.appendChild(scriptEl);
      scriptAddedRef.current = true;
    }

    // script loaded - render
    if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
      renderWidget();
    } else {
      
      if (scriptEl) {
        const onLoad = () => window[ONLOAD_CB] && window[ONLOAD_CB]();
        scriptEl.addEventListener("load", onLoad, { once: true });
      }
      
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (window.grecaptcha && typeof window.grecaptcha.render === "function") {
          clearInterval(iv);
          renderWidget();
        } else if (Date.now() - t0 > 5000) {
          clearInterval(iv);
        }
      }, 100);
      return () => clearInterval(iv);
    }
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password, captchaTokenRef.current || undefined);
      const to = state?.from || "/";
      nav(to, { replace: true });
    } catch (e1) {
      setError(
        e1?.response?.data?.message ||
          e1?.message ||
          "Login failed. Check your credentials and try again."
      );
      if (window.grecaptcha && widgetIdRef.current != null) {
        window.grecaptcha.reset(widgetIdRef.current);
        captchaTokenRef.current = "";
        setCaptchaOk(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Login</h1>

      <form onSubmit={onSubmit} className="bg-white rounded-xl shadow p-4 space-y-3">
        {error && <div className="p-2 rounded bg-red-50 text-red-800">{error}</div>}

        <label className="block">
          <span className="text-sm text-gray-600">Email</span>
          <input
            type="email"
            className="mt-1 w-full border rounded-lg p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {/* reCAPTCHA placeholder */}
        {HAS_SITE_KEY ? <div id="signup-recaptcha" ref={containerRef} className="my-2" /> : null}
        <button
          type="submit"
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={loading || (HAS_SITE_KEY && !captchaOk)}
        >
          {loading ? "Signing you in..." : "Sign in"}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 text-sm">
          <Link className="text-blue-600 hover:underline" to="/auth/reset-request">
            Forgot password?
          </Link>
          <div className="text-gray-600">
            Don’t have an account?{" "}
            <Link className="text-blue-600 hover:underline" to="/signup">
              Sign up
            </Link>
          </div>
        </div>

        <div className="text-xs text-gray-500 pt-1">
          Didn’t receive the verification email after signing up? Check spam/junk. Once verified,
          just come back here and sign in.
        </div>
      </form>
    </div>
  );
}
