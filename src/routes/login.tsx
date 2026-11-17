import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ensureLocalAccount } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/generate" });
  },
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const prepareAccount = useServerFn(ensureLocalAccount);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        await prepareAccount({ data: { email, password: pw } });
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error && /not confirmed/i.test(error.message)) {
        await prepareAccount({ data: { email, password: pw } });
        const retry = await supabase.auth.signInWithPassword({ email, password: pw });
        if (retry.error) throw retry.error;
      } else if (error) {
        throw error;
      }
      toast.success(mode === "signup" ? "Account ready. Signing you in…" : "Signed in.");
      const pending = sessionStorage.getItem("tiktok_oauth_search");
      if (pending) {
        sessionStorage.removeItem("tiktok_oauth_search");
        window.location.replace(`/tiktok-callback${pending}`);
        return;
      }
      nav({ to: "/generate" });
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
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin"
              ? "Sign in with email and password. No inbox link needed."
              : "Create an internal account. Local signup skips email confirmation."}
          </p>
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
