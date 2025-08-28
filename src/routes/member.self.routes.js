import { Router } from "express";
import { verifyJWT } from "../middleware/auth.js";

/**
 * This factory receives the DB pool from server.js so we don't
 * duplicate connection logic in multiple files.
 */
export default function createMemberSelfRoutes(pool) {
  const router = Router();

  // helper: get member_id for current user
  async function getMemberIdByUser(userId) {
    const [rows] = await pool.query(
      "SELECT id AS member_id FROM members WHERE user_id = ? LIMIT 1",
      [userId]
    );
    return rows[0]?.member_id ?? null;
  }

  // GET /api/member/profile
  router.get("/profile", verifyJWT, async (req, res) => {
    const userId = req.user?.sub;
    try {
      const [[user]] = await pool.query(
        "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
        [userId]
      );
      if (!user) return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });

      const [[m]] = await pool.query(
        `SELECT m.id AS member_id, m.age, m.join_date, m.expiry_date,
                ms.name AS plan, ms.duration_months, ms.price
           FROM members m
      LEFT JOIN memberships ms ON ms.id = m.plan_id
          WHERE m.user_id = ?
          ORDER BY m.id DESC
          LIMIT 1`,
        [userId]
      );

      res.json({
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          age: m?.age ?? null,
          plan: m?.plan ?? null,
          duration_months: m?.duration_months ?? null,
          price: m?.price ?? null,
          joinDate: m?.join_date ?? null,
          endDate: m?.expiry_date ?? null,
        },
      });
    } catch (err) {
      console.error("GET /api/member/profile", err);
      res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  });

  // GET /api/member/workouts  (workouts: member_id, workout_name, description, assigned_date)
  router.get("/workouts", verifyJWT, async (req, res) => {
    const userId = req.user?.sub;
    try {
      const memberId = await getMemberIdByUser(userId);
      if (!memberId) return res.json({ data: [], total: 0 });

      const [rows] = await pool.query(
        `SELECT id, workout_name, description, assigned_date
           FROM workouts
          WHERE member_id = ?
          ORDER BY assigned_date DESC, id DESC`,
        [memberId]
      );

      res.json({ page: 1, limit: rows.length, total: rows.length, data: rows });
    } catch (err) {
      console.error("GET /api/member/workouts", err);
      res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  });

  // GET /api/member/diets  (diets: member_id, diet_name, description, assigned_date)
  router.get("/diets", verifyJWT, async (req, res) => {
    const userId = req.user?.sub;
    try {
      const memberId = await getMemberIdByUser(userId);
      if (!memberId) return res.json({ data: [], total: 0 });

      const [rows] = await pool.query(
        `SELECT id, diet_name, description, assigned_date
           FROM diets
          WHERE member_id = ?
          ORDER BY assigned_date DESC, id DESC`,
        [memberId]
      );

      res.json({ page: 1, limit: rows.length, total: rows.length, data: rows });
    } catch (err) {
      console.error("GET /api/member/diets", err);
      res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  });

  // GET /api/member/payments  (payments: member_id, amount, payment_date, status)
  router.get("/payments", verifyJWT, async (req, res) => {
    const userId = req.user?.sub;
    try {
      const memberId = await getMemberIdByUser(userId);
      if (!memberId) return res.json({ data: [], total: 0 });

      const [rows] = await pool.query(
        `SELECT id, amount, payment_date, status
           FROM payments
          WHERE member_id = ?
          ORDER BY payment_date DESC, id DESC`,
        [memberId]
      );

      res.json({ page: 1, limit: rows.length, total: rows.length, data: rows });
    } catch (err) {
      console.error("GET /api/member/payments", err);
      res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  });

  return router;
}
