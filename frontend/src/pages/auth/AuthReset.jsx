// frontend/src/pages/auth/AuthReset.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPasswordWithToken } from "@/api/auth";

export default function AuthReset() {
  const nav = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const tokenFromUrl = params.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { setToken(tokenFromUrl); }, [tokenFromUrl]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!token) return setError("Missing token.");
    if (!pwd || pwd.length < 6) return setError("Password must be at least 6 characters.");
    if (pwd !== pwd2) return setError("Passwords do not match.");

    setLoading(true);
    try {
      await resetPasswordWithToken({ token, newPassword: pwd });
      setOk(true);
    } catch (e1) {
      setError(
        e1?.response?.data?.message ||
          e1?.message ||
          "Failed to reset password. Your link may be invalid or expired."
      );
    } finally {
      setLoading(false);
    }
  };

  if (ok) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4">Reset password</h1>
        <div className="p-4 bg-green-50 text-green-800 rounded-xl shadow">
          Password changed successfully.
          <div className="mt-3">
            <button className="px-3 py-2 rounded bg-black text-white" onClick={() => nav("/login")}>
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Reset password</h1>

      <form onSubmit={submit} className="bg-white rounded-xl shadow p-4 space-y-3">
        {error && <div className="p-2 rounded bg-red-50 text-red-800">{error}</div>}

        {!tokenFromUrl && (
          <label className="block">
            <span className="text-sm text-gray-600">Token</span>
            <input
              type="text"
              className="mt-1 w-full border rounded-lg p-2"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm text-gray-600">New password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg p-2"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Confirm password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg p-2"
            value={pwd2}
            onChange={(e) => setPwd2(e.target.value)}
            required
            minLength={6}
          />
        </label>

        <button
          type="submit"
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Saving..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
