import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Profile() {

  const { user, logout, isAdmin } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  const roles = Array.isArray(user.roles) ? user.roles : (user.role ? [user.role] : []);
  const verified = user.is_verified ?? user.isVerified ?? user.verified ?? false;
  const email = user.email || "No email provided";

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-xl shadow-md w-96 text-center">
        <h2 className="text-2xl font-bold mb-4">Profile</h2>

        {/* user info */}
        <p className="mb-2">
          <span className="font-semibold">Email:</span> {email}
        </p>
        <p className="mb-2">
          <span className="font-semibold">Roles:</span>{" "}
          {roles.length ? roles.join(', ') : 'user'}
        </p>
        <p className="mb-4">
          <span className="font-semibold">Verified:</span>{" "}
          {verified ? "Yes" : "No"}
        </p>

        {/* logout button */}
        <button
          onClick={logout}
          className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
            {isAdmin && (
                <Link
                    to="/admin"
                    className="block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                    Open Admin Dashboard
                </Link>
            )}
      </div>
    </div>
  );
}
