import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    if (location.pathname === "/") throw redirect({ to: "/generate" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { user } = useAuth();
  const nav = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 h-14 border-b border-border bg-background/95 backdrop-blur">
        <Link to="/generate" className="inline-flex items-center gap-2">
          <div className="size-7 rounded-md bg-gradient-primary shadow-glow" />
          <span className="font-bold tracking-tight">RYVAL</span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-muted-foreground ml-2">Content Factory</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[200px]">{user?.email}</span>
          <button onClick={signOut} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md">
            <LogOut className="size-3.5" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
