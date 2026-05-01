import { Router, type IRouter } from "express";
import { z } from "zod";
import { User, publicUser } from "../models/User";
import {
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
} from "../lib/auth";

const router: IRouter = Router();

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(["admin", "member"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
];

router.post("/auth/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { name, email, password, role } = parsed.data;
  const existing = await User.findOne({ email: email.toLowerCase() }).lean();
  if (existing) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }
  const passwordHash = await hashPassword(password);
  const isFirstUser = (await User.estimatedDocumentCount()) === 0;
  const finalRole = isFirstUser ? "admin" : (role || "member");
  const avatarColor = COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#6366f1";
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: finalRole,
    avatarColor,
  });
  const pub = publicUser(user);
  const token = signToken({
    sub: pub.id,
    email: pub.email,
    role: pub.role,
    name: pub.name,
  });
  res.status(201).json({ token, user: pub });
});

router.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const pub = publicUser(user);
  const token = signToken({
    sub: pub.id,
    email: pub.email,
    role: pub.role,
    name: pub.name,
  });
  res.json({ token, user: pub });
});

router.get("/auth/me", async (req, res) => {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const payload = verifyToken(header.slice("Bearer ".length).trim());
    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: publicUser(user) });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
