import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { TEMPLATE_PRESETS } from "@/lib/ryval";
import { RyvalLogo } from "@/components/ryval-logo";
import { AppStoreBadge } from "@/components/cta-stage";
import { IPhoneDevice } from "@/components/iphone-device";
import { resolveAppScreen, resolveCtaBackground, RYVAL_MARK_SRC, screenSalt } from "@/lib/brand";
import { parseEditorial } from "@/lib/content-quality";
import { displayPhotoSrc } from "@/lib/stock-photos";
import { proxiedSchoolLogo } from "@/lib/school-logo";
import {
  EDITORIAL_ACCENT,
  EDITORIAL_BG,
  EDITORIAL_FOOTER,
  EDITORIAL_H,
  EDITORIAL_TAG_LEFT,
  EDITORIAL_TAG_RIGHT,
  EDITORIAL_W,
  splitBodyGrafs,
  splitHeadlineTone,
  stripLeadingNumber,
} from "@/lib/editorial";

export type SlidePost = {
  hook?: string | null;
  slide_2?: string | null;
  slide_3?: string | null;
  slide_4?: string | null;
  slide_5?: string | null;
  slide_6?: string | null;
  cta?: string | null;
  bg_images?: (string | null)[] | null;
  bg_image_url?: string | null;
  app_screen_url?: string | null;
  logo_url?: string | null;
  cta_type?: string | null;
  cta_bg_url?: string | null;
  school_logo_url?: string | null;
};

export function getSlides(p: SlidePost) {
  const raw = [p.hook, p.slide_2, p.slide_3, p.slide_4, p.slide_5, p.slide_6, p.cta].map(
    (t, i) => ({
      text: t ?? "",
      index: i,
      isCTA: i === 6,
      editorial: parseEditorial(t ?? ""),
    }),
  );
  const slides = raw.filter((s) =>
    s.isCTA ? true : s.editorial.headline.length > 0 || s.text.trim().length > 0,
  );
  let reason = 0;
  return slides.map((s, displayIdx) => {
    const isCover = !s.isCTA && displayIdx === 0;
    if (!isCover) reason += 1;
    return { ...s, displayIdx, isCover, reasonNumber: isCover ? 0 : reason };
  });
}

function SchoolCrest({ url }: { url?: string | null }) {
  const src = proxiedSchoolLogo(url);
  if (!src) return <StackedLines lines={EDITORIAL_TAG_RIGHT} align="right" />;
  return (
    <span className="inline-flex items-center justify-end" style={{ height: 72 }}>
      <img
        src={src}
        alt=""
        width={72}
        height={72}
        className="object-contain"
        style={{ height: 72, width: "auto", maxWidth: 110 }}
      />
    </span>
  );
}

function LogoMark({ url }: { url?: string | null }) {
  const src = url || RYVAL_MARK_SRC;
  if (src.endsWith(".png") || src.endsWith(".svg") || src.startsWith("http") || src.startsWith("/")) {
    return (
      <span className="inline-flex items-center" style={{ height: 44 }}>
        <img
          src={src}
          alt="Ryval"
          width={44}
          height={44}
          className="object-contain"
          style={{ height: 44, width: "auto" }}
        />
      </span>
    );
  }
  return <RyvalLogo className="h-10" />;
}

function StackedLines({ lines, align = "left" }: { lines: readonly string[]; align?: "left" | "right" }) {
  return (
    <div
      className="text-[11px] font-semibold uppercase leading-[1.25] tracking-[0.18em] text-white/75"
      style={{ textAlign: align }}
    >
      {lines.map((l) => (
        <div key={l}>{l}</div>
      ))}
    </div>
  );
}

function TipIcon({ kind }: { kind: number }) {
  const i = kind % 5;
  const common = {
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (i === 0) {
    return (
      <svg {...common}>
        <path d="M9 18h6" />
        <path d="M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z" />
      </svg>
    );
  }
  if (i === 1) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    );
  }
  if (i === 2) {
    return (
      <svg {...common}>
        <path d="M15 8h.01" />
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="m3 10 5.2 3.5a2 2 0 0 0 2.3 0L19 8" />
      </svg>
    );
  }
  if (i === 3) {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19a7 7 0 0 1 14 0" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20V8" />
    </svg>
  );
}

