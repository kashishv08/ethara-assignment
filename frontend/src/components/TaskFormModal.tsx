import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, getApiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Project, Task, TaskPriority, TaskStatus, User } from "@/lib/types";

export function TaskFormModal({
  open,
  onOpenChange,
  task,
  projectId,
  defaultStatus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  projectId?: string;
  defaultStatus?: TaskStatus;
}) {
  const isEdit = Boolean(task);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("__unassigned");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
      setAssigneeId(task.assignee ? task.assignee.id : "__unassigned");
      setSelectedProjectId(task.projectId);
    } else {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus ?? "todo");
      setPriority("medium");
      setDueDate("");
      setAssigneeId("__unassigned");
      setSelectedProjectId(projectId ?? "");
    }
  }, [open, task, defaultStatus, projectId]);

  const projectsQuery = useQuery({
    queryKey: ["projects-for-task"],
    queryFn: async () => {
      const { data } = await api.get<{ projects: Project[] }>("/projects");
      return data.projects;
    },
    enabled: open && !projectId,
  });

  const membersQuery = useQuery({
    queryKey: ["project-members", selectedProjectId],
    queryFn: async () => {
      const { data } = await api.get<{ members: User[] }>(
        `/projects/${selectedProjectId}/members`,
      );
      return data.members;
    },
    enabled: open && Boolean(selectedProjectId),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(`${dueDate}T12:00:00.000Z`).toISOString() : null,
        assigneeId: assigneeId === "__unassigned" ? null : assigneeId,
      };
      if (isEdit && task) {
        const { data } = await api.patch<{ task: Task }>(
          `/tasks/${task.id}`,
          payload,
        );
        return data.task;
      }
      const { data } = await api.post<{ task: Task }>("/tasks", {
        ...payload,
        projectId: selectedProjectId,
      });
      return data.task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      toast({ title: isEdit ? "Task updated" : "Task created" });
      onOpenChange(false);
    },
    onError: (err) =>
      toast({
        title: "Couldn't save task",
        description: getApiErrorMessage(err),
        variant: "destructive",
      }),
  });

  const canSubmit =
    title.trim().length > 0 && Boolean(selectedProjectId) && !mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] glass-soft border-white/40">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            Capture the work and assign it to a teammate.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Design login page"
              required
              data-testid="input-task-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details…"
              rows={3}
            />
          </div>

          {!projectId && !isEdit && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger data-testid="select-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projectsQuery.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: p.color }}
                        />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger data-testid="select-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned">Unassigned</SelectItem>
                  {membersQuery.data
                    ?.filter((u) => {
                      // Restriction: Members can't assign to admins
                      if (user?.role === "member" && u.role === "admin") return false;
                      // Restriction: Admins can't assign to OTHER admins
                      if (user?.role === "admin" && u.role === "admin" && u.id !== user?.id) return false;
                      return true;
                    })
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="gradient-primary text-white"
              data-testid="button-save-task"
            >
              {mutation.isPending
                ? "Saving…"
                : isEdit
                ? "Save changes"
                : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
