import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Flame,
  GripVertical,
  Pencil,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";
import { dueDateLabel, priorityLabel } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { AvatarBubble } from "./AvatarBubble";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { api, getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/15",
  medium:
    "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/15",
  high: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/15",
};

const DUE_TONE: Record<string, string> = {
  ok: "text-muted-foreground",
  warn: "text-amber-600 dark:text-amber-300",
  danger: "text-rose-600 dark:text-rose-300",
  muted: "text-muted-foreground",
};

export function TaskCard({
  task,
  draggable,
  onEdit,
  showProject,
  onDragStart,
  onDragEnd,
  projectOwnerId,
}: {
  task: Task;
  draggable?: boolean;
  onEdit?: (task: Task) => void;
  showProject?: boolean;
  onDragStart?: (task: Task) => void;
  onDragEnd?: () => void;
  projectOwnerId?: string;
}) {
  const { user, projectRoles } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const due = dueDateLabel(task.dueDate);

  const isAdmin = user?.role === "admin";
  const isProjectAdmin = projectRoles[task.projectId] === "admin";
  const isAssignee = user?.id === task.assignee?.id;
  const isCreator = user?.id === task.createdBy.id;

  const canEditFull = isAdmin || isProjectAdmin || isCreator;
  const canMove = canEditFull || isAssignee;
  const canDelete = isAdmin || isProjectAdmin;

  const updateStatus = useMutation({
    mutationFn: async (status: TaskStatus) => {
      const { data } = await api.patch<{ task: Task }>(`/tasks/${task.id}`, {
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
        title: "Couldn't update task",
        description: getApiErrorMessage(err),
        variant: "destructive",
      }),
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      await api.delete(`/tasks/${task.id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      toast({ title: "Task deleted" });
    },
    onError: (err) =>
      toast({
        title: "Couldn't delete task",
        description: getApiErrorMessage(err),
        variant: "destructive",
      }),
  });

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card p-3.5 shadow-sm transition-all",
        "hover:shadow-md hover:-translate-y-0.5",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/task-id", task.id);
        onDragStart?.(task);
      }}
      onDragEnd={() => onDragEnd?.()}
      data-testid={`task-card-${task.id}`}
    >
      <div className="flex items-start gap-2">
        {draggable && (
          <GripVertical className="size-4 text-muted-foreground/40 mt-0.5 opacity-0 group-hover:opacity-100 transition" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium text-sm text-foreground leading-snug">
              {task.title}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-md p-1 -mr-1 -mt-0.5 text-muted-foreground hover:text-foreground hover-elevate-2"
                  data-testid={`button-task-menu-${task.id}`}
                >
                  <Pencil className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canEditFull && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit?.(task)}>
                      <Pencil className="size-3.5 mr-2" /> Edit task
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {canMove && (
                  <>
                    <DropdownMenuItem
                      onClick={() => updateStatus.mutate("todo")}
                      disabled={task.status === "todo"}
                    >
                      Move to To Do
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateStatus.mutate("in_progress")}
                      disabled={task.status === "in_progress"}
                    >
                      Move to In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateStatus.mutate("done")}
                      disabled={task.status === "done"}
                    >
                      Move to Done
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => deleteTask.mutate()}
                    >
                      <Trash2 className="size-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {task.description && (
            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </div>
          )}

          {showProject && task.project && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: task.project.color }}
              />
              {task.project.name}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "border text-[10px] py-0 h-5 px-1.5 font-medium",
                PRIORITY_TONE[task.priority],
              )}
            >
              <Flame className="size-3 mr-1" />
              {priorityLabel(task.priority)}
            </Badge>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px]",
                DUE_TONE[due.tone],
              )}
            >
              <Calendar className="size-3" />
              {due.label}
            </span>
            <div className="ml-auto">
              {task.assignee ? (
                <AvatarBubble
                  name={task.assignee.name}
                  color={task.assignee.avatarColor}
                  size="xs"
                />
              ) : (
                <div className="h-5 w-5 rounded-full grid place-items-center text-muted-foreground/60 ring-2 ring-white/70 dark:ring-white/10 bg-muted">
                  <UserIcon className="size-3" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
