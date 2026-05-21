import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PROMPT } from "@/lib/ryval";

export const Route = createFileRoute("/_authenticated/prompts")({ component: Prompts });

function Prompts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);

  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prompt_templates").select("*").order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (p: any) => {
      const { data: u } = await supabase.auth.getUser();
      if (p.id) { await supabase.from("prompt_templates").update({ name: p.name, prompt_text: p.prompt_text, category: p.category }).eq("id", p.id); }
      else { await supabase.from("prompt_templates").insert({ user_id: u.user!.id, name: p.name, prompt_text: p.prompt_text, category: p.category }); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prompts"] }); toast.success("Saved"); setEditing(null); },
  });

  return (
    <PageShell>
      <PageHeader
        title="Prompt Templates"
        subtitle="Reusable AI prompt presets. Edit the brand voice, do-not-say rules, and CTA rules."
        actions={<Button onClick={() => setEditing({ name: "New prompt", prompt_text: DEFAULT_PROMPT, category: "" })} className="bg-gradient-primary text-primary-foreground font-semibold"><Plus className="size-4 mr-2" />New</Button>}
      />
      {editing ? (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Name" />
          <Input value={editing.category ?? ""} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="Category (optional)" />
          <Textarea rows={18} value={editing.prompt_text} onChange={e => setEditing({ ...editing, prompt_text: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate(editing)} className="bg-gradient-primary text-primary-foreground font-semibold">Save</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {prompts.map(p => (
            <button key={p.id} onClick={() => setEditing(p)} className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-accent/40">
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.prompt_text}</p>
            </button>
          ))}
          {!prompts.length && <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">No prompts saved. Start with "New" to copy the default.</div>}
        </div>
      )}
    </PageShell>
  );
}
