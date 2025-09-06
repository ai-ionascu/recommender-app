// frontend/src/pages/auth/AuthVerify.jsx
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyEmail } from "@/api/auth";

export default function AuthVerify() {
  const nav = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const token = params.get("token");

  const [state, setState] = useState({ loading: true, ok: false, message: "" });
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setState({ loading: false, ok: false, message: "Missing token" });
      return;
    }
    if (inFlightRef.current) return; // deja rulează
    inFlightRef.current = true;
    (async () => {
      try {
        console.log("[auth/verify] token from URL =", token);
        await verifyEmail(token);
        setState({ loading: false, ok: true, message: "Email verified successfully." });
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Verification failed. Your link may be invalid or expired.";
        setState({ loading: false, ok: false, message: msg });
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [token]);

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Verify Email</h1>

      {state.loading ? (
        <div className="p-4 bg-white rounded-xl shadow">Verifying...</div>
      ) : state.ok ? (
        <div className="p-4 bg-green-50 text-green-800 rounded-xl shadow">
          {state.message}
          <div className="mt-4">
            <button
              className="px-3 py-2 rounded bg-black text-white"
              onClick={() => nav("/login")}
            >
              Go to login
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-50 text-red-800 rounded-xl shadow">
          {state.message}
          <div className="mt-4 flex gap-2">
            <button className="px-3 py-2 rounded bg-gray-100" onClick={() => nav("/")}>
              Home
            </button>
            <button className="px-3 py-2 rounded bg-black text-white" onClick={() => nav("/login")}>
              Go to login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
