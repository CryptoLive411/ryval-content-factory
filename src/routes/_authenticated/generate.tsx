import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Loader2, Download, GraduationCap, Megaphone } from "lucide-react";
import { generatePosts, generateBackground } from "@/lib/generate.functions";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CarouselPreview } from "@/components/carousel-preview";
import { CollegePreview, type CollegeSlideStatus } from "@/components/college-preview";
import { CATEGORIES, PLATFORMS, ACCOUNTS, AUDIENCES, TONES, CTA_TYPES } from "@/lib/ryval";
import { exportPostForTikTok } from "@/lib/tiktok-export";
import { buildCollegePost, buildComposedPrompt, type CollegePost } from "@/lib/college";
import { exportCollegePost } from "@/lib/college-export";
import JSZip from "jszip";

export const Route = createFileRoute("/_authenticated/generate")({ component: Generate });

type DbEnums = Database["public"]["Enums"];

type Mode = "ryval" | "college";
type ImageEngine = "nano" | "nano-pro";
type CollegeEngine = "nano" | "nano-pro";

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
  slide_2?: string | null; slide_3?: string | null;
  slide_4?: string | null; slide_5?: string | null; slide_6?: string | null;
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(500 * Math.pow(3, i));
    }
  }
  throw lastErr;
}

// ──────────────────────────────── Ryval brand draft card ────────────────────────────────

