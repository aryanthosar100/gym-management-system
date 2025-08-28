import "dotenv/config";
import pool from "./db.js";

async function seed() {
  try {
    await pool.query(`
      INSERT INTO memberships (name, price, duration_months)
      VALUES ('Basic',1000,1),('Premium',2500,3),('Pro',9000,12)
      ON DUPLICATE KEY UPDATE price=VALUES(price), duration_months=VALUES(duration_months);
    `);
    console.log("Seeded memberships.");
  } catch (e) {
    console.error("Seeding error:", e);
  } finally {
    process.exit(0);
  }
}
seed();
