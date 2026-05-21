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
};

export function getSlides(p: SlidePost) {
  return [p.hook, p.slide_2, p.slide_3, p.slide_4, p.slide_5, p.slide_6, p.cta]
    .map((t, i) => ({ text: t ?? "", index: i, isCTA: i === 6 }))
    .filter(s => s.text.trim() || s.isCTA);
}

export function CarouselPreview({
  post, templateId = "dark_premium", assetUrl,
}: { post: SlidePost; templateId?: string; assetUrl?: string | null }) {
  const t = TEMPLATE_PRESETS.find(p => p.id === templateId) ?? TEMPLATE_PRESETS[0];
  const slides = getSlides(post);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {slides.map((s) => (
        <div key={s.index} className="aspect-[4/5] rounded-xl overflow-hidden border border-border relative shadow-glow"
          style={{ background: t.bg, color: t.text }}>
          <div className="absolute inset-0 p-5 flex flex-col">
            <div className="flex items-center justify-between text-[10px] opacity-60 uppercase tracking-widest">
              <span>Ryval</span>
              <span>{s.isCTA ? "CTA" : `${s.index + 1}/${slides.length}`}</span>
            </div>
            <div className="flex-1 flex items-center">
              <p className={s.isCTA ? "text-xl font-bold text-balance leading-tight" : "text-lg font-bold text-balance leading-tight"}>
                {s.text || (s.isCTA ? "Build your Ryval profile." : "")}
              </p>
            </div>
            {s.isCTA && (
              <>
                {assetUrl && (
                  <div className="mb-3 flex justify-center">
                    <div className="w-16 h-28 rounded-md border border-white/20 overflow-hidden bg-black/40">
                      <img src={assetUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                <div className="inline-flex self-start items-center px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: t.accent, color: t.bg.startsWith("#fff") ? "#0b0f1a" : "#fff" }}>
                  Join early →
                </div>
              </>
            )}
            <div className="absolute bottom-3 right-3 size-5 rounded-sm" style={{ background: t.accent, opacity: 0.8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
