import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "indigo",
  loading,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: "indigo" | "violet" | "cyan" | "amber" | "rose" | "emerald";
  loading?: boolean;
}) {
  const tones: Record<string, string> = {
    indigo: "from-indigo-500 to-violet-500",
    violet: "from-violet-500 to-fuchsia-500",
    cyan: "from-cyan-500 to-sky-500",
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-pink-500",
    emerald: "from-emerald-500 to-teal-500",
  };
  const ringTones: Record<string, string> = {
    indigo: "shadow-indigo-500/20",
    violet: "shadow-violet-500/20",
    cyan: "shadow-cyan-500/20",
    amber: "shadow-amber-500/20",
    rose: "shadow-rose-500/20",
    emerald: "shadow-emerald-500/20",
  };
  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        ringTones[tone],
      )}
    >
      <div
        className={cn(
          "absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-25 blur-2xl bg-gradient-to-br",
          tones[tone],
        )}
      />
      <div className="flex items-start justify-between gap-3 relative">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-foreground">
            {loading ? <span className="inline-block h-8 w-14 rounded-md bg-muted animate-pulse" /> : value}
          </div>
          {hint && (
            <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
          )}
        </div>
        <div
          className={cn(
            "h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br text-white grid place-items-center shadow-md",
            tones[tone],
          )}
        >
          <Icon className="size-5" strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
}
