import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ExternalLink, RefreshCw, Sparkles, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PageShell, StatCard } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { draftPostFromStory, refreshStorySources, setStoryStatus } from "@/lib/story.functions";

export const Route = createFileRoute("/_authenticated/stories")({ component: Stories });

type StoryRecord = {
  id: string;
  title: string;
  summary: string | null;
  source_name: string;
  story_url: string;
  published_at: string | null;
  category: string | null;
  suggested_format: string;
  players: string[];
  schools: string[];
  stats: Record<string, string>;
  relevance_score: number;
  needs_review: boolean;
  review_reason: string | null;
  status: string;
};

const BUCKETS = [
  { id: "ready", label: "Ready to post" },
  { id: "review", label: "Needs review" },
  { id: "approved", label: "Approved" },
  { id: "used", label: "Used" },
] as const;

function Stories() {
  const queryClient = useQueryClient();
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]["id"]>("ready");
  const [msg, setMsg] = useState("");

  const refresh = useServerFn(refreshStorySources);
  const setStatus = useServerFn(setStoryStatus);
  const draft = useServerFn(draftPostFromStory);

  const { data: stories = [] } = useQuery({
    queryKey: ["stories"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stories")
        .select(
          "id, title, summary, source_name, story_url, published_at, category, suggested_format, players, schools, stats, relevance_score, needs_review, review_reason, status",
        )
        .order("relevance_score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as StoryRecord[];
    },
  });

  const { data: sources = [] } = useQuery({
    queryKey: ["content-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_sources")
        .select("id, name, reliability, enabled, last_checked_at, last_status, update_frequency_minutes")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const ingest = useMutation({
    mutationFn: () => refresh({ data: { force: true } }),
    onSuccess: (res) => {
      setMsg(`Checked ${res.checked} source(s), ${res.inserted} new stor${res.inserted === 1 ? "y" : "ies"}.`);
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["content-sources"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const reject = useMutation({
    mutationFn: (storyId: string) => setStatus({ data: { storyId, status: "rejected" as const } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stories"] }),
  });

  const makePost = useMutation({
    mutationFn: (storyId: string) => draft({ data: { storyId } }),
    onSuccess: (res) => {
      setMsg(`Drafted a ${res.template} carousel. Find it in the Library.`);
      queryClient.invalidateQueries({ queryKey: ["stories"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const inBucket = stories.filter((s) => {
    if (bucket === "used") return s.status === "used";
    if (s.status === "used" || s.status === "rejected") return false;
    if (bucket === "approved") return s.status === "approved";
    if (bucket === "review") return s.needs_review;
    return !s.needs_review;
  });

  const ready = stories.filter((s) => !s.needs_review && s.status !== "used" && s.status !== "rejected");
  const lastChecked = sources
    .map((s) => s.last_checked_at)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <PageShell>
      <PageHeader
        title="Story Desk"
        subtitle="Real college soccer stories from trusted sources. Every post keeps its source."
        actions={
          <Button onClick={() => ingest.mutate()} disabled={ingest.isPending} variant="outline">
            <RefreshCw className={`size-4 mr-2 ${ingest.isPending ? "animate-spin" : ""}`} />
            {ingest.isPending ? "Checking sources…" : "Check sources now"}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Ready to post" value={ready.length} />
        <StatCard label="Needs review" value={stories.filter((s) => s.needs_review && s.status === "new").length} />
        <StatCard label="Sources on" value={`${sources.filter((s) => s.enabled).length} of ${sources.length}`} />
        <StatCard
          label="Last checked"
          value={lastChecked ? new Date(lastChecked).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "—"}
        />
      </div>

      {msg ? <p className="mt-4 text-sm text-muted-foreground">{msg}</p> : null}

      <div className="flex gap-2 mt-6 flex-wrap">
        {BUCKETS.map((b) => (
          <Button
            key={b.id}
            size="sm"
            variant={bucket === b.id ? "default" : "outline"}
            onClick={() => setBucket(b.id)}
          >
            {b.label}
          </Button>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
        {inBucket.length === 0 ? (
          <li className="px-4 py-10 text-sm text-muted-foreground">
            Nothing here. Check sources to pull the latest stories.
          </li>
        ) : (
          inBucket.map((story) => (
            <li key={story.id} className="px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-sm font-semibold tabular-nums w-8 text-primary">
                  {story.relevance_score}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{story.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                    <a
                      href={story.story_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-foreground inline-flex items-center gap-1"
                    >
                      {story.source_name}
                      <ExternalLink className="size-3" />
                    </a>
                    {story.published_at ? (
                      <>· {new Date(story.published_at).toLocaleDateString()}</>
                    ) : null}
                    · {story.suggested_format.replace(/_/g, " ")}
                    {story.category ? <>· {story.category}</> : null}
                  </p>
                  {story.schools.length || story.players.length ? (
                    <p className="text-xs mt-1 flex gap-1 flex-wrap">
                      {story.schools.slice(0, 3).map((s) => (
                        <Badge key={s} variant="secondary">
                          {s}
                        </Badge>
                      ))}
                      {story.players.slice(0, 3).map((p) => (
                        <Badge key={p} variant="outline">
                          {p}
                        </Badge>
                      ))}
                    </p>
                  ) : null}
                  {story.needs_review && story.review_reason ? (
                    <p className="text-xs text-amber-500 mt-1">Flagged: {story.review_reason}</p>
                  ) : null}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => makePost.mutate(story.id)}
                    disabled={makePost.isPending || story.status === "used"}
                  >
                    <Sparkles className="size-4 mr-1" />
                    {story.status === "used" ? "Drafted" : "Make carousel"}
                  </Button>
                  {story.status !== "used" ? (
                    <Button size="sm" variant="ghost" onClick={() => reject.mutate(story.id)}>
                      <ThumbsDown className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      <h2 className="mt-10 text-lg font-semibold">Sources</h2>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
        {sources.map((source) => (
          <li key={source.id} className="px-4 py-3 flex items-center gap-3 text-sm">
            <Badge variant={source.enabled ? "secondary" : "outline"}>
              {source.enabled ? "on" : "off"}
            </Badge>
            <span className="font-medium min-w-0 flex-1 truncate">{source.name}</span>
            <span className="text-xs text-muted-foreground">{source.reliability}</span>
            <span className="text-xs text-muted-foreground">every {source.update_frequency_minutes}m</span>
            <span className="text-xs text-muted-foreground truncate max-w-[220px]">
              {source.last_status ?? "not checked yet"}
            </span>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
