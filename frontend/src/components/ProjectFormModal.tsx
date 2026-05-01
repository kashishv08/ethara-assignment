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
import { api, getApiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Project, User } from "@/lib/types";
import { AvatarBubble } from "./AvatarBubble";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
];

export function ProjectFormModal({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}) {
  const isEdit = Boolean(project);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
      setColor(project?.color ?? COLORS[0]!);
      setMemberIds(project?.members.map((m) => m.id) ?? []);
    }
  }, [open, project]);

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data } = await api.get<{ users: User[] }>("/users");
      return data.users;
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit && project) {
        const { data } = await api.patch<{ project: Project }>(
          `/projects/${project.id}`,
          { name, description, color, memberIds },
        );
        return data.project;
      }
      const { data } = await api.post<{ project: Project }>("/projects", {
        name,
        description,
        color,
        memberIds,
      });
      return data.project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      toast({
        title: isEdit ? "Project updated" : "Project created",
        description: `${name} is ready.`,
      });
      onOpenChange(false);
    },
    onError: (err) => {
      toast({
        title: "Couldn't save project",
        description: getApiErrorMessage(err),
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] glass-soft border-white/40">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit project" : "Create project"}</DialogTitle>
          <DialogDescription>
            Set up a workspace for your team to collaborate.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Q4 product launch"
              required
              data-testid="input-project-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              data-testid="input-project-description"
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-xl ring-2 ring-offset-2 ring-offset-background transition-all",
                    color === c
                      ? "ring-foreground scale-110"
                      : "ring-transparent hover:scale-105",
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${c}, ${c}cc)`,
                  }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Team members</Label>
            <div className="rounded-xl border bg-card max-h-48 overflow-y-auto divide-y">
              {usersQuery.data?.length ? (
                usersQuery.data.map((u) => {
                  const checked = memberIds.includes(u.id);
                  return (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() =>
                        setMemberIds((prev) =>
                          prev.includes(u.id)
                            ? prev.filter((id) => id !== u.id)
                            : [...prev, u.id],
                        )
                      }
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left hover-elevate text-sm",
                        checked && "bg-primary/5",
                      )}
                      data-testid={`member-toggle-${u.id}`}
                    >
                      <AvatarBubble name={u.name} color={u.avatarColor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {u.email}
                        </div>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 rounded-md grid place-items-center border",
                          checked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {checked && <Check className="size-3" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  Loading members…
                </div>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              You're added automatically as the project owner.
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
              disabled={mutation.isPending || name.trim().length === 0}
              data-testid="button-save-project"
              className="gradient-primary text-white"
            >
              {mutation.isPending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
