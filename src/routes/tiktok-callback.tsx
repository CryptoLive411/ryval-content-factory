import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { exchangeTikTokCode } from "@/lib/tiktok.functions";
import { supabase } from "@/integrations/supabase/client";

export const TIKTOK_OAUTH_SEARCH_KEY = "tiktok_oauth_search";

export const Route = createFileRoute("/tiktok-callback")({
  component: TikTokCallback,
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s.code === "string" ? s.code : undefined,
    state: typeof s.state === "string" ? s.state : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
    error_description:
      typeof s.error_description === "string" ? s.error_description : undefined,
  }),
});

function explainTikTokOAuthError(error?: string, description?: string) {
  const raw = `${error ?? ""} ${description ?? ""}`.toLowerCase();
  if (raw.includes("non_sandbox_target")) {
    return "That TikTok is not a Sandbox target user yet. In TikTok Developer apps → Ryval Content Forge → Sandbox → Target users → Add account, sign in as that other TikTok, then Connect again.";
  }
  return description || error || "We couldn't log in with TikTok.";
}

function TikTokCallback() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const exchange = useServerFn(exchangeTikTokCode);
  const [msg, setMsg] = useState("Connecting TikTok…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (search.error) {
        const m = explainTikTokOAuthError(search.error, search.error_description);
        setMsg(m);
        toast.error(m);
        setTimeout(() => nav({ to: "/settings" }), 2000);
        return;
      }
      if (!search.code) {
        setMsg("Missing authorization code.");
        setTimeout(() => nav({ to: "/settings" }), 2000);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        sessionStorage.setItem(TIKTOK_OAUTH_SEARCH_KEY, window.location.search);
        window.location.replace("/login");
        return;
      }

      try {
        const codeVerifier = sessionStorage.getItem("tiktok_pkce_verifier") ?? "";
        sessionStorage.removeItem("tiktok_pkce_verifier");
        const r = await exchange({
          data: {
            code: search.code,
            state: search.state,
            codeVerifier: codeVerifier || undefined,
          },
        });
        if (cancelled) return;
        toast.success(r.displayName ? `Connected @${r.displayName}` : "TikTok connected");
        nav({ to: "/settings" });
      } catch (e) {
        if (cancelled) return;
        const m = e instanceof Error ? e.message : "OAuth failed";
        setMsg(m);
        toast.error(m);
        setTimeout(() => nav({ to: "/settings" }), 2500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search.code, search.error, search.error_description, search.state, exchange, nav]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">{msg}</p>
    </div>
  );
}
