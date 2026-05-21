import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/page-shell";
import { TEMPLATE_PRESETS } from "@/lib/ryval";
import { CarouselPreview } from "@/components/carousel-preview";

export const Route = createFileRoute("/_authenticated/templates")({ component: Templates });

const SAMPLE = {
  hook: "Talent is not enough.",
  slide_2: "Coaches can't find you.",
  slide_3: "Your highlight tape is too long.",
  slide_4: "Your profile is scattered.",
  slide_5: "Recruiting is moving mobile.",
  cta: "Build your Ryval profile before launch.",
};

function Templates() {
  return (
    <PageShell>
      <PageHeader title="Templates" subtitle="Reusable visual styles for carousel slides. Pick one when previewing a post." />
      <div className="space-y-10">
        {TEMPLATE_PRESETS.map(t => (
          <div key={t.id}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xl font-bold">{t.name}</h2>
              <code className="text-xs text-muted-foreground">{t.id}</code>
            </div>
            <CarouselPreview post={SAMPLE} templateId={t.id} />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
