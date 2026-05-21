import type { CollegePost } from "@/lib/college";
import { Loader2, AlertCircle } from "lucide-react";

export type CollegeSlideStatus = "pending" | "loading" | "done" | "failed";

export function CollegePreview({
  post,
  bgImages,
  statuses,
  logoUrl,
  appScreenUrl,
  onRetry,
}: {
  post: CollegePost;
  bgImages: (string | null)[];
  statuses: CollegeSlideStatus[];
  logoUrl?: string | null;
  appScreenUrl?: string | null;
  onRetry?: (slideIdx: number) => void;
}) {
  const accent = post.meta.accent;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {post.slides.map((s, i) => {
        const bg = bgImages[i];
        const status = statuses[i];
        return (
          <div key={i} className="aspect-[4/5] rounded-lg overflow-hidden border border-border relative bg-[#05080f]">
            {bg && <img src={bg} alt="" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/90" />
            <div className="absolute inset-0 p-2.5 flex flex-col text-white">
              <div className="flex items-start justify-between text-[8px] uppercase tracking-widest font-bold">
                <div>
                  <div>{s.eyebrow}</div>
                  <div className="h-0.5 w-5 mt-1" style={{ background: accent }} />
                </div>
                {logoUrl
                  ? <img src={logoUrl} alt="" crossOrigin="anonymous" className="h-3 w-auto" />
                  : <span className="font-black">RYVAL</span>}
              </div>
              <div className="flex-1 flex items-center">
                <div className="leading-[0.95] font-black uppercase" style={{ fontFamily: "Impact, 'Arial Narrow', sans-serif", fontSize: s.kind === "hero" ? 32 : 22 }}>
                  {s.title.split("\n").map((line, li) => {
                    const isAcc = s.accentWord && line.toUpperCase().replace(/\.$/, "") === s.accentWord.toUpperCase().replace(/\.$/, "");
                    return <div key={li} style={{ color: isAcc ? accent : "#fff" }}>{line.toUpperCase()}</div>;
                  })}
                </div>
              </div>
              {s.subline && (
                <div className="text-[9px] font-bold uppercase tracking-wider mb-1">
                  {s.subline}
                  <div className="h-0.5 w-4 mt-0.5" style={{ background: accent }} />
                </div>
              )}
              {s.chips && (
                <div className="flex gap-1 text-[6px] font-bold uppercase">
                  {s.chips.map((c, ci) => (
                    <div key={ci} className="flex-1 text-center">
                      <div className="size-1.5 mx-auto mb-0.5" style={{ background: accent }} />
                      {c.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* status overlay */}
            {status !== "done" && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                {status === "loading" && <Loader2 className="size-5 animate-spin text-white/70" />}
                {status === "pending" && <span className="text-[10px] text-white/60 uppercase tracking-wider">Queued</span>}
                {status === "failed" && (
                  <button
                    onClick={() => onRetry?.(i)}
                    className="flex flex-col items-center gap-1 text-white text-[10px] hover:text-red-300"
                  >
                    <AlertCircle className="size-4 text-red-400" />
                    Retry
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
