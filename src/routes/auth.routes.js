import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js";

const router = Router();

/** SIGNUP: creates user + member (plan optional) */
router.post("/signup", async (req, res) => {
  const { name, email, password, plan } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "name, email, password required" });
  }

  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) return res.status(409).json({ error: "EMAIL_ALREADY_USED" });

    const password_hash = await bcrypt.hash(password, 10);
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [userRes] = await conn.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'member')",
        [name, email, password_hash]
      );
      const userId = userRes.insertId;

      let planId = null;
      let months = null;
      if (plan) {
        const [rows] = await conn.query(
          "SELECT id, duration_months FROM memberships WHERE LOWER(name) = LOWER(?) LIMIT 1",
          [plan]
        );
        if (!rows.length) {
          throw Object.assign(new Error("INVALID_PLAN"), { code: "INVALID_PLAN" });
        }
        planId = rows[0].id;
        months = rows[0].duration_months;
      }

      if (planId) {
        await conn.query(
          `INSERT INTO members (user_id, plan_id, expiry_date)
           VALUES (?, ?, DATE_ADD(CURRENT_DATE, INTERVAL ? MONTH))`,
          [userId, planId, months]
        );
      } else {
        await conn.query("INSERT INTO members (user_id) VALUES (?)", [userId]);
      }

      await conn.commit();
      res.status(201).json({
        message: "Signup successful",
        user: { id: userId, name, email, role: "member" }
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

/** LOGIN: verify creds, return JWT + user */
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "VALIDATION_ERROR", message: "email and password required" });
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

    const token = jwt.sign(
      { sub: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("LOGIN DB_ERROR:", err);
    res.status(500).json({ error: "DB_ERROR", message: err.message });
  }
});

export default router;
