import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import logo from "../assets/logo.jpeg";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page] = useState(1);
  const [limit] = useState(6);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  // Load a small preview list of members
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    const fetchMembers = async () => {
      setLoading(true);
      setErr("");

      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      try {
        const res = await fetch(`/api/members?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (res.status === 401) {
          navigate("/login", { replace: true });
          return;
        } else if (res.status === 403) {
          setErr("Forbidden: admin access required.");
          return;
        }

        const raw = await res.text();
        let json;
        try { json = JSON.parse(raw); } catch { throw new Error(raw || "Invalid JSON"); }
        if (!res.ok) throw new Error(json?.message || json?.error || `HTTP ${res.status}`);

        setData(Array.isArray(json.data) ? json.data : []);
        setTotal(Number(json.total || 0));
      } catch (e) {
        if (e.name !== "AbortError") setErr(e.message || "Failed to load members");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search]);

  const onSearchSubmit = (e) => { e.preventDefault(); };

  return (
    <div className="admin">
      {/* Top bar */}
      <header className="admin__topbar">
        <div className="admin__brand">
          <img src={logo} alt="Pulse Fitness" className="admin__logo" />
          <div className="admin__brandText">
            <h1>Admin Dashboard</h1>
            <p>Manage members, plans, and payments</p>
          </div>
        </div>

        <div className="admin__user">
          <span className="admin__userEmail">{user?.email}</span>
          <button className="admin__logout" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Main content */}
      <main className="admin__main">
        {/* Actions row */}
        <section className="admin__actions">
          <button className="cta cta--gold" onClick={() => navigate("/admin/add-member")}>
            ➕ Add Member
          </button>
          <button className="cta" onClick={() => navigate("/admin/active")}>
            ✅ Active Plans
          </button>
          <button className="cta" onClick={() => navigate("/admin/payments")}>
            💳 Payments
          </button>
          <button className="cta cta--gold" onClick={() => navigate("/admin/add-payment")}>
            ➕ Add Payment
          </button>
        </section>

        {/* Search + Stats */}
        <section className="admin__controls">
          <form onSubmit={onSearchSubmit} className="admin__searchForm">
            <input
              type="text"
              placeholder="Search members by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="admin__stats">
            <div className="stat">
              <div className="stat__label">Total Members</div>
              <div className="stat__value">{total}</div>
            </div>
            <div className="stat">
              <div className="stat__label">Preview Pages</div>
              <div className="stat__value">{page}/{pageCount}</div>
            </div>
          </div>
        </section>

        {/* Panels */}
        <section className="admin__grid">
          {/* Members preview table */}
          <div className="panel panel--table">
            <div className="panel__head">
              <h3>Recent Members</h3>
              <button className="panel__link" onClick={() => navigate("/admin/active")}>
                View Active
              </button>
            </div>

            {err && <div className="admin__error">⚠️ {err}</div>}
            {loading ? (
              <div className="admin__loading">Loading…</div>
            ) : (
              <div className="admin__tableWrap">
                <table className="admin__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Plan</th>
                      <th>Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: "center" }}>No members found.</td></tr>
                    ) : (
                      data.map((row, idx) => (
                        <tr key={`${row.member_id}-${row.user_id}`}>
                          <td>{idx + 1}</td>
                          <td>{row.name}</td>
                          <td>{row.email}</td>
                          <td>{row.plan_name || "-"}</td>
                          <td>{row.expiry_date || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick links / Tips */}
          <div className="panel panel--tips">
            <h3>Quick Links</h3>
            <ul>
              <li><button onClick={() => navigate("/admin/add-member")}>Create a new member</button></li>
              <li><button onClick={() => navigate("/admin/add-payment")}>Record a payment</button></li>
              <li><button onClick={() => navigate("/admin/payments")}>View all transactions</button></li>
              <li><button onClick={() => navigate("/admin/active")}>See active plans</button></li>
            </ul>

            <div className="note">
              Tip: Use the search box to quickly filter the preview list by name or email.  
              For full results and filters, open the dedicated pages.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
