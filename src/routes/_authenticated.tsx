import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Sparkles, Library, Calendar, Image, LayoutTemplate, BarChart3, Wand2, Settings, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    if (location.pathname === "/") throw redirect({ to: "/dashboard" });
  },
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/generate", icon: Sparkles, label: "Generate" },
  { to: "/library", icon: Library, label: "Library" },
  { to: "/planner", icon: Calendar, label: "Planner" },
  { to: "/assets", icon: Image, label: "Assets" },
  { to: "/templates", icon: LayoutTemplate, label: "Templates" },
  { to: "/performance", icon: BarChart3, label: "Performance" },
  { to: "/prompts", icon: Wand2, label: "Prompts" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

function AuthLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="inline-flex items-center gap-2">
            <div className="size-7 rounded-md bg-gradient-primary shadow-glow" />
            <span className="font-bold tracking-tight text-sidebar-foreground">RYVAL</span>
          </Link>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Content Factory</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(item => {
            const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}>
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-2 py-1 text-xs text-muted-foreground truncate">{user?.email}</div>
          <button onClick={signOut} className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
