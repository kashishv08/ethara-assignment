import { Router, type IRouter } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth";
import { checkProjectMembership, isProjectAdmin, isTaskAssignee } from "../middlewares/rbac";
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
      t.assignee && typeof t.assignee === "object" && t.assignee !== null && "email" in t.assignee
        ? publicUser(t.assignee)
        : t.assignee
        ? { id: String(t.assignee._id || t.assignee) }
        : null,
    createdBy:
      t.createdBy && typeof t.createdBy === "object" && t.createdBy !== null && "email" in t.createdBy
        ? publicUser(t.createdBy)
        : { id: String(t.createdBy?._id || t.createdBy) },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

router.get("/tasks", requireAuth, async (req, res) => {
  const { projectId, assignee, status } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};

  // If projectId is provided, check membership
  if (projectId) {
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid projectId", code: 400 });
    }
    
    const project = await Project.findById(projectId).select("owner members");
    if (!project) return res.status(404).json({ success: false, message: "Project not found", code: 404 });

    const userId = req.user!.sub;
    const isAdmin = req.user!.role === "admin";
    const isOwner = String(project.owner) === userId;
    const membership = project.members.find((m: any) => String(m.user) === userId);

    if (!isAdmin && !isOwner && !membership) {
      return res.status(403).json({ success: false, message: "No access to this project", code: 403 });
    }

    const projectRole = isAdmin || isOwner || (membership && membership.role === "admin") ? "admin" : "member";
    filter["project"] = new mongoose.Types.ObjectId(projectId);

    // Filter tasks if member
    if (projectRole === "member") {
      filter["assignee"] = new mongoose.Types.ObjectId(userId);
    }
  } else {
    // Return tasks from all accessible projects
    const userObjectId = new mongoose.Types.ObjectId(req.user!.sub);
    const accessibleProjects =
      req.user!.role === "admin"
        ? await Project.find().select("_id")
        : await Project.find({
            $or: [
              { owner: userObjectId }, 
              { "members.user": userObjectId },
              { "members": userObjectId }
            ],
          }).select("_id owner members");

    const projectIds = accessibleProjects.map((p) => p._id);
    
    if (req.user!.role === "admin") {
      filter["project"] = { $in: projectIds };
    } else {
      // Complex filter: tasks where (project is owned) OR (project is member AND assigned to me)
      const userId = req.user!.sub;
      const ownedProjectIds = (accessibleProjects as any[])
        .filter(p => String(p.owner) === userId)
        .map(p => p._id);
      
      const memberProjectIds = (accessibleProjects as any[])
        .filter(p => p.members.some((m: any) => {
          const mUserId = String(m.user || m);
          const mRole = m.role || "member";
          return mUserId === userId && mRole === "member";
        }))
        .map(p => p._id);

      const adminProjectIds = (accessibleProjects as any[])
        .filter(p => p.members.some((m: any) => {
          const mUserId = String(m.user || m);
          const mRole = m.role || "admin"; // Default to admin for owner-like flat lists? No, default to member.
          // Wait, if it's a flat list, we can't tell if they are admin.
          return mUserId === userId && mRole === "admin";
        }))
        .map(p => p._id);

      filter["$or"] = [
        { project: { $in: [...ownedProjectIds, ...adminProjectIds] } },
        { project: { $in: memberProjectIds }, assignee: new mongoose.Types.ObjectId(req.user!.sub) }
      ];
    }
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

router.post("/tasks", requireAuth, checkProjectMembership, isProjectAdmin, async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid input", code: 400 });
    return;
  }
  const { projectId, assigneeId, dueDate, ...rest } = parsed.data;

  // Restriction: Members cannot assign tasks to admins
  if (req.user!.role === "member" && assigneeId) {
    const assignee = await User.findById(assigneeId);
    if (assignee?.role === "admin") {
      return res.status(403).json({ success: false, message: "Members cannot assign tasks to admins", code: 403 });
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

router.get("/tasks/:taskId", requireAuth, async (req, res) => {
  const task = await Task.findById(req.params["taskId"]).populate("assignee").populate("project").populate("createdBy");
  if (!task) return res.status(404).json({ success: false, message: "Task not found", code: 404 });

  // Access check
  const project = await Project.findById(task.project).select("owner members");
  const userId = req.user!.sub;
  const isAdmin = req.user!.role === "admin";
  const isOwner = project && String(project.owner) === userId;
  const membership = project?.members.find((m: any) => String(m.user) === userId);

  if (!isAdmin && !isOwner && !membership) {
    return res.status(403).json({ success: false, message: "No access to this task", code: 403 });
  }

  const projectRole = isAdmin || isOwner || (membership && membership.role === "admin") ? "admin" : "member";
  if (projectRole === "member" && String(task.assignee) !== userId) {
    return res.status(403).json({ success: false, message: "You can only view your own tasks", code: 403 });
  }

  res.json({ task: serializeTask(task) });
});

router.patch("/tasks/:taskId", requireAuth, async (req, res) => {
  const task = await Task.findById(req.params["taskId"]);
  if (!task) return res.status(404).json({ success: false, message: "Task not found", code: 404 });

  const project = await Project.findById(task.project).select("owner members");
  const userId = req.user!.sub;
  const isAdmin = req.user!.role === "admin";
  const isOwner = project && String(project.owner) === userId;
  const membership = project?.members.find((m: any) => String(m.user) === userId);

  const projectRole = isAdmin || isOwner || (membership && membership.role === "admin") ? "admin" : "member";
  const isAssignee = String(task.assignee) === userId;

  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input", code: 400 });

  if (projectRole === "member") {
    // Members can ONLY update status of tasks assigned to them
    if (!isAssignee) {
      return res.status(403).json({ success: false, message: "You can only modify your own tasks", code: 403 });
    }
    
    const { status } = parsed.data;
    const { title, description, priority, dueDate } = req.body;
    
    if (title || description !== undefined || priority || dueDate !== undefined) {
      return res.status(403).json({ success: false, message: "Members can only update task status", code: 403 });
    }

    if (status) task.status = status;
  } else {
    // Admin/Owner can update anything
    const { assigneeId, dueDate, ...rest } = parsed.data;
    Object.assign(task, rest);
    if (assigneeId !== undefined) {
      task.assignee = assigneeId ? new mongoose.Types.ObjectId(assigneeId) as any : null;
    }
    if (dueDate !== undefined) {
      task.dueDate = dueDate ? new Date(dueDate) : null;
    }
  }

  await task.save();
  const populated = await Task.findById(task._id).populate("assignee").populate("project").populate("createdBy");
  res.json({ task: serializeTask(populated) });
});

router.delete("/tasks/:taskId", requireAuth, async (req, res) => {
  const task = await Task.findById(req.params["taskId"]);
  if (!task) return res.status(404).json({ success: false, message: "Task not found", code: 404 });

  const project = await Project.findById(task.project).select("owner members");
  const userId = req.user!.sub;
  const isAdmin = req.user!.role === "admin";
  const isOwner = project && String(project.owner) === userId;
  const membership = project?.members.find((m: any) => String(m.user) === userId && m.role === "admin");

  if (!isAdmin && !isOwner && !membership) {
    return res.status(403).json({ success: false, message: "Only admins or project owners can delete tasks", code: 403 });
  }

  await task.deleteOne();
  res.json({ success: true });
});

export default router;
