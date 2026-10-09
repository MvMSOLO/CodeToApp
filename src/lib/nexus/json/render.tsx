import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Heart, Plus, ShoppingBag, Sun } from "lucide-react";
import { LottieSlot } from "@/components/nexus/LottieSlot";
import { Scene3D } from "@/components/nexus/Scene3D";
import { evalExpr, interpolate, lookup, truthy } from "../expr";
import { interpretJson, parseJsonValue, type JDoc, type JNode } from "./interpret";

interface JsonApi {
  scope: Record<string, unknown>;
  update: (action: unknown, label?: string) => void;
  buzz: () => void;
}

const JsonCtx = createContext<JsonApi | null>(null);

function useJson(): JsonApi {
  return useContext(JsonCtx) ?? { scope: {}, update() {}, buzz() {} };
}

export function JsonStage({
  source,
  buzz,
  onLog,
}: {
  source: string;
  buzz?: () => void;
  onLog?: (line: string) => void;
}) {
  const parsed = useMemo(() => parseJsonValue(source), [source]);
  const doc = useMemo(() => (parsed.ok ? interpretJson(parsed.value) : null), [parsed]);
  const [seen, setSeen] = useState(source);
  const [state, setState] = useState<Record<string, unknown>>(() => (doc ? doc.state : {}));
  if (seen !== source) {
    setSeen(source);
    if (doc) setState(doc.state);
  }
  if (!parsed.ok || !doc) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 p-6">
        <p className="text-lg font-semibold text-balance">This JSON did not parse</p>
        <p className="text-sm text-muted">{parsed.ok ? "Empty document." : parsed.error}</p>
      </div>
    );
  }
  const scope = { ...doc.data, ...state };
  const api: JsonApi = {
    scope,
    buzz: () => buzz?.(),
    update: (action, label) => {
      buzz?.();
      setState((prev) => applyList(prev, action));
      if (label) onLog?.(label);
    },
  };
  return (
    <JsonCtx.Provider value={api}>
      <div className="nx-stage" style={{ height: "100%", background: doc.background ?? "#12151c", color: "#f3f0e8", overflow: "hidden" }}>
        {doc.kind === "lens" ? (
          <div style={{ height: "100%", overflow: "auto", padding: 16 }}>
            <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 600 }}>JSON lens</p>
            <p style={{ margin: "0 0 14px", color: "#9aa3b2", fontSize: 14 }}>
              This is not a Nexus schema. Every value is still laid out, and deep branches stay collapsed until you open them.
            </p>
            <Lens value={doc.raw} depth={0} />
          </div>
        ) : (
          <NodeView node={doc.kind === "app" ? screenOf(doc, state) : (doc.node as JNode)} index={0} depth={0} />
        )}
      </div>
    </JsonCtx.Provider>
  );
}

function screenOf(doc: JDoc, state: Record<string, unknown>): JNode {
  const name = String(state.screen ?? "");
  return doc.screens[name] ?? Object.values(doc.screens)[0] ?? { type: "text", text: "No screens in this schema." };
}

function NodeView({ node, index, depth }: { node: JNode | undefined; index: number; depth: number }): ReactNode {
  const ref = useInView(node?.animate?.enter === "scroll");
  const gesture = useGesture(node);
  if (!node || typeof node !== "object" || depth > 36) return null;
  const anim = animProps(node, index);
  const type = node.type ?? "box";
  if (type === "for") return <ForView node={node} depth={depth} />;
  if (type === "if") return <IfView node={node} index={index} depth={depth} />;
  if (type === "drag") return <DragView node={node} index={index} depth={depth} />;
  const style = frameStyle(node, type);
  return (
    <div ref={ref} className={anim.className} style={{ ...style, ...anim.style }} {...gesture}>
      {inner(node, type, index, depth)}
    </div>
  );
}

