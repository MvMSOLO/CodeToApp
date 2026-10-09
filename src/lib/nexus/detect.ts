import type { Mode } from "./types";

export function detectMode(text: string, filename?: string): Mode | null {
  const ext = filename?.split(".").pop()?.toLowerCase();
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "json") return "json";
  if (ext === "dart") return "flutter";
  const t = text.trim();
  if (!t) return null;
  const head = t.slice(0, 4000);
  if (t.startsWith("{") || t.startsWith("[")) return "json";
  if (/<!doctype html|<html[\s>]|<body[\s>]|<head[\s>]/i.test(head)) return "html";
  if (/package:flutter|StatelessWidget|StatefulWidget|Widget\s+build|NexusApp\s*\(|runApp\s*\(|MaterialApp\s*\(/m.test(head)) {
    return "flutter";
  }
  if (/<(div|style|script|section|main|span|button|canvas)\b/i.test(head)) return "html";
  if (/\bScaffold\s*\(/.test(head) || /\bColumn\s*\(/.test(head)) return "flutter";
  return null;
}

export function inferTitle(mode: Mode, code: string): string {
  if (mode === "json") {
    try {
      const value = JSON.parse(code) as { title?: unknown };
      if (typeof value.title === "string" && value.title.trim()) return value.title.trim().slice(0, 48);
    } catch {
      /* keep looking */
    }
  }
  const titled = code.match(/<title>([^<]{1,60})<\/title>/i);
  if (titled?.[1]) return titled[1].trim();
  const line = code.split("\n").find((row) => {
    const trimmed = row.trim();
    return trimmed && !trimmed.startsWith("import") && !trimmed.startsWith("//") && !trimmed.startsWith("/*");
  });
  return (line ?? mode).trim().slice(0, 42);
}

export function lineDelta(current: string, previous: string): { added: number; removed: number } {
  const bag = new Map<string, number>();
  for (const line of previous.split("\n")) bag.set(line, (bag.get(line) ?? 0) + 1);
  let added = 0;
  for (const line of current.split("\n")) {
    const n = bag.get(line) ?? 0;
    if (n > 0) bag.set(line, n - 1);
    else added += 1;
  }
  let removed = 0;
  for (const n of bag.values()) removed += n;
  return { added, removed };
}
