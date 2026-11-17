import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getTikTokConnection,
  queryTikTokCreatorInfo,
  tiktokPublishPhotoPost,
  TIKTOK_POST_CAP_MSG,
} from "@/lib/tiktok.functions";
import type { TikTokCreatorInfo } from "@/lib/tiktok.functions";
import { privacyLabel, SANDBOX_PRIVACY } from "@/lib/tiktok-privacy";
import { editorialTitle } from "@/lib/content-quality";

export type TikTokComposePost = {
  id: string;
  hook?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  export_slide_urls?: string[] | null;
};

export function TikTokComposeDialog({
  open,
  onOpenChange,
  post,
  photoUrls,
  displayName,
  onPublished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: TikTokComposePost | null;
  photoUrls?: string[];
  displayName?: string | null;
  onPublished?: () => void;
}) {
  const creatorFn = useServerFn(queryTikTokCreatorInfo);
  const publishFn = useServerFn(tiktokPublishPhotoPost);
  const connFn = useServerFn(getTikTokConnection);

  const [accounts, setAccounts] = useState<
    { id: string; display_name: string | null; avatar_url: string | null }[]
  >([]);
  const [accountId, setAccountId] = useState<string>("");
  const [creator, setCreator] = useState<TikTokCreatorInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [allowComment, setAllowComment] = useState(false);
  const [musicOk, setMusicOk] = useState(false);
  const [disclose, setDisclose] = useState(false);
  const [yourBrand, setYourBrand] = useState(false);
  const [branded, setBranded] = useState(false);

  const urls = useMemo(() => {
    const list = (photoUrls?.length ? photoUrls : post?.export_slide_urls ?? []).filter(
      (u): u is string => Boolean(u) && u.startsWith("http") && !/\.mp4(\?|#|$)/i.test(u),
    );
    return list.slice(0, 35);
  }, [photoUrls, post]);

  const privacyOpts = creator?.privacy_level_options?.length
    ? creator.privacy_level_options
    : [SANDBOX_PRIVACY];
  const commentLocked = Boolean(creator?.comment_disabled);
  const canPost = creator?.can_post !== false;
  const brandedBlocked = privacy === SANDBOX_PRIVACY;
  const commercialIncomplete = disclose && !yourBrand && !branded;
  const consentText = branded
    ? "By posting, you agree to TikTok's Branded Content Policy and Music Usage Confirmation"
    : "By posting, you agree to TikTok's Music Usage Confirmation";

  useEffect(() => {
    if (!open || !post) return;
    setTitle(editorialTitle(post.hook) || "");
    setDescription([post.caption ?? "", post.hashtags ?? ""].filter(Boolean).join("\n\n"));
    setPrivacy("");
    setAllowComment(false);
    setMusicOk(false);
    setDisclose(false);
    setYourBrand(false);
    setBranded(false);
    setCreator(null);
    setLoadError(null);
    setAccounts([]);
    setAccountId("");
    setLoading(true);
    connFn()
      .then((conn) => {
        const list = (conn.accounts ?? []).map((row) => ({
          id: row.id,
          display_name: row.display_name,
          avatar_url: row.avatar_url,
        }));
        setAccounts(list);
        setAccountId(list[0]?.id ?? "");
        if (!list[0]) {
          setLoading(false);
          setLoadError("Connect TikTok in Settings first.");
        }
      })
      .catch(() => {
        setAccounts([]);
        setAccountId("");
        setLoading(false);
        setLoadError("Could not load connected TikTok accounts");
      });
  }, [open, post?.id]);

  useEffect(() => {
    if (!open || !post || !accountId) return;
    let cancelled = false;
    setLoading(true);
    setCreator(null);
    setLoadError(null);
    setPrivacy("");
    creatorFn({ data: { accountId } })
      .then((info) => {
        if (cancelled) return;
        setCreator(info);
        if (info.postCapped || info.can_post === false) {
          setLoadError(TIKTOK_POST_CAP_MSG);
        } else if (info.rateLimited) {
          setLoadError("TikTok rate limit — you can still post Only me. Wait ~10 minutes if publish also fails.");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        const selected = accounts.find((row) => row.id === accountId);
        setCreator({
          creator_nickname: selected?.display_name || displayName || "Connected TikTok",
          privacy_level_options: [SANDBOX_PRIVACY],
          can_post: true,
          rateLimited: true,
        });
        setLoadError(
          e instanceof Error && e.message.toLowerCase().includes("rate")
            ? "TikTok rate limit — you can still post Only me. Wait ~10 minutes if publish also fails."
            : e instanceof Error
              ? e.message
              : "Could not load TikTok creator info",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, post?.id, accountId]);

  useEffect(() => {
    if (branded && privacy === SANDBOX_PRIVACY) setPrivacy("");
  }, [branded, privacy]);

  const publishDisabled =
    !post ||
    loading ||
    posting ||
    !canPost ||
    !privacy ||
    !title.trim() ||
    !musicOk ||
    commercialIncomplete ||
    urls.length < 1 ||
    (accounts.length > 0 && !accountId);

  const publish = async () => {
    if (!post || publishDisabled) return;
    try {
      setPosting(true);
      const r = await publishFn({
        data: {
          postId: post.id,
          privacyLevel: privacy,
          photoUrls: urls,
          title: title.trim().slice(0, 90),
          description: description.slice(0, 2200),
          disableComment: commentLocked || !allowComment,
          brandOrganic: disclose && yourBrand,
          brandContent: disclose && branded,
          accountId: accountId || undefined,
        },
      });
      toast.success(
        r.skipped
          ? "Already on TikTok"
          : `Posted to TikTok (${r.status ?? "started"}). It may take a few minutes to appear on the profile.`,
      );
      onOpenChange(false);
      onPublished?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post to TikTok</DialogTitle>
          <DialogDescription>
            Review the slides, choose visibility, then publish. After you post, it may take a few
            minutes for the content to process and be visible on the TikTok profile.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading TikTok creator info…
          </p>
        ) : (
          <div className="space-y-4">
            {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
            {accounts.length > 1 ? (
              <div className="space-y-2">
                <Label>TikTok account</Label>
                <Select value={accountId || undefined} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {row.display_name || "TikTok account"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              {creator?.creator_avatar_url ? (
                <img
                  src={creator.creator_avatar_url}
                  alt=""
                  className="size-10 rounded-full border border-border"
                />
              ) : (
                <div className="size-10 rounded-full bg-primary/20" />
              )}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Posting as</p>
                <p className="font-medium">
                  {creator?.creator_nickname ||
                    creator?.creator_username ||
                    accounts.find((row) => row.id === accountId)?.display_name ||
                    displayName ||
                    "Connected TikTok"}
                </p>
                {creator?.creator_username ? (
                  <p className="text-xs text-muted-foreground">@{creator.creator_username}</p>
                ) : null}
              </div>
            </div>

            {!canPost ? (
              <p className="text-sm text-destructive">{TIKTOK_POST_CAP_MSG}</p>
            ) : null}

            {urls.length ? (
              <div>
                <Label className="text-xs">Preview</Label>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {urls.map((u) => (
                    <img
                      key={u}
                      src={u}
                      alt=""
                      className="h-36 w-auto rounded-md border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive">No exported slides yet. Generate or re-export first.</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="tt-title">Title</Label>
              <Input
                id="tt-title"
                value={title}
                maxLength={90}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tt-desc">Caption</Label>
              <Textarea
                id="tt-desc"
                value={description}
                maxLength={2200}
                rows={4}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Privacy</Label>
              <Select value={privacy || undefined} onValueChange={setPrivacy}>
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility — no default" />
                </SelectTrigger>
                <SelectContent>
                  {privacyOpts.map((o) => {
                    const onlyMeBlocked = branded && o === SANDBOX_PRIVACY;
                    return (
                      <SelectItem key={o} value={o} disabled={onlyMeBlocked}>
                        {privacyLabel(o)}
                        {onlyMeBlocked ? " (branded content cannot be private)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Until TikTok audits this app, choose Only me and keep the TikTok account Private.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allowComment}
                disabled={commentLocked}
                onCheckedChange={(v) => setAllowComment(v === true)}
              />
              Allow comment
              {commentLocked ? (
                <span className="text-xs text-muted-foreground">(disabled in TikTok settings)</span>
              ) : null}
            </label>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Commercial content disclosure</p>
                  <p className="text-xs text-muted-foreground">
                    Indicate whether this content promotes yourself, a brand, product, or service.
                  </p>
                </div>
                <Switch
                  checked={disclose}
                  onCheckedChange={(v) => {
                    setDisclose(v);
                    if (!v) {
                      setYourBrand(false);
                      setBranded(false);
                    }
                  }}
                />
              </div>
              {disclose ? (
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox checked={yourBrand} onCheckedChange={(v) => setYourBrand(v === true)} />
                    <span>
                      Your brand
                      {yourBrand && !branded ? (
                        <span className="block text-xs text-muted-foreground">
                          Your photo will be labeled as &apos;Promotional content&apos;
                        </span>
                      ) : null}
                    </span>
                  </label>
                  <label
                    className="flex items-start gap-2 text-sm"
                    title={brandedBlocked ? "Branded content visibility cannot be set to private." : undefined}
                  >
                    <Checkbox
                      checked={branded}
                      disabled={brandedBlocked}
                      onCheckedChange={(v) => setBranded(v === true)}
                    />
                    <span>
                      Branded content
                      {branded ? (
                        <span className="block text-xs text-muted-foreground">
                          Your photo will be labeled as &apos;Paid partnership&apos;
                        </span>
                      ) : null}
                      {brandedBlocked ? (
                        <span className="block text-xs text-muted-foreground">
                          Branded content visibility cannot be set to private.
                        </span>
                      ) : null}
                    </span>
                  </label>
                  {commercialIncomplete ? (
                    <p className="text-xs text-destructive">
                      You need to indicate if your content promotes yourself, a third party, or both.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={musicOk} onCheckedChange={(v) => setMusicOk(v === true)} />
              <span>{consentText}</span>
            </label>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={publish}
            disabled={publishDisabled}
            className="bg-gradient-primary text-primary-foreground"
          >
            {posting ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
            Post to TikTok
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
