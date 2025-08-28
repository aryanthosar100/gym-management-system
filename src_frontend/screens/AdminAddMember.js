import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import logo from "../assets/logo.jpeg";
import { useAuth } from "../context/AuthContext";

function randomTempPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminAddMember() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", age: "", plan: "" });
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: { pathname: "/admin/add-member" } } });
    }
  }, [token, navigate]);

  // fetch plans once
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoadingPlans(true);
      setError("");
      try {
        const res = await fetch("/api/plans", { signal: controller.signal });
        const raw = await res.text();
        let json;
        try { json = JSON.parse(raw); } catch { throw new Error(raw || "Invalid JSON"); }
        if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
        setPlans(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message || "Failed to load plans");
      } finally {
        setLoadingPlans(false);
      }
    };
    load();
    return () => controller.abort();
  }, []);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.plan) { setError("Please select a plan."); return; }

    const password = randomTempPassword();
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password,
          plan: form.plan,     // send **plan name** to match backend
          // age: form.age,     // backend currently ignores
        }),
      });

      const raw = await res.text();
      let json;
      try { json = JSON.parse(raw); } catch { throw new Error(raw || "Invalid JSON"); }
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);

      setTempPassword(password);
      alert(`Member created!\n\nTemporary password: ${password}\n\nShare it with the member and ask them to log in and change it.`);
      setForm({ name: "", email: "", age: "", plan: "" });
    } catch (err) {
      setError(err.message || "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin">
      <header className="admin__topbar">
        <div className="admin__brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logo} alt="Pulse Fitness" style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 8 }} />
          <span>Add Member</span>
        </div>
        <div className="admin__user">
          {user?.email}
          <button className="admin__logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="admin__main">
        <div className="admin__tableWrap" style={{ padding: 16, borderRadius: 12 }}>
          <form className="adminAdd__form" onSubmit={onSubmit}>
            <div className="adminAdd__row">
              <label>Name</label>
              <input name="name" placeholder="Member name" value={form.name} onChange={onChange} required />
            </div>

            <div className="adminAdd__row">
              <label>Email</label>
              <input type="email" name="email" placeholder="member@example.com" value={form.email} onChange={onChange} required />
            </div>

            <div className="adminAdd__row">
              <label>Age</label>
              <input type="number" name="age" placeholder="e.g. 24" value={form.age} onChange={onChange} min="1" />
           
            </div>

            <div className="adminAdd__row">
              <label>Plan</label>
              <select name="plan" value={form.plan} onChange={onChange} required disabled={loadingPlans || plans.length === 0}>
                <option value="">{loadingPlans ? "Loading plans..." : "Select plan"}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} — ₹{p.price} / {p.duration_months} mo
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="admin__error" style={{ margin: "8px 0" }}>⚠️ {error}</div>}

            <div className="adminAdd__actions">
              <button type="button" onClick={() => navigate(-1)} className="admin__logout" style={{ background: "rgba(255, 249, 249, 0.98)" }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting || loadingPlans || plans.length === 0}>
                {submitting ? "Adding…" : "Add Member"}
              </button>
            </div>

            {tempPassword && (
              <div className="adminAdd__tempPwd">
                <strong>Temporary password:</strong> <code>{tempPassword}</code>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
