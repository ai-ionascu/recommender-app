import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { token, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    // if not logged in → go to login
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    // if admin → go to admin; else → profile
    navigate(isAdmin ? "/admin" : "/profile", { replace: true });
  }, [token, isAdmin, loading, navigate]);

  return null; // no UI, it's just a redirect component
}
