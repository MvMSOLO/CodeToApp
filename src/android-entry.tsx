import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, Code2, Play, RotateCcw } from "lucide-react";
import { FlutterStage } from "@/lib/nexus/flutter/render";
import { JsonStage } from "@/lib/nexus/json/render";
import { prepareHtml } from "@/lib/nexus/html";
import { htmlExample } from "@/lib/nexus/examples";
import { hydrateNexus, useNexus, buzz } from "@/lib/nexus/store";
import { MODE_LABEL, MODES } from "@/lib/nexus/types";
import type { Mode } from "@/lib/nexus/types";
import "@/styles.css";

function AndroidShell() {
  const { hydrated, mode, code, setMode, setCode, loadShowcase } = useNexus();
  const [screen, setScreen] = useState<"editor" | "preview">("editor");
  const [logs, setLogs] = useState<string[]>([]);
  const source = code[mode];

  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
    hydrateNexus();
  }, []);

  const run = () => {
    setLogs([]);
    buzz("ok");
    setScreen("preview");
  };

  if (screen === "preview") {
    return (
      <main className="stage-page min-h-dvh">
        <header className="flex items-center gap-3 border-b border-line px-3 py-2">
          <button type="button" aria-label="Back to editor" className="tap grid h-11 w-11 place-items-center rounded-full border border-line" onClick={() => setScreen("editor")}>
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">Live preview</p>
            <p className="text-xs text-muted">{MODE_LABEL[mode]} · isolated stage</p>
          </div>
        </header>
        <div className="relative min-h-0 flex-1" style={{ height: "calc(100dvh - 8rem)" }}>
          {mode === "html" ? <iframe title="HTML preview" sandbox="allow-scripts allow-forms allow-popups" referrerPolicy="no-referrer" srcDoc={prepareHtml(source)} className="h-full w-full border-0 bg-bg" /> : null}
          {mode === "json" ? <JsonStage source={source} buzz={() => buzz("tap")} onLog={(line) => setLogs((prev) => [...prev.slice(-29), line])} /> : null}
          {mode === "flutter" ? <FlutterStage source={source} buzz={() => buzz("tap")} onLog={(line) => setLogs((prev) => [...prev.slice(-29), line])} /> : null}
        </div>
        <section className="max-h-24 overflow-auto border-t border-line px-4 py-2 font-mono text-xs" aria-live="polite">
          {logs.length === 0 ? <p className="text-muted">Console is quiet.</p> : logs.map((line, index) => <p key={index} className="text-muted">{line}</p>)}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-line text-accent"><Code2 size={20} /></div>
          <div><h1 className="font-semibold">CodeToApp</h1><p className="text-xs text-muted">Offline-ready workspace</p></div>
        </div>
        <span className="font-mono text-[10px] text-muted">{hydrated ? "LOCAL READY" : "LOADING"}</span>
      </header>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Code studio</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Build, then run.</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Edit HTML, JSON layouts, or Flutter-style widget trees and preview them locally.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Code runtime">
          {MODES.map((item: Mode) => <button key={item} type="button" aria-pressed={mode === item} onClick={() => { setMode(item); buzz("tap"); }} className={mode === item ? "tap rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink" : "tap rounded-full border border-line bg-panel px-4 py-2.5 text-sm text-muted"}>{MODE_LABEL[item]}</button>)}
        </div>
        <section className="overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="text-sm font-medium">{mode === "html" ? "index.html" : mode === "json" ? "layout.json" : "main.dart"}</span><span className="font-mono text-xs text-muted">{source.length.toLocaleString()} chars</span></div>
          <textarea aria-label={MODE_LABEL[mode] + " source code"} spellCheck={false} value={source} onChange={(event) => setCode(mode, event.target.value)} className="min-h-[48dvh] w-full resize-y bg-transparent p-4 font-mono text-xs leading-6 text-fg outline-none" />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <button type="button" className="tap inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted" onClick={() => loadShowcase(mode)}><RotateCcw size={15} /> Restore example</button>
            <button type="button" className="tap inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink" onClick={run}><Play size={16} fill="currentColor" /> Run code</button>
          </div>
        </section>
        <p className="text-xs leading-5 text-muted">Changes are saved locally on this device. Avoid pasting private keys or passwords.</p>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<AndroidShell />);