function PunchHeadline({
  text,
  accent,
  size,
}: {
  text: string;
  accent: string;
  size: "cover" | "reason";
}) {
  const { lead, punch } = splitHeadlineTone(text);
  const cls =
    size === "cover"
      ? "text-[72px] font-black uppercase leading-[0.9] tracking-[-0.03em]"
      : "text-[46px] font-black uppercase leading-[0.92] tracking-[-0.03em]";
  return (
    <p className={cls}>
      <span className="text-white">{lead}</span>
      {punch ? (
        <>
          {" "}
          <span style={{ color: accent }}>{punch}</span>
        </>
      ) : null}
    </p>
  );
}

function EditorialChrome({
  slideIndex,
  logoUrl,
  schoolLogoUrl,
  photo,
  appScreen,
  series,
  showSwipe,
  showStore,
  children,
}: {
  slideIndex: number;
  logoUrl?: string | null;
  schoolLogoUrl?: string | null;
  photo?: string | null;
  appScreen?: string | null;
  series?: string;
  showSwipe: boolean;
  showStore: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-slide-index={slideIndex}
      className="relative overflow-hidden text-white"
      style={{ width: EDITORIAL_W, height: EDITORIAL_H, background: EDITORIAL_BG }}
    >
      <div className="absolute inset-y-0 right-0 w-[46%]">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              const el = e.currentTarget;
              const id = el.src.match(/(\d{10,}-[a-z0-9]+)/i)?.[1];
              const fallback = id
                ? `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1080&h=1350&q=80`
                : "";
              if (fallback && el.src !== fallback) el.src = fallback;
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[#0a0a0a]" />
        )}
        <div
          className="absolute inset-y-0 left-0 w-28"
          style={{ background: "linear-gradient(to right, #000 0%, rgba(0,0,0,0) 100%)" }}
        />
        <div className={`absolute inset-0 ${appScreen ? "bg-black/45" : "bg-black/15"}`} />
        {appScreen ? (
          <div className="absolute inset-x-0 top-[120px] bottom-[110px] z-10 flex items-center justify-center">
            <IPhoneDevice
              src={appScreen}
              className="h-[860px] w-auto"
              style={{ height: 860, width: Math.round((860 * 518) / 1014) }}
            />
          </div>
        ) : null}
      </div>

      <div className="absolute left-0 top-0 z-20 flex w-full items-start justify-between px-12 pt-11">
        <div className="flex items-center gap-4">
          <LogoMark url={logoUrl} />
          <span className="text-[28px] font-black tracking-[0.14em]">RYVAL</span>
          <div className="h-10 w-px bg-white/35" />
          <StackedLines lines={EDITORIAL_TAG_LEFT} />
        </div>
        <SchoolCrest url={schoolLogoUrl} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between px-12 pb-10">
        <p className="text-[15px] font-extrabold uppercase leading-[1.25] tracking-[0.08em] text-white/90">
          {EDITORIAL_FOOTER.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>
        <div className="flex flex-col items-end gap-3">
          {showStore ? (
            <AppStoreBadge className="h-12 w-auto" style={{ height: 48, width: "auto" }} />
          ) : null}
          {showSwipe ? (
            <p className="text-[16px] font-bold uppercase tracking-[0.22em] text-white/80">
              Swipe →
            </p>
          ) : null}
        </div>
      </div>

      <div className="absolute left-0 top-[118px] bottom-[120px] z-10 flex w-[58%] flex-col px-12">
        {series ? (
          <p className="mb-5 max-w-[520px] text-[13px] font-semibold uppercase leading-[1.35] tracking-[0.16em] text-white/55">
            {series}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function CoverCopy({
  headline,
  body,
  accent,
}: {
  headline: string;
  body: string;
  accent: string;
}) {
  const side = headline.match(/^(women's|men's)\b\s*/i);
  const kicker = side ? `${side[1].toUpperCase()} SOCCER` : "";
  const bare = side ? headline.slice(side[0].length) : headline;
  const { n, rest } = stripLeadingNumber(bare);
  const { lead, punch } = splitHeadlineTone(rest || bare);
  return (
    <div className="flex flex-1 flex-col justify-end pb-8">
      {kicker ? (
        <p className="mb-3 text-[18px] font-bold tracking-[0.16em]" style={{ color: accent }}>
          {kicker}
        </p>
      ) : null}
      <p className="text-[76px] font-black uppercase leading-[0.9] tracking-[-0.035em]">
        {n ? <span style={{ color: accent }}>{n} </span> : null}
        <span className="text-white">{lead || rest}</span>
        {punch ? (
          <>
            {" "}
            <span style={{ color: accent }}>{punch}</span>
          </>
        ) : null}
      </p>
      {body ? (
        <p className="mt-5 max-w-[560px] text-[28px] font-semibold leading-[1.3] text-white/90">{body}</p>
      ) : null}
      <div className="mt-12 flex gap-8 text-white/80">
        {[
          { label: "Better\nprofiles", icon: 2 },
          { label: "Real\ncoaches", icon: 3 },
          { label: "Global\nopportunities", icon: 1 },
        ].map((item) => (
          <div key={item.label} className="flex w-[110px] flex-col gap-2">
            <span className="text-white/85">
              <TipIcon kind={item.icon} />
            </span>
            <p className="whitespace-pre-line text-[12px] font-bold uppercase leading-[1.25] tracking-[0.12em]">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReasonCopy({
  number,
  headline,
  body,
  tip,
  accent,
}: {
  number: number;
  headline: string;
  body: string;
  tip: string;
  accent: string;
}) {
  const stripped = stripLeadingNumber(headline).rest || headline;
  const [g1, g2] = splitBodyGrafs(body);
  return (
    <div className="flex flex-1 flex-col pb-6">
      <div className="flex items-start gap-4">
        <span
          className="shrink-0 text-[118px] font-black leading-[0.8] tracking-[-0.06em]"
          style={{ color: accent }}
        >
          {number}
        </span>
        <div className="pt-2">
          <PunchHeadline text={stripped} accent={accent} size="reason" />
        </div>
      </div>
      {g1 ? (
        <p className="mt-7 max-w-[520px] text-[22px] font-medium leading-[1.35] text-white/88">
          {g1}
        </p>
      ) : null}
      {g2 ? (
        <p className="mt-5 max-w-[520px] text-[22px] font-medium leading-[1.35] text-white/88">
          {g2}
        </p>
      ) : null}
      {tip ? (
        <div className="mt-auto flex max-w-[520px] items-start gap-4 pb-2">
          <span className="mt-0.5 text-white/90">
            <TipIcon kind={number} />
          </span>
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[0.2em] text-white">
              Tip:
            </p>
            <p className="mt-1 text-[20px] font-medium leading-[1.35] text-white/88">{tip}</p>
          </div>
        </div>
      ) : (
        <div className="mt-auto" />
      )}
    </div>
  );
}

function ScaledFrame({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const sync = () => {
      const w = el.getBoundingClientRect().width;
      setScale(w > 0 ? w / EDITORIAL_W : 0);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <div
      ref={host}
      className="relative w-full min-w-0 overflow-hidden rounded-xl border border-border shadow-glow"
      style={{ height: 0, paddingBottom: `${(EDITORIAL_H / EDITORIAL_W) * 100}%` }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: EDITORIAL_W,
          height: EDITORIAL_H,
          transform: `scale(${scale || 0.0001})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function CarouselPreview({
  post,
  templateId = "dark_premium",
}: {
  post: SlidePost;
  templateId?: string;
}) {
  const t = TEMPLATE_PRESETS.find((p) => p.id === templateId) ?? TEMPLATE_PRESETS[0];
  const slides = getSlides(post);
  const bgs = post.bg_images ?? [];
  const series = parseEditorial(post.hook ?? "").headline;
  const accent = EDITORIAL_ACCENT || t.accent;

  return (
    <div data-carousel-root className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {slides.map((s) => {
        const last = s.displayIdx === slides.length - 1;
        const photoRaw = last
          ? (bgs[s.index] ||
            post.cta_bg_url ||
            resolveCtaBackground(screenSalt(post.app_screen_url)))
          : (bgs[s.index] ?? null);
        const photo = displayPhotoSrc(photoRaw) ?? photoRaw;
        const appScreen = last ? resolveAppScreen(post.app_screen_url) : null;
        const { headline, body, tip } = s.editorial;
        return (
          <ScaledFrame key={s.index}>
            <EditorialChrome
                slideIndex={s.index}
                logoUrl={post.logo_url}
                schoolLogoUrl={post.school_logo_url}
                photo={photo}
                appScreen={appScreen}
                series={s.isCover ? undefined : series}
                showSwipe={!last}
                showStore={last}
              >
                {s.isCover ? (
                  <CoverCopy headline={headline || s.text} body={body} accent={accent} />
                ) : (
                  <ReasonCopy
                    number={s.reasonNumber}
                    headline={headline || s.text}
                    body={body}
                    tip={tip}
                    accent={accent}
                  />
                )}
              </EditorialChrome>
          </ScaledFrame>
        );
      })}
    </div>
  );
}
