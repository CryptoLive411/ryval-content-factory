import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORMS, ACCOUNTS, POSTING_WINDOWS, STATUSES, statusColor } from "@/lib/ryval";
import { editorialTitle } from "@/lib/content-quality";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planner")({ component: Planner });

function Planner() {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: entries = [] } = useQuery({
    queryKey: ["planner", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_entries")
        .select("*, posts(id, hook, status, scheduled_date)")
        .eq("plan_date", date)
        .order("plan_time");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: libraryPosts = [] } = useQuery({
    queryKey: ["planner-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, hook, status")
        .in("status", ["approved", "designed", "scheduled", "idea", "drafted"])
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (time: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("planner_entries").insert({
        user_id: u.user!.id,
        plan_date: date,
        plan_time: time,
        status: "idea",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planner"] }),
  });

  const update = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { id, posts, ...patch } = row;
      const { error } = await supabase
        .from("planner_entries")
        .update(patch as never)
        .eq("id", id as string);
      if (error) throw error;

      // Mirror schedule onto linked post
      if (patch.post_id && (patch.status === "scheduled" || patch.plan_time)) {
        const planTime = (patch.plan_time as string) || "09:00";
        const iso = new Date(`${date}T${planTime}:00`).toISOString();
        await supabase
          .from("posts")
          .update({
            status: (patch.status as never) || "scheduled",
            scheduled_date: iso,
          })
          .eq("id", patch.post_id as string);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planner"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Updated");
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("planner_entries").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planner"] }),
  });

  return (
    <PageShell>
      <PageHeader
        title="Daily Planner"
        subtitle="Link Library posts to time slots. Scheduled posts publish via the TikTok cron worker."
      />
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="text-xs text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Select onValueChange={(v) => add.mutate(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="+ Add slot" />
          </SelectTrigger>
          <SelectContent>
            {POSTING_WINDOWS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {entries.map((e) => {
          const linked = (e as { posts?: { hook?: string } | null }).posts;
          return (
            <div
              key={e.id}
              className="rounded-xl border border-border bg-card p-4 grid md:grid-cols-6 gap-3 items-center"
            >
              <Input
                value={e.plan_time ?? ""}
                onChange={(ev) => update.mutate({ id: e.id, plan_time: ev.target.value })}
                className="w-28"
              />
              <Select
                value={e.platform ?? ""}
                onValueChange={(v) => update.mutate({ id: e.id, platform: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={e.account ?? ""}
                onValueChange={(v) => update.mutate({ id: e.id, account: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={e.post_id ?? "none"}
                onValueChange={(v) =>
                  update.mutate({
                    id: e.id,
                    post_id: v === "none" ? null : v,
                    status: v === "none" ? e.status : "scheduled",
                    plan_time: e.plan_time,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link post" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No post linked</SelectItem>
                  {libraryPosts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {editorialTitle(p.hook || p.id).slice(0, 48)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={e.status}
                onValueChange={(v) =>
                  update.mutate({
                    id: e.id,
                    status: v,
                    post_id: e.post_id,
                    plan_time: e.plan_time,
                  })
                }
              >
                <SelectTrigger>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs border",
                      statusColor(e.status),
                    )}
                  >
                    {e.status}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">
                  {linked?.hook ? linked.hook.slice(0, 40) : "—"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => del.mutate(e.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
        {!entries.length && (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
            No slots planned. Add one above, then link a Library post.
          </div>
        )}
      </div>
    </PageShell>
  );
}
