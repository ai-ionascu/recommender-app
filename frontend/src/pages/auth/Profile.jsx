// frontend/src/pages/auth/Profile.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authHttp } from "@/api/http";

export default function Profile() {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(user || null);

  const refreshProfile = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const { data } = await authHttp.get("/profile");
      setProfile(data);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to refresh profile.");
    } finally {
      setRefreshing(false);
    }
  };

  if (!profile) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow p-4">Loading profile...</div>
      </div>
    );
  }

  const email = profile.email || "";
  const isVerified = !!(profile.is_verified ?? profile.isVerified ?? profile.verified);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>

      {error && <div className="p-2 rounded bg-red-50 text-red-800">{error}</div>}

      {!isVerified && (
        <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
          <div className="font-medium text-yellow-800">
            Your email is not verified yet.
          </div>
          <div className="text-sm text-yellow-800 mt-1">
            Please check your inbox (and spam). After you click the link, you can press
            <span className="mx-1 font-medium">Refresh</span> below.
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={refreshProfile}
              className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh status"}
            </button>
            <Link
              to={`/auth/reset-request?email=${encodeURIComponent(email)}`}
              className="px-3 py-2 rounded bg-gray-100"
              title="If you didn't receive the email, you can trigger another message."
            >
              Re-send email
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-sm text-gray-600">Name</div>
            <div className="font-medium">{profile.name || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Email</div>
            <div className="font-medium">{email || "—"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Roles</div>
            <div className="font-medium">
              {Array.isArray(profile.roles) && profile.roles.length
                ? profile.roles.join(", ")
                : (profile.role || "user")}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Verified</div>
            <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${isVerified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
              {isVerified ? "Yes" : "No"}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Link
            to={`/auth/reset-request?email=${encodeURIComponent(email)}`}
            className="px-3 py-2 rounded bg-gray-100"
          >
            Change password
          </Link>
          <Link to="/orders" className="px-3 py-2 rounded bg-gray-100">My orders</Link>
          <button onClick={logout} className="px-3 py-2 rounded bg-red-600 text-white">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
