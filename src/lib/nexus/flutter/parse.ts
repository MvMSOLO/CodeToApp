export interface FCall {
  kind: "call";
  name: string;
  positional: FVal[];
  named: Record<string, FVal>;
}

export type FVal =
  | { kind: "str"; v: string }
  | { kind: "num"; v: number }
  | { kind: "bool"; v: boolean }
  | { kind: "null" }
  | { kind: "ident"; v: string }
  | { kind: "list"; v: FVal[] }
  | { kind: "map"; v: Record<string, FVal> }
  | FCall;

export interface FlutterDoc {
  state: Record<string, string | number | boolean>;
  root: FCall;
  warnings: string[];
}

const MAX_NODES = 8000;

export function parseFlutter(source: string): FlutterDoc {
  if (source.length > 1_000_000) throw new Error("Source is too large to interpret.");
  if (!source.trim()) throw new Error("Flutter source is empty.");
  const state = extractState(source);
  const start = findEntry(source);
  if (start < 0) {
    throw new Error("No widget tree found. Start with NexusApp(, Scaffold(, or MaterialApp(.");
  }
  const parser = new Parser(source, start);
  const root = parser.parseValue();
  if (root.kind !== "call") throw new Error("Expected a widget constructor.");
  return { state, root, warnings: parser.warnings };
}

export function countCalls(node: FVal | null | undefined, depth = 0): { nodes: number; depth: number } {
  if (!node || node.kind !== "call") return { nodes: 0, depth };
  let nodes = 1;
  let max = depth;
  const visit = (v: FVal) => {
    if (v.kind === "call") {
      const inner = countCalls(v, depth + 1);
      nodes += inner.nodes;
      max = Math.max(max, inner.depth);
    } else if (v.kind === "list") {
      for (const item of v.v) visit(item);
    } else if (v.kind === "map") {
      for (const item of Object.values(v.v)) visit(item);
    }
  };
  for (const v of node.positional) visit(v);
  for (const v of Object.values(node.named)) visit(v);
  return { nodes, depth: max };
}

