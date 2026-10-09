import { createContext, useContext, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowLeft,
  BarChart3,
  Box,
  Calendar,
  Check,
  Circle,
  Compass,
  Droplets,
  Flame,
  Footprints,
  Heart,
  Home,
  Menu,
  Moon,
  Pause,
  Play,
  Plus,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  Timer,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { evalExpr, truthy } from "../expr";
import {
  countCalls,
  initialFlutterState,
  numVal,
  parseFlutter,
  strVal,
  type FCall,
  type FVal,
} from "./parse";

interface FState {
  state: Record<string, string | number | boolean>;
  set: (key: string, value: string | number | boolean) => void;
  inc: (key: string, by: number) => void;
  toggle: (key: string) => void;
  buzz: () => void;
  log: (line: string) => void;
}

const FCtx = createContext<FState | null>(null);

function useF(): FState {
  return (
    useContext(FCtx) ?? {
      state: {},
      set() {},
      inc() {},
      toggle() {},
      buzz() {},
      log() {},
    }
  );
}

const ICONS: Record<string, LucideIcon> = {
  "Icons.favorite": Heart,
  "Icons.favorite_border": Heart,
  "Icons.home": Home,
  "Icons.add": Plus,
  "Icons.arrow_back": ArrowLeft,
  "Icons.shopping_bag": ShoppingBag,
  "Icons.star": Star,
  "Icons.bolt": Zap,
  "Icons.calendar_today": Calendar,
  "Icons.water_drop": Droplets,
  "Icons.local_fire_department": Flame,
  "Icons.wb_sunny": Sun,
  "Icons.nights_stay": Moon,
  "Icons.bar_chart": BarChart3,
  "Icons.timer": Timer,
  "Icons.share": Share2,
  "Icons.menu": Menu,
  "Icons.play_arrow": Play,
  "Icons.pause": Pause,
  "Icons.check": Check,
  "Icons.close": X,
  "Icons.settings": Settings,
  "Icons.north": Compass,
  "Icons.directions_run": Footprints,
  "Icons.self_improvement": Sparkles,
  "Icons.circle": Circle,
  "Icons.inventory_2": Box,
};

const COLORS: Record<string, string> = {
  "Colors.white": "#ffffff",
  "Colors.black": "#111111",
  "Colors.transparent": "transparent",
  "Colors.red": "#e23d3d",
  "Colors.blue": "#3d7ddc",
  "Colors.green": "#2f9e6b",
  "Colors.orange": "#ff6a3d",
  "Colors.grey": "#9aa3b2",
  "Colors.gray": "#9aa3b2",
  "Colors.amber": "#e2b657",
};

export function FlutterStage({
  source,
  buzz,
  onLog,
}: {
  source: string;
  buzz?: () => void;
  onLog?: (line: string) => void;
}) {
  const parsed = useMemo(() => {
    try {
      return { ok: true as const, doc: parseFlutter(source) };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Could not read this Dart.",
      };
    }
  }, [source]);
  const [seen, setSeen] = useState(source);
  const [state, setState] = useState<Record<string, string | number | boolean>>(() =>
    parsed.ok ? initialFlutterState(parsed.doc) : {},
  );
  if (seen !== source) {
    setSeen(source);
    if (parsed.ok) setState(initialFlutterState(parsed.doc));
  }
  if (!parsed.ok) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 p-6">
        <p className="text-lg font-semibold text-balance">This Dart did not parse</p>
        <p className="text-sm text-muted">{parsed.error}</p>
        <p className="text-sm text-muted">Try Repair, or start from the Northwind showcase.</p>
      </div>
    );
  }
  const stats = countCalls(parsed.doc.root);
  const api: FState = {
    state,
    set: (key, value) => setState((prev) => ({ ...prev, [key]: value })),
    inc: (key, by) =>
      setState((prev) => {
        const cur = prev[key];
        const n = typeof cur === "number" ? cur : Number(cur) || 0;
        return { ...prev, [key]: n + by };
      }),
    toggle: (key) => setState((prev) => ({ ...prev, [key]: !prev[key] })),
    buzz: () => buzz?.(),
    log: (line) => onLog?.(line),
  };
  return (
    <FCtx.Provider value={api}>
      <div
        className="nx-stage"
        data-nodes={stats.nodes}
        style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        {parsed.doc.warnings[0] ? (
          <p className="shrink-0 px-3 py-2 text-xs text-muted">{parsed.doc.warnings[0]}</p>
        ) : null}
        <div style={{ flex: 1, minHeight: 0 }}>
          <WidgetView call={parsed.doc.root} />
        </div>
      </div>
    </FCtx.Provider>
  );
}