function RyvalDraftCard({ post }: { post: GeneratedPost }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const onDownload = async () => {
    setBusy(true);
    try {
      const slug = (post.hook ?? "post")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "post";
      await exportPostForTikTok({
        post, caption: post.caption ?? "", hashtags: post.hashtags ?? "", filenameBase: slug,
      });
      toast.success("TikTok pack downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally { setBusy(false); }
  };
  return (
    <div ref={ref} className="rounded-xl border border-border bg-gradient-card p-5">
      <div className="flex justify-between items-baseline mb-4 gap-3">
        <h3 className="font-bold text-lg text-balance flex-1">{post.hook}</h3>
        <Button size="sm" variant="outline" onClick={onDownload} disabled={busy}>
          {busy ? <Loader2 className="size-3 mr-1.5 animate-spin" /> : <Download className="size-3 mr-1.5" />}
          Download
        </Button>
      </div>
      <CarouselPreview post={post} />
      <div className="mt-4 text-sm text-muted-foreground space-y-1">
        <p><span className="text-foreground font-medium">Caption:</span> {post.caption}</p>
        <p className="text-primary">{post.hashtags}</p>
      </div>
    </div>
  );
}

// ──────────────────────────────── Brand asset fetch ────────────────────────────────

async function fetchBrandAssets() {
  const [{ data: logos }, { data: screens }] = await Promise.all([
    supabase.from("assets").select("file_url").overlaps("tags", ["logo", "ryval logo"]).order("created_at", { ascending: false }).limit(1),
    supabase.from("assets").select("file_url").overlaps("tags", [
      "main page","quick scout","ryval discovery",
      "player profile","player feed","player messages","player opportunities","player reels",
    ]).limit(20),
  ]);
  const logoUrl = logos?.[0]?.file_url ?? null;
  const arr = (screens ?? []).map(s => s.file_url);
  const screenUrl = arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
  return { logoUrl, screenUrl };
}

// ──────────────────────────────── Page ────────────────────────────────

function Generate() {
  const generate = useServerFn(generatePosts);
  const genBg = useServerFn(generateBackground);

  const [mode, setMode] = useState<Mode>("ryval");
  const [imageEngine, setImageEngine] = useState<ImageEngine>("nano");

  // ── Ryval form
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

  // ── College form
  const [collegeForm, setCollegeForm] = useState({
    school: "Duke",
    sport: "Men's Soccer",
    conference: "",
    accent: "",
  });
  const [collegePost, setCollegePost] = useState<CollegePost | null>(null);
  const [collegeBgs, setCollegeBgs] = useState<(string | null)[]>([]);
  const [collegeStatuses, setCollegeStatuses] = useState<CollegeSlideStatus[]>([]);
  const [collegeAssets, setCollegeAssets] = useState<{ logoUrl: string | null; screenUrl: string | null }>({ logoUrl: null, screenUrl: null });
  const [collegeEngine, setCollegeEngine] = useState<CollegeEngine>("nano");
  const [collegeComposed, setCollegeComposed] = useState(false); // true when last render used openai composed mode

  // ── Ryval generation
  const ryvalMut = useMutation({
    mutationFn: async () => {
      setRyvalPost(null);
      const r = await generate({ data: { ...form, count: 1, variantIndex: Math.floor(Math.random() * 1000) } });
      const post: GeneratedPost = { ...r.posts[0], cta_type: form.ctaType, bg_images: [] };
      setRyvalPost(post);
      toast.success("Draft ready — rendering backgrounds…");

      const prompts = (post.slide_image_prompts ?? []) as string[];
      let fails = 0;
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        if (!prompt) continue;
        try {
          const { url } = await withRetry(() => genBg({ data: { prompt, model: imageEngine, stylePreset: "ryval" } }), 3);
          setRyvalPost(prev => {
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

  // ── College generation
  const collegeMut = useMutation({
    mutationFn: async () => {
      const input = {
        school: collegeForm.school.trim(),
        sport: collegeForm.sport.trim() || "Men's Soccer",
        conference: collegeForm.conference.trim() || undefined,
        accent: collegeForm.accent.trim() || undefined,
      };
      if (!input.school) throw new Error("Enter a school name");

      const built = buildCollegePost(input);
      setCollegePost(built);
      setCollegeBgs(new Array(built.slides.length).fill(null));
      setCollegeStatuses(built.slides.map(() => "pending" as const));

      const assets = await fetchBrandAssets();
      setCollegeAssets(assets);

      toast.success(`${built.meta.school} ${built.meta.sport} — rendering 5 slides…`);

      const useComposed = false;
      setCollegeComposed(useComposed);

      let fails = 0;
      for (let i = 0; i < built.slides.length; i++) {
        setCollegeStatuses(prev => prev.map((s, idx) => idx === i ? "loading" : s));
        try {
          const prompt = useComposed
            ? buildComposedPrompt(built.slides[i], built.meta)
            : built.slides[i].imagePrompt;
          const { url } = await withRetry(
            () => genBg({ data: {
              prompt,
              model: collegeEngine,
              stylePreset: useComposed ? "college-composed" : "college",
            } }),
            3,
          );
          setCollegeBgs(prev => { const n = [...prev]; n[i] = url; return n; });
          setCollegeStatuses(prev => prev.map((s, idx) => idx === i ? "done" : s));
        } catch (e) {
          fails++;
          console.error("college bg failed", i, e);
          setCollegeStatuses(prev => prev.map((s, idx) => idx === i ? "failed" : s));
        }
      }
      if (fails > 0) toast.error(`${fails} slide(s) failed — tap Retry on each.`);
      else toast.success("Post complete.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const retryCollegeSlide = async (idx: number) => {
    if (!collegePost) return;
    setCollegeStatuses(prev => prev.map((s, i) => i === idx ? "loading" : s));
    try {
      const useComposed = collegeComposed;
      const prompt = useComposed
        ? buildComposedPrompt(collegePost.slides[idx], collegePost.meta)
        : collegePost.slides[idx].imagePrompt;
      const { url } = await withRetry(
        () => genBg({ data: {
          prompt,
          model: useComposed ? "openai" : "nano-pro",
          stylePreset: useComposed ? "college-composed" : "college",
        } }),
        3,
      );
      setCollegeBgs(prev => { const n = [...prev]; n[idx] = url; return n; });
      setCollegeStatuses(prev => prev.map((s, i) => i === idx ? "done" : s));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Retry failed");
      setCollegeStatuses(prev => prev.map((s, i) => i === idx ? "failed" : s));
    }
  };

  const downloadCollege = async () => {
    if (!collegePost) return;
    const slug = `${collegePost.meta.school}-${collegePost.meta.sport}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      if (collegeComposed) {
        // OpenAI composed slides — images already contain everything. Just zip them.
        const zip = new JSZip();
        for (let i = 0; i < collegeBgs.length; i++) {
          const url = collegeBgs[i];
          if (!url) continue;
          const blob = await fetch(url).then(r => r.blob());
          zip.file(`${slug}-slide-${String(i + 1).padStart(2, "0")}.png`, blob);
        }
        zip.file("caption.txt", `${collegePost.caption}\n\n${collegePost.hashtags}\n`);
        const out = await zip.generateAsync({ type: "blob" });
        const dl = URL.createObjectURL(out);
        const a = document.createElement("a");
        a.href = dl;
        a.download = `${slug}-tiktok.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(dl), 1000);
      } else {
        await exportCollegePost({
          post: collegePost,
          bgImages: collegeBgs,
          logoUrl: collegeAssets.logoUrl,
          appScreenUrl: collegeAssets.screenUrl,
          filenameBase: slug,
        });
      }
      toast.success("Pack downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };

  const sel = (label: string, key: SelectKey, opts: ReadonlyArray<SelectOption>) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={String(form[key])}
        onValueChange={(v) => setForm(f => ({ ...f, [key]: typeof f[key] === "number" ? Number(v) : v }))}
      >
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
      <PageHeader title="Generate" subtitle="One post at a time. Premium output, every render." />

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg mb-6 max-w-md">
        <button
          onClick={() => setMode("ryval")}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${mode === "ryval" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          <Megaphone className="size-4" /> Ryval Brand
        </button>
        <button
          onClick={() => setMode("college")}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${mode === "college" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          <GraduationCap className="size-4" /> College
        </button>
      </div>

      {mode === "ryval" && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {sel("Platform", "platform", PLATFORMS)}
            {sel("Account", "account", ACCOUNTS)}
            {sel("Audience", "audience", AUDIENCES)}
            {sel("Category", "category", CATEGORIES)}
            {sel("Tone", "tone", TONES)}
            {sel("CTA type", "ctaType", CTA_TYPES)}
            {sel("Slides per post", "slidesPerPost", [
              { value: "5", label: "5" }, { value: "6", label: "6" }, { value: "7", label: "7" },
            ])}
            <div className="space-y-2">
              <Label>Image engine</Label>
              <Select value={imageEngine} onValueChange={(v) => setImageEngine(v as ImageEngine)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                  onCheckedChange={(v) => setForm(f => ({ ...f, includeAppScreen: v }))}
                />
                <span className="text-sm text-muted-foreground">{form.includeAppScreen ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => ryvalMut.mutate()}
            disabled={ryvalMut.isPending}
            className="bg-gradient-primary text-primary-foreground font-semibold"
          >
            {ryvalMut.isPending
              ? <><Loader2 className="size-4 mr-2 animate-spin" /> Generating…</>
              : <><Sparkles className="size-4 mr-2" /> Generate 1 Post</>}
          </Button>
          {ryvalPost && (
            <div className="mt-8">
              <RyvalDraftCard post={ryvalPost} />
            </div>
          )}
        </>
      )}

      {mode === "college" && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>School</Label>
              <Input value={collegeForm.school} onChange={e => setCollegeForm(f => ({ ...f, school: e.target.value }))} placeholder="Duke" />
            </div>
            <div className="space-y-2">
              <Label>Sport / team</Label>
              <Input value={collegeForm.sport} onChange={e => setCollegeForm(f => ({ ...f, sport: e.target.value }))} placeholder="Men's Soccer" />
            </div>
            <div className="space-y-2">
              <Label>Conference <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={collegeForm.conference} onChange={e => setCollegeForm(f => ({ ...f, conference: e.target.value }))} placeholder="ACC" />
            </div>
            <div className="space-y-2">
              <Label>Accent color hex <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input value={collegeForm.accent} onChange={e => setCollegeForm(f => ({ ...f, accent: e.target.value }))} placeholder="#1f3fb8" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Image engine</Label>
              <Select value={collegeEngine} onValueChange={(v) => setCollegeEngine(v as CollegeEngine)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nano">Nano Banana — fastest reliable render</SelectItem>
                  <SelectItem value="nano-pro">Nano Banana Pro — higher quality, slower</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Button
              onClick={() => collegeMut.mutate()}
              disabled={collegeMut.isPending}
              className="bg-gradient-primary text-primary-foreground font-semibold"
            >
              {collegeMut.isPending
                ? <><Loader2 className="size-4 mr-2 animate-spin" /> Rendering…</>
                : <><Sparkles className="size-4 mr-2" /> Generate Post</>}
            </Button>
            {collegePost && (
              <Button variant="outline" onClick={downloadCollege} disabled={collegeStatuses.some(s => s !== "done")}>
                <Download className="size-4 mr-2" /> Download TikTok pack
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Backgrounds render first; Ryval adds crisp text locally for preview and export.
            </p>
          </div>


          {collegePost && (
            <div className="mt-8 space-y-4">
              <div className="flex items-baseline justify-between">
                <h3 className="font-bold text-lg">{collegePost.meta.school} {collegePost.meta.sport}</h3>
                <span className="text-xs text-muted-foreground">{collegeStatuses.filter(s => s === "done").length}/{collegePost.slides.length} rendered</span>
              </div>
              {collegeComposed ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {collegePost.slides.map((_, i) => {
                    const url = collegeBgs[i];
                    const status = collegeStatuses[i];
                    return (
                      <div key={i} className="aspect-[4/5] rounded-lg overflow-hidden border border-border relative bg-[#05080f]">
                        {url && <img src={url} alt={`slide ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />}
                        {status !== "done" && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            {status === "loading" && <Loader2 className="size-5 animate-spin text-white/70" />}
                            {status === "pending" && <span className="text-[10px] text-white/60 uppercase tracking-wider">Queued</span>}
                            {status === "failed" && (
                              <button onClick={() => retryCollegeSlide(i)} className="text-[10px] text-red-300 underline">Retry</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <CollegePreview
                  post={collegePost}
                  bgImages={collegeBgs}
                  statuses={collegeStatuses}
                  logoUrl={collegeAssets.logoUrl}
                  appScreenUrl={collegeAssets.screenUrl}
                  onRetry={retryCollegeSlide}
                />
              )}
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="whitespace-pre-line"><span className="text-foreground font-medium">Caption:</span> {collegePost.caption}</p>
                <p className="text-primary">{collegePost.hashtags}</p>
              </div>
            </div>
          )}
        </>
      )}
    </PageShell>
  );
}