function inner(node: JNode, type: string, index: number, depth: number): ReactNode {
  const api = useJson();
  if (type === "text") {
    const Tag = node.role === "h1" ? "h1" : node.role === "h2" ? "h2" : "p";
    return (
      <Tag style={{ margin: 0, font: "inherit", fontSize: "inherit", fontWeight: "inherit", whiteSpace: "pre-wrap" }}>
        {interpolate(String(node.text ?? ""), api.scope)}
      </Tag>
    );
  }
  if (type === "button") {
    return (
      <button
        type="button"
        className="tap"
        onClick={(event) => {
          event.stopPropagation();
          api.update(node.onTap, "tap");
        }}
        style={buttonStyle(node)}
      >
        {node.text ? interpolate(String(node.text), api.scope) : null}
        {renderKids(node, depth)}
      </button>
    );
  }
  if (type === "input") {
    const bind = String(node.bind ?? "");
    const value = bind ? String(api.scope[bind] ?? "") : "";
    return (
      <input
        className="nx-input"
        aria-label={String(node.placeholder ?? bind ?? "Field")}
        placeholder={String(node.placeholder ?? "")}
        value={value}
        onPointerDown={(event) => event.stopPropagation()}
        onChange={(event) => api.update({ op: "set", key: bind, value: event.target.value })}
      />
    );
  }
  if (type === "toggle") {
    const bind = String(node.bind ?? "");
    const on = Boolean(api.scope[bind]);
    return (
      <button
        type="button"
        className="nx-toggle"
        role="switch"
        aria-checked={on}
        aria-label={bind || "Toggle"}
        onClick={(event) => {
          event.stopPropagation();
          api.update({ op: "toggle", key: bind }, "toggle");
        }}
      >
        <i />
      </button>
    );
  }
  if (type === "image") {
    const src = typeof node.src === "string" ? node.src : "";
    const safe = /^https?:\/\//i.test(src) || /^data:image\//i.test(src);
    if (!safe) return <div style={{ height: 96, borderRadius: 12, background: "color-mix(in oklab, currentColor 10%, transparent)" }} />;
    return <img src={src} alt={typeof node.alt === "string" ? node.alt : ""} style={{ width: "100%", objectFit: "cover", borderRadius: 12 }} />;
  }
  if (type === "icon") {
    const name = String(node.name ?? "");
    const Icon = name.includes("heart") ? Heart : name.includes("sun") ? Sun : name.includes("bag") ? ShoppingBag : Plus;
    return <Icon aria-hidden size={22} />;
  }
  if (type === "lottie") {
    const animation = node.animation && typeof node.animation === "object" ? (node.animation as object) : undefined;
    return <LottieSlot width={num(node.width) ?? 88} height={num(node.height) ?? 88} animation={animation} />;
  }
  if (type === "scene3d") return <Scene3D height={num(node.height) ?? 180} />;
  if (type === "divider") return <div role="separator" style={{ height: 1, background: "color-mix(in oklab, currentColor 18%, transparent)" }} />;
  if (type === "spacer") return <div style={{ height: num(node.height) ?? 8, width: num(node.width) ?? undefined }} />;
  return renderKids(node, depth);
}

function renderKids(node: JNode, depth: number) {
  const kids = childList(node);
  return kids.map((kid, i) => <NodeView key={i} node={kid} index={i} depth={depth + 1} />);
}

function ForView({ node, depth }: { node: JNode; depth: number }) {
  const api = useJson();
  const list = lookup(String(node.each ?? ""), api.scope);
  const items = Array.isArray(list) ? list.slice(0, 200) : [];
  const as = String(node.as ?? "item");
  const template = node.template as JNode | undefined;
  if (!template || typeof template !== "object") return null;
  return (
    <>
      {items.map((item, i) => (
        <JsonCtx.Provider key={i} value={{ ...api, scope: { ...api.scope, [as]: item, index: i } }}>
          <NodeView node={template} index={i} depth={depth + 1} />
        </JsonCtx.Provider>
      ))}
    </>
  );
}

function IfView({ node, index, depth }: { node: JNode; index: number; depth: number }) {
  const api = useJson();
  const ok = truthy(evalExpr(String(node.when ?? ""), api.scope));
  const branch = (ok ? node.then : node.else) as JNode | undefined;
  if (!branch || typeof branch !== "object") return null;
  return <NodeView node={branch} index={index} depth={depth + 1} />;
}

function DragView({ node, index, depth }: { node: JNode; index: number; depth: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const origin = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const child = node.child as JNode | undefined;
  return (
    <div
      ref={ref}
      style={{ touchAction: "none", width: "fit-content" }}
      onPointerDown={(event) => {
        event.stopPropagation();
        const host = event.currentTarget;
        host.setPointerCapture(event.pointerId);
        origin.current = { x: event.clientX, y: event.clientY, px: origin.current.px, py: origin.current.py };
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const x = origin.current.px + event.clientX - origin.current.x;
        const y = origin.current.py + event.clientY - origin.current.y;
        event.currentTarget.style.transform = `translate(${x}px, ${y}px)`;
      }}
      onPointerUp={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        origin.current.px += event.clientX - origin.current.x;
        origin.current.py += event.clientY - origin.current.y;
        origin.current.x = event.clientX;
        origin.current.y = event.clientY;
      }}
    >
      {child ? <NodeView node={child} index={index} depth={depth + 1} /> : null}
    </div>
  );
}

