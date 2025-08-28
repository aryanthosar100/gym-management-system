import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";
import logo from "../assets/logo.jpeg";
import { useAuth } from "../context/AuthContext";

export default function ActiveMembers() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    if (!token) navigate("/login", { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    const fetchMembers = async () => {
      setLoading(true);
      setErr("");

      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        active: "true",
        ...(search.trim() ? { search: search.trim() } : {}),
      });

      try {
        const res = await fetch(`/api/members?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (res.status === 401) return navigate("/login", { replace: true });
        if (res.status === 403) { setErr("Forbidden: admin access required."); return; }

        const text = await res.text();
        const json = JSON.parse(text || "{}");
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
  }, [page, limit, search, token, navigate]);

  const onSearchSubmit = (e) => { e.preventDefault(); setPage(1); };
  const nextPage = () => setPage((p) => Math.min(p + 1, pageCount));
  const prevPage = () => setPage((p) => Math.max(p - 1, 1));

  return (
    <div className="admin">
      <header className="admin__topbar">
        <div className="admin__brand">
          <img src={logo} alt="Pulse Fitness" className="admin__logo" />
          <div className="admin__brandText">
            <h1>Active Plans</h1>
            <p>Members whose memberships haven’t expired</p>
          </div>
        </div>
        <div className="admin__user">
          <span className="admin__userEmail">{user?.email}</span>
          <button className="admin__logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="admin__main">
        <section className="admin__controls">
          <form onSubmit={onSearchSubmit} className="admin__searchForm">
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="admin__stats">
            <div className="stat">
              <div className="stat__label">Active Members</div>
              <div className="stat__value">{total}</div>
            </div>
            <button className="panel__link" onClick={() => navigate("/admin")}>
              Back to Dashboard
            </button>
          </div>
        </section>

        <section className="panel panel--whiteTable">
          <div className="panel__head">
            <h3>Active Members</h3>
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
                    <th>Joined</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: "center" }}>No active members found.</td></tr>
                  ) : (
                    data.map((row, idx) => (
                      <tr key={`${row.member_id}-${row.user_id}`}>
                        <td>{(page - 1) * limit + idx + 1}</td>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>{row.plan_name || "-"}</td>
                        <td>{row.join_date || "-"}</td>
                        <td>{row.expiry_date || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin__pager" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button className="panel__link" onClick={prevPage} disabled={page <= 1}>Prev</button>
            <button className="panel__link" onClick={nextPage} disabled={page >= pageCount}>Next</button>
          </div>
        </section>
      </main>
    </div>
  );
}
