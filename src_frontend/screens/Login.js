import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Login.css";
import logo from "../assets/logo.jpeg";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const raw = await res.text();
      let data; try { data = JSON.parse(raw); } catch { data = { raw }; }

      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);

      login({ user: data.user, token: data.token });
      const target = from || (data.user.role === "admin" ? "/admin" : "/member");
      navigate(target, { replace: true });
    } catch (err) {
      alert(`Login failed: ${err.message}`);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <img src={logo} alt="Pulse Fitness" className="login__logo" />
      <div className="login__formBox">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
          <button type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
        </form>
      </div>
    </div>
  );
}
