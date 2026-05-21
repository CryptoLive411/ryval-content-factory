import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSET_TAGS } from "@/lib/ryval";

export const Route = createFileRoute("/_authenticated/assets")({ component: Assets });

function Assets() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: assets = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return;
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      for (const file of Array.from(files)) {
        const path = `${u.user.id}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("assets").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("assets").getPublicUrl(path);
        const { error: insErr } = await supabase.from("assets").insert({
          user_id: u.user.id, file_url: pub.publicUrl, file_name: file.name, asset_type: file.type, tags: [],
        });
        if (insErr) throw insErr;
      }
      toast.success(`Uploaded ${files.length} file(s)`);
      qc.invalidateQueries({ queryKey: ["assets"] });
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("assets").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });

  const toggleTag = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const { error } = await supabase.from("assets").update({ tags }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });

  return (
    <PageShell>
      <PageHeader
        title="Assets"
        subtitle="Upload Ryval app screens, mockups, founder photos. Tag them so they slot into the right CTA slide."
        actions={
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-semibold cursor-pointer">
            <Upload className="size-4" />{uploading ? "Uploading…" : "Upload"}
            <input type="file" multiple accept="image/*" className="hidden" onChange={onUpload} disabled={uploading} />
          </label>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map(a => (
          <div key={a.id} className="group rounded-xl border border-border bg-card overflow-hidden">
            <div className="aspect-square bg-muted relative">
              <img src={a.file_url} alt={a.file_name} className="w-full h-full object-cover" />
              <button onClick={() => del.mutate(a.id)} className="absolute top-2 right-2 size-7 rounded-full bg-black/60 hover:bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-3">
              <p className="text-xs font-medium truncate">{a.file_name}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {ASSET_TAGS.slice(0,6).map(t => {
                  const on = a.tags?.includes(t);
                  return (
                    <button key={t} onClick={() => toggleTag.mutate({ id: a.id, tags: on ? a.tags!.filter((x: string) => x !== t) : [...(a.tags ?? []), t] })}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${on ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
        {!assets.length && <div className="col-span-full text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">No assets yet. Upload Ryval app screens or mockups to use on CTA slides.</div>}
      </div>
    </PageShell>
  );
}