function WidgetView({ call }: { call: FCall }): ReactNode {
  switch (call.name) {
    case "NexusApp":
      return <NexusAppView call={call} />;
    case "runApp":
    case "MaterialApp": {
      const home = asCall(call.named.home) ?? asCall(call.positional[0]);
      return home ? <WidgetView call={home} /> : null;
    }
    case "Scaffold":
      return <ScaffoldView call={call} />;
    case "AppBar":
      return <AppBarView call={call} />;
    case "Column":
      return <FlexView call={call} direction="column" />;
    case "Row":
      return <FlexView call={call} direction="row" />;
    case "Wrap":
      return <FlexView call={call} direction="row" wrap />;
    case "ListView":
      return (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <FlexView call={call} direction="column" />
        </div>
      );
    case "GridView":
    case "GridView.count": {
      const cols = numVal(call.named.crossAxisCount) ?? 2;
      const gap = numVal(call.named.gap) ?? 12;
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap }}>
          {kids(call).map((kid, i) => (
            <WidgetView key={i} call={kid} />
          ))}
        </div>
      );
    }
    case "Stack":
      return <StackView call={call} />;
    case "SingleChildScrollView": {
      const child = asCall(call.named.child) ?? asCall(call.positional[0]);
      return (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", height: "100%" }}>
          {child ? <WidgetView call={child} /> : null}
        </div>
      );
    }
    case "Padding":
    case "SafeArea": {
      const child = asCall(call.named.child);
      const pad = call.name === "SafeArea" ? "12px 16px" : (insets(call.named.padding) ?? "0");
      return <div style={{ padding: pad, height: call.name === "SafeArea" ? undefined : undefined }}>{child ? <WidgetView call={child} /> : null}</div>;
    }
    case "Center":
    case "Align": {
      const child = asCall(call.named.child) ?? asCall(call.positional[0]);
      const align = alignmentCss(strVal(call.named.alignment) ?? "Alignment.center");
      return (
        <div style={{ display: "flex", width: "100%", flex: 1, ...align }}>
          {child ? <WidgetView call={child} /> : null}
        </div>
      );
    }
    case "SizedBox":
      return <SizedView call={call} />;
    case "Container":
    case "DecoratedBox":
      return <ContainerView call={call} />;
    case "Text":
      return <TextView call={call} />;
    case "Icon":
      return <IconView call={call} />;
    case "ElevatedButton":
    case "TextButton":
    case "IconButton":
    case "GestureDetector":
    case "InkWell":
      return <Pressable call={call} />;
    case "Expanded":
    case "Flexible": {
      const child = asCall(call.named.child);
      return child ? <WidgetView call={child} /> : null;
    }
    case "Spacer":
      return <div style={{ flex: numVal(call.named.flex) ?? 1 }} />;
    case "Divider":
      return <div role="separator" style={{ height: 1, width: "100%", background: "color-mix(in oklab, currentColor 18%, transparent)", margin: "8px 0" }} />;
    case "Card": {
      const child = asCall(call.named.child);
      return (
        <div style={{ borderRadius: 16, background: "color-mix(in oklab, currentColor 8%, transparent)", padding: 12 }}>
          {child ? <WidgetView call={child} /> : null}
        </div>
      );
    }
    case "Chip": {
      const label = asCall(call.named.label);
      const text = strVal(call.named.label) ?? strVal(call.positional[0]);
      return (
        <span style={{ display: "inline-flex", alignItems: "center", minHeight: 32, padding: "0 12px", borderRadius: 999, background: "color-mix(in oklab, currentColor 10%, transparent)" }}>
          {label ? <WidgetView call={label} /> : text}
        </span>
      );
    }
    case "CircleAvatar": {
      const r = numVal(call.named.radius) ?? 20;
      const child = asCall(call.named.child);
      return (
        <div style={{ width: r * 2, height: r * 2, borderRadius: 999, display: "grid", placeItems: "center", background: colorOf(call.named.backgroundColor) ?? "var(--color-accent)", color: "var(--color-accent-ink)", overflow: "hidden" }}>
          {child ? <WidgetView call={child} /> : null}
        </div>
      );
    }
    case "Opacity": {
      const child = asCall(call.named.child);
      return <div style={{ opacity: numVal(call.named.opacity) ?? 1 }}>{child ? <WidgetView call={child} /> : null}</div>;
    }
    case "Transform.rotate":
    case "Transform.scale":
    case "Transform": {
      const child = asCall(call.named.child);
      const angle = numVal(call.named.angle);
      const scale = numVal(call.named.scale) ?? (call.name === "Transform.scale" ? numVal(call.positional[0]) : null);
      const transform = [
        angle != null ? `rotate(${(angle * 180) / Math.PI}deg)` : "",
        scale != null ? `scale(${scale})` : "",
      ].filter(Boolean).join(" ");
      return <div style={{ transform }}>{child ? <WidgetView call={child} /> : null}</div>;
    }
    case "When":
      return <WhenView call={call} />;
    case "Repeat":
      return <RepeatView call={call} />;
    case "Bars":
      return <BarsView call={call} />;
    case "BottomNavigationBar":
      return <BottomNav call={call} />;
    case "Image":
    case "Image.network": {
      const src = strVal(call.positional[0]) ?? strVal(call.named.src);
      const alt = strVal(call.named.semanticLabel) ?? "";
      if (!src || !/^https?:\/\//i.test(src)) {
        return <div style={{ height: numVal(call.named.height) ?? 96, borderRadius: 12, background: "color-mix(in oklab, currentColor 10%, transparent)" }} />;
      }
      return <img src={src} alt={alt} style={{ width: "100%", height: numVal(call.named.height) ?? 140, objectFit: "cover", borderRadius: 12 }} />;
    }
    default:
      return <UnknownView call={call} />;
  }
}

