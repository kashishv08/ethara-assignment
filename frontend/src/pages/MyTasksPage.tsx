import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckSquare, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "@/components/TaskCard";
import { EmptyState } from "@/components/EmptyState";
import { TaskFormModal } from "@/components/TaskFormModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export default function MyTasksPage() {
  const [tab, setTab] = useState<"all" | TaskStatus>("all");
  const [query, setQuery] = useState("");
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const tasksQuery = useQuery({
    queryKey: ["tasks", { mine: true }],
    queryFn: async () => {
      const { data } = await api.get<{ tasks: Task[] }>("/tasks?assignee=me");
      return data.tasks;
    },
  });

  const tasks = tasksQuery.data ?? [];
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (tab !== "all" && t.status !== tab) return false;
      if (query && !t.title.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [tasks, tab, query]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks],
  );

  return (
    <div className="space-y-5 max-w-[1100px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Tasks</h2>
          <p className="text-sm text-muted-foreground">
            Everything currently assigned to you across all projects.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search your tasks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-card"
              data-testid="input-search-my-tasks"
            />
          </div>
          <Button
            onClick={() => {
              setEditingTask(null);
              setTaskOpen(true);
            }}
            className="gradient-primary text-white"
          >
            <Plus className="size-4 mr-1.5" /> New task
          </Button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="bg-muted/60">
            <TabsTrigger value="all" data-testid="tab-all">
              All <span className="ml-1.5 text-[10px] opacity-70">{counts.all}</span>
            </TabsTrigger>
            <TabsTrigger value="todo" data-testid="tab-todo">
              To Do <span className="ml-1.5 text-[10px] opacity-70">{counts.todo}</span>
            </TabsTrigger>
            <TabsTrigger value="in_progress" data-testid="tab-in-progress">
              In Progress <span className="ml-1.5 text-[10px] opacity-70">{counts.in_progress}</span>
            </TabsTrigger>
            <TabsTrigger value="done" data-testid="tab-done">
              Done <span className="ml-1.5 text-[10px] opacity-70">{counts.done}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {tasksQuery.isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-muted/40 animate-pulse"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title={
                  tasks.length === 0
                    ? "Nothing on your plate"
                    : "No matching tasks"
                }
                description={
                  tasks.length === 0
                    ? "Tasks assigned to you will show up here."
                    : "Try a different filter or search term."
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filtered.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    showProject
                    onEdit={(task) => {
                      setEditingTask(task);
                      setTaskOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TaskFormModal
        open={taskOpen}
        onOpenChange={(o) => {
          setTaskOpen(o);
          if (!o) setEditingTask(null);
        }}
        task={editingTask}
      />
    </div>
  );
}
