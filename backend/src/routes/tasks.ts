import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { Task, TASK_PRIORITIES, TASK_STATUSES } from "../models/Task";
import { Project } from "../models/Project";
import { publicUser } from "../models/User";

const router: IRouter = Router();

const objectIdSchema = z.string().refine((v) => mongoose.isValidObjectId(v), {
  message: "Invalid id",
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(""),
  status: z.enum(TASK_STATUSES).optional().default("todo"),
  priority: z.enum(TASK_PRIORITIES).optional().default("medium"),
  dueDate: z.string().datetime().nullish(),
  projectId: objectIdSchema,
  assigneeId: objectIdSchema.nullish(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.string().datetime().nullish(),
  assigneeId: objectIdSchema.nullish(),
});

function serializeTask(t: any) {
  return {
    id: String(t._id),
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
    projectId:
      t.project && typeof t.project === "object" && t.project._id
        ? String(t.project._id)
        : String(t.project),
    project:
      t.project && typeof t.project === "object" && t.project.name
        ? {
            id: String(t.project._id),
            name: t.project.name,
            color: t.project.color,
          }
        : undefined,
    assignee:
      t.assignee && typeof t.assignee === "object" && "email" in t.assignee
        ? publicUser(t.assignee)
        : t.assignee
        ? { id: String(t.assignee) }
        : null,
    createdBy:
      t.createdBy && typeof t.createdBy === "object" && "email" in t.createdBy
        ? publicUser(t.createdBy)
        : { id: String(t.createdBy) },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

async function userHasProjectAccess(
  userId: string,
  role: string,
  projectId: string,
): Promise<boolean> {
  if (role === "admin") return true;
  const project = await Project.findById(projectId).select("owner members");
  if (!project) return false;
  if (String(project.owner) === userId) return true;
  return project.members.some((m: any) => String(m) === userId);
}

router.get("/tasks", requireAuth, async (req, res) => {
  const { projectId, assignee, status } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};

  if (projectId) {
    if (!mongoose.isValidObjectId(projectId)) {
      res.status(400).json({ error: "Invalid projectId" });
      return;
    }
    const ok = await userHasProjectAccess(
      req.user!.sub,
      req.user!.role,
      projectId,
    );
    if (!ok) {
      res.status(403).json({ error: "No access to this project" });
      return;
    }
    filter["project"] = new mongoose.Types.ObjectId(projectId);
  } else {
    // limit to projects the user can see
    const accessibleProjects =
      req.user!.role === "admin"
        ? await Project.find().select("_id")
        : await Project.find({
            $or: [{ owner: req.user!.sub }, { members: req.user!.sub }],
          }).select("_id");
    filter["project"] = { $in: accessibleProjects.map((p) => p._id) };
  }

  if (assignee === "me") {
    filter["assignee"] = new mongoose.Types.ObjectId(req.user!.sub);
  } else if (assignee && mongoose.isValidObjectId(assignee)) {
    filter["assignee"] = new mongoose.Types.ObjectId(assignee);
  }

  if (status && (TASK_STATUSES as readonly string[]).includes(status)) {
    filter["status"] = status;
  }

  const tasks = await Task.find(filter)
    .sort({ updatedAt: -1 })
    .populate("assignee")
    .populate("project")
    .populate("createdBy");

  res.json({ tasks: tasks.map(serializeTask) });
});

router.get("/tasks/summary", requireAuth, async (req, res) => {
  const userId = req.user!.sub;
  const accessibleProjects =
    req.user!.role === "admin"
      ? await Project.find().select("_id")
      : await Project.find({
          $or: [{ owner: userId }, { members: userId }],
        }).select("_id");
  const projectIds = accessibleProjects.map((p) => p._id);
  const now = new Date();

  const [counts, mineCounts, overdue, recent] = await Promise.all([
    Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          assignee: new mongoose.Types.ObjectId(userId),
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.countDocuments({
      project: { $in: projectIds },
      status: { $ne: "done" },
      dueDate: { $lt: now, $ne: null },
    }),
    Task.find({ project: { $in: projectIds } })
      .sort({ updatedAt: -1 })
      .limit(8)
      .populate("assignee")
      .populate("project")
      .populate("createdBy"),
  ]);

  const stats = { todo: 0, in_progress: 0, done: 0, total: 0 };
  for (const row of counts) {
    stats.total += row.count;
    if (row._id in stats) (stats as any)[row._id] = row.count;
  }
  const mine = { todo: 0, in_progress: 0, done: 0, total: 0 };
  for (const row of mineCounts) {
    mine.total += row.count;
    if (row._id in mine) (mine as any)[row._id] = row.count;
  }

  res.json({
    summary: {
      total: stats.total,
      todo: stats.todo,
      inProgress: stats.in_progress,
      done: stats.done,
      overdue,
      projects: projectIds.length,
      mine,
    },
    recent: recent.map(serializeTask),
  });
});

router.post("/tasks", requireAuth, async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { projectId, assigneeId, dueDate, ...rest } = parsed.data;
  const ok = await userHasProjectAccess(
    req.user!.sub,
    req.user!.role,
    projectId,
  );
  if (!ok) {
    res.status(403).json({ error: "No access to this project" });
    return;
  }
  if (req.user!.role !== "admin") {
    // Members can only create tasks on projects they belong to (already checked).
    // Members may not assign tasks to others — only to themselves or unassigned.
    if (assigneeId && assigneeId !== req.user!.sub) {
      res.status(403).json({ error: "Members can only assign tasks to themselves" });
      return;
    }
  }
  const task = await Task.create({
    ...rest,
    project: new mongoose.Types.ObjectId(projectId),
    assignee: assigneeId ? new mongoose.Types.ObjectId(assigneeId) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
    createdBy: new mongoose.Types.ObjectId(req.user!.sub),
  });
  const populated = await Task.findById(task._id)
    .populate("assignee")
    .populate("project")
    .populate("createdBy");
  res.status(201).json({ task: serializeTask(populated) });
});

router.patch("/tasks/:id", requireAuth, async (req, res) => {
  const id = req.params["id"];
  if (!id || !mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const task = await Task.findById(id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const ok = await userHasProjectAccess(
    req.user!.sub,
    req.user!.role,
    String(task.project),
  );
  if (!ok) {
    res.status(403).json({ error: "No access to this task" });
    return;
  }

  // Members can only update tasks assigned to them; admins/owner can update anything
  if (req.user!.role !== "admin") {
    const project = await Project.findById(task.project).select("owner");
    const isOwner = project && String(project.owner) === req.user!.sub;
    const isAssignee =
      task.assignee && String(task.assignee) === req.user!.sub;
    if (!isOwner && !isAssignee) {
      res
        .status(403)
        .json({ error: "Only admins, project owner, or assignee can update task" });
      return;
    }
    // Members cannot reassign a task to someone else
    if (
      parsed.data.assigneeId !== undefined &&
      parsed.data.assigneeId &&
      parsed.data.assigneeId !== req.user!.sub &&
      !isOwner
    ) {
      res.status(403).json({ error: "Members cannot reassign tasks" });
      return;
    }
  }

  const { assigneeId, dueDate, ...rest } = parsed.data;
  Object.assign(task, rest);
  if (assigneeId !== undefined) {
    task.assignee = assigneeId
      ? (new mongoose.Types.ObjectId(assigneeId) as any)
      : null;
  }
  if (dueDate !== undefined) {
    task.dueDate = dueDate ? new Date(dueDate) : null;
  }
  await task.save();
  const populated = await Task.findById(task._id)
    .populate("assignee")
    .populate("project")
    .populate("createdBy");
  res.json({ task: serializeTask(populated) });
});

router.delete("/tasks/:id", requireAuth, async (req, res) => {
  const id = req.params["id"];
  if (!id || !mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: "Invalid task id" });
    return;
  }
  const task = await Task.findById(id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  if (req.user!.role !== "admin") {
    const project = await Project.findById(task.project).select("owner");
    const isOwner = project && String(project.owner) === req.user!.sub;
    if (!isOwner) {
      res
        .status(403)
        .json({ error: "Only admins or project owner can delete tasks" });
      return;
    }
  }
  await task.deleteOne();
  res.json({ ok: true });
});

export default router;
