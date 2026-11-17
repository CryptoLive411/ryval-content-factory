import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { publishMyDueTikTokPosts } from "@/lib/tiktok.functions";

/** While signed in, publish any due scheduled TikTok posts (local + prod). */
export function useTikTokAutoPublish() {
  const publishDue = useServerFn(publishMyDueTikTokPosts);
  const publishDueRef = useRef(publishDue);
  publishDueRef.current = publishDue;

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await publishDueRef.current();
        if (cancelled) return;
        if (r.published > 0) {
          toast.success(`Posted ${r.published} scheduled TikTok post${r.published === 1 ? "" : "s"}`);
        } else if (r.results.some((x) => !x.ok)) {
          const err = r.results.find((x) => !x.ok)?.error || "A scheduled TikTok post failed";
          if (/24 hours|spam cap|too many posts/i.test(err)) return;
          toast.error(err);
        }
      } catch {
        /* not connected or nothing due */
      }
    };
    const start = window.setTimeout(tick, 15_000);
    const interval = window.setInterval(tick, 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, []);
}
