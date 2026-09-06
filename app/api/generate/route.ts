// app/api/generate/route.ts
// Javari Marketing — AI Content Generator
// COST LAW: Groq free -> OpenAI fallback
// CR AudioViz AI EIN 39-3646201 June 2026
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

async function ai(prompt: string): Promise<string> {
  const gk = process.env.GROQ_API_KEY ?? "";
  if (gk) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + gk },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          max_tokens: 1500,
          temperature: 0.85,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (r.ok) {
        const d = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
        const t = d.choices?.[0]?.message?.content ?? "";
        if (t.trim()) return t;
      }
    } catch (_) { /* next provider */ }
  }
  const ok = process.env.OPENAI_API_KEY ?? "";
  if (ok) {
    try {
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + ok },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1500,
          temperature: 0.85,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (r.ok) {
        const d = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
        return d.choices?.[0]?.message?.content ?? "";
      }
    } catch (_) { /* next provider */ }
  }
  const ak = process.env.ANTHROPIC_API_KEY ?? "";
  if (ak) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ak,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(25000),
    });
    const d = await r.json() as { content?: Array<{ text?: string }> };
    return d.content?.[0]?.text ?? "";
  }
  throw new Error("No AI providers available");
}

function splitHashtags(raw: string): { content: string; hashtags: string[] } {
  if (!raw.trim()) return { content: "", hashtags: [] };
  const lines = raw.trim().split("\n");
  const lastLine = lines[lines.length - 1]?.trim() ?? "";
  const words = lastLine.split(/\s+/).filter(Boolean);
  const allTags = words.length > 0 && words.every((w) => w.startsWith("#"));
  if (allTags) {
    const hashtags = words.slice(0, 20);
    const content = lines.slice(0, -1).join("\n").trim();
    return { content: content || raw.trim(), hashtags };
  }
  const tags = raw.match(/#\w{2,30}/g) ?? [];
  return { content: raw.trim(), hashtags: tags.slice(0, 20) };
}

const RULES: Record<string, string> = {
  instagram: "Instagram: engaging hook in first line, emojis naturally, 5-10 hashtags on last line, max 2200 chars",
  linkedin: "LinkedIn: professional yet personal, first 200 chars must compel see-more, data or insight, end with question, max 3000 chars",
  twitter: "X Twitter: under 250 chars total, punchy hook, max 2 hashtags inline",
  facebook: "Facebook: 2-3 paragraphs, conversational storytelling, question at end",
  tiktok: "TikTok: under 120 chars, energetic Gen-Z tone, 3-5 hashtags",
  threads: "Threads: casual authentic voice, under 400 chars",
  youtube: "YouTube Community: 2-3 engaging sentences, ask for engagement",
  pinterest: "Pinterest: keyword-rich, under 500 chars, focus on outcome",
  discord: "Discord: community-first, casual and welcoming, under 300 chars",
  telegram: "Telegram: clear direct announcement, under 400 chars",
  bluesky: "Bluesky: thoughtful and authentic, under 280 chars",
  mastodon: "Mastodon: open-web values, community-oriented, under 500 chars",
  craudiovizai: "CR AudioViz AI platform: brand voice, highlight platform mission and impact",
  javariai: "Javari AI: showcase AI power, highlight specific feature, direct and compelling",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type?: string;
      platform?: string;
      tone?: string;
      brief?: string;
      brand?: string;
      contentType?: string;
      title?: string;
      cadenceDays?: number;
    };

    const type = body.type ?? "social";
    const platform = body.platform ?? "instagram";
    const tone = body.tone ?? "professional";
    const brief = body.brief ?? "";
    const brand = body.brand ?? "CR AudioViz AI";
    const contentType = body.contentType ?? "post";

    if (type === "social") {
      const rule = RULES[platform] ?? "Write an engaging social media post appropriate for the platform.";
      const prompt =
        "You are a world-class social media copywriter.\n" +
        "Brand: " + brand + "\n" +
        "Platform: " + rule + "\n" +
        "Tone: " + tone + "\n" +
        "Content type: " + contentType + "\n\n" +
        "Write a " + contentType + " about this topic:\n" + brief + "\n\n" +
        "Rules:\n" +
        "- Write ONLY the post. No intro, no labels, no quotation marks.\n" +
        "- Start directly with the content.\n" +
        "- If hashtags are appropriate, put them on the final line only.";

      const raw = await ai(prompt);
      const { content, hashtags } = splitHashtags(raw);
      return NextResponse.json({ content, hashtags, platform, tone });
    }

    if (type === "ebook_split") {
      const ebookContent = brief;
      const title = body.title ?? "Ebook";
      const cadenceDays = body.cadenceDays ?? 7;
      const wordCount = ebookContent.split(/\s+/).length;
      const target = Math.min(Math.max(Math.floor(wordCount / 400), 4), 12);

      const prompt =
        "Split this ebook into exactly " + target + " chapters for a weekly drip email campaign.\n" +
        "Ebook title: " + title + "\n\n" +
        "Content:\n" + ebookContent.slice(0, 8000) + "\n\n" +
        "Return a JSON array with " + target + " objects. Each object must have exactly these keys:\n" +
        "title (string), content (string, 300+ words), teaser (string, one cliffhanger sentence).\n" +
        "Return ONLY valid JSON. No markdown, no explanation.";

      const raw = await ai(prompt, 4000);
      type Chapter = { title: string; content: string; teaser: string };
      let chapters: Chapter[] = [];
      try {
        const s = raw.indexOf("[");
        const e = raw.lastIndexOf("]");
        if (s !== -1 && e > s) chapters = JSON.parse(raw.slice(s, e + 1)) as Chapter[];
      } catch (_) {
        chapters = [{ title: title, content: ebookContent.slice(0, 2000), teaser: "More coming next week!" }];
      }
      if (!chapters.length) {
        chapters = [{ title: title, content: ebookContent.slice(0, 2000), teaser: "Stay tuned!" }];
      }
      return NextResponse.json({ chapters, totalChapters: chapters.length, cadenceDays });
    }

    return NextResponse.json({ error: "Unknown type: " + type }, { status: 400 });

  } catch (err) {
    console.error("[generate]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

