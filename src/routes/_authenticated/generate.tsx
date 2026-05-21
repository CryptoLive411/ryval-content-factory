import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Loader2, Download } from "lucide-react";
import { generatePosts, generateBackground } from "@/lib/generate.functions";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CarouselPreview } from "@/components/carousel-preview";
import { CATEGORIES, PLATFORMS, ACCOUNTS, AUDIENCES, TONES, CTA_TYPES } from "@/lib/ryval";
import { exportPostForTikTok } from "@/lib/tiktok-export";

export const Route = createFileRoute("/_authenticated/generate")({ component: Generate });

type DbEnums = Database["public"]["Enums"];
type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];

type FormState = {
  count: number;
  slidesPerPost: number;
  platform: DbEnums["platform"];
  account: DbEnums["account"];
  audience: DbEnums["audience"];
  category: DbEnums["category"];
  tone: string;
  ctaType: string;
  includeAppScreen: boolean;
};

type GeneratedPost = {
  hook?: string | null;
  slide_2?: string | null;
  slide_3?: string | null;
  slide_4?: string | null;
  slide_5?: string | null;
  slide_6?: string | null;
  cta?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  slide_image_prompts?: string[];
  bg_images?: (string | null)[];
  bg_image_url?: string | null;
  logo_url?: string | null;
  app_screen_url?: string | null;
  cta_type?: string | null;
};

type SelectOption = { value: string; label: string } | string;
type SelectKey = Exclude<keyof FormState, "includeAppScreen">;

