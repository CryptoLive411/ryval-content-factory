// Reusable carousel slide preview rendering.
import { TEMPLATE_PRESETS } from "@/lib/ryval";

export type SlidePost = {
  hook?: string | null;
  slide_2?: string | null;
  slide_3?: string | null;
  slide_4?: string | null;
  slide_5?: string | null;
  slide_6?: string | null;
  cta?: string | null;
  bg_images?: (string | null)[] | null;
  bg_image_url?: string | null; // legacy fallback
  app_screen_url?: string | null;
  logo_url?: string | null;
  cta_type?: string | null;
};

export function getSlides(p: SlidePost) {
  return [p.hook, p.slide_2, p.slide_3, p.slide_4, p.slide_5, p.slide_6, p.cta]
    .map((t, i) => ({ text: t ?? "", index: i, isCTA: i === 6 }))
    .filter(s => s.text.trim() || s.isCTA);
}

function LogoMark({ url, accent }: { url?: string | null; accent: string }) {
  if (url) {
    return <img src={url} alt="Ryval" className="h-5 w-auto object-contain drop-shadow-md" />;
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="size-3 rounded-sm shadow-glow" style={{ background: accent }} />
      <span className="text-[11px] font-black tracking-[0.2em]">RYVAL</span>
    </div>
  );
}

function ctaLabels(ctaType?: string | null) {
  const t = (ctaType ?? "").toLowerCase();
  if (t.includes("waitlist")) return { tag: "Coming soon · Join the waitlist", btn: "Join the waitlist →" };
  if (t.includes("coming"))   return { tag: "Coming soon", btn: "Join the waitlist →" };
  if (t.includes("follow"))   return { tag: "Follow for more", btn: "@ryval.app →" };
  return { tag: "Coming soon · Join the waitlist", btn: "Join the waitlist →" };
}

export function CarouselPreview({
  post, templateId = "dark_premium",
}: { post: SlidePost; templateId?: string }) {
  const t = TEMPLATE_PRESETS.find(p => p.id === templateId) ?? TEMPLATE_PRESETS[0];
  const slides = getSlides(post);
  const bgs = post.bg_images ?? [];
  const cta = ctaLabels(post.cta_type);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {slides.map((s) => {
        const bg = !s.isCTA ? (bgs[s.index] ?? post.bg_image_url ?? null) : null;
        return (
          <div
            key={s.index}
            className="aspect-[4/5] rounded-xl overflow-hidden border border-border relative shadow-glow"
            style={{ background: t.bg, color: t.text }}
          >
            {/* Per-slide background image */}
            {bg && (
              <>
                <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{
                  background: "radial-gradient(ellipse at center, rgba(5,8,18,0.35) 0%, rgba(5,8,18,0.85) 75%)",
                }} />
              </>
            )}

            {/* CTA slide background */}
            {s.isCTA && (
              <div className="absolute inset-0" style={{
                background: "linear-gradient(160deg, #0b0f1a 0%, #11182b 55%, #1e3a8a 100%)",
              }} />
            )}

            <div className="absolute inset-0 p-5 flex flex-col">
              {/* Top: logo + slide counter */}
              <div className="flex items-center justify-between text-[10px] opacity-90 uppercase tracking-widest relative z-10">
                <LogoMark url={post.logo_url} accent={t.accent} />
                <span className="opacity-60">{s.isCTA ? "CTA" : `${s.index + 1}/${slides.length}`}</span>
              </div>

              {s.isCTA ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10">
                  {post.app_screen_url ? (
                    <div className="w-24 sm:w-28 aspect-[9/19] rounded-xl border-2 border-white/15 overflow-hidden shadow-2xl bg-black/60">
                      <img src={post.app_screen_url} alt="Ryval app" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 aspect-[9/19] rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-[10px] text-white/40 text-center px-2">
                      Upload app screen
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-base font-bold leading-tight text-balance">
                      {s.text || "Get on the list."}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                      {cta.tag}
                    </p>
                  </div>
                  <div
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold shadow-glow"
                    style={{ background: t.accent, color: "#0b0f1a" }}
                  >
                    {cta.btn}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center relative z-10 px-2">
                  <p className="text-lg font-black leading-[1.15] text-balance drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
                    {s.text}
                  </p>
                </div>
              )}

              {!s.isCTA && (
                <div className="absolute bottom-3 right-3 size-2 rounded-full shadow-glow" style={{ background: t.accent }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
