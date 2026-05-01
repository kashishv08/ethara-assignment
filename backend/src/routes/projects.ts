import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { checkProjectMembership, isProjectAdmin } from "../middlewares/rbac";
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
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().optional(),
  status: z.enum(["active", "archived"]).optional(),
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
    status: p.status ?? "active",
    owner:
      p.owner && typeof p.owner === "object" && "email" in p.owner
        ? publicUser(p.owner)
        : { id: String(p.owner) },
    members: Array.isArray(p.members)
      ? p.members.map((m: any) => {
          const u = m.user || m;
          const isPopulated = u && typeof u === "object" && "email" in u;
          return {
            user: isPopulated ? publicUser(u) : { id: String(u._id || u) },
            role: m.role || "member",
          };
        })
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
      : { 
          $or: [
            { owner: userId }, 
            { "members.user": userId }
          ],
          status: "active" // Members only see active projects
        };

  const projects = await Project.find(filter)
    .sort({ updatedAt: -1 })
    .populate("owner")
    .populate("members.user");

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

router.post("/projects", requireAuth, async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid input", code: 400 });
    return;
  }
  const { name, description, color } = parsed.data;
  const project = await Project.create({
    name,
    description,
    color: color ?? COLORS[Math.floor(Math.random() * COLORS.length)],
    owner: req.user!.sub,
    members: [{ user: req.user!.sub, role: "admin" }],
  });
  const populated = await Project.findById(project._id)
    .populate("owner")
    .populate("members.user");
  res.status(201).json({ project: serializeProject(populated) });
});

router.get("/projects/:projectId", requireAuth, checkProjectMembership, async (req, res) => {
  const project = await Project.findById(req.params["projectId"])
    .populate("owner")
    .populate("members.user");
  
  res.json({ 
    project: serializeProject(project),
    myRole: req.projectRole 
  });
});

router.patch("/projects/:projectId", requireAuth, checkProjectMembership, isProjectAdmin, async (req, res) => {
  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid input", code: 400 });
    return;
  }
  
  const project = await Project.findById(req.params["projectId"]);
  if (!project) return res.status(404).json({ success: false, message: "Project not found", code: 404 });

  const { name, description, color, status } = parsed.data;
  if (name !== undefined) project.name = name;
  if (description !== undefined) project.description = description;
  if (color !== undefined) project.color = color;
  if (status !== undefined) project.status = status as any;

  await project.save();
  const populated = await Project.findById(project._id)
    .populate("owner")
    .populate("members.user");
  res.json({ project: serializeProject(populated) });
});

router.delete("/projects/:projectId", requireAuth, checkProjectMembership, isProjectAdmin, async (req, res) => {
  const project = await Project.findById(req.params["projectId"]);
  if (!project) return res.status(404).json({ success: false, message: "Project not found", code: 404 });

  // Soft delete as requested (archive)
  project.status = "archived";
  await project.save();
  
  res.json({ success: true, message: "Project archived" });
});

router.get("/projects/:projectId/members", requireAuth, checkProjectMembership, async (req, res) => {
  const project = await Project.findById(req.params["projectId"]).populate("members.user");
  const members = project!.members.map((m: any) => ({
    ...publicUser(m.user),
    projectRole: m.role,
  }));
  res.json({ members });
});

router.post("/projects/:projectId/members", requireAuth, checkProjectMembership, isProjectAdmin, async (req, res) => {
  const schema = z.object({ userId: objectIdSchema, role: z.enum(["admin", "member"]).optional().default("member") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input", code: 400 });

  const project = await Project.findById(req.params["projectId"]);
  const userToAdd = await User.findById(parsed.data.userId);
  if (!userToAdd) return res.status(404).json({ success: false, message: "User not found", code: 404 });

  const has = project!.members.some((m: any) => String(m.user) === parsed.data.userId);
  if (!has) {
    project!.members.push({ user: userToAdd._id as any, role: parsed.data.role as any });
    await project!.save();
  }

  res.json({ success: true });
});

router.patch("/projects/:projectId/members/:userId/role", requireAuth, checkProjectMembership, isProjectAdmin, async (req, res) => {
  const schema = z.object({ role: z.enum(["admin", "member"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input", code: 400 });

  const project = await Project.findById(req.params["projectId"]);
  const member = project!.members.find((m: any) => String(m.user) === req.params["userId"]);
  if (!member) return res.status(404).json({ success: false, message: "Member not found", code: 404 });

  member.role = parsed.data.role as any;
  await project!.save();
  res.json({ success: true });
});

router.delete("/projects/:projectId/members/:userId", requireAuth, checkProjectMembership, isProjectAdmin, async (req, res) => {
  const project = await Project.findById(req.params["projectId"]);
  if (String(project!.owner) === req.params["userId"]) {
    return res.status(400).json({ success: false, message: "Cannot remove project owner", code: 400 });
  }

  project!.members = project!.members.filter((m: any) => String(m.user) !== req.params["userId"]) as any;
  await project!.save();
  res.json({ success: true });
});

export default router;
