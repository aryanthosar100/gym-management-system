import jwt from "jsonwebtoken";

// verifies token and puts payload on req.user
export function verifyJWT(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "NO_TOKEN" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { sub, role, email, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }
}

// simple role gate (use "admin" for this endpoint)
export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user?.role || req.user.role !== role) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    next();
  };
}