function findEntry(src: string): number {
  const patterns = [/NexusApp\s*\(/, /MaterialApp\s*\(/, /Scaffold\s*\(/, /runApp\s*\(/];
  for (const re of patterns) {
    const match = re.exec(src);
    if (match && match.index >= 0) return match.index;
  }
  return -1;
}

function extractState(src: string): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  let i = 0;
  let depth = 0;
  while (i < src.length) {
    const c = src[i] ?? "";
    if (c === "/" && src[i + 1] === "/") {
      const eol = src.indexOf("\n", i);
      const line = src.slice(i, eol === -1 ? src.length : eol);
      const noted = /@state\s+(\w+)\s*=\s*(.+)$/.exec(line);
      if (noted) out[noted[1]] = coerce(noted[2].trim());
      i = eol === -1 ? src.length : eol + 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      i = skipString(src, i);
      continue;
    }
    if (c === "(" || c === "{" || c === "[") {
      depth += 1;
      i += 1;
      continue;
    }
    if (c === ")" || c === "}" || c === "]") {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }
    if (depth === 0 && /[A-Za-z]/.test(c)) {
      const m = /^(?:int|double|num|bool|String|var|final|const)\s+(\w+)\s*=\s*/.exec(src.slice(i));
      if (m) {
        i += m[0].length;
        const valStart = i;
        let d = 0;
        while (i < src.length) {
          const ch = src[i] ?? "";
          if (ch === "'" || ch === '"') {
            i = skipString(src, i);
            continue;
          }
          if (ch === "(" || ch === "{" || ch === "[") d += 1;
          else if (ch === ")" || ch === "}" || ch === "]") d -= 1;
          else if (ch === ";" && d === 0) break;
          i += 1;
        }
        out[m[1]] = coerce(src.slice(valStart, i).trim());
        if (src[i] === ";") i += 1;
        continue;
      }
    }
    i += 1;
  }
  return out;
}

function coerce(raw: string): string | number | boolean {
  const t = raw.replace(/;$/, "").trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function skipString(src: string, i: number): number {
  const q = src[i];
  if ((q === "'" || q === '"') && src.startsWith(q + q + q, i)) {
    const end = src.indexOf(q + q + q, i + 3);
    return end === -1 ? src.length : end + 3;
  }
  i += 1;
  while (i < src.length && src[i] !== q) {
    if (src[i] === "\\") i += 2;
    else i += 1;
  }
  return Math.min(src.length, i + 1);
}

class Parser {
  i: number;
  warnings: string[] = [];
  private nodes = 0;

  constructor(
    private readonly src: string,
    start: number,
  ) {
    this.i = start;
  }

  private get ch() {
    return this.src[this.i] ?? "";
  }

  private err(message: string): Error {
    const line = this.src.slice(0, this.i).split("\n").length;
    return new Error(`${message} (line ${line})`);
  }

  private skipWs() {
    const s = this.src;
    while (this.i < s.length) {
      const c = s[this.i];
      if (c === " " || c === "\n" || c === "\r" || c === "\t") {
        this.i += 1;
        continue;
      }
      if (c === "/" && s[this.i + 1] === "/") {
        this.i += 2;
        while (this.i < s.length && s[this.i] !== "\n") this.i += 1;
        continue;
      }
      if (c === "/" && s[this.i + 1] === "*") {
        this.i += 2;
        while (this.i < s.length && !(s[this.i] === "*" && s[this.i + 1] === "/")) this.i += 1;
        if (this.i < s.length) this.i += 2;
        continue;
      }
      break;
    }
  }

  parseValue(): FVal {
    this.skipWs();
    if (this.i >= this.src.length) throw this.err("Unexpected end of source");
    if (this.ch === "r" && (this.src[this.i + 1] === "'" || this.src[this.i + 1] === '"')) this.i += 1;
    if (this.ch === "'" || this.ch === '"') return this.parseString();
    if (this.ch === "[") return this.parseList();
    if (this.ch === "{") return this.parseMapOrSet();
    if (this.ch === "<") {
      this.skipAngles();
      return this.parseValue();
    }
    if (this.ch === "(") return this.parseGroupOrClosure();
    if (/[0-9]/.test(this.ch) || (this.ch === "-" && /[0-9]/.test(this.src[this.i + 1] ?? ""))) {
      return this.parseNumber();
    }
    if (!/[A-Za-z_]/.test(this.ch)) throw this.err(`Unexpected "${this.ch || "EOF"}"`);
    const name = this.readIdent();
    if (name === "true") return { kind: "bool", v: true };
    if (name === "false") return { kind: "bool", v: false };
    if (name === "null") return { kind: "null" };
    if (name === "const" || name === "new" || name === "required" || name === "final") return this.parseValue();
    this.skipWs();
    if (this.ch === "<") {
      this.skipAngles();
      this.skipWs();
    }
    if (this.ch === "(") return this.parseCallRest(name);
    return { kind: "ident", v: name };
  }

  private parseCallRest(name: string): FCall {
    if (this.ch !== "(") throw this.err("Expected (");
    this.i += 1;
    this.nodes += 1;
    if (this.nodes > MAX_NODES) throw this.err("Widget tree exceeds the safety limit");
    const positional: FVal[] = [];
    const named: Record<string, FVal> = {};
    while (this.i < this.src.length) {
      this.skipWs();
      if (this.ch === ")") {
        this.i += 1;
        break;
      }
      if (this.ch === ",") {
        this.i += 1;
        continue;
      }
      const before = this.i;
      try {
        if (/[A-Za-z_]/.test(this.ch)) {
          const mark = this.i;
          const ident = this.readIdent();
          this.skipWs();
          if (this.ch === ":") {
            this.i += 1;
            named[ident] = this.parseValue();
          } else {
            this.i = mark;
            positional.push(this.parseValue());
          }
        } else {
          positional.push(this.parseValue());
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not read argument";
        if (this.warnings.length < 12) this.warnings.push(message);
        if (this.i === before) this.i += 1;
        this.skipToArgBoundary();
      }
      this.skipWs();
      if (this.ch === ",") this.i += 1;
    }
    this.skipTrailingCalls();
    return { kind: "call", name, positional, named };
  }

  private skipTrailingCalls() {
    this.skipWs();
    while (this.ch === "." && this.src[this.i + 1] !== ".") {
      const mark = this.i;
      this.i += 1;
      if (!/[A-Za-z_]/.test(this.ch)) {
        this.i = mark;
        return;
      }
      this.readIdent();
      this.skipWs();
      if (this.ch === "(") this.skipBalanced("(", ")");
      else {
        this.i = mark;
        return;
      }
      this.skipWs();
    }
  }

  private parseGroupOrClosure(): FVal {
    const close = this.matchBalanced(this.i, "(", ")");
    let j = close + 1;
    while (this.src[j] === " " || this.src[j] === "\n" || this.src[j] === "\t" || this.src[j] === "\r") j += 1;
    const arrow = this.src.startsWith("=>", j);
    const block = this.src[j] === "{";
    if (arrow) {
      this.i = j + 2;
      this.skipWs();
      if (this.ch === "{") {
        this.skipBalanced("{", "}");
        if (this.warnings.length < 12) this.warnings.push("Ignored a closure body. Use nexus.inc(), nexus.nav(), or nexus.set().");
        return { kind: "null" };
      }
      return this.parseValue();
    }
    if (block) {
      this.i = j;
      this.skipBalanced("{", "}");
      if (this.warnings.length < 12) this.warnings.push("Ignored a closure body. Use nexus.inc(), nexus.nav(), or nexus.set().");
      return { kind: "null" };
    }
    this.i += 1;
    const value = this.parseValue();
    this.skipWs();
    if (this.ch === ")") this.i += 1;
    return value;
  }

  private parseList(): FVal {
    this.i += 1;
    const v: FVal[] = [];
    while (this.i < this.src.length) {
      this.skipWs();
      if (this.ch === "]") {
        this.i += 1;
        break;
      }
      if (this.ch === ",") {
        this.i += 1;
        continue;
      }
      if (this.ch === "<") {
        this.skipAngles();
        continue;
      }
      const before = this.i;
      try {
        v.push(this.parseValue());
      } catch (error) {
        if (this.warnings.length < 12) {
          this.warnings.push(error instanceof Error ? error.message : "Skipped a list entry");
        }
        if (this.i === before) this.i += 1;
        this.skipToListBoundary();
      }
    }
    return { kind: "list", v };
  }

  private parseMapOrSet(): FVal {
    this.i += 1;
    this.skipWs();
    if (this.ch === "}") {
      this.i += 1;
      return { kind: "map", v: {} };
    }
    const first = this.parseValue();
    this.skipWs();
    if (this.ch === ":") {
      const map: Record<string, FVal> = {};
      const key = mapKey(first);
      this.i += 1;
      if (key) map[key] = this.parseValue();
      while (this.i < this.src.length) {
        this.skipWs();
        if (this.ch === "}") {
          this.i += 1;
          break;
        }
        if (this.ch === ",") {
          this.i += 1;
          this.skipWs();
          if (this.ch === "}") {
            this.i += 1;
            break;
          }
          const kVal = this.parseValue();
          this.skipWs();
          if (this.ch === ":") {
            this.i += 1;
            const k = mapKey(kVal);
            if (k) map[k] = this.parseValue();
          }
          continue;
        }
        break;
      }
      return { kind: "map", v: map };
    }
    const list = [first];
    while (this.i < this.src.length) {
      this.skipWs();
      if (this.ch === "}") {
        this.i += 1;
        break;
      }
      if (this.ch === ",") {
        this.i += 1;
        this.skipWs();
        if (this.ch === "}") {
          this.i += 1;
          break;
        }
        list.push(this.parseValue());
        continue;
      }
      break;
    }
    return { kind: "list", v: list };
  }

  private parseString(): FVal {
    const q = this.ch;
    if (this.src.startsWith(q + q + q, this.i)) {
      const end = this.src.indexOf(q + q + q, this.i + 3);
      if (end < 0) throw this.err("Unterminated string");
      const v = this.src.slice(this.i + 3, end);
      this.i = end + 3;
      return { kind: "str", v };
    }
    this.i += 1;
    let out = "";
    while (this.i < this.src.length && this.src[this.i] !== q) {
      if (this.src[this.i] === "\\") {
        const n = this.src[this.i + 1] ?? "";
        const map: Record<string, string> = { n: "\n", t: "\t", r: "\r", "\\": "\\", "'": "'", '"': '"' };
        out += map[n] ?? n;
        this.i += 2;
        continue;
      }
      if (this.src[this.i] === "$") {
        if (this.src[this.i + 1] === "{") {
          const start = this.i;
          this.i += 2;
          let d = 1;
          while (this.i < this.src.length && d > 0) {
            if (this.src[this.i] === "{") d += 1;
            else if (this.src[this.i] === "}") d -= 1;
            this.i += 1;
          }
          out += this.src.slice(start, this.i);
          continue;
        }
        const m = /^\$[A-Za-z_]\w*/.exec(this.src.slice(this.i));
        if (m) {
          out += m[0];
          this.i += m[0].length;
          continue;
        }
      }
      out += this.src[this.i];
      this.i += 1;
    }
    if (this.src[this.i] !== q) throw this.err("Unterminated string");
    this.i += 1;
    return { kind: "str", v: out };
  }

  private parseNumber(): FVal {
    if (this.src.startsWith("0x", this.i) || this.src.startsWith("0X", this.i)) {
      const m = /^0x[0-9a-fA-F]+/i.exec(this.src.slice(this.i));
      if (!m) throw this.err("Bad hex number");
      this.i += m[0].length;
      return { kind: "num", v: Number(m[0]) };
    }
    const m = /^-?\d+(?:\.\d+)?/.exec(this.src.slice(this.i));
    if (!m) throw this.err("Bad number");
    this.i += m[0].length;
    this.skipTrailingCalls();
    return { kind: "num", v: Number(m[0]) };
  }

  private readIdent(): string {
    const start = this.i;
    if (!/[A-Za-z_]/.test(this.ch)) throw this.err("Expected a name");
    this.i += 1;
    while (/[A-Za-z0-9_]/.test(this.src[this.i] ?? "")) this.i += 1;
    while (
      this.src[this.i] === "." &&
      this.src[this.i + 1] !== "." &&
      /[A-Za-z_]/.test(this.src[this.i + 1] ?? "")
    ) {
      this.i += 1;
      while (/[A-Za-z0-9_]/.test(this.src[this.i] ?? "")) this.i += 1;
    }
    return this.src.slice(start, this.i);
  }

  private skipAngles() {
    if (this.ch !== "<") return;
    let d = 0;
    while (this.i < this.src.length) {
      const c = this.src[this.i];
      if (c === "'" || c === '"') {
        this.i = skipString(this.src, this.i);
        continue;
      }
      if (c === "<") d += 1;
      else if (c === ">") {
        d -= 1;
        this.i += 1;
        if (d === 0) return;
        continue;
      }
      this.i += 1;
    }
  }

  private skipBalanced(open: string, close: string) {
    const end = this.matchBalanced(this.i, open, close);
    this.i = Math.min(this.src.length, end + 1);
  }

  private matchBalanced(from: number, open: string, close: string): number {
    let d = 0;
    let i = from;
    const s = this.src;
    while (i < s.length) {
      const c = s[i];
      if (c === "'" || c === '"') {
        i = skipString(s, i);
        continue;
      }
      if (c === "/" && s[i + 1] === "/") {
        i = s.indexOf("\n", i);
        if (i < 0) return s.length - 1;
        continue;
      }
      if (c === open) d += 1;
      else if (c === close) {
        d -= 1;
        if (d === 0) return i;
      }
      i += 1;
    }
    return s.length - 1;
  }

  private skipToArgBoundary() {
    let d = 0;
    while (this.i < this.src.length) {
      const c = this.src[this.i] ?? "";
      if (c === "'" || c === '"') {
        this.i = skipString(this.src, this.i);
        continue;
      }
      if (c === "(" || c === "{" || c === "[") d += 1;
      else if (c === ")" || c === "}" || c === "]") {
        if (d === 0 && c === ")") return;
        d = Math.max(0, d - 1);
      } else if (c === "," && d === 0) return;
      this.i += 1;
    }
  }

  private skipToListBoundary() {
    let d = 0;
    while (this.i < this.src.length) {
      const c = this.src[this.i] ?? "";
      if (c === "'" || c === '"') {
        this.i = skipString(this.src, this.i);
        continue;
      }
      if (c === "(" || c === "{" || c === "[") d += 1;
      else if (c === "]" && d === 0) return;
      else if (c === ")" || c === "}" || c === "]") d = Math.max(0, d - 1);
      else if (c === "," && d === 0) return;
      this.i += 1;
    }
  }
}

function mapKey(v: FVal): string | null {
  if (v.kind === "str" || v.kind === "ident") return v.v;
  if (v.kind === "num") return String(v.v);
  return null;
}

export function strVal(v: FVal | undefined): string | null {
  if (!v) return null;
  if (v.kind === "str") return v.v;
  if (v.kind === "ident") return v.v;
  if (v.kind === "num") return String(v.v);
  return null;
}

export function numVal(v: FVal | undefined): number | null {
  if (!v) return null;
  if (v.kind === "num") return v.v;
  if (v.kind === "str" && /^-?\d+(\.\d+)?$/.test(v.v)) return Number(v.v);
  return null;
}

export function initialFlutterState(doc: FlutterDoc): Record<string, string | number | boolean> {
  const state = { ...doc.state };
  if (doc.root.name === "NexusApp") {
    const start = strVal(doc.root.named.start) ?? "home";
    if (state.screen == null) state.screen = start;
  }
  return state;
}
