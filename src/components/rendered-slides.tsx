import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { renderPostSlides } from "@/lib/render.functions";

type Draft = Record<string, string | string[] | undefined>;

const SLIDE_KEYS = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6", "cta"] as const;

/**
 * The real exported slides, rendered by the same code that posts them.
 * No parallel CSS mock, so the preview cannot drift from the output again.
 */
export function RenderedSlides({
  post,
  onRendered,
}: {
  post: Record<string, unknown>;
  onRendered?: (urls: string[]) => void;
}) {
  const render = useServerFn(renderPostSlides);
  const stored = ((post.export_slide_urls as string[] | null) ?? []).filter((u) =>
    u?.startsWith("http"),
  );
  const [urls, setUrls] = useState<string[]>(stored);
  const [busy, setBusy] = useState(false);
  const autoRan = useRef(false);

  const draft: Draft = {};
  for (const key of SLIDE_KEYS) draft[key] = String(post[key] ?? "");

  const run = async () => {
    setBusy(true);
    try {
      const res = await render({ data: { postId: String(post.id), draft: draft as never } });
      setUrls(res.urls);
      onRendered?.(res.urls);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Render failed");
    } finally {
      setBusy(false);
    }
  };

  // Nothing rendered yet, so draw it once on open rather than showing an empty box.
  useEffect(() => {
    if (autoRan.current || stored.length) return;
    autoRan.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {urls.length ? `${urls.length} slides · exactly what gets posted` : "Not rendered yet"}
        </span>
        <Button size="sm" variant="outline" onClick={run} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          {busy ? "Rendering…" : "Re-render preview"}
        </Button>
      </div>
      {urls.length ? (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url, i) => (
            <a key={url} href={url} target="_blank" rel="noreferrer">
              <img
                src={url}
                alt={`Slide ${i + 1}`}
                loading="lazy"
                className="w-full rounded-lg border border-border"
                style={{ aspectRatio: "1080 / 1350", objectFit: "cover" }}
              />
            </a>
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
          {busy ? "Rendering slides…" : "Hit Re-render preview to draw the slides"}
        </div>
      )}
    </div>
  );
}
