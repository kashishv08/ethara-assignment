import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { Project } from "../models/Project";
import { Task } from "../models/Task";
import mongoose from "mongoose";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  const userId = req.user!.sub;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const isGlobalAdmin = user.role === "admin";
  const now = new Date();

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Find all accessible projects
  const projects = isGlobalAdmin
    ? await Project.find()
    : await Project.find({
        $or: [{ owner: userObjectId }, { "members.user": userObjectId }],
        status: "active"
      });

  const projectIds = projects.map((p) => p._id);

  if (isGlobalAdmin) {
    // Global admin sees everything
    const [counts, overdue, taskStatsByMember] = await Promise.all([
      Task.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Task.find({
        status: { $ne: "done" },
        dueDate: { $lt: now, $ne: null },
      }).populate("assignee", "name"),
      Task.aggregate([
        { $match: { assignee: { $ne: null } } },
        { $group: { 
            _id: "$assignee", 
            total: { $sum: 1 },
            done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } }
        }},
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" }
      ])
    ]);

    const stats = { todo: 0, in_progress: 0, in_review: 0, done: 0, total: 0 };
    for (const row of counts) {
      stats.total += row.count;
      if (row._id in stats) (stats as any)[row._id] = row.count;
    }

    return res.json({
      role: user.role,
      stats: {
        ...stats,
        overdueCount: overdue.length,
        projectsCount: projectIds.length,
      },
      overdueTasks: overdue.map(t => ({
        id: t._id,
        title: t.title,
        dueDate: t.dueDate,
        assigneeName: (t.assignee as any)?.name || "Unassigned"
      })),
      memberBreakdown: taskStatsByMember.map(m => ({
        userId: m._id,
        name: m.user.name,
        total: m.total,
        done: m.done
      }))
    });
  } else {
    // Member only sees their own stats
    const [counts, mineCounts, overdue] = await Promise.all([
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        {
          $match: {
            project: { $in: projectIds },
            assignee: userObjectId,
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Task.find({
        project: { $in: projectIds },
        assignee: userObjectId,
        status: { $ne: "done" },
        dueDate: { $lt: now, $ne: null },
      }),
    ]);

    const stats = { todo: 0, in_progress: 0, in_review: 0, done: 0, total: 0 };
    for (const row of counts) {
      stats.total += row.count;
      if (row._id in stats) (stats as any)[row._id] = row.count;
    }

    const mine = { todo: 0, in_progress: 0, in_review: 0, done: 0, total: 0 };
    for (const row of mineCounts) {
      mine.total += row.count;
      if (row._id in mine) (mine as any)[row._id] = row.count;
    }

    res.json({
      role: user.role,
      stats: {
        totalAssigned: mine.total,
        completed: mine.done,
        inProgress: mine.in_progress + mine.in_review,
        overdueCount: overdue.length,
      },
      projectProgress: projects.map(p => ({
        id: p._id,
        name: p.name,
        // aggregate progress would be calculated here if needed
      })),
      overdueTasks: overdue.map(t => ({
        id: t._id,
        title: t.title,
        dueDate: t.dueDate
      }))
    });
  }
});

export default router;