function DraftCard({ post, index }: { post: GeneratedPost; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const onDownload = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const root = ref.current.querySelector<HTMLElement>("[data-carousel-root]");
      if (!root) throw new Error("Preview not ready");
      const slug = (post.hook ?? `post-${index + 1}`)
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || `post-${index + 1}`;
      await exportPostForTikTok({
        container: root,
        caption: post.caption ?? "",
        hashtags: post.hashtags ?? "",
        filenameBase: slug,
      });
      toast.success("TikTok pack downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div ref={ref} className="rounded-xl border border-border bg-gradient-card p-5">
      <div className="flex justify-between items-baseline mb-4 gap-3">
        <h3 className="font-bold text-lg text-balance flex-1">{post.hook}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">Draft #{index + 1}</span>
          <Button size="sm" variant="outline" onClick={onDownload} disabled={busy}>
            {busy ? <Loader2 className="size-3 mr-1.5 animate-spin" /> : <Download className="size-3 mr-1.5" />}
            TikTok pack
          </Button>
        </div>
      </div>
      <CarouselPreview post={post} />
      <div className="mt-4 text-sm text-muted-foreground space-y-1">
        <p><span className="text-foreground font-medium">Caption:</span> {post.caption}</p>
        <p className="text-primary">{post.hashtags}</p>
      </div>
    </div>
  );
}

function Generate() {
  const qc = useQueryClient();
  const generate = useServerFn(generatePosts);
  const genBg = useServerFn(generateBackground);
  const [form, setForm] = useState<FormState>({
    count: 5,
    slidesPerPost: 5,
    platform: "tiktok",
    account: "recruiting_truth",
    audience: "players",
    category: "harsh_truths",
    tone: "direct",
    ctaType: "join waitlist",
    includeAppScreen: true,
  });
  const [generated, setGenerated] = useState<GeneratedPost[]>([]);

  const mut = useMutation({
    mutationFn: async () => {
      setGenerated([]);
      const drafts: GeneratedPost[] = [];

      // Rotate variantIndex so each post hits a different persona + angle.
      const seedBase = Math.floor(Math.random() * 1000);
      for (let i = 0; i < form.count; i += 1) {
        const r = await generate({ data: { ...form, count: 1, variantIndex: seedBase + i } });
        const seeded: GeneratedPost[] = r.posts.map((p) => ({
          ...p,
          cta_type: form.ctaType,
          bg_images: [] as (string | null)[],
        }));
        drafts.push(...seeded);
        setGenerated([...drafts]);
      }

      toast.success(`Generated ${drafts.length} drafts — rendering backgrounds…`);

      const tasks = drafts.flatMap((p, postIdx) =>
        ((p.slide_image_prompts ?? []) as string[])
          .map((prompt, slideIdx) => ({ prompt, postIdx, slideIdx }))
          .filter((task) => Boolean(task.prompt)),
      );

      let imgFails = 0;
      // Keep image generation bounded too; this avoids flooding the gateway on big batches.
      for (let i = 0; i < tasks.length; i += 3) {
        await Promise.all(
          tasks.slice(i, i + 3).map(async ({ prompt, postIdx, slideIdx }) => {
            try {
              const { url } = await genBg({ data: { prompt } });
              setGenerated((prev) => {
                const next = [...prev];
                const post = next[postIdx];
                if (!post) return prev;
                const bgs = [...(post.bg_images ?? [])];
                bgs[slideIdx] = url;
                next[postIdx] = { ...post, bg_images: bgs };
                return next;
              });
            } catch (e) {
              imgFails += 1;
              console.error("bg gen failed", postIdx, slideIdx, e);
            }
          }),
        );
      }
      if (imgFails > 0) {
        toast.error(`${imgFails} background image(s) failed to generate — you can retry by re-generating.`);
      } else {
        toast.success("All backgrounds rendered.");
      }

      return { posts: drafts };
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const saveAll = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const rows: PostInsert[] = generated.map((p) => ({
        user_id: u.user!.id,
        hook: p.hook ?? "",
        slide_2: p.slide_2 ?? "",
        slide_3: p.slide_3 ?? "",
        slide_4: p.slide_4 ?? "",
        slide_5: p.slide_5 ?? "",
        slide_6: p.slide_6 ?? "",
        cta: p.cta ?? "",
        caption: p.caption ?? "",
        hashtags: p.hashtags ?? "",
        bg_images: (p.bg_images ?? []).filter((url): url is string => Boolean(url)),
        bg_image_url: p.bg_images?.find((url): url is string => Boolean(url)) ?? null,
        logo_url: p.logo_url ?? null,
        app_screen_url: p.app_screen_url ?? null,
        category: form.category,
        audience: form.audience,
        platform: form.platform,
        account: form.account,
        cta_type: form.ctaType,
        tone: form.tone,
        status: "drafted" as const,
      }));
      const { error } = await supabase.from("posts").insert(rows);
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

  const sel = (label: string, key: SelectKey, opts: ReadonlyArray<SelectOption>) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={String(form[key])}
        onValueChange={(v) =>
          setForm((f) => ({
            ...f,
            [key]: typeof f[key] === "number" ? Number(v) : v,
          }))
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => {
            const val = typeof o === "string" ? o : o.value;
            const lbl = typeof o === "string" ? o : o.label;
            return (
              <SelectItem key={val} value={val}>
                {lbl}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageShell>
      <PageHeader
        title="Generate"
        subtitle="Spin up a batch of slideshow drafts. Short, direct, premium."
      />
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {sel("Platform", "platform", PLATFORMS)}
        {sel("Account", "account", ACCOUNTS)}
        {sel("Audience", "audience", AUDIENCES)}
        {sel("Category", "category", CATEGORIES)}
        {sel("Tone", "tone", TONES)}
        {sel("CTA type", "ctaType", CTA_TYPES)}
        {sel("Number of posts", "count", [
          { value: "5", label: "5" },
          { value: "10", label: "10" },
          { value: "25", label: "25" },
          { value: "50", label: "50" },
        ])}
        {sel("Slides per post", "slidesPerPost", [
          { value: "5", label: "5" },
          { value: "6", label: "6" },
          { value: "7", label: "7" },
        ])}
        <div className="space-y-2">
          <Label>Include app-screen CTA</Label>
          <div className="h-10 flex items-center gap-3 px-3 rounded-md border border-input bg-input">
            <Switch
              checked={form.includeAppScreen}
              onCheckedChange={(v) => setForm((f) => ({ ...f, includeAppScreen: v }))}
            />
            <span className="text-sm text-muted-foreground">
              {form.includeAppScreen ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>
      <Button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        className="bg-gradient-primary text-primary-foreground font-semibold"
      >
        {mut.isPending ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Sparkles className="size-4 mr-2" />
            Generate Posts
          </>
        )}
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
            <DraftCard key={i} post={p} index={i} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
