import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }} className="muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/app" replace />;
  return children;
}
