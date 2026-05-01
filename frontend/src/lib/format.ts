import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";

export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function relativeFromNow(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return formatDistanceToNow(date, { addSuffix: true });
}

export function dueDateLabel(d: string | null): {
  label: string;
  tone: "ok" | "warn" | "danger" | "muted";
} {
  if (!d) return { label: "No due date", tone: "muted" };
  const date = new Date(d);
  if (isToday(date)) return { label: "Due today", tone: "warn" };
  if (isTomorrow(date)) return { label: "Due tomorrow", tone: "warn" };
  if (isPast(date)) return { label: `Overdue · ${format(date, "MMM d")}`, tone: "danger" };
  return { label: `Due ${format(date, "MMM d")}`, tone: "ok" };
}

export function statusLabel(s: string) {
  switch (s) {
    case "todo":
      return "To Do";
    case "in_progress":
      return "In Progress";
    case "done":
      return "Done";
    default:
      return s;
  }
}

export function priorityLabel(p: string) {
  switch (p) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    default:
      return p;
  }
}
