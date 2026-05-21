import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES, PLATFORMS, STATUSES, statusColor } from "@/lib/ryval";
import { exportPostForTikTok } from "@/lib/tiktok-export";
import { CarouselPreview } from "@/components/carousel-preview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/library")({ component: Library });

function Library() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ category: "all", platform: "all", status: "all" });
  const [open, setOpen] = useState<string | null>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["posts", filters],
    queryFn: async () => {
      let q = supabase.from("posts").select("*").order("created_at", { ascending: false });
      if (filters.category !== "all") q = q.eq("category", filters.category as any);
      if (filters.platform !== "all") q = q.eq("platform", filters.platform as any);
      if (filters.status !== "all") q = q.eq("status", filters.status as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async (row: any) => {
      const { id, created_at, updated_at, user_id, ...patch } = row;
      const { error } = await supabase.from("posts").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["posts"] }); toast.success("Saved"); setOpen(null); },
    onError: e => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("posts").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["posts"] }); toast.success("Deleted"); setOpen(null); },
  });

  const exportApproved = () => {
    const rows = posts.filter(p => ["approved","designed","scheduled"].includes(p.status));
    if (!rows.length) return toast.error("No approved posts");
    downloadCSV(`ryval-posts-${Date.now()}.csv`, postsToCSV(rows as any));
    toast.success(`Exported ${rows.length} posts`);
  };

  const editing = posts.find(p => p.id === open);

  return (
    <PageShell>
      <PageHeader
        title="Post Library"
        subtitle={`${posts.length} posts`}
        actions={<Button onClick={exportApproved} className="bg-gradient-primary text-primary-foreground font-semibold"><Download className="size-4 mr-2" />Export Approved (CSV)</Button>}
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <FilterSelect label="Category" value={filters.category} onChange={(v: string) => setFilters(f => ({...f, category: v}))} options={CATEGORIES as any} />
        <FilterSelect label="Platform" value={filters.platform} onChange={(v: string) => setFilters(f => ({...f, platform: v}))} options={PLATFORMS as any} />
        <FilterSelect label="Status" value={filters.status} onChange={(v: string) => setFilters(f => ({...f, status: v}))} options={STATUSES as any} />

        <Button variant="outline" onClick={() => setFilters({ category: "all", platform: "all", status: "all" })}>Reset</Button>
      </div>
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
            <tr><th className="text-left p-3">Hook</th><th className="text-left p-3">Category</th><th className="text-left p-3">Platform</th><th className="text-left p-3">Status</th><th className="text-left p-3">Created</th></tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id} onClick={() => setOpen(p.id)} className="border-t border-border hover:bg-accent/40 cursor-pointer">
                <td className="p-3 max-w-md truncate font-medium">{p.hook}</td>
                <td className="p-3 text-muted-foreground capitalize">{p.category?.replace(/_/g," ")}</td>
                <td className="p-3 text-muted-foreground capitalize">{p.platform?.replace(/_/g," ")}</td>
                <td className="p-3"><span className={cn("px-2 py-1 rounded-full text-xs border", statusColor(p.status))}>{p.status}</span></td>
                <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!posts.length && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">No posts yet. Head to Generate.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={v => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit post</DialogTitle></DialogHeader>
          {editing && <PostEditor post={editing} onSave={update.mutate} onDelete={() => del.mutate(editing.id)} />}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function FilterSelect({ label, value, onChange, options }: any) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o: any) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function PostEditor({ post, onSave, onDelete }: any) {
  const [p, setP] = useState(post);
  const f = (k: string) => (e: any) => setP({ ...p, [k]: e.target ? e.target.value : e });
  return (
    <div className="space-y-4">
      <CarouselPreview post={p} />
      {(["hook","slide_2","slide_3","slide_4","slide_5","slide_6","cta"] as const).map(k => (
        <div key={k}><Label className="capitalize text-xs">{k.replace("_"," ")}</Label><Input value={p[k] ?? ""} onChange={f(k)} /></div>
      ))}
      <div><Label className="text-xs">Caption</Label><Textarea value={p.caption ?? ""} onChange={f("caption")} /></div>
      <div><Label className="text-xs">Hashtags</Label><Input value={p.hashtags ?? ""} onChange={f("hashtags")} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={p.status} onValueChange={v => setP({...p, status: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Scheduled date</Label><Input type="datetime-local" value={p.scheduled_date?.slice(0,16) ?? ""} onChange={e => setP({...p, scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : null})} /></div>
      </div>
      <div><Label className="text-xs">Notes</Label><Textarea value={p.notes ?? ""} onChange={f("notes")} /></div>
      <div className="flex justify-between">
        <Button variant="destructive" onClick={onDelete}>Delete</Button>
        <Button onClick={() => onSave(p)} className="bg-gradient-primary text-primary-foreground font-semibold">Save</Button>
      </div>
    </div>
  );
}
