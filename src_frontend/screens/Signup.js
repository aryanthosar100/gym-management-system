import React, { useState } from "react";
import "./Signup.css";
import logo from "../assets/logo.jpeg";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", plan: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    if (!form.plan) {
      alert("Please select a membership plan");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const raw = await res.text();
      let data; try { data = JSON.parse(raw); } catch { data = { raw }; }

      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);

      alert("Signup successful! You can now log in.");
      // Optionally: navigate("/login");
    } catch (err) {
      console.error("Signup error:", err);
      alert(`Signup failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup">
      <img src={logo} alt="Pulse Fitness" className="signup__logo" />
      <div className="signup__formBox">
        <h2>Sign Up</h2>
        <form onSubmit={handleSubmit}>
          <input name="name" placeholder="Name" onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
          <select name="plan" value={form.plan} onChange={handleChange} required>
            <option value="">Select Plan</option>
            <option value="Basic">Basic</option>
            <option value="Premium">Premium</option>
            <option value="Pro">Pro</option>
          </select>
          <button type="submit" disabled={loading}>{loading ? "Submitting..." : "Sign Up"}</button>
        </form>
      </div>
    </div>
  );
}
