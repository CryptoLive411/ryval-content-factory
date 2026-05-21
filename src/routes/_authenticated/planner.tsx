import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS, ACCOUNTS, POSTING_WINDOWS, STATUSES, statusColor } from "@/lib/ryval";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planner")({ component: Planner });

function Planner() {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));

  const { data: entries = [] } = useQuery({
    queryKey: ["planner", date],
    queryFn: async () => {
      const { data, error } = await supabase.from("planner_entries").select("*").eq("plan_date", date).order("plan_time");
      if (error) throw error; return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (time: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("planner_entries").insert({
        user_id: u.user!.id, plan_date: date, plan_time: time, status: "idea",
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planner"] }),
  });

  const update = useMutation({
    mutationFn: async (row: any) => {
      const { id, ...patch } = row;
      const { error } = await supabase.from("planner_entries").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planner"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await supabase.from("planner_entries").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planner"] }),
  });

  return (
    <PageShell>
      <PageHeader title="Daily Planner" subtitle="Plan which posts go out today, across pages and platforms." />
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div><label className="text-xs text-muted-foreground">Date</label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <Select onValueChange={v => add.mutate(v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="+ Add slot" /></SelectTrigger>
          <SelectContent>{POSTING_WINDOWS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {entries.map(e => (
          <div key={e.id} className="rounded-xl border border-border bg-card p-4 grid md:grid-cols-5 gap-3 items-center">
            <Input value={e.plan_time ?? ""} onChange={ev => update.mutate({ id: e.id, plan_time: ev.target.value })} className="w-28" />
            <Select value={e.platform ?? ""} onValueChange={v => update.mutate({ id: e.id, platform: v })}>
              <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>{PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={e.account ?? ""} onValueChange={v => update.mutate({ id: e.id, account: v })}>
              <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
              <SelectContent>{ACCOUNTS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={e.status} onValueChange={v => update.mutate({ id: e.id, status: v })}>
              <SelectTrigger><span className={cn("px-2 py-0.5 rounded-full text-xs border", statusColor(e.status))}>{e.status}</span></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => del.mutate(e.id)} className="text-muted-foreground hover:text-destructive">Remove</Button>
          </div>
        ))}
        {!entries.length && <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">No slots planned. Add one above.</div>}
      </div>
    </PageShell>
  );
}
