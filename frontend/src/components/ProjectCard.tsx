import { Link } from "wouter";
import { CheckCircle2, Circle, Clock, MoreVertical, Trash2 } from "lucide-react";
import type { Project } from "@/lib/types";
import { AvatarBubble } from "./AvatarBubble";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

export function ProjectCard({
  project,
  onDelete,
}: {
  project: Project;
  onDelete?: (p: Project) => void;
}) {
  const { user } = useAuth();
  const total = project.stats?.total ?? 0;
  const done = project.stats?.done ?? 0;
  const todo = project.stats?.todo ?? 0;
  const inProgress = project.stats?.in_progress ?? 0;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const canDelete = user?.role === "admin";

  return (
    <div className="group glass relative rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background: `linear-gradient(90deg, ${project.color}, ${project.color}80)`,
        }}
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/projects/${project.id}`}
            className="flex-1 min-w-0"
            data-testid={`link-project-${project.id}`}
          >
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl shadow-sm grid place-items-center text-white font-semibold text-sm"
                style={{
                  background: `linear-gradient(135deg, ${project.color}, ${project.color}cc)`,
                }}
              >
                {project.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">
                  {project.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {project.description || "No description"}
                </div>
              </div>
            </div>
          </Link>

          {canDelete && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover-elevate-2"
                  data-testid={`button-project-menu-${project.id}`}
                >
                  <MoreVertical className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(project)}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Pill icon={Circle} label="To do" value={todo} tone="indigo" />
          <Pill icon={Clock} label="Doing" value={inProgress} tone="amber" />
          <Pill icon={CheckCircle2} label="Done" value={done} tone="emerald" />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>{total === 0 ? "No tasks yet" : `${pct}% complete`}</span>
            <span>{total} total</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex -space-x-2">
            {project.members.slice(0, 4).map((m) => (
              <AvatarBubble
                key={m.id}
                name={m.name}
                color={m.avatarColor}
                size="sm"
              />
            ))}
            {project.members.length > 4 && (
              <div className="h-7 w-7 rounded-full bg-muted text-xs font-medium grid place-items-center ring-2 ring-white/70 dark:ring-white/10 text-muted-foreground">
                +{project.members.length - 4}
              </div>
            )}
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {project.members.length} member{project.members.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </div>
    </div>
  );
}

function Pill({
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
  const colors: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  };
  return (
    <div className={`rounded-xl px-2 py-2 ${colors[tone]}`}>
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide font-semibold">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
