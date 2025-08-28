import { Router } from "express";
import { verifyJWT } from "../middleware/auth.js";

/**
 * Factory: admin members listing routes
 * Usage in server.js:  app.use("/api/members", createMembersRoutes(pool));
 */
export default function createMembersRoutes(pool) {
  const router = Router();

  // simple admin guard (kept local so we don't depend on another helper)
  const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Admin only" });
    }
    next();
  };

  /**
   * GET /api/members?search=&page=1&limit=10&active=true
   * Lists members with user + plan info. Admin only.
   */
  router.get("/", verifyJWT, requireAdmin, async (req, res) => {
    const page  = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const onlyActive = req.query.active === "true";

    const where = [];
    const params = [];

    if (search) {
      where.push("(u.name LIKE ? OR u.email LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (onlyActive) {
      // active = not expired (today or later)
      where.push("m.expiry_date >= CURRENT_DATE()");
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    try {
      const [rows] = await pool.query(
        `
        SELECT
          m.id                 AS member_id,
          u.id                 AS user_id,
          u.name,
          u.email,
          u.role,
          m.join_date,
          m.expiry_date,
          ms.name              AS plan_name,
          ms.duration_months,
          ms.price
        FROM members m
        JOIN users u             ON u.id = m.user_id
        LEFT JOIN memberships ms ON ms.id = m.plan_id
        ${whereSQL}
        ORDER BY m.id DESC
        LIMIT ? OFFSET ?
        `,
        [...params, limit, offset]
      );

      const [[{ total }]] = await pool.query(
        `
        SELECT COUNT(*) AS total
        FROM members m
        JOIN users u ON u.id = m.user_id
        ${whereSQL}
        `,
        params
      );

      res.json({ page, limit, total, data: rows });
    } catch (err) {
      console.error("GET /api/members error:", err);
      res.status(500).json({ error: "DB_ERROR", message: err.message });
    }
  });

  return router;
}
