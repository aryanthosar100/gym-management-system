// gym-backend/src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();

// ---------- Middleware ----------
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));

// ---------- DB Pool ----------
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// ---------- Helpers ----------
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });

// ---------- Health / Debug ----------
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.get("/db-ping", async (_req, res) => {
  try {
    const [[{ v }]] = await pool.query("SELECT 1 AS v");
    res.json({ db: v === 1 ? "reachable" : "unknown" });
  } catch (e) {
    res.status(500).json({ error: "DB_ERROR", message: e.message });
  }
});

app.get("/debug/db", async (_req, res) => {
  try {
    const [[{ db }]] = await pool.query("SELECT DATABASE() AS db");
    const [tables] = await pool.query("SHOW TABLES");
    const [plans] = await pool.query(
      "SELECT id, name, price, duration_months FROM memberships ORDER BY price ASC, duration_months ASC, name ASC"
    );
    res.json({ database: db, tablesCount: tables.length, plansCount: plans.length, plans });
  } catch (err) {
    console.error("DEBUG /debug/db:", err);
    res.status(500).json({ error: err.code || "DB_ERROR", message: err.message });
  }
});

// ======================================================
// ======================= AUTH =========================
// ======================================================

// SIGNUP (supports optional 'age' and 'plan' by name)
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password, plan, age } = req.body || {};

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "VALIDATION_ERROR", message: "name, email, password required" });
  }

  // validate age if provided
  let parsedAge = null;
  if (age !== undefined && age !== null && String(age).trim() !== "") {
    const n = Number(age);
    if (!Number.isFinite(n) || n < 1 || n > 120) {
      return res.status(400).json({ error: "INVALID_AGE", message: "age must be between 1 and 120" });
    }
    parsedAge = Math.trunc(n);
  }

  try {
    // email exists?
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ error: "EMAIL_ALREADY_USED" });

    const password_hash = await bcrypt.hash(password, 10);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // create user
      const [userRes] = await conn.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'member')",
        [name, email, password_hash]
      );
      const userId = userRes.insertId;

      // resolve plan (optional)
      let planId = null;
      let durationMonths = null;
      if (plan) {
        const [rows] = await conn.query(
          "SELECT id, duration_months FROM memberships WHERE LOWER(name) = LOWER(?) LIMIT 1",
          [plan]
        );
        if (!rows.length) {
          throw Object.assign(new Error("INVALID_PLAN"), { code: "INVALID_PLAN" });
        }
        planId = rows[0].id;
        durationMonths = rows[0].duration_months;
      }

      // insert member (with age; set expiry if plan chosen)
      if (planId) {
        await conn.query(
          `INSERT INTO members (user_id, age, plan_id, expiry_date)
           VALUES (?, ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL ? MONTH))`,
          [userId, parsedAge, planId, durationMonths]
        );
      } else {
        await conn.query("INSERT INTO members (user_id, age) VALUES (?, ?)", [userId, parsedAge]);
      }

      await conn.commit();
      res.status(201).json({
        message: "Signup successful",
        user: { id: userId, name, email, role: "member", age: parsedAge ?? null },
      });
    } catch (err) {
      await conn.rollback();
      if (err?.code === "INVALID_PLAN") {
        return res.status(400).json({ error: "INVALID_PLAN", message: "Unknown plan name" });
      }
      console.error("DB_TX_ERROR:", err);
      return res.status(500).json({ error: "DB_TX_ERROR", message: err.message });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("SIGNUP DB_ERROR:", err);
    return res.status(500).json({ error: "DB_ERROR", message: err.message });
  }
});

// LOGIN -> returns { token, user }
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "email, password required" });
  }
  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, role, password_hash FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (!rows.length) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });

    const token = signToken({ sub: user.id, role: user.role, email: user.email });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("LOGIN DB_ERROR:", err);
    res.status(500).json({ error: "DB_ERROR", message: err.message });
  }
});

// Plans for dropdown
app.get("/api/plans", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, price, duration_months
         FROM memberships
         ORDER BY price ASC, duration_months ASC, name ASC`
    );
    res.json({ data: rows });
  } catch (err) {
    console.error("GET /api/plans", err);
    res.status(500).json({ error: "DB_ERROR", message: err.message });
  }
});

// ======================================================
// ========== Feature Routes (factories) ================
// ======================================================

// Member self endpoints (profile/workouts/diets/payments for logged-in user)
import createMemberSelfRoutes from "./routes/member.self.routes.js";
app.use("/api/member", createMemberSelfRoutes(pool));

// Admin: members listing with ?active=true filter
import createMembersRoutes from "./routes/members.routes.js";
app.use("/api/members", createMembersRoutes(pool));

// Admin: payments listing + create + members dropdown
import createPaymentsRoutes from "./routes/payments.routes.js";
app.use("/api/payments", createPaymentsRoutes(pool));

// ---------- Start ----------
const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
