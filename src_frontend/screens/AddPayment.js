import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ActiveMembers.css";            // same UI shell as ActiveMembers
import logo from "../assets/logo.jpeg";
import { useAuth } from "../context/AuthContext";

export default function AddPayment() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    member_id: "",
    amount: "",
    balance_amount: "",
    status: "Success",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // load member list for dropdown
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const load = async () => {
      setLoadingMembers(true);
      setErr("");
      try {
        const res = await fetch("/api/payments/members", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (res.status === 401) { navigate("/login", { replace: true }); return; }
        if (res.status === 403) { setErr("Forbidden: admin access required."); return; }
        const raw = await res.text();
        let json; try { json = JSON.parse(raw); } catch { throw new Error(raw || "Invalid JSON"); }
        if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
        setMembers(Array.isArray(json.data) ? json.data : []);
      } catch (e) {
        if (e.name !== "AbortError") setErr(e.message || "Failed to load members");
      } finally {
        setLoadingMembers(false);
      }
    };
    load();
    return () => controller.abort();
  }, [token, navigate]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!form.member_id) { setErr("Please select a member."); return; }
    if (!form.amount || Number(form.amount) <= 0) { setErr("Enter a valid paid amount."); return; }
    if (form.balance_amount !== "" && Number(form.balance_amount) < 0) { setErr("Balance cannot be negative."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          member_id: Number(form.member_id),
          amount: Number(form.amount),
          balance_amount: form.balance_amount === "" ? null : Number(form.balance_amount),
          status: form.status || "Success",
        }),
      });

      const raw = await res.text();
      let json; try { json = JSON.parse(raw); } catch { throw new Error(raw || "Invalid JSON"); }
      if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);

      alert("Payment recorded successfully.");
      // reset + go to payments list
      setForm({ member_id: "", amount: "", balance_amount: "", status: "Success" });
      navigate("/admin/payments");
    } catch (e) {
      setErr(e.message || "Failed to save payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="active">{/* same shell as ActiveMembers */}
      <header className="active__topbar">
        <div className="active__brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logo} alt="Pulse Fitness" className="active__logo" />
          <span>Add Payment</span>
        </div>
        <div className="active__user">
          {user?.email}
          <button className="active__logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="active__main">
        {/* Simple form block styled like the rest (white text on dark bg) */}
        <div style={{
          background: "rgba(0,0,0,0.45)",
          borderRadius: 12,
          padding: 16,
          color: "#fff"
        }}>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 600 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label>Member</label>
              <select
                name="member_id"
                value={form.member_id}
                onChange={onChange}
                disabled={loadingMembers || members.length === 0}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff"
                }}
                required
              >
                <option value="">{loadingMembers ? "Loading members..." : "Select a member"}</option>
                {members.map((m) => (
                  <option key={m.member_id} value={m.member_id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label>Paid Amount (₹)</label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={onChange}
                min="0"
                step="0.01"
                placeholder="e.g. 2500"
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff"
                }}
                required
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label>Balance Amount (₹)</label>
              <input
                type="number"
                name="balance_amount"
                value={form.balance_amount}
                onChange={onChange}
                min="0"
                step="0.01"
                placeholder="e.g. 0"
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff"
                }}
              />
              <small style={{ opacity: 0.8 }}>
                Leave blank if no balance is due.
              </small>
            </div>

            {err && <div style={{ color: "#ff6b6b" }}>⚠️ {err}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => navigate(-1)}
                style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontWeight: 700 }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting || loadingMembers || members.length === 0}
                style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#f5b301", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {submitting ? "Saving…" : "Save Payment"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
