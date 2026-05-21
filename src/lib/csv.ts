// Canva Bulk Create-compatible CSV export.
type PostRow = {
  account?: string | null;
  platform?: string | null;
  category?: string | null;
  audience?: string | null;
  hook: string;
  slide_2?: string | null;
  slide_3?: string | null;
  slide_4?: string | null;
  slide_5?: string | null;
  slide_6?: string | null;
  cta?: string | null;
  caption?: string | null;
  hashtags?: string | null;
  asset_url?: string | null;
  status?: string | null;
  scheduled_date?: string | null;
};

const HEADERS = [
  "Page","Platform","Category","Audience","Hook",
  "Slide 2","Slide 3","Slide 4","Slide 5","Slide 6",
  "CTA","Caption","Hashtags","Asset URL","Status","Scheduled Date",
];

const esc = (v: unknown) => {
  const s = (v ?? "").toString();
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export function postsToCSV(rows: PostRow[]): string {
  const out = [HEADERS.join(",")];
  for (const r of rows) {
    out.push([
      r.account, r.platform, r.category, r.audience,
      r.hook, r.slide_2, r.slide_3, r.slide_4, r.slide_5, r.slide_6,
      r.cta, r.caption, r.hashtags, r.asset_url, r.status, r.scheduled_date,
    ].map(esc).join(","));
  }
  return out.join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
