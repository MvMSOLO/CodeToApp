import { createServerFn } from "@tanstack/react-start";

export interface FixInput {
  mode: "html" | "json" | "flutter";
  code: string;
  error: string;
}

export type FixResult =
  | { ok: true; code: string; note: string }
  | { ok: false; error: string };

export const fixSource = createServerFn({ method: "POST" })
  .validator((input: FixInput) => {
    const mode = input?.mode === "html" || input?.mode === "flutter" ? input.mode : "json";
    const code = String(input?.code ?? "").slice(0, 8000);
    const error = String(input?.error ?? "").slice(0, 800);
    if (!code.trim()) throw new Error("Nothing to fix.");
    return { mode, code, error };
  })
  .handler(async ({ data }): Promise<FixResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "AI repair is not available in this environment." };
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        max_tokens: 2500,
        messages: [
          {
            role: "user",
            content:
              "You repair source for Nexus Runner. Return ONLY the corrected source, no markdown fences and no commentary. " +
              `Mode: ${data.mode}. ${data.mode === "json" ? "Output must be valid JSON." : ""} ` +
              `${data.mode === "flutter" ? "Keep the Nexus widget dialect: NexusApp, nexus.inc, nexus.nav, nexus.set, nexus.pick. Do not invent Flutter SDK imports unless they were already there." : ""} ` +
              `Known problem: ${data.error || "unknown"}\n\nSOURCE:\n${data.code}`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: false, error: `AI repair failed (${res.status}).` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content ?? "";
    const code = extractCode(text, data.mode);
    if (!code.trim()) return { ok: false, error: "AI returned an empty suggestion." };
    return { ok: true, code, note: "Suggestion from Grok. Nothing is applied until you tap Apply." };
  });

function extractCode(text: string, mode: string): string {
  const fenced = /```(?:html|json|dart|flutter|javascript)?\s*([\s\S]*?)```/i.exec(text);
  let body = (fenced?.[1] ?? text).trim();
  if (mode === "json") {
    const start = body.indexOf("{");
    const alt = body.indexOf("[");
    const cut = start < 0 ? alt : alt < 0 ? start : Math.min(start, alt);
    if (cut >= 0) {
      const endObj = body.lastIndexOf("}");
      const endArr = body.lastIndexOf("]");
      const end = Math.max(endObj, endArr);
      if (end > cut) {
        const slice = body.slice(cut, end + 1);
        try {
          JSON.parse(slice);
          return slice;
        } catch {
          /* keep body */
        }
      }
    }
  }
  return body;
}
