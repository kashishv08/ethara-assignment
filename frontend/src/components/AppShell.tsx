import { Link, useLocation } from "wouter";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  LogOut,
  Sparkles,
  Menu,
  X,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AvatarBubble } from "./AvatarBubble";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  // { href: "/admin", label: "Admin Panel", icon: Shield, adminOnly: true },
];

function basePath() {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <aside className="flex h-full w-72 flex-col gap-2 bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 px-6 pt-6 pb-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          onClick={() => setMobileOpen(false)}
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400 to-fuchsia-500 blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
              <Sparkles className="size-5 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-white">
              Tasklane
            </div>
            <div className="text-[11px] text-sidebar-foreground/60 -mt-0.5">
              Team Task Manager
            </div>
          </div>
        </Link>
        <button
          className="md:hidden rounded-lg p-1.5 text-sidebar-foreground/70 hover-elevate-2"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-4" />
        </button>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map(({ href, label, icon: Icon, adminOnly }) => {
          if (adminOnly && user?.role !== "admin") return null;
          const active =
            href === "/"
              ? location === "/" || location === ""
              : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover-elevate-2",
                active
                  ? "bg-gradient-to-r from-indigo-500/25 to-fuchsia-500/15 text-white shadow-inner"
                  : "text-sidebar-foreground/80 hover:text-white",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-300 to-fuchsia-300" />
              )}
              <Icon className="size-[18px] shrink-0" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-cyan-500/10 p-4">
          <div className="text-xs font-medium text-sidebar-foreground/70">
            Logged in as
          </div>
          <div className="mt-3 flex items-center gap-3">
            <AvatarBubble
              name={user?.name ?? ""}
              color={user?.avatarColor}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white truncate">
                {user?.name}
              </div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">
                {user?.email}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn(
                "border-0 text-[10px] uppercase tracking-wide font-semibold",
                user?.role === "admin"
                  ? "bg-amber-400/20 text-amber-200"
                  : "bg-white/10 text-white/80",
              )}
            >
              {user?.role}
            </Badge>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-sidebar-foreground/80 hover:text-white hover-elevate-2"
              data-testid="button-logout"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <div className="hidden md:block sticky top-0 h-screen">{sidebar}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 h-full">{sidebar}</div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 px-4 md:px-8 pt-4 md:pt-6">
          <div className="glass rounded-2xl px-4 md:px-6 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <PageTitle path={location} />
            </div>
            <a
              href={`${basePath()}/projects`}
              className="hidden sm:inline-flex"
            >
              <Button
                variant="outline"
                size="sm"
                className="rounded-full bg-white/60 border-white/60 backdrop-blur"
              >
                <FolderKanban className="size-4 mr-1.5" />
                Browse projects
              </Button>
            </a>
            <div className="flex items-center gap-2">
              <AvatarBubble
                name={user?.name ?? ""}
                color={user?.avatarColor}
                size="sm"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 pt-6 pb-12">{children}</main>
      </div>
    </div>
  );
}

function PageTitle({ path }: { path: string }) {
  let title = "Dashboard";
  let subtitle: string | null = "Overview of your work";
  if (path.startsWith("/projects/")) {
    title = "Project";
    subtitle = "Plan, assign, and ship";
  } else if (path === "/projects") {
    title = "Projects";
    subtitle = "All projects you're part of";
  } else if (path === "/my-tasks") {
    title = "My Tasks";
    subtitle = "Everything assigned to you";
  }
  return (
    <div className="leading-tight">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/80 font-semibold">
        Workspace
      </div>
      <div className="text-base md:text-lg font-semibold text-foreground">
        {title}
        {subtitle && (
          <span className="text-muted-foreground font-normal ml-2 text-sm">
            · {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
