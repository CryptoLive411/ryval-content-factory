function cleanEnv(raw: string | undefined) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

export function getChatProvider() {
  const lovable = cleanEnv(process.env.LOVABLE_API_KEY);
  if (lovable) {
    return {
      kind: "lovable" as const,
      key: lovable,
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      textModel: "google/gemini-2.5-flash",
    };
  }
  const openai = cleanEnv(process.env.OPENAI_API_KEY);
  if (openai) {
    return {
      kind: "openai" as const,
      key: openai,
      url: "https://api.openai.com/v1/chat/completions",
      textModel: "gpt-4o",
    };
  }
  throw new Error(
    "AI not configured. Set OPENAI_API_KEY in .env and restart the dev server.",
  );
}

export async function chatCompletions(body: {
  messages: unknown[];
  tools?: unknown[];
  tool_choice?: unknown;
}) {
  const provider = getChatProvider();
  const res = await fetch(provider.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.textModel,
      messages: body.messages,
      tools: body.tools,
      tool_choice: body.tool_choice,
    }),
  });

  if (res.status === 429) throw new Error("Rate limit reached. Wait a moment and try again.");
  if (res.status === 402) throw new Error("AI credits exhausted.");
  if (!res.ok) {
    console.error("AI chat error", provider.kind, res.status, await res.text());
    throw new Error(`AI error (${res.status})`);
  }
  return res.json();
}

export async function generateImageBytes(
  prompt: string,
  model: "nano" | "nano-pro" | "openai" = "openai",
): Promise<{ bytes: Uint8Array; mime: string; ext: string }> {
  const lovable = cleanEnv(process.env.LOVABLE_API_KEY);
  const openai = cleanEnv(process.env.OPENAI_API_KEY);
  const useLovable = Boolean(lovable) && model !== "openai";

  if (useLovable) {
    const lovableModel =
      model === "nano-pro"
        ? "google/gemini-3.1-flash-image-preview"
        : "google/gemini-2.5-flash-image";
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovable}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: lovableModel,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (r.status === 429) throw new Error("Rate limit on image gateway. Wait a moment.");
    if (r.status === 402) throw new Error("AI credits exhausted.");
    if (!r.ok) throw new Error(`Image gateway error (${r.status})`);
    const j = await r.json();
    const dataUrl: string | undefined = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) throw new Error("No image returned");
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.slice(5, meta.indexOf(";"));
    const ext = mime.split("/")[1] ?? "png";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return { bytes, mime, ext };
  }

  if (!openai) {
    throw new Error("AI not configured. Set OPENAI_API_KEY in .env and restart the dev server.");
  }

  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openai}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1536",
      quality: "high",
      n: 1,
    }),
  });
  if (r.status === 429) throw new Error("OpenAI rate limit. Wait a moment.");
  if (!r.ok) {
    const t = await r.text();
    console.error("OpenAI image error", r.status, t);
    throw new Error(`OpenAI image error (${r.status}): ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  const b64: string | undefined = j.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI");
  return {
    bytes: Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
    mime: "image/png",
    ext: "png",
  };
}
