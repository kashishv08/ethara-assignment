import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { User, publicUser } from "../models/User";
import { z } from "zod";
import mongoose from "mongoose";

const router: IRouter = Router();

// Global Admin Users Management
router.get("/users", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users: users.map(publicUser) });
});

router.patch("/users/:userId/role", requireAuth, requireRole("admin"), async (req, res) => {
  const schema = z.object({ role: z.enum(["admin", "member"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input", code: 400 });

  const user = await User.findById(req.params["userId"]);
  if (!user) return res.status(404).json({ success: false, message: "User not found", code: 404 });

  user.role = parsed.data.role;
  await user.save();
  res.json({ success: true, user: publicUser(user) });
});

router.delete("/users/:userId", requireAuth, requireRole("admin"), async (req, res) => {
  const user = await User.findById(req.params["userId"]);
  if (!user) return res.status(404).json({ success: false, message: "User not found", code: 404 });

  // Deactivate account as requested (instead of hard delete)
  user.isActive = false;
  await user.save();
  res.json({ success: true, message: "User account deactivated" });
});

export default router;
