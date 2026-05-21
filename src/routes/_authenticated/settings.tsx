import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });

function Settings() {
  const { user } = useAuth();
  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Account and workspace." />
      <div className="rounded-xl border border-border bg-card p-6 max-w-xl space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Signed in as</p>
          <p className="font-medium mt-1">{user?.email}</p>
        </div>
        <div className="text-sm text-muted-foreground border-t border-border pt-4">
          <p className="font-medium text-foreground mb-1">Roadmap</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Canva, Buffer, Metricool integrations</li>
            <li>Direct TikTok / Instagram scheduling</li>
            <li>Auto-resize to TikTok/Reels/Shorts</li>
            <li>Team roles (Admin, Editor, Designer, Social manager)</li>
            <li>AI-generated variations of winning posts</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
