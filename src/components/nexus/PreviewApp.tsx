import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Gauge, Maximize2, RectangleHorizontal, RefreshCw, SquareArrowOutUpRight } from "lucide-react";
import { parseFlutter, countCalls } from "@/lib/nexus/flutter/parse";
import { FlutterStage } from "@/lib/nexus/flutter/render";
import { prepareHtml } from "@/lib/nexus/html";
import { parseJsonValue, summarize } from "@/lib/nexus/json/interpret";
import { JsonStage } from "@/lib/nexus/json/render";
import { readLive, subscribeLive, type LivePayload } from "@/lib/nexus/live";
import { MODE_LABEL } from "@/lib/nexus/types";
import { buzz } from "@/lib/nexus/store";

interface LogLine {
  level: string;
  text: string;
}

export function PreviewApp() {
  const [live, setLive] = useState<LivePayload | null | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const [frame, setFrame] = useState<"phone" | "full">("full");
  const [hud, setHud] = useState(true);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [fps, setFps] = useState(0);
  const [frameMs, setFrameMs] = useState(0);
  const [heap, setHeap] = useState<number | null>(null);

  useEffect(() => {
    setLive(readLive());
    return subscribeLive((payload) => {
      setLive(payload);
      setLogs([]);
    });
  }, []);

  useEffect(() => {
    setFrame(window.innerWidth >= 960 ? "phone" : "full");
  }, []);

  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let acc = 0;
    let raf = 0;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      frames += 1;
      acc += dt;
      if (acc >= 500) {
        setFps(Math.round((frames * 1000) / acc));
        setFrameMs(Math.round(acc / frames));
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
        if (memory) setHeap(Math.round(memory.usedJSHeapSize / 1048576));
        frames = 0;
        acc = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; fps?: number; frame?: number; level?: string; text?: string } | null;
      if (!data || typeof data !== "object") return;
      if (data.type === "nexus-hud" && typeof data.fps === "number") {
        setFps(data.fps);
        if (typeof data.frame === "number") setFrameMs(data.frame);
      }
      if (data.type === "nexus-log" && typeof data.text === "string") {
        setLogs((prev) => [...prev.slice(-29), { level: data.level ?? "log", text: data.text as string }]);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const stats = useMemo(() => {
    if (!live) return null;
    if (live.mode === "json") {
      const parsed = parseJsonValue(live.code);
      if (!parsed.ok) return null;
      const sum = summarize(parsed.value);
      return { nodes: sum.nodes, depth: sum.depth };
    }
    if (live.mode === "flutter") {
      try {
        return countCalls(parseFlutter(live.code).root);
      } catch {
        return null;
      }
    }
    return null;
  }, [live]);

  if (live === undefined) {
    return (
      <main className="grid h-dvh place-items-center bg-bg text-fg">
        <p className="text-muted">Opening the stage…</p>
      </main>
    );
  }

  if (!live) {
    return (
      <main className="grid h-dvh place-items-center bg-bg px-6 text-center text-fg">
        <div className="max-w-sm">
          <h1 className="text-2xl font-semibold text-balance">Nothing is running</h1>
          <p className="mt-2 text-muted">Go back to the studio, pick a runtime, and press Run.</p>
          <Link to="/" className="tap mt-6 inline-flex h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink">
            Back to studio
          </Link>
        </div>
      </main>
    );
  }

  const html = live.mode === "html" ? prepareHtml(live.code) : "";
  const log = (line: string) => setLogs((prev) => [...prev.slice(-29), { level: "log", text: line }]);

  return (
    <main className="stage-page">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <Link to="/" aria-label="Back to studio" className="tap grid h-11 w-11 place-items-center rounded-full border border-line">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{live.title}</p>
          <p className="text-xs text-muted">
            {MODE_LABEL[live.mode as keyof typeof MODE_LABEL]} stage
            {live.mode === "flutter" ? " · Nexus widget runtime" : ""}
            {live.mode === "html" ? " · sealed frame" : ""}
          </p>
        </div>
        <button type="button" className="tap grid h-11 w-11 place-items-center rounded-full border border-line" aria-pressed={hud} aria-label="Toggle performance HUD" onClick={() => setHud((v) => !v)}>
          <Gauge size={18} />
        </button>
        <button
          type="button"
          className="tap grid h-11 w-11 place-items-center rounded-full border border-line"
          aria-label={frame === "phone" ? "Fill the window" : "Show device frame"}
          onClick={() => setFrame((v) => (v === "phone" ? "full" : "phone"))}
        >
          {frame === "phone" ? <Maximize2 size={18} /> : <RectangleHorizontal size={18} />}
        </button>
        <button
          type="button"
          className="tap grid h-11 w-11 place-items-center rounded-full border border-line"
          aria-label="Reload stage"
          onClick={() => {
            buzz("tap");
            setLive(readLive() ?? live);
            setTick((n) => n + 1);
            setLogs([]);
          }}
        >
          <RefreshCw size={18} />
        </button>
        <button
          type="button"
          className="tap hidden h-11 w-11 place-items-center rounded-full border border-line sm:grid"
          aria-label="Open stage in a window"
          onClick={() => window.open("/run", "nexus-stage", "width=440,height=860")}
        >
          <SquareArrowOutUpRight size={18} />
        </button>
      </header>
      <div className="grid min-h-0 flex-1 place-items-center p-3">
        <div className={frame === "phone" ? "device" : "h-full w-full"}>
          <div className={frame === "phone" ? "device-screen" : "relative h-full overflow-hidden rounded-xl border border-line"}>
            {hud ? (
              <div className="hud">
                <span>{fps} fps</span>
                <span>{frameMs} ms</span>
                {heap != null ? <span>{heap} MB</span> : null}
                {stats ? (
                  <span>
                    {stats.nodes} nodes · d{stats.depth}
                  </span>
                ) : (
                  <span>sealed</span>
                )}
              </div>
            ) : null}
            {live.mode === "html" ? (
              <iframe
                key={`${live.at}-${tick}`}
                title="HTML stage"
                sandbox="allow-scripts allow-forms allow-popups"
                referrerPolicy="no-referrer"
                srcDoc={html}
                className="h-full w-full border-0 bg-bg"
              />
            ) : null}
            {live.mode === "json" ? (
              <JsonStage key={`${live.at}-${tick}`} source={live.code} buzz={() => buzz("tap")} onLog={log} />
            ) : null}
            {live.mode === "flutter" ? (
              <FlutterStage key={`${live.at}-${tick}`} source={live.code} buzz={() => buzz("tap")} onLog={log} />
            ) : null}
          </div>
        </div>
      </div>
      <section className="max-h-28 overflow-auto border-t border-line px-4 py-2 font-mono text-xs" aria-live="polite">
        {logs.length === 0 ? <p className="text-muted">Console is quiet.</p> : null}
        {logs.map((line, i) => (
          <p key={`${i}-${line.text.slice(0, 12)}`} className={line.level === "error" ? "text-danger" : "text-muted"}>
            {line.level} · {line.text}
          </p>
        ))}
      </section>
    </main>
  );
}
