export type Role = "admin" | "member";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  isActive?: boolean;
  createdAt?: string;
}

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface ProjectStats {
  todo: number;
  in_progress: number;
  done: number;
  total: number;
}

export interface ProjectMember {
  user: User;
  role: "admin" | "member";
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: "active" | "archived";
  owner: User;
  members: ProjectMember[];
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

export interface DashboardResponse {
  role: "admin" | "member";
  stats: {
    todo?: number;
    in_progress?: number;
    in_review?: number;
    done?: number;
    total?: number;
    totalAssigned?: number;
    completed?: number;
    inProgress?: number;
    overdueCount: number;
    projectsCount?: number;
    activeProjects?: number;
    archivedProjects?: number;
  };
  overdueTasks: {
    id: string;
    title: string;
    dueDate: string;
    assigneeName?: string;
  }[];
  memberBreakdown?: {
    userId: string;
    name: string;
    total: number;
    done: number;
  }[];
  projectProgress?: {
    id: string;
    name: string;
  }[];
}
