import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/db", async (_req, res) => {
  try {
    const [[{ db }]] = await pool.query("SELECT DATABASE() AS db");
    const [tables] = await pool.query("SHOW TABLES");
    const [plans] = await pool.query("SELECT id, name, duration_months FROM memberships");
    res.json({ database: db, tablesCount: tables.length, plansCount: plans.length, plans });
  } catch (err) {
    console.error("DEBUG /debug/db:", err);
    res.status(500).json({ error: err.code || "DB_ERROR", message: err.message });
  }
});

export default router;
