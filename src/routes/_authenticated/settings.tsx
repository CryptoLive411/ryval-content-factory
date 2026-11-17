import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Unplug, Send, Plus, Check, Image, Shuffle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateBackground, generatePosts } from "@/lib/generate.functions";
import { generateSchoolSpotlight } from "@/lib/school.functions";
import {
  fillAutopilotQueue,
  loadAutopilotSettings,
  repairQueuedPostPhotos,
  rewriteQueuedPostTopics,
  saveAutopilotSettings,
} from "@/lib/autopilot-queue";
import {
  disconnectTikTok,
  getTikTokAuthUrl,
  getTikTokConnection,
  getTikTokPublishReady,
  publishMyDueTikTokPosts,
  setActiveTikTokAccount,
} from "@/lib/tiktok.functions";
import { PREFERRED_PRIVACY, SANDBOX_PRIVACY } from "@/lib/tiktok-privacy";

export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });

function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const getAuthUrl = useServerFn(getTikTokAuthUrl);
  const getConn = useServerFn(getTikTokConnection);
  const disconnect = useServerFn(disconnectTikTok);
  const setActive = useServerFn(setActiveTikTokAccount);
  const readyFn = useServerFn(getTikTokPublishReady);
  const publishDue = useServerFn(publishMyDueTikTokPosts);
  const generate = useServerFn(generatePosts);
  const generateSchool = useServerFn(generateSchoolSpotlight);
  const genBg = useServerFn(generateBackground);
  const [queueMsg, setQueueMsg] = useState("");
  const [switchHintOpen, setSwitchHintOpen] = useState(false);

  const { data: conn, isLoading } = useQuery({
    queryKey: ["tiktok-connection"],
    queryFn: () => getConn(),
  });
  const { data: ready } = useQuery({
    queryKey: ["tiktok-ready"],
    queryFn: () => readyFn(),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  const { data: pilot } = useQuery({
    queryKey: ["autopilot", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => loadAutopilotSettings(user!.id),
  });
  const publishDueMut = useMutation({
    mutationFn: () => publishDue(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["tiktok-ready"] });
      if (r.published > 0) toast.success(`Posted ${r.published} due post(s)`);
      else if (r.processed === 0) toast("Nothing due — schedule a post in Library first");
      else toast.error(r.results.find((x) => !x.ok)?.error || "Publish failed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Publish failed"),
  });

  const connectMut = useMutation({
    mutationFn: async () => {
      const { url, codeVerifier } = await getAuthUrl();
      sessionStorage.setItem("tiktok_pkce_verifier", codeVerifier);
      window.location.href = url;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not start TikTok OAuth"),
  });

  const disconnectMut = useMutation({
    mutationFn: (accountId?: string) => disconnect({ data: accountId ? { accountId } : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tiktok-connection"] });
      qc.invalidateQueries({ queryKey: ["tiktok-ready"] });
      toast.success("TikTok disconnected");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Disconnect failed"),
  });

  const setActiveMut = useMutation({
    mutationFn: (accountId: string) => setActive({ data: { accountId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tiktok-connection"] });
      qc.invalidateQueries({ queryKey: ["tiktok-ready"] });
      toast.success("Default TikTok account updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not set default"),
  });

  const accounts = conn?.accounts ?? [];
  const account = accounts[0] ?? conn?.account ?? null;
  const canPublic = Boolean(ready?.canPostPublic);

  const savePilot = useMutation({
    mutationFn: async (patch: Parameters<typeof saveAutopilotSettings>[1]) => {
      if (!user?.id) throw new Error("Sign in first");
      await saveAutopilotSettings(user.id, patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["autopilot"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const fillMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in first");
      const settings = pilot ?? (await loadAutopilotSettings(user.id));
      return fillAutopilotQueue({
        userId: user.id,
        generate: generate as never,
        generateSchool: generateSchool as never,
        genBg: genBg as never,
        intervalHours: settings.autopilot_interval_hours,
        queueHours: settings.autopilot_queue_hours,
        privacy: canPublic ? PREFERRED_PRIVACY : SANDBOX_PRIVACY,
        postsPerInterval: 2,
        onProgress: setQueueMsg,
      });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success(
        r.created
          ? `Queued ${r.created} post${r.created === 1 ? "" : "s"} (2/hour, all TikTok accounts). You can close the laptop.`
          : "Queue already covers that window.",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Queue fill failed"),
  });

  const repairPhotosMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in first");
      return repairQueuedPostPhotos({
        userId: user.id,
        onProgress: setQueueMsg,
      });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success(
        r.repaired
          ? `Added soccer photos to ${r.repaired} queued post${r.repaired === 1 ? "" : "s"}.`
          : "Queued posts already have photos.",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not rebuild photos"),
  });

  const rewriteTopicsMut = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Sign in first");
      return rewriteQueuedPostTopics({
        userId: user.id,
        generate: generate as never,
        onProgress: setQueueMsg,
      });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success(
        r.rewritten
          ? `Rewrote ${r.rewritten} SuperDraft-repeat post${r.rewritten === 1 ? "" : "s"} onto new topics.`
          : "Queued posts already use different topics.",
      );
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not rewrite topics"),
  });

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Account, TikTok publishing, and workspace." />
      <div className="space-y-6 max-w-xl">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Signed in as</p>
            <p className="font-medium mt-1">{user?.email}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div>
            <p className="font-semibold">TikTok Photo Autopost</p>
            <p className="text-sm text-muted-foreground mt-1">
              {ready?.publisher === "publer"
                ? "Publishing through Publer (public TikTok carousels) until the Ryval developer app is approved. Connect each TikTok in Publer → Social Accounts."
                : "Until the TikTok developer app is approved, connect Publer (Business API key) to post publicly. Direct Post stays available as a private-only fallback."}
            </p>
          </div>

          {ready?.publisher === "publer" && ready.publerAccounts?.length ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Publer TikToks</p>
              {ready.publerAccounts.map((row) => (
                <div key={row.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  {row.picture ? (
                    <img src={row.picture} alt="" className="size-10 rounded-full border border-border" />
                  ) : (
                    <div className="size-10 rounded-full bg-primary/20" />
                  )}
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">Public carousels via Publer</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground space-y-2">
              <p>
                {ready?.publisher === "publer"
                  ? "Publer is connected, but no TikTok is unlocked in this workspace yet. Connect the new TikToks in Publer → Social Accounts."
                  : "Until the TikTok developer app is approved, connect Publer Business (API key) to post publicly. In Publer: Settings → API & Webhooks, then connect the TikToks under Social Accounts."}
              </p>
              {ready?.publerError ? <p className="text-destructive">{ready.publerError}</p> : null}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Checking connection…
            </div>
          ) : accounts.length ? (
            <div className="space-y-3">
              {accounts.map((row, index) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 flex-wrap rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {row.avatar_url ? (
                      <img
                        src={row.avatar_url}
                        alt=""
                        className="size-10 rounded-full border border-border"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-primary/20" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {row.display_name || row.open_id}
                        {index === 0 ? (
                          <span className="ml-2 text-[11px] uppercase tracking-wider text-primary">
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Token expires {new Date(row.expires_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {index > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveMut.mutate(row.id)}
                        disabled={setActiveMut.isPending}
                      >
                        <Check className="size-3.5 mr-1.5" /> Use as default
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectMut.mutate(row.id)}
                      disabled={disconnectMut.isPending}
                    >
                      <Unplug className="size-3.5 mr-1.5" /> Disconnect
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => setSwitchHintOpen(true)}
                disabled={connectMut.isPending}
              >
                {connectMut.isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="size-4 mr-2" />
                )}
                Connect another TikTok
              </Button>
              <p className="text-xs text-muted-foreground">
                Your browser is still signed into the current TikTok, so Connect will keep reusing
                it until you log that one out. Until audit, add the new account as a Sandbox
                target user first.
              </p>
            </div>
          ) : (
            <>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-2">
              <p className="font-medium text-foreground">Before Connect (sandbox)</p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>
                  Open{" "}
                  <a
                    href="https://developers.tiktok.com/apps/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    TikTok Developer apps
                  </a>
                  → <span className="text-foreground">Ryval Content Forge</span> → toggle{" "}
                  <span className="text-foreground">Sandbox</span> → left side{" "}
                  <span className="text-foreground">local-dev</span>.
                </li>
                <li>
                  Stay on <span className="text-foreground">https://ryvalcontent.space</span> for
                  Connect. Do not use localhost.
                </li>
                <li>
                  Login Kit → <span className="text-foreground">Configure for Web</span> on. Also
                  set Website URL to{" "}
                  <span className="text-foreground">https://ryvalcontent.space</span>.
                </li>
                <li>
                  Redirect URI — this exact value, then{" "}
                  <span className="text-foreground">Apply changes</span>:
                </li>
              </ol>
              {ready?.redirectUri ? (
                <button
                  type="button"
                  className="w-full text-left font-mono text-[11px] break-all rounded-md border border-border bg-background px-2 py-1.5 text-foreground"
                  onClick={() => {
                    void navigator.clipboard.writeText(ready.redirectUri!);
                    toast.success("Redirect URI copied");
                  }}
                >
                  {ready.redirectUri}
                </button>
              ) : (
                <p className="font-mono text-[11px] break-all">
                  https://ryvalcontent.space/tiktok-callback
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                <code>redirect_uri</code> means Sandbox Login Kit → Configure for Web does not have
                this exact HTTPS URI. Not Production. Click Apply changes.
              </p>
              <p className="text-xs text-muted-foreground">
                <code>non_sandbox_target</code> means the TikTok account is not a Target user.
              </p>
              <p className="text-xs text-muted-foreground">
                <code>scope</code> means add <span className="text-foreground">video.publish</span>{" "}
                under Sandbox → Scopes (needs Content Posting API), then Apply changes.
              </p>
            </div>
            <Button
              onClick={() => connectMut.mutate()}
              disabled={connectMut.isPending}
              className="bg-gradient-primary text-primary-foreground font-semibold"
            >
              {connectMut.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : null}
              Connect TikTok
            </Button>
            </>
          )}

          {account && (
            <Button
              variant="outline"
              onClick={() => publishDueMut.mutate()}
              disabled={publishDueMut.isPending}
            >
              {publishDueMut.isPending ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="size-3.5 mr-1.5" />
              )}
              Publish due posts now{ready?.dueCount ? ` (${ready.dueCount})` : ""}
            </Button>
          )}

          <div className="text-xs text-muted-foreground border-t border-border pt-4 space-y-1">
            <p className="font-medium text-foreground">Required in TikTok Developer Portal</p>
            <p>
              App → URL properties: add this prefix so TikTok can pull slide images:
            </p>
            {ready?.storagePrefix ? (
              <p className="break-all font-mono text-[11px] text-foreground">{ready.storagePrefix}</p>
            ) : (
              <p>
                <code>https://YOUR_PROJECT.supabase.co/storage/v1/object/public/</code>
              </p>
            )}
            <p>
              Add your TikTok account as a sandbox tester. In the TikTok app, turn{" "}
              <span className="text-foreground">Private account</span> ON. Unaudited apps cannot post
              to a public TikTok account.
            </p>
            <p>
              The 24/7 worker publishes due scheduled posts even if this laptop is asleep. Library →{" "}
              <span className="text-foreground">Post</span> still sends one immediately.
            </p>
          </div>
        </div>

        {account && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div>
              <p className="font-semibold">Autopilot</p>
              <p className="text-sm text-muted-foreground mt-1">
                The worker makes one post at a time and rotates the TikToks connected in
                Publer. Each post is different, and each account gets its own photos.
                It keeps going until you turn autopilot off: two posts a day on each
                account, six total. The times are uneven on purpose, so a post does
                not go out at the top of every hour.
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label>Keep autopilot on</Label>
              <Switch
                checked={Boolean(pilot?.autopilot_enabled)}
                onCheckedChange={(v) => savePilot.mutate({ autopilot_enabled: v })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Schedule</Label>
              <p className="text-sm text-muted-foreground">
                Two posts a day on each account, six total. Times land off the hour, with uneven
                gaps, like 1:22pm and then 4:07pm.
              </p>
            </div>
              <div className="space-y-2">
                <Label>Queue ahead</Label>
                <Select
                  value={String(pilot?.autopilot_queue_hours ?? 12)}
                  onValueChange={(v) => savePilot.mutate({ autopilot_queue_hours: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="8">8 hours</SelectItem>
                    <SelectItem value="12">12 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={() => fillMut.mutate()}
              disabled={fillMut.isPending || repairPhotosMut.isPending || rewriteTopicsMut.isPending}
              className="bg-gradient-primary text-primary-foreground font-semibold"
            >
              {fillMut.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : null}
              Queue the next {pilot?.autopilot_queue_hours ?? 12} hours
            </Button>
            <Button
              variant="outline"
              onClick={() => repairPhotosMut.mutate()}
              disabled={fillMut.isPending || repairPhotosMut.isPending || rewriteTopicsMut.isPending}
            >
              {repairPhotosMut.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Image className="size-4 mr-2" />
              )}
              Rebuild photos on queued posts
            </Button>
            <Button
              variant="outline"
              onClick={() => rewriteTopicsMut.mutate()}
              disabled={fillMut.isPending || repairPhotosMut.isPending || rewriteTopicsMut.isPending}
            >
              {rewriteTopicsMut.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Shuffle className="size-4 mr-2" />
              )}
              Rewrite back-to-back topics
            </Button>
            {queueMsg ? <p className="text-xs text-muted-foreground">{queueMsg}</p> : null}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 text-sm space-y-2">
          <p className="font-medium text-foreground">Public posts (TikTok audit)</p>
          {canPublic ? (
            <p className="text-muted-foreground">
              TikTok already allows <span className="text-foreground">PUBLIC_TO_EVERYONE</span>. New
              queued posts will go to the public feed.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                Unaffected by our settings: unaudited apps can only post{" "}
                <span className="text-foreground">SELF_ONLY</span>. Submit the app for review.
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                <li>
                  Open{" "}
                  <a
                    href="https://developers.tiktok.com/apps/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    TikTok Developer apps
                  </a>{" "}
                  → Ryval Content Forge.
                </li>
                <li>Content Posting API → apply for production / submit for review.</li>
                <li>
                  Terms and privacy are already live:{" "}
                  <span className="text-foreground">https://ryvalcontent.space/legal/terms.html</span>{" "}
                  and{" "}
                  <span className="text-foreground">https://ryvalcontent.space/legal/privacy.html</span>.
                </li>
                <li>
                  After approval, reconnect TikTok here. Public will show up in privacy options and
                  autopilot will use it.
                </li>
              </ol>
            </>
          )}
        </div>
      </div>

      <Dialog open={switchHintOpen} onOpenChange={setSwitchHintOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch TikTok account first</DialogTitle>
            <DialogDescription>
              Add the other TikTok as a Sandbox target user first, or TikTok returns{" "}
              <span className="text-foreground">non_sandbox_target</span>. Then log out of{" "}
              {account?.display_name ? (
                <span className="text-foreground">{account.display_name}</span>
              ) : (
                "the account already signed in on this browser"
              )}{" "}
              before Connect, or it will keep reusing that session.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              Open{" "}
              <a
                href="https://developers.tiktok.com/apps/"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                TikTok Developer apps
              </a>{" "}
              → Ryval Content Forge → Sandbox → Target users → Add account. Sign in as the other
              TikTok and accept the terms.
            </li>
            <li>Log that current TikTok out in this browser.</li>
            <li>Come back here and continue, then sign in with the other account.</li>
          </ol>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" asChild>
              <a href="https://www.tiktok.com/logout" target="_blank" rel="noreferrer">
                Log out of TikTok
              </a>
            </Button>
            <Button
              onClick={() => {
                setSwitchHintOpen(false);
                connectMut.mutate();
              }}
              disabled={connectMut.isPending}
              className="bg-gradient-primary text-primary-foreground"
            >
              {connectMut.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : null}
              I logged out — continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
