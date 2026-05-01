import { initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AvatarBubble({
  name,
  color,
  size = "md",
  className,
}: {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes: Record<typeof size, string> = {
    xs: "h-5 w-5 text-[9px]",
    sm: "h-7 w-7 text-[11px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white shadow-sm ring-2 ring-white/70 dark:ring-white/10 select-none",
        sizes[size],
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${color ?? "#6366f1"}, ${
          shiftColor(color ?? "#6366f1", -25)
        })`,
      }}
      title={name}
    >
      {initialsOf(name) || "?"}
    </div>
  );
}

function shiftColor(hex: string, amount: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = clamp(parseInt(m.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(m.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(m.slice(4, 6), 16) + amount);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function clamp(n: number) {
  return Math.max(0, Math.min(255, n));
}
