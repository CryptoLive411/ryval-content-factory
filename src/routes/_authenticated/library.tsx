import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Loader2, Send, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES, PLATFORMS, STATUSES, statusColor } from "@/lib/ryval";
import {
  exportPostForTikTok,
} from "@/lib/tiktok-export";
import { RenderedSlides } from "@/components/rendered-slides";
import { renderPostSlides } from "@/lib/render.functions";
import { TikTokComposeDialog } from "@/components/tiktok-compose-dialog";
import { SANDBOX_PRIVACY, privacyLabel } from "@/lib/tiktok-privacy";
import { queryTikTokCreatorInfo } from "@/lib/tiktok.functions";
import { editorialTitle } from "@/lib/content-quality";
import { cn } from "@/lib/utils";
import { schoolLogoFromNotes } from "@/lib/school-logo";
import { fanoutLines, outboundWhen, schoolNameFromNotes } from "@/lib/outbound";

export const Route = createFileRoute("/_authenticated/library")({ component: Library });

/** Coerce empty-string sparse slots from DB back to null for preview/export. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePost(p: any): any {
  const bgs = Array.isArray(p.bg_images)
    ? (p.bg_images as string[]).map((u) => (u && u.length ? u : null))
    : [];
  return {
    ...p,
    bg_images: bgs,
    school_logo_url: p.school_logo_url || schoolLogoFromNotes(p.notes),
  };
}

function Library() {
  const qc = useQueryClient();
  const renderFn = useServerFn(renderPostSlides);
  const [filters, setFilters] = useState({ category: "all", platform: "all", status: "all" });
  const [open, setOpen] = useState<string | null>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["posts", filters],
    queryFn: async () => {
      let q = supabase.from("posts").select("*");
      q =
        filters.status === "scheduled"
          ? q.order("scheduled_date", { ascending: true })
          : q.order("created_at", { ascending: false });
      if (filters.category !== "all") q = q.eq("category", filters.category as never);
      if (filters.platform !== "all") q = q.eq("platform", filters.platform as never);
      if (filters.status !== "all") q = q.eq("status", filters.status as never);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((p) => normalizePost(p as never));
    },
  });

  const update = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { id, created_at, updated_at, user_id, ...patch } = row;
      // Persist sparse bg_images as strings
      if (Array.isArray(patch.bg_images)) {
        patch.bg_images = (patch.bg_images as (string | null)[]).map((u) => u ?? "");
      }
      const { error } = await supabase
        .from("posts")
        .update(patch as never)
        .eq("id", id as string);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Saved");
      setOpen(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Deleted");
      setOpen(null);
    },
  });

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [composePost, setComposePost] = useState<Record<string, unknown> | null>(null);

  const downloadPost = async (p: Record<string, unknown>, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDownloadingId(p.id as string);
    try {
      const slug =
        (editorialTitle(p.hook as string) || `post-${String(p.id).slice(0, 6)}`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40) || `post-${String(p.id).slice(0, 6)}`;
      await exportPostForTikTok({
        post: p as never,
        caption: (p.caption as string) ?? "",
        hashtags: (p.hashtags as string) ?? "",
        filenameBase: slug,
      });
      toast.success("TikTok pack downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const editing = posts.find((p) => p.id === open);

  return (
    <PageShell>
      <PageHeader
        title="Post Library"
        subtitle={`${posts.length} posts · approve, schedule, or post to TikTok`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">TikTok settings</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <FilterSelect
          label="Category"
          value={filters.category}
          onChange={(v: string) => setFilters((f) => ({ ...f, category: v }))}
          options={CATEGORIES as never}
        />
        <FilterSelect
          label="Platform"
          value={filters.platform}
          onChange={(v: string) => setFilters((f) => ({ ...f, platform: v }))}
          options={PLATFORMS as never}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v: string) => setFilters((f) => ({ ...f, status: v }))}
          options={STATUSES as never}
        />

        <Button
          variant="outline"
          onClick={() => setFilters({ category: "all", platform: "all", status: "all" })}
        >
          Reset
        </Button>
      </div>
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/30">
            <tr>
              <th className="text-left p-3">Hook</th>
              <th className="text-left p-3">Goes out</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">TikTok</th>
              <th className="text-left p-3">Created</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr
                key={p.id as string}
                onClick={() => setOpen(p.id as string)}
                className="border-t border-border hover:bg-accent/40 cursor-pointer"
              >
                <td className="p-3 max-w-md">
                  <div className="flex items-center gap-3 min-w-0">
                    {((p.export_slide_urls as string[] | null) ?? []).find((u) => u?.startsWith("http")) ? (
                      <img
                        src={((p.export_slide_urls as string[]) ?? []).find((u) => u?.startsWith("http"))}
                        alt=""
                        className="h-12 w-9 rounded object-cover bg-muted shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{editorialTitle(p.hook as string)}</p>
                      <p className="text-xs text-muted-foreground truncate capitalize">
                        {schoolNameFromNotes(p.notes as string) || String(p.category ?? "").replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground whitespace-nowrap">
                  {p.scheduled_date ? outboundWhen(p.scheduled_date as string) : "—"}
                </td>
                <td className="p-3">
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs border",
                      statusColor(p.status as string),
                    )}
                  >
                    {p.status as string}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {fanoutLines(p.notes as string).length
                    ? fanoutLines(p.notes as string)
                        .map((row) => row.name)
                        .join(", ")
                    : (p.tiktok_status as string) || "—"}
                </td>
                <td className="p-3 text-muted-foreground">
                  {new Date(p.created_at as string).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <Button
                      size="sm"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          let urls = ((p.export_slide_urls as string[] | null) ?? []).filter(
                            (u) => u?.startsWith("http") && !/\.mp4(\?|#|$)/i.test(u),
                          );
                          if (urls.length < 1) {
                            urls = (await renderFn({ data: { postId: p.id as string } })).urls;
                          }
                          setComposePost({ ...p, export_slide_urls: urls });
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Could not prepare TikTok post");
                        }
                      }}
                    >
                      <Send className="size-3 mr-1.5" />
                      Post
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadingId === p.id}
                      onClick={(e) => downloadPost(p, e)}
                    >
                      {downloadingId === p.id ? (
                        <Loader2 className="size-3 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="size-3 mr-1.5" />
                      )}
                      Pack
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!posts.length && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  No posts yet. Head to Generate.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>
          {editing && (
            <PostEditor
              post={editing}
              onSave={update.mutate}
              onDelete={() => del.mutate(editing.id as string)}
              onDownload={() => downloadPost(editing)}
              downloading={downloadingId === editing.id}
              onSaved={() => qc.invalidateQueries({ queryKey: ["posts"] })}
              onPostTikTok={(row) => setComposePost(row)}
            />
          )}
        </DialogContent>
      </Dialog>
      <TikTokComposeDialog
        open={!!composePost}
        onOpenChange={(v) => !v && setComposePost(null)}
        post={
          composePost
            ? {
                id: composePost.id as string,
                hook: composePost.hook as string | null,
                caption: composePost.caption as string | null,
                hashtags: composePost.hashtags as string | null,
                export_slide_urls: composePost.export_slide_urls as string[] | null,
              }
            : null
        }
        photoUrls={(composePost?.export_slide_urls as string[] | undefined) ?? undefined}
        onPublished={() => qc.invalidateQueries({ queryKey: ["posts"] })}
      />
    </PageShell>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PostEditor({
  post,
  onSave,
  onDelete,
  onDownload,
  downloading,
  onSaved,
  onPostTikTok,
}: {
  post: Record<string, unknown>;
  onSave: (p: Record<string, unknown>) => void;
  onDelete: () => void;
  onDownload: () => void;
  downloading: boolean;
  onSaved: () => void;
  onPostTikTok: (p: Record<string, unknown>) => void;
}) {
  const [p, setP] = useState(post);
  const creatorFn = useServerFn(queryTikTokCreatorInfo);
  const renderFn = useServerFn(renderPostSlides);
  const [privacy, setPrivacy] = useState("");
  const [privacyOpts, setPrivacyOpts] = useState<string[]>([SANDBOX_PRIVACY]);
  const [busy, setBusy] = useState<"publish" | "schedule" | "export" | null>(null);

  const f = (k: string) => (e: { target?: { value: string } } | string) =>
    setP({ ...p, [k]: typeof e === "string" ? e : e.target ? e.target.value : e });

  const ensureExportUrls = async (): Promise<string[]> => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");
    setBusy("export");
    const { urls } = await renderFn({
      data: {
        postId: p.id as string,
        draft: {
          hook: String(p.hook ?? ""),
          slide_2: String(p.slide_2 ?? ""),
          slide_3: String(p.slide_3 ?? ""),
          slide_4: String(p.slide_4 ?? ""),
          slide_5: String(p.slide_5 ?? ""),
          slide_6: String(p.slide_6 ?? ""),
          cta: String(p.cta ?? ""),
        },
      },
    });
    setP({ ...p, export_slide_urls: urls });
    return urls;
  };

  const loadPrivacy = async () => {
    try {
      const info = await creatorFn();
      const opts = info.privacy_level_options?.length
        ? info.privacy_level_options
        : ["SELF_ONLY"];
      setPrivacyOpts(opts);
      setPrivacy((prev) => (prev && opts.includes(prev) ? prev : ""));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connect TikTok in Settings first");
    }
  };

  const postNow = async () => {
    try {
      setBusy("export");
      const urls = await ensureExportUrls();
      onPostTikTok({ ...p, export_slide_urls: urls });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not prepare TikTok post");
    } finally {
      setBusy(null);
    }
  };

  const schedule = async () => {
    if (!p.scheduled_date) {
      toast.error("Pick a scheduled date/time first");
      return;
    }
    try {
      setBusy("schedule");
      await ensureExportUrls();
      await loadPrivacy();
      const { error } = await supabase
        .from("posts")
        .update({
          status: "scheduled",
          scheduled_date: p.scheduled_date as string,
          tiktok_privacy_level: privacy || SANDBOX_PRIVACY,
        })
        .eq("id", p.id as string);
      if (error) throw error;

      // Link planner slot for the day
      const d = new Date(p.scheduled_date as string);
      const planDate = d.toISOString().slice(0, 10);
      const planTime = d.toISOString().slice(11, 16);
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase.from("planner_entries").insert({
          user_id: auth.user.id,
          plan_date: planDate,
          plan_time: planTime,
          post_id: p.id as string,
          platform: (p.platform as never) ?? "tiktok",
          account: (p.account as never) ?? null,
          status: "scheduled",
        });
      }

      toast.success("Scheduled — cron will publish when due");
      setP({ ...p, status: "scheduled", tiktok_privacy_level: privacy });
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <RenderedSlides
        post={p as Record<string, unknown>}
        onRendered={(urls) => setP({ ...p, export_slide_urls: urls })}
      />
      {(["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6", "cta"] as const).map(
        (k) => (
          <div key={k}>
            <Label className="capitalize text-xs">{k.replace("_", " ")}</Label>
            <Input value={(p[k] as string) ?? ""} onChange={f(k)} />
          </div>
        ),
      )}
      <div>
        <Label className="text-xs">Caption</Label>
        <Textarea value={(p.caption as string) ?? ""} onChange={f("caption")} />
      </div>
      <div>
        <Label className="text-xs">Hashtags</Label>
        <Input value={(p.hashtags as string) ?? ""} onChange={f("hashtags")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={p.status as string} onValueChange={(v) => setP({ ...p, status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Scheduled date</Label>
          <Input
            type="datetime-local"
            value={
              p.scheduled_date
                ? new Date(p.scheduled_date as string).toISOString().slice(0, 16)
                : ""
            }
            onChange={(e) =>
              setP({
                ...p,
                scheduled_date: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : null,
              })
            }
          />
        </div>
      </div>

      <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium">TikTok photo carousel</p>
          <Select value={privacy || undefined} onValueChange={setPrivacy} onOpenChange={(o) => o && loadPrivacy()}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select visibility" />
            </SelectTrigger>
            <SelectContent>
              {privacyOpts.map((o) => (
                <SelectItem key={o} value={o}>
                  {privacyLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(p.tiktok_error as string) && (
          <p className="text-xs text-destructive">{p.tiktok_error as string}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={postNow}
            disabled={!!busy}
            className="bg-gradient-primary text-primary-foreground"
          >
            {busy === "publish" || busy === "export" ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Send className="size-3.5 mr-1.5" />
            )}
            Post to TikTok now
          </Button>
          <Button size="sm" variant="outline" onClick={schedule} disabled={!!busy}>
            {busy === "schedule" ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <CalendarClock className="size-3.5 mr-1.5" />
            )}
            Schedule
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea value={(p.notes as string) ?? ""} onChange={f("notes")} />
      </div>
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <Button variant="destructive" onClick={onDelete}>
          Delete
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDownload} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Download className="size-4 mr-1.5" />
            )}
            TikTok pack
          </Button>
          <Button
            onClick={() => onSave(p)}
            className="bg-gradient-primary text-primary-foreground font-semibold"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
