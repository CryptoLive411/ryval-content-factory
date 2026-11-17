import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell, StatCard } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { editorialTitle } from "@/lib/content-quality";

export const Route = createFileRoute("/_authenticated/performance")({ component: Performance });

function Performance() {
  const qc = useQueryClient();
  const { data: posts = [] } = useQuery({
    queryKey: ["perf-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("posts").select("id, hook, category, is_winner, status").in("status", ["posted","winner"]).order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });
  const { data: perfRows = [] } = useQuery({
    queryKey: ["perf-rows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("performance").select("*");
      if (error) throw error; return data ?? [];
    },
  });

  const totals = perfRows.reduce((acc, r) => ({
    views: acc.views + (r.views ?? 0), likes: acc.likes + (r.likes ?? 0),
    saves: acc.saves + (r.saves ?? 0), signups: acc.signups + (r.signups ?? 0),
  }), { views: 0, likes: 0, saves: 0, signups: 0 });

  const upsert = useMutation({
    mutationFn: async ({ post_id, patch }: any) => {
      const { data: u } = await supabase.auth.getUser();
      const existing = perfRows.find(r => r.post_id === post_id);
      if (existing) { await supabase.from("performance").update(patch).eq("id", existing.id); }
      else { await supabase.from("performance").insert({ user_id: u.user!.id, post_id, ...patch }); }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["perf-rows"] }),
  });

  const markWinner = useMutation({
    mutationFn: async (id: string) => { await supabase.from("posts").update({ is_winner: true, status: "winner" }).eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["perf-posts"] }); toast.success("Marked as winner"); },
  });

  return (
    <PageShell>
      <PageHeader title="Performance" subtitle="Log results manually to surface winning hooks and categories." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total views" value={totals.views.toLocaleString()} />
        <StatCard label="Total likes" value={totals.likes.toLocaleString()} />
        <StatCard label="Total saves" value={totals.saves.toLocaleString()} />
        <StatCard label="Signups attributed" value={totals.signups.toLocaleString()} />
      </div>
      <div className="space-y-2">
        {posts.map(p => {
          const r = perfRows.find(x => x.post_id === p.id) ?? { views: 0, likes: 0, saves: 0, signups: 0 };
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 grid md:grid-cols-6 gap-3 items-center">
              <p className="md:col-span-2 font-medium truncate">{editorialTitle(p.hook)}</p>
              {(["views","likes","saves","signups"] as const).map(k => (
                <Input key={k} type="number" placeholder={k} defaultValue={(r as any)[k] ?? 0}
                  onBlur={e => upsert.mutate({ post_id: p.id, patch: { [k]: Number(e.target.value) } })} />
              ))}
              <Button size="sm" variant={p.is_winner ? "default" : "outline"} onClick={() => markWinner.mutate(p.id)} className={p.is_winner ? "bg-success text-success-foreground" : ""}>
                <Trophy className="size-3 mr-1" />{p.is_winner ? "Winner" : "Mark winner"}
              </Button>
            </div>
          );
        })}
        {!posts.length && <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">Mark posts as "posted" in the Library to track their performance here.</div>}
      </div>
    </PageShell>
  );
}
