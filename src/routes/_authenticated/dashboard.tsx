import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell, StatCard } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { editorialTitle } from "@/lib/content-quality";
import {
  factsThroughFromNotes,
  fanoutLines,
  laneLabel,
  outboundWhen,
  schoolNameFromNotes,
} from "@/lib/outbound";

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
      return {
        total: all.length, approved: by("approved"), scheduled: by("scheduled"),
        posted: by("posted"), winners: by("winner"), todayCount,
      };
    },
  });

  const { data: outbound = [] } = useQuery({
    queryKey: ["outbound-posts"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("posts")
        .select(
          "id, hook, status, scheduled_date, posted_at, tiktok_status, tiktok_error, export_slide_urls, notes, category",
        )
        .in("status", ["scheduled", "posted"])
        .order("scheduled_date", { ascending: false })
        .limit(48);
      if (error) throw error;
      return rows ?? [];
    },
  });

  const goingOut = outbound
    .filter((post) => post.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.scheduled_date ?? 0).getTime() - new Date(b.scheduled_date ?? 0).getTime(),
    );
  const sent = outbound
    .filter((post) => post.status === "posted")
    .sort(
      (a, b) =>
        new Date(b.posted_at ?? b.scheduled_date ?? 0).getTime() -
        new Date(a.posted_at ?? a.scheduled_date ?? 0).getTime(),
    );

  // Every carousel fans out to both TikToks, so 2 carousels an hour is 2 posts an hour each.
  const pacing = (() => {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayStart = new Date().setHours(0, 0, 0, 0);
    const lastHour = sent.filter((p) => new Date(p.posted_at ?? 0).getTime() >= hourAgo).length;
    const perAccount = new Map<string, number>();
    for (const post of sent) {
      if (new Date(post.posted_at ?? 0).getTime() < dayStart) continue;
      for (const line of fanoutLines(post.notes)) {
        if (line.status !== "PUBLISH_COMPLETE") continue;
        perAccount.set(line.name, (perAccount.get(line.name) ?? 0) + 1);
      }
    }
    const next = goingOut.find((p) => new Date(p.scheduled_date ?? 0).getTime() > now);
    return {
      lastHour,
      nextLabel: next ? outboundWhen(next.scheduled_date) : "—",
      accounts: [...perAccount].map(([name, count]) => ({ name, count })).slice(0, 2),
      factsThrough:
        [...goingOut, ...sent].map((p) => factsThroughFromNotes(p.notes)).find(Boolean) ?? null,
    };
  })();

  return (
    <PageShell>
      <PageHeader
        title="Content Command Center"
        subtitle="See what's queued for collegesoccerlens and The Football Network, and what already went out."
        actions={
          <>
            <Button asChild className="bg-gradient-primary text-primary-foreground font-semibold"><Link to="/generate"><Sparkles className="size-4 mr-2" />Generate New Batch</Link></Button>
            <Button asChild variant="outline"><Link to="/assets"><Upload className="size-4 mr-2" />Upload Screens</Link></Button>
            <Button asChild variant="outline"><Link to="/library"><Download className="size-4 mr-2" />Export Approved</Link></Button>
          </>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Posted this hour" value={`${pacing.lastHour} of 2`} />
        <StatCard label="Next carousel" value={pacing.nextLabel} />
        {pacing.accounts.length ? (
          pacing.accounts.map((acct) => (
            <StatCard key={acct.name} label={`${acct.name} today`} value={acct.count} />
          ))
        ) : (
          <StatCard label="Accounts today" value="—" />
        )}
        <StatCard label="Queued" value={goingOut.length} />
        <StatCard label="Stats through" value={pacing.factsThrough ?? "—"} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <OutboundList title="Going out" empty="Nothing queued. Autopilot fills the next few hours." posts={goingOut} />
        <OutboundList title="Sent" empty="No carousels posted yet." posts={sent} sent />
      </div>
    </PageShell>
  );
}

function OutboundList({
  title,
  empty,
  posts,
  sent = false,
}: {
  title: string;
  empty: string;
  sent?: boolean;
  posts: Array<{
    id: string;
    hook: string | null;
    status: string | null;
    scheduled_date: string | null;
    posted_at: string | null;
    tiktok_status: string | null;
    tiktok_error: string | null;
    export_slide_urls: string[] | null;
    notes: string | null;
    category: string | null;
  }>;
}) {
  return (
    <section className="rounded-xl bg-gradient-card border border-border p-4 min-h-64">
      <p className="text-xs uppercase tracking-widest text-muted-foreground px-2">{title}</p>
      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground px-2 py-8">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {posts.map((post) => {
            const thumb = post.export_slide_urls?.find((url) => url?.startsWith("http"));
            const school = schoolNameFromNotes(post.notes);
            const accounts = fanoutLines(post.notes);
            const when = outboundWhen(sent ? post.posted_at || post.scheduled_date : post.scheduled_date);
            return (
              <li key={post.id}>
                <Link
                  to="/library"
                  className="flex gap-3 py-3 px-2 rounded-lg hover:bg-accent/40"
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="h-16 w-12 rounded-md object-cover bg-muted shrink-0" />
                  ) : (
                    <div className="h-16 w-12 rounded-md bg-muted shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{editorialTitle(post.hook ?? "") || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {when}
                      {` · ${laneLabel(post.notes)}`}
                      {school ? ` · ${school}` : ""}
                    </p>
                    <p className="text-xs mt-1">
                      {accounts.length
                        ? accounts.map((row) => `${row.name} ${row.status === "PUBLISH_COMPLETE" ? "sent" : row.status.toLowerCase()}`).join(" · ")
                        : post.tiktok_status || (sent ? "Posted" : "Waiting to post")}
                      {post.tiktok_error ? ` · ${post.tiktok_error}` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
