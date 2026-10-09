export interface JAnimate {
  enter?: string;
  delay?: number;
  stagger?: number;
  press?: string;
  loop?: string;
}

export interface JNode {
  type?: string;
  children?: JNode[];
  child?: JNode;
  text?: string;
  style?: Record<string, unknown>;
  animate?: JAnimate;
  onTap?: unknown;
  onLongPress?: unknown;
  onSwipeLeft?: unknown;
  onSwipeRight?: unknown;
  [key: string]: unknown;
}

export interface JDoc {
  kind: "app" | "node" | "lens";
  title: string;
  background?: string;
  state: Record<string, unknown>;
  data: Record<string, unknown>;
  screens: Record<string, JNode>;
  node?: JNode;
  raw: unknown;
}

export function parseJsonValue(
  code: string,
): { ok: true; value: unknown } | { ok: false; error: string; line?: number; column?: number } {
  try {
    return { ok: true, value: JSON.parse(code) as unknown };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    const pos = /position (\d+)/.exec(message);
    if (!pos) return { ok: false, error: message };
    const index = Number(pos[1]);
    const head = code.slice(0, index);
    const line = head.split("\n").length;
    const column = index - head.lastIndexOf("\n");
    return { ok: false, error: `Line ${line}, column ${column}: ${message}`, line, column };
  }
}

export function interpretJson(value: unknown): JDoc {
  if (isObj(value)) {
    const state = isObj(value.state) ? { ...value.state } : {};
    const data = isObj(value.data) ? { ...value.data } : {};
    const title = typeof value.title === "string" ? value.title : "JSON";
    const background = typeof value.background === "string" ? value.background : undefined;
    if (isObj(value.screens)) {
      const screens = value.screens as Record<string, JNode>;
      const first = Object.keys(screens)[0];
      if (state.screen == null && first) state.screen = first;
      return { kind: "app", title, background, state, data, screens, raw: value };
    }
    if (typeof value.type === "string") {
      return { kind: "node", title, background, state, data, screens: {}, node: value as JNode, raw: value };
    }
  }
  return {
    kind: "lens",
    title: Array.isArray(value) ? "JSON list" : "JSON value",
    state: {},
    data: {},
    screens: {},
    raw: value,
  };
}

export function summarize(value: unknown, cap = 5000): {
  nodes: number;
  depth: number;
  types: Record<string, number>;
  capped: boolean;
} {
  const types: Record<string, number> = {};
  let nodes = 0;
  let depth = 0;
  let capped = false;
  const walk = (node: unknown, level: number) => {
    if (nodes >= cap) {
      capped = true;
      return;
    }
    if (!node || typeof node !== "object") return;
    nodes += 1;
    depth = Math.max(depth, level);
    if (!Array.isArray(node) && typeof (node as JNode).type === "string") {
      const kind = (node as JNode).type as string;
      types[kind] = (types[kind] ?? 0) + 1;
    }
    const kids = Array.isArray(node) ? node : Object.values(node);
    for (const kid of kids) walk(kid, level + 1);
  };
  walk(value, 1);
  return { nodes, depth, types, capped };
}

function isObj(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
