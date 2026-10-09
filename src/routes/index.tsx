import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Code2, Eye, FileCode2, Play, RotateCcw } from "lucide-react";
import { Scene3D } from "@/components/nexus/Scene3D";
import { htmlExample } from "@/lib/nexus/examples";
import { inferTitle } from "@/lib/nexus/detect";
import { hydrateNexus, useNexus, buzz } from "@/lib/nexus/store";
import { publishLive } from "@/lib/nexus/live";
import { MODES, MODE_LABEL, nid } from "@/lib/nexus/types";
import type { Mode } from "@/lib/nexus/types";

export const Route = createFileRoute("/")({ component: StudioRoute });

function StudioRoute() {
  const { hydrated, mode, code, setMode, setCode, loadShowcase } = useNexus();
  const source = code[mode];

  useEffect(() => {
    hydrateNexus();
  }, []);

  const run = () => {
    const current = useNexus.getState();
    const currentCode = current.code[current.mode];
    publishLive({
      id: nid(),
      at: Date.now(),
      mode: current.mode,
      code: currentCode,
      title: inferTitle(current.mode, currentCode),
    });
    buzz("ok");
    window.location.assign("/run");
  };

  const chooseMode = (next: Mode) => {
    setMode(next);
    buzz("tap");
  };

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-10 lg:px-10 lg:py-8">
        <section className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-panel text-accent">
                <Code2 size={21} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted">Nexus workspace</p>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">CodeToApp</h1>
              </div>
            </div>
            <span className="rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted">
              {hydrated ? "LOCAL READY" : "LOADING"}
            </span>
          </header>

          <div className="mt-10 max-w-xl">
            <p className="text-sm font-medium text-accent">Build · preview · refine</p>
            <h2 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-6xl">
              Your code, in a live stage.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-muted">
              Edit HTML, JSON layouts, or Flutter-style widget trees, then run them in a separate preview stage.
              Your workspace stays saved on this device.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Code runtime">
            {MODES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => chooseMode(item)}
                aria-pressed={mode === item}
                className={mode === item
                  ? "tap rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink"
                  : "tap rounded-full border border-line bg-panel px-4 py-2.5 text-sm text-muted hover:text-fg"}
              >
                {MODE_LABEL[item]}
              </button>
            ))}
          </div>

          <section className="mt-4 flex min-h-[390px] flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-panel">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileCode2 size={16} className="text-accent" />
                <span>{mode === "html" ? "index.html" : mode === "json" ? "layout.json" : "main.dart"}</span>
              </div>
              <span className="font-mono text-xs text-muted">{source.length.toLocaleString()} chars</span>
            </div>
            <textarea
              aria-label={`${MODE_LABEL[mode]} source code`}
              spellCheck={false}
              value={source}
              onChange={(event) => setCode(mode, event.target.value)}
              className="min-h-[330px] w-full flex-1 resize-y bg-transparent p-4 font-mono text-[13px] leading-6 text-fg outline-none placeholder:text-muted"
              placeholder="Paste or write your code here…"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
              <button type="button" className="tap inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted hover:text-fg" onClick={() => loadShowcase(mode)}>
                <RotateCcw size={15} /> Restore example
              </button>
              <button type="button" className="tap inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink" onClick={run}>
                <Play size={16} fill="currentColor" /> Run code
              </button>
            </div>
          </section>
          <p className="mt-3 text-xs leading-5 text-muted">Preview code runs separately from the editor. Avoid pasting secrets or private credentials.</p>
        </section>

        <aside className="flex min-w-0 flex-col gap-4 lg:pt-20">
          <div className="relative min-h-[230px] overflow-hidden rounded-3xl border border-line bg-panel">
            <div className="absolute inset-0 opacity-80"><Scene3D height={260} /></div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
            <div className="relative flex min-h-[230px] flex-col justify-end p-5 sm:p-7">
              <span className="text-xs uppercase tracking-[0.2em] text-accent">Live stage</span>
              <h3 className="mt-2 text-2xl font-semibold">From source to scene.</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted">A focused workspace with a separate preview, performance HUD, and three lightweight runtimes.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Eye size={19} /></div>
              <div>
                <h3 className="font-semibold">Ready to preview</h3>
                <p className="mt-1 text-sm text-muted">Current runtime: {MODE_LABEL[mode]}</p>
              </div>
            </div>
            <button type="button" onClick={run} className="tap mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-line px-4 py-3 text-sm font-semibold hover:border-accent">
              Open live preview <Play size={15} />
            </button>
          </div>

          <div className="rounded-2xl border border-line p-5">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">Quick start</p>
            <ol className="mt-3 space-y-3 text-sm text-muted">
              <li className="flex gap-3"><span className="font-mono text-accent">01</span><span>Choose a runtime above.</span></li>
              <li className="flex gap-3"><span className="font-mono text-accent">02</span><span>Edit the starter example or paste your code.</span></li>
              <li className="flex gap-3"><span className="font-mono text-accent">03</span><span>Run it to open the isolated stage.</span></li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}
