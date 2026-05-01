import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
