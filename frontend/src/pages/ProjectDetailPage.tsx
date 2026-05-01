import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Project, Task, TaskStatus } from "@/lib/types";
import { KanbanBoard } from "@/components/KanbanBoard";
import { TaskFormModal } from "@/components/TaskFormModal";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import { ProjectAdminOnly } from "@/components/guards/RBACGuards";
import { AvatarBubble } from "@/components/AvatarBubble";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export default function ProjectDetailPage({ projectId }: { projectId: string }) {
  const { user, updateProjectRole } = useAuth();
  const [, navigate] = useLocation();
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("todo");
  const [editProjectOpen, setEditProjectOpen] = useState(false);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data } = await api.get<{ project: Project; myRole: "admin" | "member" }>(
        `/projects/${projectId}`,
      );
      if (data.myRole) {
        updateProjectRole(projectId, data.myRole);
      }
      return data.project;
    },
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", { projectId }],
    queryFn: async () => {
      const { data } = await api.get<{ tasks: Task[] }>(
        `/tasks?projectId=${projectId}`,
      );
      return data.tasks;
    },
    enabled: Boolean(projectQuery.data),
  });

  if (projectQuery.isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="h-8 w-48 rounded-lg bg-muted/40 animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h2 className="text-xl font-semibold">Project not found</h2>
        <p className="text-sm text-muted-foreground mt-1">
          You may not have access to this project.
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => navigate("/projects")}
        >
          Back to projects
        </Button>
      </div>
    );
  }

  const project = projectQuery.data;
  const tasks = tasksQuery.data ?? [];
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const canEdit = user?.role === "admin" || project.owner.id === user?.id;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" /> All projects
        </Link>
      </div>

      {/* Header card */}
      <div className="relative overflow-hidden rounded-3xl glass p-6 md:p-8">
        <div
          className="absolute inset-x-0 top-0 h-2"
          style={{
            background: `linear-gradient(90deg, ${project.color}, ${project.color}99)`,
          }}
        />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-3xl"
          style={{ background: project.color }}
        />
        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className="h-14 w-14 rounded-2xl shadow-md grid place-items-center text-white text-xl font-bold shrink-0"
              style={{
                background: `linear-gradient(135deg, ${project.color}, ${project.color}cc)`,
              }}
            >
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">
                {project.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {project.description || "No description added yet."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3" />
                  Created {format(new Date(project.createdAt), "MMM d, yyyy")}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  Owner: {project.owner.name}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ProjectAdminOnly projectId={projectId}>
              <Button
                variant="outline"
                onClick={() => setEditProjectOpen(true)}
                className="bg-card/70 backdrop-blur"
                data-testid="button-edit-project"
              >
                <Pencil className="size-4 mr-1.5" /> Edit project
              </Button>
            </ProjectAdminOnly>

            <ProjectAdminOnly projectId={projectId}>
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setDefaultStatus("todo");
                  setTaskOpen(true);
                }}
                className="gradient-primary text-white"
                data-testid="button-add-task"
              >
                <Plus className="size-4 mr-1.5" /> Add task
              </Button>
            </ProjectAdminOnly>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            icon={ListChecks}
            label="Total"
            value={total}
            color="text-indigo-600 dark:text-indigo-300"
          />
          <Stat
            icon={ListChecks}
            label="In progress"
            value={inProgress}
            color="text-amber-600 dark:text-amber-300"
          />
          <Stat
            icon={CheckCircle2}
            label="Done"
            value={done}
            color="text-emerald-600 dark:text-emerald-300"
          />
          <Stat
            icon={Users}
            label="Members"
            value={project.members.length}
            color="text-fuchsia-600 dark:text-fuchsia-300"
          />
        </div>

        <div className="relative mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progress</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="relative mt-5 flex items-center gap-3">
          <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Team
          </div>
          <div className="flex -space-x-2">
            {project.members.map((m) => (
              <AvatarBubble
                key={m.user?.id}
                name={m.user?.name ?? "Unknown"}
                color={m.user?.avatarColor}
                size="sm"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div>
        <KanbanBoard
          tasks={tasks}
          onEditTask={(t) => {
            setEditingTask(t);
            setTaskOpen(true);
          }}
          onAddTask={(status) => {
            setEditingTask(null);
            setDefaultStatus(status);
            setTaskOpen(true);
          }}
          projectOwnerId={project.owner.id}
        />
      </div>

      <TaskFormModal
        open={taskOpen}
        onOpenChange={(o) => {
          setTaskOpen(o);
          if (!o) setEditingTask(null);
        }}
        task={editingTask}
        projectId={projectId}
        defaultStatus={defaultStatus}
      />
      <ProjectFormModal
        open={editProjectOpen}
        onOpenChange={setEditProjectOpen}
        project={project}
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-card/60 border border-border/40 backdrop-blur p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">
        <Icon className={`size-3.5 ${color}`} />
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