function NexusAppView({ call }: { call: FCall }) {
  const ctx = useF();
  const start = strVal(call.named.start) ?? "home";
  const current = String(ctx.state.screen ?? start);
  const chosen = asCall(call.named[current]) ?? asCall(call.named[start]);
  if (!chosen) return <p className="p-4 text-sm">This NexusApp has no screens.</p>;
  return (
    <div style={{ height: "100%" }}>
      <WidgetView call={chosen} />
    </div>
  );
}

function ScaffoldView({ call }: { call: FCall }) {
  const bg = colorOf(call.named.backgroundColor) ?? "#10141c";
  const appBar = asCall(call.named.appBar);
  const body = asCall(call.named.body);
  const fab = asCall(call.named.floatingActionButton);
  const bar = asCall(call.named.bottomNavigationBar);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: bg, color: readableInk(bg), position: "relative", overflow: "hidden" }}>
      {appBar ? <WidgetView call={appBar} /> : null}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{body ? <WidgetView call={body} /> : null}</div>
      {bar ? <WidgetView call={bar} /> : null}
      {fab ? (
        <div style={{ position: "absolute", right: 16, bottom: bar ? 76 : 16 }}>
          <WidgetView call={fab} />
        </div>
      ) : null}
    </div>
  );
}

function AppBarView({ call }: { call: FCall }) {
  const title = asCall(call.named.title);
  const bg = colorOf(call.named.backgroundColor);
  const fg = colorOf(call.named.foregroundColor);
  const text = strVal(call.named.title);
  return (
    <header style={{ display: "flex", alignItems: "center", minHeight: 56, padding: "0 16px", gap: 8, flexShrink: 0, background: bg, color: fg }}>
      {title ? <WidgetView call={title} /> : <span style={{ fontWeight: 650 }}>{text}</span>}
    </header>
  );
}

function FlexView({
  call,
  direction,
  wrap,
}: {
  call: FCall;
  direction: "row" | "column";
  wrap?: boolean;
}) {
  const gap = numVal(call.named.gap) ?? 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: wrap ? "row" : direction,
        flexWrap: wrap ? "wrap" : undefined,
        alignItems: crossAlign(call.named.crossAxisAlignment, "center"),
        justifyContent: mainAlign(call.named.mainAxisAlignment),
        gap,
        width: direction === "column" && !wrap ? "100%" : undefined,
        minWidth: 0,
      }}
    >
      {kids(call).map((kid, i) => {
        if (kid.name === "Expanded" || kid.name === "Flexible") {
          const inner = asCall(kid.named.child);
          return (
            <div key={i} style={{ flex: numVal(kid.named.flex) ?? 1, minWidth: 0, minHeight: 0, display: "flex" }}>
              {inner ? <div style={{ flex: 1, minWidth: 0 }}><WidgetView call={inner} /></div> : null}
            </div>
          );
        }
        if (kid.name === "Spacer") return <div key={i} style={{ flex: numVal(kid.named.flex) ?? 1 }} />;
        return <WidgetView key={i} call={kid} />;
      })}
    </div>
  );
}

