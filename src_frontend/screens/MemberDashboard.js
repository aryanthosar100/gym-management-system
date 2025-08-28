import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import "./MemberDashboard.css";
import logo from "../assets/logo.jpeg";
import { useAuth } from "../context/AuthContext";

export default function MemberDashboard() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [workouts, setWorkouts] = useState([]);
  const [diets, setDiets] = useState([]);
  const [payments, setPayments] = useState([]);
  const [membership, setMembership] = useState({ endDate: "-", plan: "-" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true, state: { from: { pathname: "/member" } } });
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };
    const pull = async (url) => {
      const res = await fetch(url, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      return data;
    };

    (async () => {
      try {
        setError("");
        const [w, d, p, prof] = await Promise.all([
          pull("/api/member/workouts"),
          pull("/api/member/diets"),
          pull("/api/member/payments"),
          pull("/api/member/profile"),
        ]);

        setWorkouts(Array.isArray(w?.data) ? w.data : []);
        setDiets(Array.isArray(d?.data) ? d.data : []);
        setPayments(Array.isArray(p?.data) ? p.data : []);
        setMembership({
          plan: prof?.data?.plan ?? "-",
          endDate: prof?.data?.endDate ?? "-",
        });
      } catch (e) {
        setError(e.message || "Failed to load dashboard");
      }
    })();
  }, [token]);

  return (
    <div className="login">
      <header className="memberDash__header">
        <img className="memberDash__logo" src={logo} alt="Pulse Fitness" />
        <div className="memberDash__user">
          {user?.email}
          <button className="memberDash__logout" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="memberDash__content">
        <div className="memberDash__grid">
          {/* Membership */}
          <section className="memberDash__card">
            <h3>Membership</h3>
            <div className="memberDash__kv">
              <span>Plan</span><strong>{membership.plan}</strong>
            </div>
            <div className="memberDash__kv">
              <span>End Date</span><strong>{membership.endDate}</strong>
            </div>
          </section>

          {/* My Workout — matches workouts schema */}
          <section className="memberDash__section">
            <h3>My Workout</h3>
            <div className="memberDash__tableWrap">
              <table className="memberDash__table">
                <thead>
                  <tr>
                    <th>Assigned Date</th>
                    <th>Workout Name</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {workouts.length === 0 ? (
                    <tr><td colSpan="3" className="memberDash__empty">No workouts assigned yet.</td></tr>
                  ) : (
                    workouts.map((w) => (
                      <tr key={w.id}>
                        <td>{w.assigned_date || "-"}</td>
                        <td>{w.workout_name || "-"}</td>
                        <td>{w.description || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* My Diet — matches diets schema */}
          <section className="memberDash__section">
            <h3>My Diet</h3>
            <div className="memberDash__tableWrap">
              <table className="memberDash__table">
                <thead>
                  <tr>
                    <th>Assigned Date</th>
                    <th>Diet Name</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {diets.length === 0 ? (
                    <tr><td colSpan="3" className="memberDash__empty">No diet plan assigned yet.</td></tr>
                  ) : (
                    diets.map((d) => (
                      <tr key={d.id}>
                        <td>{d.assigned_date || "-"}</td>
                        <td>{d.diet_name || "-"}</td>
                        <td>{d.description || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Payments — matches payments schema */}
          <section className="memberDash__section">
            <h3>Payments Made</h3>
            <div className="memberDash__tableWrap">
              <table className="memberDash__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan="3" className="memberDash__empty">No payments found.</td></tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id}>
                        <td>{p.payment_date || "-"}</td>
                        <td>{p.amount != null ? `₹${p.amount}` : "-"}</td>
                        <td>{p.status || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {error && <div className="memberDash__error">⚠️ {error}</div>}
      </main>
    </div>
  );
}
