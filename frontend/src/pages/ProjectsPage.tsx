import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban, Plus, Search } from "lucide-react";
import { api, getApiErrorMessage } from "@/lib/api";
import type { Project } from "@/lib/types";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data } = await api.get<{ projects: Project[] }>("/projects");
      return data.projects;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      toast({ title: "Project deleted" });
      setPendingDelete(null);
    },
    onError: (err) =>
      toast({
        title: "Couldn't delete project",
        description: getApiErrorMessage(err),
        variant: "destructive",
      }),
  });

  const filtered = (projectsQuery.data ?? []).filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-sm text-muted-foreground">
            Organize your team's work into focused workspaces.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search projects…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-card"
              data-testid="input-search-projects"
            />
          </div>
          {isAdmin && (
            <Button
              onClick={() => setOpen(true)}
              className="gradient-primary text-white"
              data-testid="button-new-project-page"
            >
              <Plus className="size-4 mr-1.5" /> New project
            </Button>
          )}
        </div>
      </div>

      {projectsQuery.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={query ? "No matching projects" : "No projects yet"}
          description={
            query
              ? "Try a different search."
              : isAdmin
              ? "Spin up your first project to start collaborating."
              : "An admin will add you to a project soon."
          }
          action={
            !query && isAdmin ? (
              <Button
                onClick={() => setOpen(true)}
                className="gradient-primary text-white"
              >
                <Plus className="size-4 mr-1.5" /> New project
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onDelete={(proj) => setPendingDelete(proj)}
            />
          ))}
        </div>
      )}

      <ProjectFormModal open={open} onOpenChange={setOpen} />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">{pendingDelete?.name}</span> and
              all of its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                pendingDelete && deleteMutation.mutate(pendingDelete.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
