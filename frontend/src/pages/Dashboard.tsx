import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  FolderKanban,
  Plus,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardSummary, Project, Task } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/TaskCard";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState } from "@/components/EmptyState";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import { TaskFormModal } from "@/components/TaskFormModal";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["summary"],
    queryFn: async () => {
      const { data } = await api.get<{
        summary: DashboardSummary;
        recent: Task[];
      }>("/tasks/summary");
      return data;
    },
  });

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await api.get<{ projects: Project[] }>("/projects");
      return data.projects;
    },
  });

  const summary = summaryQuery.data?.summary;
  const recent = summaryQuery.data?.recent ?? [];

  const pieData = useMemo(
    () => [
      { name: "To Do", value: summary?.todo ?? 0, color: "#6366f1" },
      { name: "In Progress", value: summary?.inProgress ?? 0, color: "#f59e0b" },
      { name: "Done", value: summary?.done ?? 0, color: "#10b981" },
    ],
    [summary],
  );
  const totalForChart = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay">
          <div className="absolute top-10 right-10 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-cyan-300/40 blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-semibold text-white/80">
              <Sparkles className="size-3.5" />
              {greeting()}
            </div>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
              {user?.name?.split(" ")[0] ?? "Welcome"}, here's your team today.
            </h1>
            <p className="mt-2 text-white/80 max-w-xl">
              {summary
                ? summary.total === 0
                  ? "No tasks yet. Spin up a project and start collaborating."
                  : `You're tracking ${summary.total} task${summary.total === 1 ? "" : "s"} across ${summary.projects} project${summary.projects === 1 ? "" : "s"}.`
                : "Loading your workspace…"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {isAdmin && (
              <Button
                onClick={() => setProjectModalOpen(true)}
                className="bg-white text-indigo-700 hover:bg-white/95 shadow-md"
                data-testid="button-new-project"
              >
                <Plus className="size-4 mr-1.5" /> New project
              </Button>
            )}
            <Button
              onClick={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
              variant="secondary"
              className="bg-white/15 text-white border border-white/20 hover:bg-white/25 backdrop-blur"
              data-testid="button-new-task"
            >
              <Plus className="size-4 mr-1.5" /> New task
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total tasks"
          value={summary?.total ?? 0}
          hint={`${summary?.projects ?? 0} project${summary?.projects === 1 ? "" : "s"}`}
          icon={FolderKanban}
          tone="indigo"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="In progress"
          value={summary?.inProgress ?? 0}
          hint="Currently being worked on"
          icon={Clock}
          tone="amber"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Completed"
          value={summary?.done ?? 0}
          hint={
            summary && summary.total > 0
              ? `${Math.round((summary.done / summary.total) * 100)}% done`
              : "No tasks yet"
          }
          icon={CheckCircle2}
          tone="emerald"
          loading={summaryQuery.isLoading}
        />
        <StatCard
          label="Overdue"
          value={summary?.overdue ?? 0}
          hint="Past due date"
          icon={AlertTriangle}
          tone="rose"
          loading={summaryQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Distribution chart */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">
                Task distribution
              </h3>
              <p className="text-xs text-muted-foreground">
                Across all your projects
              </p>
            </div>
          </div>

          <div className="mt-4 h-56 relative">
            {totalForChart === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No data yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid hsl(var(--border))",
                        backgroundColor: "hsl(var(--popover))",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-2xl font-bold tabular-nums">
                    {totalForChart}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Tasks
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {pieData.map((d) => (
              <div key={d.name} className="text-xs">
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <div className="font-semibold tabular-nums">{d.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* My tasks summary */}
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Your workload</h3>
              <p className="text-xs text-muted-foreground">
                Tasks assigned to you
              </p>
            </div>
            <Link
              href="/my-tasks"
              className="text-xs text-primary font-semibold inline-flex items-center gap-0.5 hover:underline"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Tile
              icon={Circle}
              label="To Do"
              value={summary?.mine.todo ?? 0}
              tone="indigo"
            />
            <Tile
              icon={Clock}
              label="In Progress"
              value={summary?.mine.in_progress ?? 0}
              tone="amber"
            />
            <Tile
              icon={CheckCircle2}
              label="Done"
              value={summary?.mine.done ?? 0}
              tone="emerald"
            />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {summary?.mine.total
              ? `${summary.mine.total} total assigned to you`
              : "Nothing on your plate yet."}
          </div>
        </div>
      </div>

      {/* Recent activity & projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">Recent activity</h3>
              <p className="text-xs text-muted-foreground">
                Latest task updates
              </p>
            </div>
          </div>
          {summaryQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No tasks yet — create one to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  showProject
                  onEdit={(task) => {
                    setEditingTask(task);
                    setTaskModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">Your projects</h3>
              <p className="text-xs text-muted-foreground">Quick access</p>
            </div>
            <Link
              href="/projects"
              className="text-xs text-primary font-semibold inline-flex items-center gap-0.5 hover:underline"
            >
              All <ArrowRight className="size-3" />
            </Link>
          </div>
          {projectsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-muted/40 animate-pulse"
                />
              ))}
            </div>
          ) : projectsQuery.data?.length ? (
            <div className="space-y-2">
              {projectsQuery.data.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-3 rounded-xl p-2.5 hover-elevate-2 transition"
                  data-testid={`link-dash-project-${p.id}`}
                >
                  <div
                    className="h-9 w-9 rounded-lg grid place-items-center text-white text-xs font-semibold shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)`,
                    }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.stats?.total ?? 0} tasks · {p.members.length} member
                      {p.members.length === 1 ? "" : "s"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description={
                isAdmin
                  ? "Create a project to start organizing tasks."
                  : "Ask an admin to add you to a project."
              }
              action={
                isAdmin ? (
                  <Button
                    onClick={() => setProjectModalOpen(true)}
                    className="gradient-primary text-white"
                  >
                    <Plus className="size-4 mr-1.5" /> New project
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Featured projects */}
      {projectsQuery.data && projectsQuery.data.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-foreground">Active projects</h3>
            <Link
              href="/projects"
              className="text-xs text-primary font-semibold inline-flex items-center gap-0.5 hover:underline"
            >
              See all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsQuery.data.slice(0, 3).map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </div>
      )}

      <ProjectFormModal
        open={projectModalOpen}
        onOpenChange={setProjectModalOpen}
      />
      <TaskFormModal
        open={taskModalOpen}
        onOpenChange={(o) => {
          setTaskModalOpen(o);
          if (!o) setEditingTask(null);
        }}
        task={editingTask}
      />
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Circle;
  label: string;
  value: number;
  tone: "indigo" | "amber" | "emerald";
}) {
  const tones: Record<string, string> = {
    indigo:
      "from-indigo-500/15 to-violet-500/10 text-indigo-700 dark:text-indigo-300",
    amber:
      "from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-300",
    emerald:
      "from-emerald-500/15 to-teal-500/10 text-emerald-700 dark:text-emerald-300",
  };
  return (
    <div
      className={`rounded-xl bg-gradient-to-br p-3.5 border border-border/40 ${tones[tone]}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
        <Icon className="size-3" /> {label}
      </div>
      <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
