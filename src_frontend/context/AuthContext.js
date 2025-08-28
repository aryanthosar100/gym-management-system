import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // { id, name, email, role }
  const [token, setToken] = useState(null); // JWT string

  useEffect(() => {
    const raw = localStorage.getItem("auth");
    if (raw) {
      try {
        const { user: u, token: t } = JSON.parse(raw);
        if (u && t) { setUser(u); setToken(t); }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (user && token) localStorage.setItem("auth", JSON.stringify({ user, token }));
    else localStorage.removeItem("auth");
  }, [user, token]);

  const login = ({ user, token }) => { setUser(user); setToken(token); };
  const logout = () => { setUser(null); setToken(null); localStorage.removeItem("auth"); };

  const value = useMemo(() => ({ user, token, role: user?.role ?? null, login, logout }), [user, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
