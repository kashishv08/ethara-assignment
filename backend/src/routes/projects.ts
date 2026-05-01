import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { Project } from "../models/Project";
import { Task } from "../models/Task";
import { publicUser, User } from "../models/User";

const router: IRouter = Router();

const objectIdSchema = z.string().refine((v) => mongoose.isValidObjectId(v), {
  message: "Invalid id",
});

const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().default(""),
  color: z.string().optional(),
  memberIds: z.array(objectIdSchema).optional().default([]),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().optional(),
  memberIds: z.array(objectIdSchema).optional(),
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

function serializeProject(p: any) {
  return {
    id: String(p._id),
    name: p.name,
    description: p.description ?? "",
    color: p.color ?? "#6366f1",
    owner:
      p.owner && typeof p.owner === "object" && "email" in p.owner
        ? publicUser(p.owner)
        : { id: String(p.owner) },
    members: Array.isArray(p.members)
      ? p.members.map((m: any) =>
          m && typeof m === "object" && "email" in m
            ? publicUser(m)
            : { id: String(m) },
        )
      : [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

router.get("/projects", requireAuth, async (req, res) => {
  const userId = req.user!.sub;
  const filter =
    req.user!.role === "admin"
      ? {}
      : { $or: [{ owner: userId }, { members: userId }] };

  const projects = await Project.find(filter)
    .sort({ updatedAt: -1 })
    .populate("owner")
    .populate("members");

  const projectIds = projects.map((p) => p._id);
  const counts = await Task.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: { project: "$project", status: "$status" },
        count: { $sum: 1 },
      },
    },
  ]);
  const map = new Map<string, { todo: number; in_progress: number; done: number; total: number }>();
  for (const p of projects) {
    map.set(String(p._id), { todo: 0, in_progress: 0, done: 0, total: 0 });
  }
  for (const row of counts) {
    const key = String(row._id.project);
    const entry = map.get(key);
    if (!entry) continue;
    entry.total += row.count;
    if (row._id.status === "todo") entry.todo = row.count;
    if (row._id.status === "in_progress") entry.in_progress = row.count;
    if (row._id.status === "done") entry.done = row.count;
  }

  res.json({
    projects: projects.map((p) => ({
      ...serializeProject(p),
      stats: map.get(String(p._id)),
    })),
  });
});

router.post("/projects", requireAuth, requireAdmin, async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { name, description, color, memberIds } = parsed.data;
  const project = await Project.create({
    name,
    description,
    color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    owner: req.user!.sub,
    members: Array.from(new Set([req.user!.sub, ...memberIds])),
  });
  const populated = await Project.findById(project._id)
    .populate("owner")
    .populate("members");
  res.status(201).json({ project: serializeProject(populated) });
});

router.get("/projects/:id", requireAuth, async (req, res) => {
  const id = req.params["id"];
  if (!id || !mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const project = await Project.findById(id)
    .populate("owner")
    .populate("members");
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const userId = req.user!.sub;
  const isMember =
    String(project.owner._id ?? project.owner) === userId ||
    project.members.some((m: any) => String(m._id ?? m) === userId);
  if (!isMember && req.user!.role !== "admin") {
    res.status(403).json({ error: "You do not have access to this project" });
    return;
  }
  res.json({ project: serializeProject(project) });
});

router.patch("/projects/:id", requireAuth, async (req, res) => {
  const id = req.params["id"];
  if (!id || !mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const project = await Project.findById(id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (
    req.user!.role !== "admin" &&
    String(project.owner) !== req.user!.sub
  ) {
    res.status(403).json({ error: "Only admins or owner can edit project" });
    return;
  }
  const { name, description, color, memberIds } = parsed.data;
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (color !== undefined) project.color = color;
  if (memberIds !== undefined) {
    project.members = Array.from(
      new Set([String(project.owner), ...memberIds]),
    ).map((mid) => new mongoose.Types.ObjectId(mid)) as any;
  }
  await project.save();
  const populated = await Project.findById(project._id)
    .populate("owner")
    .populate("members");
  res.json({ project: serializeProject(populated) });
});

router.delete("/projects/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = req.params["id"];
  if (!id || !mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const project = await Project.findById(id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await Task.deleteMany({ project: project._id });
  await project.deleteOne();
  res.json({ ok: true });
});

router.get("/projects/:id/members", requireAuth, async (req, res) => {
  const id = req.params["id"];
  if (!id || !mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const project = await Project.findById(id).populate("members").populate("owner");
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const owner = project.owner as any;
  const members = (project.members as any[]).map(publicUser);
  // ensure owner is included
  const ownerPub = publicUser(owner);
  if (!members.find((m) => m.id === ownerPub.id)) members.unshift(ownerPub);
  res.json({ members });
});

router.post("/projects/:id/members", requireAuth, async (req, res) => {
  const id = req.params["id"];
  if (!id || !mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const schema = z.object({ userId: objectIdSchema });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const project = await Project.findById(id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (
    req.user!.role !== "admin" &&
    String(project.owner) !== req.user!.sub
  ) {
    res.status(403).json({ error: "Only admins or owner can add members" });
    return;
  }
  const userToAdd = await User.findById(parsed.data.userId);
  if (!userToAdd) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const has = project.members.some(
    (m: any) => String(m) === parsed.data.userId,
  );
  if (!has) {
    project.members.push(userToAdd._id as any);
    await project.save();
  }
  const populated = await Project.findById(project._id)
    .populate("owner")
    .populate("members");
  res.json({ project: serializeProject(populated) });
});

router.delete("/projects/:id/members/:userId", requireAuth, async (req, res) => {
  const id = req.params["id"];
  const userId = req.params["userId"];
  if (
    !id ||
    !userId ||
    !mongoose.isValidObjectId(id) ||
    !mongoose.isValidObjectId(userId)
  ) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const project = await Project.findById(id);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  if (
    req.user!.role !== "admin" &&
    String(project.owner) !== req.user!.sub
  ) {
    res.status(403).json({ error: "Only admins or owner can remove members" });
    return;
  }
  if (String(project.owner) === userId) {
    res.status(400).json({ error: "Cannot remove project owner" });
    return;
  }
  project.members = project.members.filter(
    (m: any) => String(m) !== userId,
  ) as any;
  await project.save();
  const populated = await Project.findById(project._id)
    .populate("owner")
    .populate("members");
  res.json({ project: serializeProject(populated) });
});

export default router;
