import { parseFlutter } from "./flutter/parse";
import type { JNode } from "./json/interpret";
import type { Mode } from "./types";

export interface RepairResult {
  code: string;
  notes: string[];
  ok: boolean;
}

export function localRepair(mode: Mode, code: string): RepairResult {
  if (mode === "json") return repairJson(code);
  if (mode === "flutter") return repairFlutter(code);
  return repairHtml(code);
}

export function formatJson(code: string): string | null {
  try {
    return JSON.stringify(JSON.parse(code) as unknown, null, 2);
  } catch {
    return null;
  }
}

/** Voice edit: bump authored font sizes on buttons or text. */
export function enlargeJson(code: string, target: "button" | "text"): string | null {
  try {
    const value = JSON.parse(code) as unknown;
    let hits = 0;
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      if (!Array.isArray(node)) {
        const item = node as JNode;
        if (item.type === target || (target === "button" && item.type === "button")) {
          const style = (item.style ??= {});
          const current = typeof style.fontSize === "number" ? style.fontSize : target === "button" ? 16 : 16;
          style.fontSize = current + 2;
          hits += 1;
        }
      }
      const kids = Array.isArray(node) ? node : Object.values(node as object);
      for (const kid of kids) walk(kid);
    };
    walk(value);
    if (!hits) return null;
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

function repairJson(code: string): RepairResult {
  const notes: string[] = [];
  let next = code.replace(/^\uFEFF/, "");
  const straight = next.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if (straight !== next) notes.push("Straightened curly quotes.");
  next = straight;
  const uncommented = stripJsonComments(next);
  if (uncommented !== next) notes.push("Removed comments.");
  next = uncommented;
  const noTrail = next.replace(/,\s*([}\]])/g, "$1");
  if (noTrail !== next) notes.push("Removed trailing commas.");
  next = noTrail;
  try {
    const parsed = JSON.parse(next) as unknown;
    const pretty = JSON.stringify(parsed, null, 2);
    if (!notes.length && pretty === code) return { code, notes: [], ok: true };
    if (pretty !== next) notes.push("Formatted the schema.");
    return { code: pretty, notes, ok: true };
  } catch {
    return { code, notes, ok: false };
  }
}

function repairFlutter(code: string): RepairResult {
  const notes: string[] = [];
  let next = code.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if (next !== code) notes.push("Straightened curly quotes.");
  const missing = unmatchedClosers(next);
  if (missing) {
    next += missing;
    notes.push("Closed unmatched brackets.");
  }
  try {
    parseFlutter(next);
    if (!notes.length) return { code, notes: [], ok: true };
    return { code: next, notes, ok: true };
  } catch {
    return { code, notes, ok: false };
  }
}

function repairHtml(code: string): RepairResult {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      code: "<!doctype html><html><head><meta charset=\"utf-8\"></head><body><p>Empty page.</p></body></html>",
      notes: ["Started a blank document."],
      ok: true,
    };
  }
  if (!/<\w+/.test(trimmed)) {
    const safe = trimmed.replace(/[&<>]/g, (ch) => ({ "&": "&", "<": "<", ">": ">" })[ch] ?? ch);
    return {
      code: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><pre>${safe}</pre></body></html>`,
      notes: ["Wrapped plain text in a document."],
      ok: true,
    };
  }
  if (!/<html[\s>]/i.test(trimmed)) {
    return {
      code: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n${trimmed}\n</body></html>`,
      notes: ["Wrapped a fragment in a document."],
      ok: true,
    };
  }
  return { code, notes: [], ok: true };
}

function stripJsonComments(input: string): string {
  let out = "";
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === '"') {
      const start = i;
      i += 1;
      while (i < input.length) {
        if (input[i] === "\\") i += 2;
        else if (input[i] === '"') {
          i += 1;
          break;
        } else i += 1;
      }
      out += input.slice(start, i);
      continue;
    }
    if (c === "/" && input[i + 1] === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && input[i + 1] === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i += 1;
      i = Math.min(input.length, i + 2);
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function unmatchedClosers(input: string): string {
  const stack: string[] = [];
  let i = 0;
  const pair: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  while (i < input.length) {
    const c = input[i] ?? "";
    if (c === "'" || c === '"') {
      const q = c;
      i += 1;
      while (i < input.length && input[i] !== q) {
        if (input[i] === "\\") i += 2;
        else i += 1;
      }
      i += 1;
      continue;
    }
    if (c === "/" && input[i + 1] === "/") {
      i = input.indexOf("\n", i);
      if (i < 0) break;
      continue;
    }
    if (pair[c]) stack.push(pair[c]);
    else if (c === ")" || c === "}" || c === "]") {
      if (stack[stack.length - 1] === c) stack.pop();
    }
    i += 1;
  }
  return stack.reverse().join("");
}