function StackView({ call }: { call: FCall }) {
  return (
    <div style={{ position: "relative" }}>
      {kids(call).map((kid, i) => {
        if (kid.name !== "Positioned") return <WidgetView key={i} call={kid} />;
        const inner = asCall(kid.named.child);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: px(numVal(kid.named.top)),
              left: px(numVal(kid.named.left)),
              right: px(numVal(kid.named.right)),
              bottom: px(numVal(kid.named.bottom)),
            }}
          >
            {inner ? <WidgetView call={inner} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function SizedView({ call }: { call: FCall }) {
  const child = asCall(call.named.child);
  const width = dim(call.named.width) ?? dim(call.positional[0]);
  const height = dim(call.named.height) ?? dim(call.positional[1]);
  return (
    <div style={{ width: cssDim(width), height: cssDim(height), flexShrink: 0 }}>
      {child ? <WidgetView call={child} /> : null}
    </div>
  );
}

function ContainerView({ call }: { call: FCall }) {
  const child = asCall(call.named.child);
  const deco = call.named.decoration?.kind === "call" ? readDecoration(call.named.decoration) : null;
  const alignName = strVal(call.named.alignment);
  const align = alignName ? alignmentCss(alignName) : null;
  const bg = deco?.background ?? colorOf(call.named.color);
  return (
    <div
      style={{
        width: cssDim(dim(call.named.width)),
        height: cssDim(dim(call.named.height)),
        padding: insets(call.named.padding),
        margin: insets(call.named.margin),
        background: bg,
        borderRadius: deco?.radius,
        border: deco?.border,
        boxShadow: deco?.shadow,
        display: align ? "flex" : undefined,
        boxSizing: "border-box",
        ...(align ?? {}),
      }}
    >
      {child ? <WidgetView call={child} /> : null}
    </div>
  );
}

function TextView({ call }: { call: FCall }) {
  const ctx = useF();
  const raw = strVal(call.positional[0]) ?? strVal(call.named.data) ?? "";
  const style = textCss(call.named.style);
  return (
    <span style={{ display: "block", margin: 0, ...style }}>{fill(raw, ctx.state)}</span>
  );
}

function IconView({ call }: { call: FCall }) {
  const name = strVal(call.positional[0]) ?? strVal(call.named.icon) ?? "";
  const Icon = ICONS[name] ?? Circle;
  const size = numVal(call.named.size) ?? 22;
  const color = colorOf(call.named.color) ?? "currentColor";
  return <Icon size={size} color={color} aria-hidden strokeWidth={1.75} />;
}

function Pressable({ call }: { call: FCall }) {
  const ctx = useF();
  const child = asCall(call.named.child) ?? asCall(call.named.icon);
  const text = strVal(call.positional[0]);
  const ghost = call.name === "TextButton" || call.name === "GestureDetector" || call.name === "InkWell";
  const iconOnly = call.name === "IconButton";
  const action = call.named.onPressed ?? call.named.onTap;
  return (
    <button
      type="button"
      className="tap"
      onClick={() => {
        if (action?.kind === "call") runAction(action, ctx);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: iconOnly ? 44 : 46,
        minWidth: iconOnly ? 44 : undefined,
        padding: ghost || iconOnly ? "8px 12px" : "12px 16px",
        borderRadius: iconOnly ? 999 : 999,
        border: ghost ? "0" : "0",
        background: ghost || iconOnly ? "transparent" : (colorOf(call.named.backgroundColor) ?? "var(--color-accent)"),
        color: ghost || iconOnly ? "inherit" : "var(--color-accent-ink)",
        font: "inherit",
        fontWeight: 600,
      }}
    >
      {child ? <WidgetView call={child} /> : null}
      {text ? <span>{fill(text, ctx.state)}</span> : null}
    </button>
  );
}

function WhenView({ call }: { call: FCall }) {
  const ctx = useF();
  const test = strVal(call.named.test) ?? "";
  const ok = truthy(evalExpr(test, ctx.state as unknown as Record<string, unknown>));
  const branch = asCall(ok ? (call.named.child ?? call.named.then) : (call.named.elseChild ?? call.named.orElse));
  return branch ? <WidgetView call={branch} /> : null;
}

function RepeatView({ call }: { call: FCall }) {
  const child = asCall(call.named.child);
  const times = Math.max(0, Math.min(40, numVal(call.named.times) ?? 0));
  if (!child) return null;
  return (
    <>
      {Array.from({ length: times }, (_, i) => (
        <WidgetView key={i} call={child} />
      ))}
    </>
  );
}

function BarsView({ call }: { call: FCall }) {
  const list = call.named.values?.kind === "list" ? call.named.values.v : [];
  const values = list.map((item) => numVal(item) ?? 0);
  const color = colorOf(call.named.color) ?? "var(--color-accent)";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 112 }} aria-hidden>
      {values.map((value, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(8, Math.min(100, value))}%`,
            background: color,
            borderRadius: 8,
            opacity: 0.45 + (values.length <= 1 ? 0.5 : (i / (values.length - 1)) * 0.55),
          }}
        />
      ))}
    </div>
  );
}

function BottomNav({ call }: { call: FCall }) {
  const ctx = useF();
  const items = call.named.items?.kind === "list" ? call.named.items.v.filter(isCall) : [];
  const action = call.named.onTap?.kind === "call" ? call.named.onTap : null;
  const key = action?.name === "nexus.pick" ? strVal(action.positional[0]) : null;
  const dests = action?.name === "nexus.pick" ? action.positional.slice(1).map((item) => strVal(item) ?? "") : [];
  const current = key ? String(ctx.state[key] ?? "") : "";
  return (
    <nav style={{ display: "flex", flexShrink: 0, borderTop: "1px solid color-mix(in oklab, currentColor 16%, transparent)" }}>
      {items.map((item, i) => {
        const label = strVal(item.named.label) ?? "";
        const icon = asCall(item.named.icon);
        const active = dests[i] ? current === dests[i] : false;
        return (
          <button
            key={label || i}
            type="button"
            className="tap"
            aria-current={active ? "page" : undefined}
            onClick={() => {
              if (action) runAction(action, ctx, i);
            }}
            style={{
              flex: 1,
              minHeight: 56,
              border: 0,
              background: "transparent",
              color: active ? "var(--color-accent)" : "inherit",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              font: "inherit",
            }}
          >
            {icon ? <WidgetView call={icon} /> : null}
            <span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function UnknownView({ call }: { call: FCall }) {
  const nested = nestedWidgets(call);
  return (
    <div style={{ border: "1px dashed color-mix(in oklab, currentColor 28%, transparent)", borderRadius: 12, padding: 8, margin: "4px 0" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, opacity: 0.7 }}>{call.name}</div>
      {nested.map((kid, i) => (
        <WidgetView key={i} call={kid} />
      ))}
    </div>
  );
}

function runAction(call: FCall, ctx: FState, index?: number) {
  ctx.buzz();
  const name = call.name;
  if (name === "nexus.inc" || name === "nexus.dec") {
    const key = strVal(call.positional[0]);
    const by = numVal(call.positional[1]) ?? 1;
    if (!key) return;
    ctx.inc(key, name.endsWith("dec") ? -by : by);
    ctx.log(`${key} ${name.endsWith("dec") ? "decreased" : "increased"}`);
    return;
  }
  if (name === "nexus.toggle") {
    const key = strVal(call.positional[0]);
    if (key) ctx.toggle(key);
    return;
  }
  if (name === "nexus.set") {
    const key = strVal(call.positional[0]);
    const raw = call.positional[1];
    if (!key || !raw) return;
    const value = raw.kind === "bool" || raw.kind === "num" ? raw.v : (strVal(raw) ?? "");
    ctx.set(key, value);
    return;
  }
  if (name === "nexus.nav") {
    const to = strVal(call.positional[0]);
    if (to) {
      ctx.set("screen", to);
      ctx.log(`Opened ${to}`);
    }
    return;
  }
  if (name === "nexus.pick") {
    const key = strVal(call.positional[0]);
    const dest = strVal(call.positional[(index ?? 0) + 1]);
    if (key && dest) {
      ctx.set(key, dest);
      ctx.log(`Opened ${dest}`);
    }
  }
}

function kids(call: FCall): FCall[] {
  const list = call.named.children;
  if (list?.kind === "list") return list.v.filter(isCall);
  const one = asCall(call.named.child);
  if (one) return [one];
  return call.positional.filter(isCall);
}

function nestedWidgets(call: FCall): FCall[] {
  const out: FCall[] = [];
  const take = (v: FVal) => {
    if (v.kind === "call") out.push(v);
    else if (v.kind === "list") for (const item of v.v) if (isCall(item)) out.push(item);
  };
  for (const v of Object.values(call.named)) take(v);
  for (const v of call.positional) take(v);
  return out;
}

function asCall(v: FVal | undefined): FCall | null {
  return v && v.kind === "call" ? v : null;
}

function isCall(v: FVal): v is FCall {
  return v.kind === "call";
}

function fill(text: string, state: Record<string, string | number | boolean>): string {
  return text.replace(/\$\{([^}]+)\}|\$([A-Za-z_]\w*)/g, (_, a: string | undefined, b: string | undefined) => {
    const key = (a ?? b ?? "").trim();
    const value = state[key];
    return value == null ? "" : String(value);
  });
}

function colorOf(v: FVal | undefined): string | undefined {
  if (!v) return undefined;
  if (v.kind === "str") return v.v;
  if (v.kind === "ident") return COLORS[v.v];
  if (v.kind === "num") return argb(v.v);
  if (v.kind === "call" && v.name.startsWith("Color")) {
    const n = numVal(v.positional[0]);
    if (n == null) return undefined;
    return argb(n);
  }
  return undefined;
}

function argb(n: number): string {
  const u = n >>> 0;
  const a = (u >>> 24) & 255;
  const r = (u >>> 16) & 255;
  const g = (u >>> 8) & 255;
  const b = u & 255;
  if (a >= 250) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

function readableInk(bg: string): string {
  let r = 16;
  let g = 20;
  let b = 28;
  const hex = /^#([0-9a-f]{6})$/i.exec(bg);
  const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(bg);
  if (hex) {
    r = parseInt(hex[1].slice(0, 2), 16);
    g = parseInt(hex[1].slice(2, 4), 16);
    b = parseInt(hex[1].slice(4, 6), 16);
  } else if (rgb) {
    r = Number(rgb[1]);
    g = Number(rgb[2]);
    b = Number(rgb[3]);
  }
  const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return y > 0.64 ? "#141820" : "#f3f0e8";
}

function insets(v: FVal | undefined): string | undefined {
  if (!v || v.kind !== "call") return undefined;
  if (v.name === "EdgeInsets.all") return `${numVal(v.positional[0]) ?? 0}px`;
  if (v.name === "EdgeInsets.symmetric") {
    const h = numVal(v.named.horizontal) ?? 0;
    const vert = numVal(v.named.vertical) ?? 0;
    return `${vert}px ${h}px`;
  }
  if (v.name === "EdgeInsets.only" || v.name === "EdgeInsets.fromLTRB") {
    const l = numVal(v.named.left) ?? numVal(v.positional[0]) ?? 0;
    const t = numVal(v.named.top) ?? numVal(v.positional[1]) ?? 0;
    const r = numVal(v.named.right) ?? numVal(v.positional[2]) ?? 0;
    const b = numVal(v.named.bottom) ?? numVal(v.positional[3]) ?? 0;
    return `${t}px ${r}px ${b}px ${l}px`;
  }
  return undefined;
}

function radius(v: FVal | undefined): number | undefined {
  if (!v) return undefined;
  if (v.kind === "num") return v.v;
  if (v.kind === "call" && (v.name === "BorderRadius.circular" || v.name === "Radius.circular")) {
    return numVal(v.positional[0]) ?? undefined;
  }
  return undefined;
}

function weightOf(v: FVal | undefined): number | undefined {
  if (!v) return undefined;
  if (v.kind === "num") return v.v;
  if (v.kind !== "ident") return undefined;
  if (v.v.endsWith(".bold")) return 700;
  if (v.v.endsWith(".normal") || v.v.endsWith(".w400")) return 400;
  const match = /w(\d{3})$/.exec(v.v);
  return match ? Number(match[1]) : undefined;
}

function textCss(v: FVal | undefined): CSSProperties {
  if (!v || v.kind !== "call") return {};
  const height = numVal(v.named.height);
  return {
    fontSize: px(numVal(v.named.fontSize)),
    fontWeight: weightOf(v.named.fontWeight),
    color: colorOf(v.named.color),
    letterSpacing: numVal(v.named.letterSpacing) != null ? `${numVal(v.named.letterSpacing)}px` : undefined,
    lineHeight: height != null ? (height < 4 ? height : `${height}px`) : undefined,
    fontFamily: strVal(v.named.fontFamily) ?? undefined,
    textAlign: (strVal(v.named.textAlign)?.split(".").pop() as CSSProperties["textAlign"]) ?? undefined,
  };
}

function readDecoration(call: FCall): { background?: string; radius?: number; border?: string; shadow?: string } {
  const gradient = gradientOf(call.named.gradient);
  const shadowCall = call.named.boxShadow?.kind === "list" ? call.named.boxShadow.v.find(isCall) : asCall(call.named.boxShadow);
  let shadow: string | undefined;
  if (shadowCall?.name === "BoxShadow") {
    const color = colorOf(shadowCall.named.color) ?? "rgba(0,0,0,0.28)";
    const blur = numVal(shadowCall.named.blurRadius) ?? 16;
    const offset = shadowCall.named.offset?.kind === "call" ? shadowCall.named.offset : null;
    const y = offset ? (numVal(offset.positional[1]) ?? 8) : 8;
    shadow = `0 ${y}px ${blur}px ${color}`;
  }
  const border = call.named.border?.kind === "call" ? call.named.border : null;
  const borderCss =
    border?.name === "Border.all"
      ? `${numVal(border.named.width) ?? 1}px solid ${colorOf(border.named.color) ?? "rgba(255,255,255,0.16)"}`
      : undefined;
  return {
    background: gradient ?? colorOf(call.named.color),
    radius: radius(call.named.borderRadius),
    border: borderCss,
    shadow,
  };
}

function gradientOf(v: FVal | undefined): string | undefined {
  if (!v || v.kind !== "call" || v.name !== "LinearGradient") return undefined;
  if (v.named.colors?.kind !== "list") return undefined;
  const stops = v.named.colors.v.map((item) => colorOf(item)).filter((item): item is string => Boolean(item));
  if (!stops.length) return undefined;
  const begin = strVal(v.named.begin) ?? "";
  const dir = begin.includes("centerLeft") || begin.endsWith(".left") ? "to right" : "to bottom";
  return `linear-gradient(${dir}, ${stops.join(", ")})`;
}

function alignmentCss(name: string): CSSProperties {
  const table: Record<string, [string, string]> = {
    "Alignment.topLeft": ["flex-start", "flex-start"],
    "Alignment.topCenter": ["center", "flex-start"],
    "Alignment.topRight": ["flex-end", "flex-start"],
    "Alignment.centerLeft": ["flex-start", "center"],
    "Alignment.center": ["center", "center"],
    "Alignment.centerRight": ["flex-end", "center"],
    "Alignment.bottomLeft": ["flex-start", "flex-end"],
    "Alignment.bottomCenter": ["center", "flex-end"],
    "Alignment.bottomRight": ["flex-end", "flex-end"],
  };
  const pair = table[name] ?? ["center", "center"];
  return { justifyContent: pair[0], alignItems: pair[1] };
}

function mainAlign(v: FVal | undefined): string {
  const name = strVal(v) ?? "";
  if (name.endsWith("center")) return "center";
  if (name.endsWith("end")) return "flex-end";
  if (name.endsWith("spaceBetween")) return "space-between";
  if (name.endsWith("spaceAround")) return "space-around";
  if (name.endsWith("spaceEvenly")) return "space-evenly";
  return "flex-start";
}

function crossAlign(v: FVal | undefined, fallback: string): string {
  const name = strVal(v);
  if (!name) return fallback;
  if (name.endsWith("stretch")) return "stretch";
  if (name.endsWith("start")) return "flex-start";
  if (name.endsWith("end")) return "flex-end";
  if (name.endsWith("baseline")) return "baseline";
  return "center";
}

function dim(v: FVal | undefined): number | "fill" | undefined {
  if (!v) return undefined;
  if (v.kind === "ident" && (v.v === "double.infinity" || v.v.endsWith(".infinity"))) return "fill";
  if (v.kind === "num") return v.v;
  return undefined;
}

function cssDim(v: number | "fill" | undefined): string | number | undefined {
  if (v == null) return undefined;
  if (v === "fill") return "100%";
  return v;
}

function px(v: number | null): string | undefined {
  return v == null ? undefined : `${v}px`;
}