function Lens({ value, label, depth }: { value: unknown; label?: string; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const [limit, setLimit] = useState(24);
  const complex = Boolean(value) && typeof value === "object";
  const entries = complex ? (Array.isArray(value) ? value.map((item, i) => [String(i), item] as const) : Object.entries(value as object)) : [];
  return (
    <div style={{ marginLeft: depth ? 12 : 0, marginTop: 6 }}>
      <button
        type="button"
        className="tap"
        onClick={() => complex && setOpen((v) => !v)}
        style={{
          display: "flex",
          width: "100%",
          gap: 8,
          alignItems: "baseline",
          textAlign: "left",
          background: depth === 0 ? "#1c222c" : "transparent",
          color: "inherit",
          border: depth === 0 ? "1px solid #2c3444" : "0",
          borderRadius: 12,
          padding: depth === 0 ? "10px 12px" : "2px 0",
          font: "inherit",
          minHeight: 36,
        }}
      >
        {label != null ? <span style={{ fontFamily: "var(--font-mono)", color: "#9aa3b2" }}>{label}</span> : null}
        <span>{complex ? (Array.isArray(value) ? `List · ${entries.length}` : `Object · ${entries.length}`) : preview(value)}</span>
      </button>
      {complex && open
        ? entries.slice(0, limit).map(([key, item]) => <Lens key={key} label={key} value={item} depth={depth + 1} />)
        : null}
      {complex && open && entries.length > limit ? (
        <button type="button" className="tap" style={quietButton} onClick={() => setLimit((n) => n + 24)}>
          Show more
        </button>
      ) : null}
    </div>
  );
}

const quietButton: CSSProperties = {
  marginTop: 6,
  background: "transparent",
  color: "inherit",
  border: "1px solid #3a4254",
  borderRadius: 999,
  minHeight: 36,
  padding: "0 12px",
  font: "inherit",
};

function useGesture(node: JNode | undefined) {
  const api = useJson();
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const timer = useRef<number>(0);
  const onPointerDown = (event: ReactPointerEvent) => {
    if (!node?.onLongPress && !node?.onSwipeLeft && !node?.onSwipeRight && !node?.onTap) return;
    start.current = { x: event.clientX, y: event.clientY, t: Date.now() };
    if (node.onLongPress) {
      timer.current = window.setTimeout(() => {
        api.update(node.onLongPress, "long-press");
        start.current = null;
      }, 480);
    }
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    window.clearTimeout(timer.current);
    const origin = start.current;
    start.current = null;
    if (!origin || !node) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      api.update(dx < 0 ? node.onSwipeLeft : node.onSwipeRight, "swipe");
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest("button,a,input,textarea")) return;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && node.onTap) api.update(node.onTap, "tap");
  };
  const onPointerCancel = () => {
    window.clearTimeout(timer.current);
    start.current = null;
  };
  return { onPointerDown, onPointerUp, onPointerCancel };
}

function useInView(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) el.classList.add("in");
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return ref;
}

function frameStyle(node: JNode, type: string): CSSProperties {
  const defaults: CSSProperties = {};
  if (type === "row" || type === "column" || type === "scroll") {
    defaults.display = "flex";
    defaults.flexDirection = type === "row" ? "row" : "column";
    defaults.minWidth = 0;
  }
  if (type === "stack" || type === "absolute") defaults.position = type === "absolute" ? "absolute" : "relative";
  if (type === "grid") {
    defaults.display = "grid";
    const cols = num(node.columns) ?? 2;
    defaults.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  }
  if (type === "scroll" || node.fill) {
    defaults.flex = 1;
    defaults.minHeight = 0;
  }
  if (type === "scroll") defaults.overflow = "auto";
  if (type === "column" || type === "scroll") defaults.width = "100%";
  const style: CSSProperties = { ...defaults, ...cssOf(node.style) };
  if (typeof node.align === "string") style.alignItems = safeWord(node.align);
  if (typeof node.justify === "string") style.justifyContent = safeWord(node.justify);
  if (node.gap != null && style.gap == null) style.gap = unit(node.gap);
  if (node.fill) {
    style.flex = 1;
    style.minHeight = 0;
  }
  return style;
}

function buttonStyle(node: JNode): CSSProperties {
  const authored = node.style ?? {};
  const hasBg = authored.background != null || authored.backgroundColor != null;
  const base = cssOf(authored);
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    padding: "10px 14px",
    borderRadius: 14,
    border: "0",
    font: "inherit",
    fontWeight: 600,
    background: hasBg ? undefined : "var(--color-accent)",
    color: authored.color != null ? undefined : hasBg ? "inherit" : "var(--color-accent-ink)",
    ...base,
  };
}

const PX = new Set([
  "fontSize", "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
  "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "gap", "width", "height",
  "minHeight", "minWidth", "maxWidth", "maxHeight", "borderRadius", "top", "left", "right", "bottom",
  "letterSpacing", "borderWidth",
]);

