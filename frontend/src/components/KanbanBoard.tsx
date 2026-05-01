import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./TaskCard";
import { api, getApiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const COLUMNS: {
  id: TaskStatus;
  label: string;
  accent: string;
  badge: string;
}[] = [
  {
    id: "todo",
    label: "To Do",
    accent: "from-indigo-500 to-violet-500",
    badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  },
  {
    id: "in_progress",
    label: "In Progress",
    accent: "from-amber-500 to-orange-500",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  {
    id: "in_review",
    label: "In Review",
    accent: "from-fuchsia-500 to-pink-500",
    badge: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
  },
  {
    id: "done",
    label: "Done",
    accent: "from-emerald-500 to-teal-500",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
];

export function KanbanBoard({
  tasks,
  onEditTask,
  onAddTask,
  projectOwnerId,
}: {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  projectOwnerId?: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { data } = await api.patch<{ task: Task }>(`/tasks/${id}`, {
        status,
      });
      return data.task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
    },
    onError: (err) =>
      toast({
        title: "Couldn't move task",
        description: getApiErrorMessage(err),
        variant: "destructive",
      }),
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const list = tasks.filter((t) => t.status === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.id);
            }}
            onDragLeave={() => setDragOver((c) => (c === col.id ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/task-id");
              setDragOver(null);
              if (id) {
                const t = tasks.find((x) => x.id === id);
                if (t && t.status !== col.id) {
                  updateStatus.mutate({ id, status: col.id });
                }
              }
            }}
            className={cn(
              "glass rounded-2xl p-3 transition-all",
              dragOver === col.id && "ring-2 ring-primary/50 scale-[1.01]",
            )}
          >
            <div className="flex items-center justify-between px-1.5 mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full bg-gradient-to-r",
                    col.accent,
                  )}
                />
                <h3 className="font-semibold text-sm text-foreground">
                  {col.label}
                </h3>
                <span
                  className={cn(
                    "text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums",
                    col.badge,
                  )}
                >
                  {list.length}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => onAddTask(col.id)}
                aria-label={`Add task to ${col.label}`}
                data-testid={`button-add-task-${col.id}`}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-2 min-h-32">
              {list.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground/70 py-8 border-2 border-dashed border-border/50 rounded-xl">
                  Drop tasks here
                </div>
              ) : (
                list.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    draggable
                    onEdit={onEditTask}
                    projectOwnerId={projectOwnerId}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
