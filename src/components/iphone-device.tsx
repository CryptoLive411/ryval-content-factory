import type { CSSProperties } from "react";
import { IPHONE_FRAME_SRC, IPHONE_SCREEN_INSET } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function IPhoneDevice({
  src,
  className,
  style,
}: {
  src: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={cn("relative shrink-0 drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]", className)}
      style={{ aspectRatio: "518 / 1014", ...style }}
    >
      <div
        className="absolute overflow-hidden bg-black"
        style={{
          left: IPHONE_SCREEN_INSET.left,
          top: IPHONE_SCREEN_INSET.top,
          width: IPHONE_SCREEN_INSET.width,
          height: IPHONE_SCREEN_INSET.height,
          borderRadius: "12% / 6.2%",
        }}
      >
        <img
          src={src}
          alt="Ryval app"
          crossOrigin="anonymous"
          className="h-full w-full object-cover object-top"
        />
      </div>
      <img
        src={IPHONE_FRAME_SRC}
        alt=""
        crossOrigin="anonymous"
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        draggable={false}
      />
    </div>
  );
}
