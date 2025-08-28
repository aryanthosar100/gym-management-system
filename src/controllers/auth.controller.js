import bcrypt from "bcrypt";
import pool from "../db.js";
import { SignupSchema } from "../validators/auth.validators.js";

export async function signup(req, res) {
  // 1) validate
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      details: parsed.error.flatten()
    });
  }
  const { name, email, password, plan } = parsed.data;

  // 2) email exists?
  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ error: "EMAIL_ALREADY_USED" });
    }
  } catch (err) {
    console.error("DB_ERROR during email check:", err.code, err.message);
    return res.status(500).json({ error: "DB_ERROR", code: err.code, message: err.message });
  }

  const password_hash = await bcrypt.hash(password, 10);

  // 3) transaction: user + member (with optional plan/expiry)
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [userRes] = await conn.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'member')",
      [name, email, password_hash]
    );
    const userId = userRes.insertId;

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

    if (planId) {
      await conn.query(
        `INSERT INTO members (user_id, plan_id, expiry_date)
         VALUES (?, ?, DATE_ADD(CURRENT_DATE, INTERVAL ? MONTH))`,
        [userId, planId, durationMonths]
      );
    } else {
      await conn.query("INSERT INTO members (user_id) VALUES (?)", [userId]);
    }

    await conn.commit();

    return res.status(201).json({
      message: "Signup successful",
      user: { id: userId, name, email, role: "member" },
      plan: planId ? { name: plan, planId } : null
    });
  } catch (err) {
    await conn.rollback();
    console.error("DB_TX_ERROR during signup:", err.code, err.message);
    if (err?.code === "INVALID_PLAN") {
      return res.status(400).json({ error: "INVALID_PLAN", message: "Unknown plan name" });
    }
    return res.status(500).json({ error: "DB_TX_ERROR", code: err.code, message: err.message });
  } finally {
    conn.release();
  }
}
