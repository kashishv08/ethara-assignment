import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
