// frontend/src/pages/auth/Signup.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { publicAuthHttp } from "@/api/http";

const SITE_KEY =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  (typeof window !== "undefined" ? window.__RECAPTCHA_SITE_KEY__ : "");
const HAS_SITE_KEY = Boolean(SITE_KEY);

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState(null);

  const captchaTokenRef = useRef("");
  const widgetIdRef = useRef(null);
  const scriptAddedRef = useRef(false);
  const [captchaOk, setCaptchaOk] = useState(false);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  const containerRef = useRef(null);
  const ONLOAD_CB = "__onRecaptchaLoad__";

  // find existing reCAPTCHA script element
  const getRecaptchaScriptEl = () =>
    document.querySelector('script[src*="www.google.com/recaptcha/api.js"]');

  // render widget once in DOM container
  const renderWidget = () => {
    if (!HAS_SITE_KEY) return;
    if (!window.grecaptcha || typeof window.grecaptcha.render !== "function") return;
    if (widgetIdRef.current != null) return;
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
  }

  useEffect(() => {
    if (!HAS_SITE_KEY) return;

    if (!window[ONLOAD_CB]) {
      window[ONLOAD_CB] = () => {
        if (window.grecaptcha && typeof window.grecaptcha.ready === "function") {
          window.grecaptcha.ready(() => renderWidget());
        } else {
          renderWidget();
        }
      };
    }

    // add script if not exits yet
    let scriptEl = getRecaptchaScriptEl();
    if (!scriptAddedRef.current && !scriptEl) {
      scriptEl = document.createElement("script");
      scriptEl.id = "recaptcha-script"; // generic reusable id
      scriptEl.src = `https://www.google.com/recaptcha/api.js?onload=${ONLOAD_CB}&render=explicit`;
      scriptEl.async = true;
      scriptEl.defer = true;
      document.body.appendChild(scriptEl);
      scriptAddedRef.current = true;
    }

    // API ready - render immediately, otherwise wait for load + short polling
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
        } else if (Date.now() - t0 > 7000) {
          clearInterval(iv);
        }
      }, 100);
      return () => clearInterval(iv);
    }
  }, [HAS_SITE_KEY]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOk(false);
    setError(null);
    if (HAS_SITE_KEY && !captchaOk) {
      setLoading(false);
      setError("Please complete the reCAPTCHA.");
      return;
    }
    try {
      const payload = {
        name,
        email,
        password,
        // backend middleware reads `captchaToken`
        captchaToken: captchaTokenRef.current || undefined,
      };

      try {
        await publicAuthHttp.post("/signup", payload);
      } catch {
        await publicAuthHttp.post("/register", payload);
      }
      setOk(true);
    } catch (e1) {
      setError(
        e1?.response?.data?.message ||
          e1?.message ||
          "Signup failed. Please try again."
      );
      // if token was consumed or invalid, reset the widget for another try
      if (window.grecaptcha && widgetIdRef.current != null) {
        window.grecaptcha.reset(widgetIdRef.current);
        captchaTokenRef.current = "";
        setCaptchaOk(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendMsg("");
    try {
      await publicAuthHttp.post("/verify/resend", { email });
      setResendMsg("If an account exists, a new verification email was sent.");
    } catch (e) {
      setResendMsg(e?.response?.data?.message || "Could not send verification email.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create account</h1>

      {ok ? (
        <div className="bg-green-50 text-green-800 rounded-xl shadow p-4 space-y-2">
          <div>Account created. Please check your inbox and verify your email.</div>
          <div className="flex gap-2 items-center">
            <Link className="px-3 py-2 rounded bg-black text-white" to="/login">
              Go to login
            </Link>
            <button
              type="button"
              className="px-3 py-2 rounded bg-gray-100 disabled:opacity-50"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? "Sending..." : "Didn’t get it? Try sending again"}
            </button>
            {resendMsg ? <span className="text-sm text-gray-700">{resendMsg}</span> : null}
          </div>
        </div>
      ) : (
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
          {HAS_SITE_KEY ? (
            <div id="signup-recaptcha" ref={containerRef} className="my-2" />
          ) : null}

          <button
            type="submit"
            className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
            disabled={loading || (HAS_SITE_KEY && !captchaOk)}
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          <div className="text-sm text-gray-600 pt-2">
            Already have an account?{" "}
            <Link className="text-blue-600 hover:underline" to="/login">
              Sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
