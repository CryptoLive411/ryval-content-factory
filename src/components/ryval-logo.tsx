// Inline SVG Ryval wordmark — transparent background, scales cleanly.
export function RyvalLogo({ className = "h-5 w-auto", accent = "#3B82F6" }: { className?: string; accent?: string }) {
  return (
    <svg viewBox="0 0 220 56" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Ryval">
      {/* R chevron mark */}
      <path
        d="M6 6 H30 C42 6 50 14 50 24 C50 32 45 38 38 40 L52 50 H38 L26 40 H18 V50 H6 Z M18 16 V30 H28 C33 30 37 27 37 23 C37 19 33 16 28 16 Z"
        fill={accent}
      />
      {/* RYVAL wordmark */}
      <text
        x="62"
        y="40"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Inter', sans-serif"
        fontWeight="900"
        fontSize="32"
        letterSpacing="2"
        fill="#ffffff"
      >
        RYVAL
      </text>
    </svg>
  );
}
