import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function UserMenu() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/login" className="text-sm hover:underline">Login</Link>
        <Link to="/signup" className="text-sm rounded-md border px-2 py-1 hover:bg-zinc-50">Sign up</Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v)=>!v)} className="text-sm rounded-md border px-2 py-1 hover:bg-zinc-50">
        {user?.email || "Account"}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-md border bg-white shadow">
          <Link to="/profile" className="block px-3 py-2 text-sm hover:bg-zinc-50">Profile</Link>
          <Link to="/orders" className="block px-3 py-2 text-sm hover:bg-zinc-50">Orders</Link>
          {isAdmin && <Link to="/admin" className="block px-3 py-2 text-sm hover:bg-zinc-50">Admin</Link>}
          {isAdmin && <Link to="/admin/analytics" className="block px-3 py-2 text-sm hover:bg-zinc-50">Analytics</Link>}
          <button onClick={logout} className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-50">Logout</button>
        </div>
      )}
    </div>
  );
}
