import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Sparkles, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const { signup } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signup(name, email, password);
      navigate("/");
    } catch (err) {
      toast({
        title: "Couldn't create account",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center shadow-lg shadow-indigo-500/30">
              <Sparkles className="size-6 text-white" strokeWidth={2.4} />
            </div>
            <div className="text-2xl font-bold tracking-tight">Tasklane</div>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start collaborating with your team in minutes.
          </p>
        </div>

        <div className="glass rounded-3xl p-7 shadow-xl">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="pl-9"
                  data-testid="input-name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@team.com"
                  className="pl-9"
                  data-testid="input-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-9"
                  data-testid="input-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full gradient-primary text-white shadow-lg shadow-indigo-500/20"
              data-testid="button-signup"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" /> Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline"
              data-testid="link-login"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
