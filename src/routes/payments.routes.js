// src/routes/payments.routes.js
import { Router } from "express";
import { verifyJWT } from "../middleware/auth.js";

/**
 * Factory: admin payments listing + create + members dropdown
 * Usage in server.js:
 *   import createPaymentsRoutes from "./routes/payments.routes.js";
 *   app.use("/api/payments", createPaymentsRoutes(pool));
 */
export default function createPaymentsRoutes(pool) {
  const router = Router();

  // simple admin guard
  const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Admin only" });
    }
    next();
  };

  // ---- GET /api/payments  (list all payments, paginated, searchable) ----
  router.get("/", verifyJWT, requireAdmin, async (req, res) => {
    const page  = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();

    const where = [];
    const params = [];
    if (search) {
      where.push("(u.name LIKE ? OR u.email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    try {
      const [rows] = await pool.query(
        `
        SELECT
          p.id                 AS payment_id,
          p.member_id,
          p.amount,
          p.balance_amount,
          p.payment_date,
          p.status,
          u.id                 AS user_id,
          u.name,
          u.email,
          ms.name              AS plan_name
        FROM payments p
        JOIN members m           ON m.id = p.member_id
        JOIN users u             ON u.id = m.user_id
        LEFT JOIN memberships ms ON ms.id = m.plan_id
        ${whereSQL}
        ORDER BY p.payment_date DESC, p.id DESC
        LIMIT ? OFFSET ?
        `,
        [...params, limit, offset]
      );

      const [[{ total }]] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM payments p
        JOIN members m ON m.id = p.member_id
        JOIN users u   ON u.id = m.user_id
        ${whereSQL}
        `,
        params
      );

      res.json({ page, limit, total, data: rows });
    } catch (err) {
      console.error("GET /api/payments error:", err);
      res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  });

  // ---- GET /api/payments/members  (dropdown list for Add Payment) ----
  router.get("/members", verifyJWT, requireAdmin, async (_req, res) => {
    try {
      const [rows] = await pool.query(
        `
        SELECT m.id AS member_id, u.id AS user_id, u.name, u.email
        FROM members m
        JOIN users u ON u.id = m.user_id
        ORDER BY u.name ASC, u.email ASC
        `
      );
      res.json({ data: rows });
    } catch (err) {
      console.error("GET /api/payments/members error:", err);
      res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  });

  // ---- POST /api/payments  (create a payment) ----
  router.post("/", verifyJWT, requireAdmin, async (req, res) => {
    const { member_id, amount, balance_amount = null, status = "Success" } = req.body || {};

    if (!member_id || !Number.isFinite(Number(member_id))) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "member_id is required" });
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "amount must be > 0" });
    }
    if (balance_amount !== null && balance_amount !== undefined) {
      const b = Number(balance_amount);
      if (!Number.isFinite(b) || b < 0) {
        return res.status(400).json({ error: "VALIDATION_ERROR", message: "balance_amount must be >= 0" });
      }
    }

    try {
      const [members] = await pool.query("SELECT id FROM members WHERE id = ? LIMIT 1", [member_id]);
      if (!members.length) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Member not found" });
      }

      await pool.query(
        `INSERT INTO payments (member_id, amount, balance_amount, payment_date, status)
         VALUES (?, ?, ?, CURRENT_DATE(), ?)`,
        [Number(member_id), Number(amount), balance_amount === null ? null : Number(balance_amount), String(status)]
      );

      res.status(201).json({ message: "Payment recorded" });
    } catch (err) {
      console.error("POST /api/payments error:", err);
      res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  });

  return router;
}
