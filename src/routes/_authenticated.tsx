import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Sparkles, Library, Calendar, Image, LayoutTemplate, BarChart3, Wand2, Settings, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

function NavList({ path, onNavigate, signOut, email }: { path: string; onNavigate?: () => void; signOut: () => void; email?: string | null }) {
  return (
    <>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(item => {
          const active = path === item.to || (item.to !== "/dashboard" && path.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}>
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="px-2 py-1 text-xs text-muted-foreground truncate">{email}</div>
        <button onClick={signOut} className="w-full mt-1 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </>
  );
}

function AuthLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: s => s.location.pathname });
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="inline-flex items-center gap-2">
            <div className="size-7 rounded-md bg-gradient-primary shadow-glow" />
            <span className="font-bold tracking-tight text-sidebar-foreground">RYVAL</span>
          </Link>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Content Factory</p>
        </div>
        <NavList path={path} signOut={signOut} email={user?.email} />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border bg-background/95 backdrop-blur">
          <Link to="/dashboard" className="inline-flex items-center gap-2">
            <div className="size-6 rounded-md bg-gradient-primary shadow-glow" />
            <span className="font-bold tracking-tight">RYVAL</span>
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="p-2 -mr-2 rounded-md hover:bg-accent" aria-label="Open menu">
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 flex flex-col bg-sidebar border-sidebar-border">
              <div className="px-5 py-5 border-b border-sidebar-border">
                <div className="inline-flex items-center gap-2">
                  <div className="size-7 rounded-md bg-gradient-primary shadow-glow" />
                  <span className="font-bold tracking-tight text-sidebar-foreground">RYVAL</span>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Content Factory</p>
              </div>
              <NavList path={path} onNavigate={() => setOpen(false)} signOut={signOut} email={user?.email} />
            </SheetContent>
          </Sheet>
        </header>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
