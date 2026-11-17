import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageShell } from "@/components/page-shell";
import { TEMPLATE_PRESETS } from "@/lib/ryval";
import { CarouselPreview } from "@/components/carousel-preview";

export const Route = createFileRoute("/_authenticated/templates")({ component: Templates });

const SAMPLE = {
  hook: "5 reasons college coaches aren't responding to you.\n---\nIt's probably not what you think.",
  slide_2:
    "Your message is too generic.\n---\nCoaches receive hundreds of messages from players every week. If yours sounds like everyone else's, it's easy to ignore.\n---\nMention specific reasons you're interested in their program.",
  slide_3:
    "You're contacting programs that don't need your position.\n---\nMany players reach out without researching roster needs. If a program is already full at your position, they won't respond.\n---\nTarget schools that actually have a need at your position.",
  slide_4:
    "Your film doesn't show enough, quickly enough.\n---\nCoaches don't have time to watch 10 minutes of unedited footage. You have about 30 seconds to make an impression.\n---\nKeep your highlight video 1–3 minutes, best clips first.",
  slide_5:
    "Your profile is incomplete.\n---\nCoaches want to quickly see position, graduation year, height, weight, and film. Missing details create doubt.\n---\nMake sure your Ryval profile is 100% complete.",
  cta: "Ryval puts your film in front of coaches hunting your position.\n---\nBuild one profile coaches can open — film, position, and real roster needs.\n---\nDownload Ryval on the App Store.",
  app_screen_url: "/app-screens/discover.jpg",
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
