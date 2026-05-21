import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { generatePosts } from "@/lib/generate.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CarouselPreview } from "@/components/carousel-preview";
import { CATEGORIES, PLATFORMS, ACCOUNTS, AUDIENCES, TONES, CTA_TYPES } from "@/lib/ryval";

export const Route = createFileRoute("/_authenticated/generate")({ component: Generate });

function Generate() {
  const qc = useQueryClient();
  const generate = useServerFn(generatePosts);
  const [form, setForm] = useState({
    count: 5, slidesPerPost: 5,
    platform: "tiktok", account: "recruiting_truth",
    audience: "players", category: "harsh_truths",
    tone: "direct", ctaType: "join waitlist", includeAppScreen: true,
  });
  const [generated, setGenerated] = useState<Array<Record<string, string | null>>>([]);

  const mut = useMutation({
    mutationFn: () => generate({ data: form }),
    onSuccess: (r) => { setGenerated(r.posts as any); toast.success(`Generated ${r.posts.length} posts`); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const saveAll = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const rows = generated.map(p => ({
        user_id: u.user!.id,
        hook: p.hook ?? "", slide_2: p.slide_2 ?? "", slide_3: p.slide_3 ?? "", slide_4: p.slide_4 ?? "", slide_5: p.slide_5 ?? "", slide_6: p.slide_6 ?? "",
        cta: p.cta ?? "", caption: p.caption ?? "", hashtags: p.hashtags ?? "",
        bg_image_url: p.bg_image_url ?? null, logo_url: p.logo_url ?? null, app_screen_url: p.app_screen_url ?? null,
        category: form.category as any, audience: form.audience as any, platform: form.platform as any, account: form.account as any,
        cta_type: form.ctaType, tone: form.tone, status: "drafted" as const,
      }));
      const { error } = await supabase.from("posts").insert(rows as any);
      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Saved to library");
      setGenerated([]);
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const sel = (label: string, key: keyof typeof form, opts: ReadonlyArray<{ value: string; label: string } | string>) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={String(form[key])} onValueChange={v => setForm(f => ({ ...f, [key]: isNaN(Number(v)) ? v : Number(v) }))}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {opts.map(o => {
            const val = typeof o === "string" ? o : o.value;
            const lbl = typeof o === "string" ? o : o.label;
            return <SelectItem key={val} value={val}>{lbl}</SelectItem>;
          })}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageShell>
      <PageHeader title="Generate" subtitle="Spin up a batch of slideshow drafts. Short, direct, premium." />
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {sel("Platform", "platform", PLATFORMS as any)}
        {sel("Account", "account", ACCOUNTS as any)}
        {sel("Audience", "audience", AUDIENCES as any)}
        {sel("Category", "category", CATEGORIES as any)}
        {sel("Tone", "tone", TONES as any)}
        {sel("CTA type", "ctaType", CTA_TYPES as any)}
        {sel("Number of posts", "count", [{value:"5",label:"5"},{value:"10",label:"10"},{value:"25",label:"25"},{value:"50",label:"50"}])}
        {sel("Slides per post", "slidesPerPost", [{value:"5",label:"5"},{value:"6",label:"6"},{value:"7",label:"7"}])}
        <div className="space-y-2">
          <Label>Include app-screen CTA</Label>
          <div className="h-10 flex items-center gap-3 px-3 rounded-md border border-input bg-input">
            <Switch checked={form.includeAppScreen} onCheckedChange={v => setForm(f => ({ ...f, includeAppScreen: v }))} />
            <span className="text-sm text-muted-foreground">{form.includeAppScreen ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>
      <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="bg-gradient-primary text-primary-foreground font-semibold">
        {mut.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" />Generating…</> : <><Sparkles className="size-4 mr-2" />Generate Posts</>}
      </Button>

      {generated.length > 0 && (
        <div className="mt-10 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{generated.length} drafts ready</h2>
            <Button onClick={() => saveAll.mutate()} disabled={saveAll.isPending} variant="outline">
              {saveAll.isPending ? "Saving…" : "Save all to library"}
            </Button>
          </div>
          {generated.map((p, i) => (
            <div key={i} className="rounded-xl border border-border bg-gradient-card p-5">
              <div className="flex justify-between items-baseline mb-4">
                <h3 className="font-bold text-lg text-balance">{p.hook}</h3>
                <span className="text-xs text-muted-foreground">Draft #{i + 1}</span>
              </div>
              <CarouselPreview post={p as any} />
              <div className="mt-4 text-sm text-muted-foreground space-y-1">
                <p><span className="text-foreground font-medium">Caption:</span> {p.caption}</p>
                <p className="text-primary">{p.hashtags}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
