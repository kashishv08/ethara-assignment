import { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Renders children only if the user is a global platform admin.
 */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "admin") return null;
  return <>{children}</>;
}

/**
 * Renders children only if the user is an admin of the specified project.
 */
export function ProjectAdminOnly({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const { user, projectRoles } = useAuth();
  
  // Global admin bypasses
  if (user?.role === "admin") return <>{children}</>;
  
  if (projectRoles[projectId] !== "admin") return null;
  return <>{children}</>;
}

/**
 * Hook to check if current user is an admin of a specific project.
 */
export function useIsProjectAdmin(projectId: string) {
  const { user, projectRoles } = useAuth();
  return user?.role === "admin" || projectRoles[projectId] === "admin";
}
