export type Role = "admin" | "member";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  createdAt?: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface ProjectStats {
  todo: number;
  in_progress: number;
  done: number;
  total: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  owner: User;
  members: User[];
  stats?: ProjectStats;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: string;
  project?: { id: string; name: string; color: string };
  assignee: User | null;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
  projects: number;
  mine: { total: number; todo: number; in_progress: number; done: number };
}
