import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Loader2, Download, Send, Search, X } from "lucide-react";
import { generatePosts, generateBackground } from "@/lib/generate.functions";
import { generateSchoolSpotlight, searchCollegeSchools } from "@/lib/school.functions";
import type { Database } from "@/integrations/supabase/types";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { editorialTitle } from "@/lib/content-quality";
import { inferPhotoGender, isGenericCampusPhoto, pickStockPhoto } from "@/lib/stock-photos";
import { proxiedSchoolLogo } from "@/lib/school-logo";
import {
  exportPostForTikTok,
  renderPostSlideBlobs,
  renderPostSlideUrls,
  uploadExportSlides,
} from "@/lib/tiktok-export";
import { supabase } from "@/integrations/supabase/client";
import { getTikTokPublishReady } from "@/lib/tiktok.functions";
import { TikTokComposeDialog } from "@/components/tiktok-compose-dialog";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/generate")({ component: Generate });

type DbEnums = Database["public"]["Enums"];
type ImageEngine = "stock" | "stick" | "openai";

type FormState = {
  slidesPerPost: number;
  platform: DbEnums["platform"];
  account: DbEnums["account"];
  audience: DbEnums["audience"];
  category: DbEnums["category"];
  tone: string;
  ctaType: string;
  includeAppScreen: boolean;
  promptTemplateId: string;
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
  photo_exclude_ids?: string[];
  photo_gender?: "women" | "men" | "neutral";
  cta_bg_url?: string | null;
  fact_lane?: string;
  notes?: string | null;
  school_logo_url?: string | null;
  fact_source?: string | null;
};

type SchoolHit = {
  id: string;
  name: string;
  shortName: string;
  nickname: string;
  association: string;
  division: string;
  city: string;
  state: string;
  logoUrl: string;
};

type SelectOption = { value: string; label: string } | string;
type SelectKey = Exclude<keyof FormState, "includeAppScreen" | "promptTemplateId">;

function schoolMeta(s: Pick<SchoolHit, "association" | "division" | "city" | "state">) {
  const div = s.division ? ` ${s.division.replace("Division ", "D")}` : "";
  const loc = [s.city, s.state].filter(Boolean).join(", ");
  return `${s.association}${div}${loc ? ` · ${loc}` : ""}`;
}

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

/** Persist sparse bg array — empty string for missing slots so Postgres text[] keeps index alignment. */
function sparseBgForDb(bgs: (string | null)[]): string[] {
  return bgs.map((u) => u ?? "");
}

function SaveableSlideGallery({
  post,
  scope,
}: {
  post: GeneratedPost;
  scope?: RefObject<HTMLDivElement | null>;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);
  const bgsKey = (post.bg_images ?? []).join("|");

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    setRendering(true);
    renderPostSlideUrls(post, scope?.current)
      .then((next) => {
        if (cancelled) {
          next.forEach((u) => URL.revokeObjectURL(u));
          return;
        }
        created.push(...next);
        setUrls(next);
      })
      .catch((e) => console.error("slide render failed", e))
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgsKey, post.cta, post.app_screen_url, post.logo_url, post.cta_type, post.school_logo_url]);

  const slug =
    (editorialTitle(post.hook) || "post")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "post";

  if (rendering && urls.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Preparing saveable slides…
      </div>
    );
  }
  if (urls.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-semibold">Save individual slides</h4>
        <span className="text-[11px] text-muted-foreground">
          Long-press on mobile to save · tap to download
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {urls.map((u, i) => (
          <a
            key={u}
            href={u}
            download={`${slug}-slide-${String(i + 1).padStart(2, "0")}.png`}
            className="block aspect-[4/5] rounded-lg overflow-hidden border border-border bg-[#05080f] active:opacity-80"
          >
            <img
              src={u}
              alt={`Slide ${i + 1}`}
              className="w-full h-full object-cover select-none"
              draggable={false}
              style={{ WebkitTouchCallout: "default" } as React.CSSProperties}
            />
          </a>
        ))}
      </div>
    </div>
  );
}

