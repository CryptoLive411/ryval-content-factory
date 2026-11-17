import { RYVAL_MARK_SRC } from "@/lib/brand";

const MARK = RYVAL_MARK_SRC;

/** Official Ryval R mark — transparent PNG, no plate behind it. */
export function RyvalLogo({
  className = "h-6",
  showWord = false,
}: {
  className?: string;
  accent?: string;
  showWord?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <img src={MARK} alt="Ryval" className="h-full w-auto object-contain" />
      {showWord ? (
        <span className="font-black tracking-[0.18em] text-[10px] text-white leading-none">
          RYVAL
        </span>
      ) : null}
    </span>
  );
}
