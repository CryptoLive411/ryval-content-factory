import type { CSSProperties } from "react";
import { APP_STORE_BADGE_SRC } from "@/lib/brand";

const SPARKS = [
  { top: "7%", left: "14%", size: 3, opacity: 0.85 },
  { top: "11%", left: "72%", size: 2, opacity: 0.7 },
  { top: "18%", left: "88%", size: 4, opacity: 0.55 },
  { top: "22%", left: "8%", size: 2, opacity: 0.65 },
  { top: "31%", left: "81%", size: 3, opacity: 0.5 },
  { top: "38%", left: "6%", size: 2, opacity: 0.45 },
  { top: "48%", left: "92%", size: 3, opacity: 0.4 },
  { top: "16%", left: "46%", size: 2, opacity: 0.75 },
];

export function CtaBackdrop({ src }: { src: string }) {
  return (
    <>
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.28) 42%, rgba(5,8,18,0.45) 100%)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 32%, rgba(59,130,246,0.18) 0%, rgba(0,0,0,0) 52%)",
        }}
      />
      <div
        className="absolute -top-6 left-[16%] h-[62%] w-12 rotate-[16deg] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(255,246,200,0.42), transparent 78%)",
          filter: "blur(6px)",
        }}
      />
      <div
        className="absolute -top-6 right-[14%] h-[58%] w-10 -rotate-[18deg] pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(147,197,253,0.38), transparent 78%)",
          filter: "blur(6px)",
        }}
      />
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            opacity: s.opacity,
            boxShadow: "0 0 8px 2px rgba(255,255,255,0.55)",
          }}
        />
      ))}
    </>
  );
}

export function AppStoreBadge({
  className = "h-7 w-auto",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <img
      src={APP_STORE_BADGE_SRC}
      alt="Download on the App Store"
      className={className}
      draggable={false}
      style={style}
    />
  );
}
