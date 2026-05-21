import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell, StatCard } from "@/components/page-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data: posts } = await supabase.from("posts").select("status,category,created_at");
      const all = posts ?? [];
      const by = (s: string) => all.filter(p => p.status === s).length;
      const today = new Date(); today.setHours(0,0,0,0);
      const todayCount = all.filter(p => new Date(p.created_at) >= today).length;
      const catCounts = all.reduce<Record<string, number>>((acc, p) => {
        if (p.category) acc[p.category] = (acc[p.category] ?? 0) + 1;
        return acc;
      }, {});
      const topCat = Object.entries(catCounts).sort((a,b) => b[1]-a[1])[0]?.[0] ?? "—";
      return {
        total: all.length, approved: by("approved"), scheduled: by("scheduled"),
        posted: by("posted"), winners: by("winner"), todayCount, topCat,
      };
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="Content Command Center"
        subtitle="Generate, organize, and ship daily faceless slideshow content for Ryval."
        actions={
          <>
            <Button asChild className="bg-gradient-primary text-primary-foreground font-semibold"><Link to="/generate"><Sparkles className="size-4 mr-2" />Generate New Batch</Link></Button>
            <Button asChild variant="outline"><Link to="/assets"><Upload className="size-4 mr-2" />Upload Screens</Link></Button>
            <Button asChild variant="outline"><Link to="/library"><Download className="size-4 mr-2" />Export Approved</Link></Button>
          </>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total" value={data?.total ?? "—"} />
        <StatCard label="Approved" value={data?.approved ?? "—"} />
        <StatCard label="Scheduled" value={data?.scheduled ?? "—"} />
        <StatCard label="Posted" value={data?.posted ?? "—"} />
        <StatCard label="Winners" value={data?.winners ?? "—"} />
        <StatCard label="Created today" value={data?.todayCount ?? "—"} />
      </div>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="rounded-xl bg-gradient-card border border-border p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Best-performing category</p>
          <p className="text-2xl font-bold mt-2 capitalize">{data?.topCat?.replace(/_/g," ")}</p>
          <p className="text-xs text-muted-foreground mt-2">Based on volume created. Hook performance opens up once you log results in the Performance tab.</p>
        </div>
        <div className="rounded-xl bg-gradient-card border border-border p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Launch countdown</p>
          <p className="text-2xl font-bold mt-2">Set it in Settings →</p>
          <p className="text-xs text-muted-foreground mt-2">Add your launch date to start the daily countdown shown here.</p>
        </div>
      </div>
    </PageShell>
  );
}
