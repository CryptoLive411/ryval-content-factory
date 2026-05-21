import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: pw, options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
      nav({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 bg-gradient-card border-border shadow-glow">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="size-8 rounded-lg bg-gradient-primary shadow-glow" />
            <span className="text-xl font-bold tracking-tight">RYVAL</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Content Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">{mode === "signin" ? "Sign in to keep shipping." : "Create your internal admin account."}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@ryval.app" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" required minLength={8} value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground font-semibold">
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <button onClick={() => setMode(m => m === "signin" ? "signup" : "signin")} className="mt-6 text-xs text-muted-foreground hover:text-foreground w-full text-center">
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </Card>
    </div>
  );
}
