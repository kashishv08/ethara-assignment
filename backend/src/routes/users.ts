import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { User, publicUser } from "../models/User";

const router: IRouter = Router();

router.get("/users", requireAuth, async (_req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json({ users: users.map(publicUser) });
});

export default router;
