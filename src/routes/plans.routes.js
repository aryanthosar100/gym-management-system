import { Router } from "express";
import pool from "../db.js";

const router = Router();

/**
 * GET /api/plans
 * Returns all plans from memberships
 */
router.get("/", async (_req, res) => {
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

export default router;
