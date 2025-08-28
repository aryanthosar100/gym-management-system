import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import "./Members.css";
import logo from "../assets/logo.jpeg";
import { useAuth } from "../context/AuthContext";

export default function Members() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [downloading, setDownloading] = useState(false);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // redirect if not logged in
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: { pathname: "/members" } } });
    }
  }, [token, navigate]);

  // fetch members (paged)
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();

    const load = async () => {
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
          logout();
          navigate("/login", { replace: true, state: { from: { pathname: "/members" } } });
          return;
        }
        if (res.status === 403) {
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

    load();
    return () => controller.abort();
  }, [page, limit, search, token, logout, navigate]);

  const onSearchSubmit = (e) => { e.preventDefault(); setPage(1); };
  const nextPage = () => setPage((p) => Math.min(p + 1, pageCount));
  const prevPage = () => setPage((p) => Math.max(p - 1, 1));

  // ---- CSV Download (fetches ALL rows across pages) ----
  const downloadCSV = async () => {
    if (!token) return;
    setDownloading(true);
    setErr("");

    try {
      const collected = [];
      const fetchPage = async (pg) => {
        const qs = new URLSearchParams({
          page: String(pg),
          limit: "1000", // big chunk to reduce round-trips
          ...(search.trim() ? { search: search.trim() } : {}),
        });
        const res = await fetch(`/api/members?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) throw new Error("Unauthorized — login again.");
        if (res.status === 403) throw new Error("Forbidden — admin only.");
        const out = await res.json();
        if (!res.ok) throw new Error(out?.message || out?.error || `HTTP ${res.status}`);
        return out;
      };

      // first page
      const first = await fetchPage(1);
      collected.push(...first.data);
      const totalRows = Number(first.total || 0);
      const perChunk = 1000;
      const totalPages = Math.max(1, Math.ceil(totalRows / perChunk));

      // remaining pages (if any)
      for (let pg = 2; pg <= totalPages; pg++) {
        const part = await fetchPage(pg);
        collected.push(...(part.data || []));
      }

      // build CSV
      const headers = [
        "member_id",
        "user_id",
        "name",
        "email",
        "role",
        "plan_name",
        "join_date",
        "expiry_date",
        "duration_months",
        "price"
      ];
      const escape = (val) => {
        if (val === null || val === undefined) return "";
        const s = String(val);
        // wrap in quotes if contains comma/quote/newline; escape quotes by doubling
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };
      const rows = collected.map(r =>
        [
          r.member_id,
          r.user_id,
          r.name,
          r.email,
          r.role,
          r.plan_name ?? "",
          r.join_date ?? "",
          r.expiry_date ?? "",
          r.duration_months ?? "",
          r.price ?? ""
        ].map(escape).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");

      // download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `members-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message || "CSV export failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="login">{/* reuse login background */}
      <img src={logo} alt="Pulse Fitness" className="login__logo" />

      <div className="members__box">
        <div className="members__boxHeader">
          <h2>Members</h2>
          <div className="members__actions">
            <button onClick={downloadCSV} disabled={downloading}>
              {downloading ? "Exporting…" : "Download CSV"}
            </button>
          </div>
        </div>

        <form onSubmit={onSearchSubmit} className="members__search">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        {err && <div className="members__error">⚠️ {err}</div>}
        {loading ? (
          <div className="members__loading">Loading…</div>
        ) : (
          <div className="members__tableWrap">
            <table className="members__table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Joined</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: "center" }}>No members found.</td></tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={`${row.member_id}-${row.user_id}`}>
                      <td>{(page - 1) * limit + idx + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.email}</td>
                      <td>{row.role}</td>
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

        <div className="members__pager">
          <button onClick={prevPage} disabled={page <= 1}>Prev</button>
          <button onClick={nextPage} disabled={page >= pageCount}>Next</button>
        </div>
      </div>
    </div>
  );
}
