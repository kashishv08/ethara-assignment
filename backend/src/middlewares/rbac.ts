import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Project } from "../models/Project";
import { Task } from "../models/Task";

declare module "express-serve-static-core" {
  interface Request {
    projectRole?: "admin" | "member";
  }
}

/**
 * Middleware factory to check for global system roles.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
        code: 401,
      });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        code: 403,
      });
    }
    next();
  };
}

/**
 * Checks if the user is a member of the project and attaches their project role.
 */
export async function checkProjectMembership(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const projectId = req.params["projectId"] || req.body.projectId;
  if (!projectId || !mongoose.isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid project ID",
      code: 400,
    });
  }

  const project = await Project.findById(projectId).select("owner members status");
  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
      code: 404,
    });
  }

  const userId = req.user!.sub;
  
  // Check global admin
  if (req.user!.role === "admin") {
    req.projectRole = "admin";
    return next();
  }

  // Check owner
  if (String(project.owner) === userId) {
    req.projectRole = "admin";
    return next();
  }

  // Check members array
  const membership = project.members.find(
    (m: any) => String(m.user) === userId,
  );

  if (!membership) {
    return res.status(403).json({
      success: false,
      message: "Not a member of this project",
      code: 403,
    });
  }

  req.projectRole = membership.role as "admin" | "member";
  next();
}

/**
 * Requires admin role WITHIN the current project.
 */
export function isProjectAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.projectRole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required for this project",
      code: 403,
    });
  }
  next();
}

/**
 * Checks if the user is assigned to the task. Admins bypass this.
 */
export async function isTaskAssignee(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const taskId = req.params["taskId"];
  if (!taskId || !mongoose.isValidObjectId(taskId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID",
      code: 400,
    });
  }

  // Admins or project admins can bypass
  if (req.projectRole === "admin") {
    return next();
  }

  const task = await Task.findById(taskId).select("assignee");
  if (!task) {
    return res.status(404).json({
      success: false,
      message: "Task not found",
      code: 404,
    });
  }

  if (String(task.assignee) !== req.user!.sub) {
    return res.status(403).json({
      success: false,
      message: "You can only modify your own tasks",
      code: 403,
    });
  }

  next();
}