function RyvalDraftCard({ post }: { post: GeneratedPost }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const onDownload = async () => {
    setBusy(true);
    try {
      const slug =
        (editorialTitle(post.hook) || "post")
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
  const slidesReady = (post.bg_images ?? []).some(Boolean);
  return (
    <div ref={ref} className="min-w-0 rounded-xl border border-border bg-gradient-card p-5">
      <div className="flex justify-between items-baseline mb-4 gap-3">
        <h3 className="font-bold text-lg text-balance flex-1">{editorialTitle(post.hook)}</h3>
        <Button size="sm" variant="outline" onClick={onDownload} disabled={busy}>
          {busy ? (
            <Loader2 className="size-3 mr-1.5 animate-spin" />
          ) : (
            <Download className="size-3 mr-1.5" />
          )}
          Download ZIP
        </Button>
      </div>
      <CarouselPreview post={post} />
      {slidesReady && <SaveableSlideGallery post={post} scope={ref} />}
      <div className="mt-4 text-sm text-muted-foreground space-y-1">
        <p>
          <span className="text-foreground font-medium">Caption:</span> {post.caption}
        </p>
        <p className="text-primary">{post.hashtags}</p>
        {post.fact_source ? (
          <p>
            <span className="text-foreground font-medium">Source:</span>{" "}
            <a href={post.fact_source} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {post.fact_source.replace(/^https?:\/\//, "").slice(0, 72)}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Generate() {
  const generate = useServerFn(generatePosts);
  const generateSchool = useServerFn(generateSchoolSpotlight);
  const searchSchoolsFn = useServerFn(searchCollegeSchools);
  const genBg = useServerFn(generateBackground);
  const readyFn = useServerFn(getTikTokPublishReady);

  const [imageEngine, setImageEngine] = useState<ImageEngine>("stock");
  const [autoPost, setAutoPost] = useState(true);
  const [mode, setMode] = useState<"pathway" | "school">("pathway");
  const [schoolQ, setSchoolQ] = useState("");
  const [schoolQDebounced, setSchoolQDebounced] = useState("");
  const [pickedSchool, setPickedSchool] = useState<SchoolHit | null>(null);
  const [schoolSport, setSchoolSport] = useState<"men" | "women">("men");
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const [exportUrls, setExportUrls] = useState<string[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    slidesPerPost: 6,
    platform: "tiktok",
    account: "recruiting_truth",
    audience: "players",
    category: "harsh_truths",
    tone: "direct",
    ctaType: "download app",
    includeAppScreen: true,
    promptTemplateId: "default",
  });
  const [ryvalPost, setRyvalPost] = useState<GeneratedPost | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setSchoolQDebounced(schoolQ), 220);
    return () => window.clearTimeout(t);
  }, [schoolQ]);

  const { data: schoolSearch } = useQuery({
    queryKey: ["college-schools", schoolQDebounced],
    queryFn: () => searchSchoolsFn({ data: { q: schoolQDebounced } }),
    staleTime: 60_000,
    enabled: mode === "school",
  });

  const { data: tiktokReady } = useQuery({
    queryKey: ["tiktok-ready"],
    queryFn: () => readyFn(),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: prompts = [] } = useQuery({
    queryKey: ["prompts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ryvalMut = useMutation({
    mutationFn: async () => {
      setRyvalPost(null);
      setSavedPostId(null);

      const { count } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });
      const variantIndex = count ?? 0;

      const selectedPrompt =
        form.promptTemplateId !== "default"
          ? prompts.find((p) => p.id === form.promptTemplateId)?.prompt_text
          : undefined;

      const r =
        mode === "school" && pickedSchool
          ? await generateSchool({
              data: {
                schoolId: pickedSchool.id,
                sport: schoolSport,
                slidesPerPost: form.slidesPerPost,
              },
            })
          : await generate({
              data: {
                slidesPerPost: form.slidesPerPost,
                platform: form.platform,
                account: form.account,
                audience: form.audience,
                category: form.category,
                tone: form.tone,
                ctaType: form.ctaType,
                includeAppScreen: form.includeAppScreen,
                count: 1,
                variantIndex,
                promptOverride: selectedPrompt,
              },
            });
      const post: GeneratedPost = {
        ...r.posts[0],
        cta_type: form.ctaType,
        school_logo_url:
          (r.posts[0] as GeneratedPost).school_logo_url ?? pickedSchool?.logoUrl ?? null,
      };
      setRyvalPost(post);
      toast.success("Draft ready — attaching photos…");

      const promptsList = (post.slide_image_prompts ?? []) as string[];
      const slideTexts = [
        post.hook,
        post.slide_2,
        post.slide_3,
        post.slide_4,
        post.slide_5,
        post.slide_6,
        post.cta,
      ];
      const bgs: (string | null)[] = [...(post.bg_images ?? [])];
      const historyIds = [...(post.photo_exclude_ids ?? [])];
      const usedInPost: string[] = [];
      const lockedGender = post.photo_gender ?? inferPhotoGender(...slideTexts);
      let fails = 0;
      for (let i = 0; i < 6; i++) {
        if (!slideTexts[i]) {
          bgs[i] = bgs[i] ?? null;
          continue;
        }
        if (imageEngine === "stock") {
          const existing = bgs[i];
          const keepAssigned =
            !!existing &&
            !existing.startsWith("data:") &&
            (mode === "school"
              ? !isGenericCampusPhoto(existing)
              : existing.includes("unsplash") ||
                existing.includes("/stock/") ||
                existing.includes("/api/stock/") ||
                existing.includes("/api/school-logo") ||
                existing.includes("wikimedia") ||
                existing.includes("ncaa.com") ||
                existing.includes("/cta-bg/"));
          if (keepAssigned) {
            const pickedId = existing.match(/(\d{10,}-[a-z0-9]+)/i)?.[1];
            if (pickedId) usedInPost.push(pickedId);
            bgs[i] = existing.includes("/api/stock/")
              ? `/stock/${pickedId}.jpg`
              : existing;
            continue;
          }
          if (mode === "school") {
            const campus = bgs.filter((url) => url && !isGenericCampusPhoto(url));
            bgs[i] = campus.length ? campus[i % campus.length]! : "";
            setRyvalPost((prev) => {
              if (!prev) return prev;
              const next = [...(prev.bg_images ?? [])];
              next[i] = bgs[i];
              return { ...prev, bg_images: next };
            });
            continue;
          }
          const picked = pickStockPhoto(
            [promptsList[i], slideTexts[i]].filter(Boolean).join(". "),
            variantIndex * 17 + i,
            [...historyIds, ...usedInPost],
            lockedGender === "neutral"
              ? inferPhotoGender(promptsList[i], slideTexts[i])
              : lockedGender,
            usedInPost,
          );
          usedInPost.push(picked.photoId);
          bgs[i] = picked.url;
          setRyvalPost((prev) => {
            if (!prev) return prev;
            const next = [...(prev.bg_images ?? [])];
            next[i] = picked.url;
            return { ...prev, bg_images: next };
          });
          continue;
        }
        const prompt = promptsList[i];
        if (!prompt) {
          bgs[i] = bgs[i] ?? null;
          continue;
        }
        try {
          const { url, photoId } = await withRetry(
            () =>
              genBg({
                data: {
                  prompt: [prompt, slideTexts[i]].filter(Boolean).join(". "),
                  model: imageEngine,
                  stylePreset: imageEngine === "stick" ? "stick" : "ryval",
                  salt: variantIndex * 17 + i,
                  excludeIds: [...historyIds, ...usedInPost],
                  hardExcludeIds: usedInPost,
                  gender: lockedGender === "neutral" ? inferPhotoGender(prompt, slideTexts[i]) : lockedGender,
                },
              }),
            3,
          );
          if (photoId) usedInPost.push(photoId);
          bgs[i] = url;
          setRyvalPost((prev) => {
            if (!prev) return prev;
            const next = [...(prev.bg_images ?? [])];
            next[i] = url;
            return { ...prev, bg_images: next };
          });
        } catch (e) {
          fails++;
          if (mode === "school") {
            const campus = bgs.filter((url) => url && !isGenericCampusPhoto(url));
            bgs[i] = campus.length ? campus[i % campus.length]! : "";
            setRyvalPost((prev) => {
              if (!prev) return prev;
              const next = [...(prev.bg_images ?? [])];
              next[i] = bgs[i];
              return { ...prev, bg_images: next };
            });
            continue;
          }
          const picked = pickStockPhoto(
            [prompt, slideTexts[i]].filter(Boolean).join(". "),
            variantIndex * 17 + i,
            [...historyIds, ...usedInPost],
            lockedGender === "neutral" ? inferPhotoGender(prompt, slideTexts[i]) : lockedGender,
            usedInPost,
          );
          if (picked.photoId) usedInPost.push(picked.photoId);
          bgs[i] = picked.url;
          setRyvalPost((prev) => {
            if (!prev) return prev;
            const next = [...(prev.bg_images ?? [])];
            next[i] = picked.url;
            return { ...prev, bg_images: next };
          });
          console.error("bg gen failed, used stock URL", i, e);
        }
      }
      if (post.cta_bg_url) {
        bgs[6] = post.cta_bg_url;
        setRyvalPost((prev) => {
          if (!prev) return prev;
          const next = [...(prev.bg_images ?? [])];
          next[6] = post.cta_bg_url ?? null;
          return { ...prev, bg_images: next, cta_bg_url: post.cta_bg_url };
        });
      }
      setRyvalPost((prev) => (prev ? { ...prev, bg_images: bgs } : prev));
      if (fails > 0)
        toast.error(`${fails} image(s) failed — used soccer stock photos so slides stay aligned.`);
      else toast.success("Photos attached.");

      try {
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          const sparse = sparseBgForDb(bgs);
          const { data: inserted, error } = await supabase
            .from("posts")
            .insert({
              user_id: auth.user.id,
              hook: post.hook ?? "",
              slide_2: post.slide_2 ?? "",
              slide_3: post.slide_3 ?? "",
              slide_4: post.slide_4 ?? "",
              slide_5: post.slide_5 ?? "",
              slide_6: post.slide_6 ?? "",
              cta: post.cta ?? "",
              caption: post.caption ?? "",
              hashtags: post.hashtags ?? "",
              cta_type: form.ctaType,
              platform: form.platform,
              account: form.account,
              audience: form.audience,
              category: form.category,
              tone: form.tone,
              status: "idea",
              bg_images: sparse,
              logo_url: post.logo_url ?? null,
              app_screen_url: post.app_screen_url ?? null,
              bg_image_url: bgs.find((u) => !!u && !u.startsWith("data:")) ?? null,
              notes: post.notes ?? (post.fact_lane ? `lane:${post.fact_lane}` : null),
            })
            .select("id")
            .single();
          if (error) throw error;

          // Pre-render composed slides for TikTok schedule/publish
          if (inserted?.id) {
            try {
              const fullPost = { ...post, bg_images: bgs, cta_type: form.ctaType };
              const blobs = await renderPostSlideBlobs(fullPost);
              const exportUrls = await uploadExportSlides({
                supabase,
                userId: auth.user.id,
                postId: inserted.id,
                blobs,
              });
              await supabase
                .from("posts")
                .update({ export_slide_urls: exportUrls })
                .eq("id", inserted.id);
              setSavedPostId(inserted.id);
              setExportUrls(exportUrls);
              if (autoPost && exportUrls.length >= 2 && tiktokReady?.connected && !tiktokReady.postCapped) {
                setComposeOpen(true);
              }
            } catch (exportErr) {
              console.warn("export slide upload skipped", exportErr);
            }
          }
          toast.success("Saved to library");
        }
      } catch (e) {
        console.error("save failed", e);
        toast.error("Could not save to library");
      }
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
      <PageHeader
        title="Generate"
        subtitle={
          mode === "school"
            ? "Real crests. Sourced season records. One school per post."
            : "One post at a time. Premium output, every render."
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "pathway" ? "default" : "outline"}
          onClick={() => setMode("pathway")}
        >
          Recruiting facts
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "school" ? "default" : "outline"}
          onClick={() => setMode("school")}
        >
          School spotlight
        </Button>
      </div>

      {mode === "school" && (
        <div className="mb-6 rounded-xl border border-border bg-gradient-card p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 min-w-[240px] flex-1">
              <Label>School — NCAA, NAIA, NJCAA</Label>
              {pickedSchool ? (
                <div className="flex items-center gap-3 h-10 px-3 rounded-md border border-input bg-input">
                  {pickedSchool.logoUrl ? (
                    <img
                      src={proxiedSchoolLogo(pickedSchool.logoUrl) ?? pickedSchool.logoUrl}
                      alt=""
                      className="h-7 w-7 object-contain"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{pickedSchool.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{schoolMeta(pickedSchool)}</p>
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setPickedSchool(null)}
                    aria-label="Clear school"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={schoolQ}
                    onChange={(e) => setSchoolQ(e.target.value)}
                    placeholder="Search Stanford, UNC, Odessa College…"
                    className="pl-9"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2 w-[200px]">
              <Label>Soccer</Label>
              <Select value={schoolSport} onValueChange={(v) => setSchoolSport(v as "men" | "women")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="men">Men's soccer</SelectItem>
                  <SelectItem value="women">Women's soccer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {!pickedSchool && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {(schoolSearch?.schools ?? []).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setPickedSchool(s);
                    setSchoolQ("");
                  }}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background/60 px-3 py-2 text-left hover:border-primary/50"
                >
                  {s.logoUrl ? (
                    <img
                      src={proxiedSchoolLogo(s.logoUrl) ?? s.logoUrl}
                      alt=""
                      className="h-8 w-8 object-contain shrink-0"
                    />
                  ) : (
                    <span className="h-8 w-8 shrink-0 rounded bg-muted" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{s.shortName || s.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{schoolMeta(s)}</span>
                  </span>
                </button>
              ))}
              {schoolSearch && schoolSearch.schools.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">No schools matched that search.</p>
              ) : null}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {schoolSearch?.total?.toLocaleString() ?? "1,900+"} programs from Ryval. Live W–L and player
            leaders come from NCAA.com this week. Wikipedia is history only. Each slide uses a photo
            that matches the text — stadium/facilities for campus copy, match photos for records. If
            nothing relevant turns up, we use a cinematic pitch or ball shot, never an old portrait.
          </p>
        </div>
      )}

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
              <SelectItem value="stock">Real soccer photos — default</SelectItem>
              <SelectItem value="stick">Stick-figure comics — entertaining</SelectItem>
              <SelectItem value="openai">AI photo (color only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prompt template</Label>
          <Select
            value={form.promptTemplateId}
            onValueChange={(v) => setForm((f) => ({ ...f, promptTemplateId: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Built-in brand voice</SelectItem>
              {prompts.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
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
        <div className="space-y-2">
          <Label>Post to TikTok after generate</Label>
          <div className="h-10 flex items-center gap-3 px-3 rounded-md border border-input bg-input">
            <Switch checked={autoPost} onCheckedChange={setAutoPost} />
            <span className="text-sm text-muted-foreground">
              {autoPost
                ? "Open TikTok composer after generate"
                : "Save only"}
            </span>
          </div>
        </div>
      </div>

      {tiktokReady && !tiktokReady.connected && (
        <p className="text-sm text-muted-foreground mb-4">
          TikTok is not connected.{" "}
          <Link to="/settings" className="text-primary underline underline-offset-2">
            Connect in Settings
          </Link>{" "}
          so auto-post can run.
        </p>
      )}
      {tiktokReady?.connected && (
        <p className="text-sm text-muted-foreground mb-4">
          TikTok connected
          {tiktokReady.accounts?.length
            ? ` (${tiktokReady.accounts.length} account${tiktokReady.accounts.length === 1 ? "" : "s"})`
            : tiktokReady.displayName
              ? ` as ${tiktokReady.displayName}`
              : ""}
          . Until audit, choose Only me and keep each TikTok account Private.
          {tiktokReady.postCapped ? (
            <span className="block text-destructive mt-1">
              Every connected TikTok hit the 24-hour API post cap. Generate still works — posting
              resumes tomorrow, or connect another account in Settings.
            </span>
          ) : null}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
      <Button
        onClick={() => ryvalMut.mutate()}
        disabled={ryvalMut.isPending || (mode === "school" && !pickedSchool)}
        className="bg-gradient-primary text-primary-foreground font-semibold"
      >
        {ryvalMut.isPending ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Sparkles className="size-4 mr-2" />{" "}
            {mode === "school" ? "Generate school post" : "Generate 1 Post"}
          </>
        )}
      </Button>
      {savedPostId && (
        <Button variant="outline" onClick={() => setComposeOpen(true)}>
          <Send className="size-4 mr-2" />
          Post this to TikTok now
        </Button>
      )}
      </div>
      <TikTokComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        post={
          savedPostId && ryvalPost
            ? {
                id: savedPostId,
                hook: ryvalPost.hook,
                caption: ryvalPost.caption,
                hashtags: ryvalPost.hashtags,
                export_slide_urls: exportUrls,
              }
            : savedPostId
              ? { id: savedPostId, export_slide_urls: exportUrls }
              : null
        }
        photoUrls={exportUrls}
        displayName={tiktokReady?.displayName}
      />
      {ryvalPost && (
        <div className="mt-8">
          <RyvalDraftCard post={ryvalPost} />
        </div>
      )}
    </PageShell>
  );
}
