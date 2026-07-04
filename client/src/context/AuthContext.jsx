import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("vanguard_token");
    if (!token) {
      setUser(null);
      setRank(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.me();
      setUser(data.user);
      setRank(data.rank);
    } catch {
      localStorage.removeItem("vanguard_token");
      setUser(null);
      setRank(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function applySession(data) {
    localStorage.setItem("vanguard_token", data.token);
    setUser(data.user);
    setRank(data.rank);
  }

  function logout() {
    localStorage.removeItem("vanguard_token");
    setUser(null);
    setRank(null);
  }

  return (
    <AuthContext.Provider value={{ user, rank, loading, applySession, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
