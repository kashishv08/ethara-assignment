import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardResponse, Project, Task } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const dashQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardResponse>("/dashboard");
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

  const d = dashQuery.data;
  const isDashAdmin = d?.role === "admin";

  const pieData = useMemo(() => {
    if (!d || d.role !== "admin") return [];
    return [
      { name: "To Do", value: d.stats.todo ?? 0, color: "#6366f1" },
      { name: "In Progress", value: (d.stats.in_progress ?? 0) + (d.stats.in_review ?? 0), color: "#f59e0b" },
      { name: "Done", value: d.stats.done ?? 0, color: "#10b981" },
    ];
  }, [d]);
  
  const totalForChart = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-8 text-white shadow-xl">
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
              {isAdmin 
                ? "You have full administrative control over the platform." 
                : "View your assigned tasks and track your project progress."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {isAdmin && (
              <Button
                onClick={() => setProjectModalOpen(true)}
                className="bg-white text-indigo-700 hover:bg-white/95 shadow-md"
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
            >
              <Plus className="size-4 mr-1.5" /> New task
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isDashAdmin ? (
          <>
            <StatCard
              label="Total Tasks"
              value={d?.stats.total ?? 0}
              hint={`${d?.stats.projectsCount ?? 0} projects`}
              icon={FolderKanban}
              tone="indigo"
              loading={dashQuery.isLoading}
            />
            <StatCard
              label="Completed"
              value={d?.stats.done ?? 0}
              hint="Across all projects"
              icon={CheckCircle2}
              tone="emerald"
              loading={dashQuery.isLoading}
            />
            <StatCard
              label="Active Members"
              value={d?.memberBreakdown?.length ?? 0}
              hint="Working on tasks"
              icon={Users}
              tone="amber"
              loading={dashQuery.isLoading}
            />
            <StatCard
              label="Overdue"
              value={d?.stats.overdueCount ?? 0}
              hint="Urgent attention needed"
              icon={AlertTriangle}
              tone="rose"
              loading={dashQuery.isLoading}
            />
          </>
        ) : (
          <>
            <StatCard
              label="Assigned to me"
              value={d?.stats.totalAssigned ?? 0}
              hint="Total tasks"
              icon={FolderKanban}
              tone="indigo"
              loading={dashQuery.isLoading}
            />
            <StatCard
              label="My Progress"
              value={d?.stats.completed ?? 0}
              hint="Tasks completed"
              icon={CheckCircle2}
              tone="emerald"
              loading={dashQuery.isLoading}
            />
            <StatCard
              label="In Progress"
              value={d?.stats.inProgress ?? 0}
              hint="Current workload"
              icon={Clock}
              tone="amber"
              loading={dashQuery.isLoading}
            />
            <StatCard
              label="My Overdue"
              value={d?.stats.overdueCount ?? 0}
              hint="Check deadlines"
              icon={AlertTriangle}
              tone="rose"
              loading={dashQuery.isLoading}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-5">
          {/* Overdue Tasks */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-4 text-rose-500" />
              Overdue Tasks
            </h3>
            <div className="mt-4 space-y-2">
              {d?.overdueTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No overdue tasks. Great job!</p>
              ) : (
                d?.overdueTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-rose-100 dark:border-rose-900/30">
                    <div>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-[10px] text-rose-500 font-medium">
                        Due {format(new Date(t.dueDate), "MMM d, yyyy")}
                      </div>
                    </div>
                    {t.assigneeName && (
                      <Badge variant="outline" className="text-[10px]">{t.assigneeName}</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Member Breakdown (Admin Only) */}
          {isDashAdmin && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="size-4 text-indigo-500" />
                Team Performance
              </h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {d.memberBreakdown?.map(m => (
                  <div key={m.userId} className="p-3 rounded-xl bg-card border flex items-center justify-between">
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{m.done}</span> / {m.total} done
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Area */}
        <div className="space-y-5">
           {/* Chart (Admin Only) */}
           {isDashAdmin && (
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-foreground">Task Distribution</h3>
              <div className="mt-4 h-56 relative">
                {totalForChart === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {/* Project List */}
          <div className="glass rounded-2xl p-5">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Projects</h3>
                <Link href="/projects" className="text-xs text-primary hover:underline">View All</Link>
             </div>
             <div className="space-y-2">
                {projectsQuery.data?.slice(0, 5).map(p => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-sm font-medium truncate">{p.name}</span>
                  </Link>
                ))}
             </div>
          </div>
        </div>
      </div>

      <ProjectFormModal open={projectModalOpen} onOpenChange={setProjectModalOpen} />
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

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