function cssOf(style: Record<string, unknown> | undefined): CSSProperties {
  if (!style) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(style)) {
    if (["rotate", "rotateX", "rotateY", "rotateZ", "scale", "translateX", "translateY", "translateZ", "perspective", "shadow"].includes(key)) {
      continue;
    }
    if (value == null) continue;
    if (typeof value === "number" && PX.has(key)) out[key] = `${value}px`;
    else if (typeof value === "number" && (key === "fontWeight" || key === "opacity" || key === "flex" || key === "zIndex" || key === "lineHeight")) {
      out[key] = value;
    } else if (typeof value === "string" && safeCss(key, value)) {
      out[key] = value;
    }
  }
  if (typeof style.background === "string" && style.background.includes("gradient") && safeCss("background", style.background)) {
    out.background = style.background;
  }
  if (typeof style.shadow === "number") {
    const n = style.shadow;
    out.boxShadow = `0 ${Math.round(n / 3)}px ${n}px color-mix(in oklab, black 28%, transparent)`;
  }
  const transform = composeTransform(style);
  if (transform) {
    out.transform = transform;
    out.transformStyle = "preserve-3d";
  }
  return out as CSSProperties;
}

function composeTransform(style: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof style.perspective === "number") parts.push(`perspective(${style.perspective}px)`);
  if (typeof style.rotateX === "number") parts.push(`rotateX(${style.rotateX}deg)`);
  if (typeof style.rotateY === "number") parts.push(`rotateY(${style.rotateY}deg)`);
  if (typeof style.rotate === "number" || typeof style.rotateZ === "number") {
    parts.push(`rotate(${Number(style.rotate ?? style.rotateZ)}deg)`);
  }
  if (typeof style.scale === "number") parts.push(`scale(${style.scale})`);
  if (typeof style.translateX === "number") parts.push(`translateX(${style.translateX}px)`);
  if (typeof style.translateY === "number") parts.push(`translateY(${style.translateY}px)`);
  if (typeof style.translateZ === "number") parts.push(`translateZ(${style.translateZ}px)`);
  return parts.join(" ");
}

function safeCss(key: string, value: string): boolean {
  if (value.length > 180) return false;
  if (/url\s*\(|expression\s*\(|javascript:|<|>/i.test(value)) return false;
  if (key === "background" || key === "color" || key === "border" || key === "borderColor" || key === "backgroundImage" || key === "boxShadow" || key === "fontFamily") {
    return true;
  }
  return /^[#a-z0-9\s.,()%'"+/-]+$/i.test(value);
}

function animProps(node: JNode, index: number): { className?: string; style?: CSSProperties } {
  const animate = node.animate;
  if (!animate) return {};
  const map: Record<string, string> = {
    "fade-up": "nx-fade-up",
    fade: "nx-fade",
    scale: "nx-scale",
    "slide-left": "nx-slide",
    scroll: "nx-await",
  };
  const loop = animate.loop === "float" ? "nx-float" : animate.loop === "pulse" ? "nx-pulse" : animate.loop === "spin" ? "nx-spin" : "";
  const enter = animate.enter ? map[animate.enter] ?? "" : "";
  const delay = (animate.delay ?? 0) + (animate.stagger ?? 0) * index;
  return {
    className: [enter, loop].filter(Boolean).join(" ") || undefined,
    style: delay ? { animationDelay: `${delay}ms` } : undefined,
  };
}

function applyList(state: Record<string, unknown>, action: unknown): Record<string, unknown> {
  const list = Array.isArray(action) ? action : action ? [action] : [];
  let next = state;
  for (const step of list) {
    if (!step || typeof step !== "object") continue;
    const row = step as { op?: string; key?: string; value?: unknown; by?: number; to?: string };
    if (row.op === "nav" && row.to) next = { ...next, screen: row.to };
    else if (row.op === "set" && row.key) next = { ...next, [row.key]: row.value };
    else if (row.op === "inc" && row.key) next = { ...next, [row.key]: Number(next[row.key] ?? 0) + Number(row.by ?? 1) };
    else if (row.op === "toggle" && row.key) next = { ...next, [row.key]: !next[row.key] };
  }
  return next;
}

function childList(node: JNode): JNode[] {
  if (Array.isArray(node.children)) return node.children.filter((child) => child && typeof child === "object");
  if (node.child && typeof node.child === "object") return [node.child as JNode];
  return [];
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function unit(value: unknown): string | number | undefined {
  if (typeof value === "number") return `${value}px`;
  if (typeof value === "string" && safeCss("gap", value)) return value;
  return undefined;
}

function safeWord(value: string): string | undefined {
  return /^[a-z-]+$/i.test(value) ? value : undefined;
}

function preview(value: unknown): string {
  if (value == null) return "empty";
  if (typeof value === "string") return value.length > 80 ? `${value.slice(0, 80)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
