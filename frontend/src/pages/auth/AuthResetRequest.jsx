// frontend/src/pages/auth/AuthResetRequest.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "@/api/auth";

export default function AuthResetRequest() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    setErr(null);
    try {
      await requestPasswordReset(email.trim());
      setMsg("If the email exists, a reset link has been sent. Please check your inbox.");
      setEmail("");
    } catch (e1) {
      setErr(e1?.response?.data?.message || "Could not send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-2xl shadow p-6">
      <h1 className="text-2xl font-bold mb-2 text-center">Forgot password</h1>
      <p className="text-center text-gray-600 mb-6">
        Enter your email and we'll send you a reset link.
      </p>

      {msg && <div className="mb-3 rounded-lg bg-green-50 text-green-700 p-3 text-sm">{msg}</div>}
      {err && <div className="mb-3 rounded-lg bg-red-50 text-red-700 p-3 text-sm">{err}</div>}

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-2"
          placeholder="you@example.com"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white rounded-lg py-2 disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <Link to="/login" className="text-blue-600 hover:underline">Back to Login</Link>
        <Link to="/signup" className="text-blue-600 hover:underline">Create account</Link>
      </div>
    </div>
  );
}
