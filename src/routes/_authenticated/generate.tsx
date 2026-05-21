import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Loader2, Download } from "lucide-react";
import { generatePosts, generateBackground } from "@/lib/generate.functions";
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
type ImageEngine = "nano" | "nano-pro";

type FormState = {
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(500 * Math.pow(3, i));
    }
  }
  throw lastErr;
}

function RyvalDraftCard({ post }: { post: GeneratedPost }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const onDownload = async () => {
    setBusy(true);
    try {
      const slug =
        (post.hook ?? "post")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40) || "post";
      await exportPostForTikTok({
        post,
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
        <Button size="sm" variant="outline" onClick={onDownload} disabled={busy}>
          {busy ? (
            <Loader2 className="size-3 mr-1.5 animate-spin" />
          ) : (
            <Download className="size-3 mr-1.5" />
          )}
          Download
        </Button>
      </div>
      <CarouselPreview post={post} />
      <div className="mt-4 text-sm text-muted-foreground space-y-1">
        <p>
          <span className="text-foreground font-medium">Caption:</span> {post.caption}
        </p>
        <p className="text-primary">{post.hashtags}</p>
      </div>
    </div>
  );
}

function Generate() {
  const generate = useServerFn(generatePosts);
  const genBg = useServerFn(generateBackground);

  const [imageEngine, setImageEngine] = useState<ImageEngine>("nano");
  const [form, setForm] = useState<FormState>({
    slidesPerPost: 5,
    platform: "tiktok",
    account: "recruiting_truth",
    audience: "players",
    category: "harsh_truths",
    tone: "direct",
    ctaType: "join waitlist in bio",
    includeAppScreen: true,
  });
  const [ryvalPost, setRyvalPost] = useState<GeneratedPost | null>(null);

  const ryvalMut = useMutation({
    mutationFn: async () => {
      setRyvalPost(null);
      const r = await generate({
        data: { ...form, count: 1, variantIndex: Math.floor(Math.random() * 1000) },
      });
      const post: GeneratedPost = { ...r.posts[0], cta_type: form.ctaType, bg_images: [] };
      setRyvalPost(post);
      toast.success("Draft ready — rendering backgrounds…");

      const prompts = (post.slide_image_prompts ?? []) as string[];
      let fails = 0;
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        if (!prompt) continue;
        try {
          const { url } = await withRetry(
            () => genBg({ data: { prompt, model: imageEngine, stylePreset: "ryval" } }),
            3,
          );
          setRyvalPost((prev) => {
            if (!prev) return prev;
            const bgs = [...(prev.bg_images ?? [])];
            bgs[i] = url;
            return { ...prev, bg_images: bgs };
          });
        } catch (e) {
          fails++;
          console.error("bg gen failed", i, e);
        }
      }
      if (fails > 0) toast.error(`${fails} image(s) failed — refresh and re-generate.`);
      else toast.success("All backgrounds rendered.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const sel = (label: string, key: SelectKey, opts: ReadonlyArray<SelectOption>) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={String(form[key])}
        onValueChange={(v) =>
          setForm((f) => ({ ...f, [key]: typeof f[key] === "number" ? Number(v) : v }))
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
      <PageHeader title="Generate" subtitle="One post at a time. Premium output, every render." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {sel("Platform", "platform", PLATFORMS)}
        {sel("Account", "account", ACCOUNTS)}
        {sel("Audience", "audience", AUDIENCES)}
        {sel("Category", "category", CATEGORIES)}
        {sel("Tone", "tone", TONES)}
        {sel("CTA type", "ctaType", CTA_TYPES)}
        {sel("Slides per post", "slidesPerPost", [
          { value: "5", label: "5" },
          { value: "6", label: "6" },
          { value: "7", label: "7" },
        ])}
        <div className="space-y-2">
          <Label>Image engine</Label>
          <Select value={imageEngine} onValueChange={(v) => setImageEngine(v as ImageEngine)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nano">Nano Banana — fast & cheap</SelectItem>
              <SelectItem value="nano-pro">Nano Banana Pro — premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Include app screen on CTA</Label>
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
        onClick={() => ryvalMut.mutate()}
        disabled={ryvalMut.isPending}
        className="bg-gradient-primary text-primary-foreground font-semibold"
      >
        {ryvalMut.isPending ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Sparkles className="size-4 mr-2" /> Generate 1 Post
          </>
        )}
      </Button>
      {ryvalPost && (
        <div className="mt-8">
          <RyvalDraftCard post={ryvalPost} />
        </div>
      )}
    </PageShell>
  );
}
