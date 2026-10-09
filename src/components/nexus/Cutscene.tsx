import { useEffect, useRef, useState } from "react";

const PHASES = [
  { at: 0, kicker: "Nexus Runner", title: "Three runtimes. One stage.", body: "Write or paste. Run it sealed from the editor." },
  { at: 1.45, kicker: "HTML", title: "A whole document.", body: "Markup, CSS, and script, in a frame that cannot touch the studio." },
  { at: 2.85, kicker: "JSON", title: "A living schema.", body: "Layout, motion, state, gestures, and navigation — even when the file is huge." },
  { at: 4.2, kicker: "Flutter", title: "Dart, interpreted.", body: "Widget trees render immediately. No compile step in the browser." },
];

export function Cutscene({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [reduce, setReduce] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finished = useRef(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(motion);
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - started) / 1000;
      setElapsed(t);
      if (t >= 5.4 && !finished.current) {
        finished.current = true;
        doneRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (reduce) return;
    const host = canvasRef.current;
    if (!host) return;
    let dead = false;
    let raf = 0;
    let renderer: { dispose(): void; domElement: HTMLCanvasElement } | null = null;
    const disposers: Array<() => void> = [];
    void (async () => {
      try {
        const THREE = await import("three");
        if (dead || !canvasRef.current) return;
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog("#0c0e12", 8, 28);
        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
        camera.position.set(0, 0.4, 16);
        const webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer = webgl;
        webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        host.appendChild(webgl.domElement);
        scene.add(new THREE.AmbientLight("#f3f0e8", 0.55));
        const key = new THREE.PointLight("#ff6a3d", 18, 30);
        key.position.set(2, 2, 6);
        scene.add(key);
        const accent = new THREE.MeshStandardMaterial({ color: "#ff6a3d", metalness: 0.45, roughness: 0.28 });
        const steel = new THREE.MeshBasicMaterial({ color: "#9aa3b2", wireframe: true });
        disposers.push(() => accent.dispose(), () => steel.dispose());
        const rings: Array<{ mesh: { rotation: { z: number; x: number }; position: { z: number } } }> = [];
        for (let i = 0; i < 7; i += 1) {
          const mesh = new THREE.Mesh(new THREE.TorusGeometry(1.6 + (i % 3) * 0.35, 0.015, 8, 48), i % 2 ? accent : steel);
          mesh.position.z = -i * 3.2;
          mesh.rotation.x = Math.PI / 2.4;
          scene.add(mesh);
          rings.push({ mesh });
          disposers.push(() => mesh.geometry.dispose());
        }
        const bits: Array<{ mesh: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number } } }> = [];
        for (let i = 0; i < 28; i += 1) {
          const mesh = new THREE.Mesh(
            i % 3 === 0 ? new THREE.OctahedronGeometry(0.18) : new THREE.IcosahedronGeometry(0.14, 0),
            i % 4 === 0 ? accent : steel,
          );
          const angle = i * 0.7;
          mesh.position.set(Math.cos(angle) * (1.8 + (i % 5) * 0.35), Math.sin(angle * 1.3) * 1.4, -i * 0.85);
          scene.add(mesh);
          bits.push({ mesh });
          disposers.push(() => mesh.geometry.dispose());
        }
        const fit = () => {
          const w = host.clientWidth || window.innerWidth;
          const h = host.clientHeight || window.innerHeight;
          webgl.setSize(w, h, false);
          camera.aspect = w / Math.max(1, h);
          camera.updateProjectionMatrix();
        };
        fit();
        const started = performance.now();
        const loop = (now: number) => {
          const t = (now - started) / 1000;
          camera.position.z = 16 - t * 3.1;
          camera.position.x = Math.sin(t * 0.7) * 0.8;
          camera.position.y = 0.3 + Math.cos(t * 0.5) * 0.25;
          camera.lookAt(0, 0, camera.position.z - 6);
          for (const ring of rings) ring.mesh.rotation.z = t * 0.25;
          for (const bit of bits) {
            bit.mesh.rotation.y += 0.01;
            bit.mesh.rotation.x += 0.006;
          }
          webgl.render(scene, camera);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        window.addEventListener("resize", fit);
        disposers.push(() => window.removeEventListener("resize", fit));
      } catch {
        /* text still carries the intro */
      }
    })();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      for (const dispose of disposers) dispose();
      renderer?.dispose();
      host.replaceChildren();
    };
  }, [reduce]);

  const phase = [...PHASES].reverse().find((item) => elapsed >= item.at) ?? PHASES[0];
  const skippable = reduce || elapsed >= 1.5;

  return (
    <div className="relative h-dvh overflow-hidden bg-bg text-fg" role="dialog" aria-label="Introduction">
      <div ref={canvasRef} className="absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-bg/40" />
      <div className="relative flex h-full flex-col justify-end p-6 sm:p-10">
        <p className="text-xs font-medium tracking-widest text-accent uppercase">{phase.kicker}</p>
        <h1 className="mt-2 max-w-xl text-4xl font-semibold text-balance sm:text-5xl">{phase.title}</h1>
        <p className="mt-3 max-w-md text-muted">{phase.body}</p>
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            className="tap h-11 rounded-full bg-accent px-5 font-semibold text-accent-ink disabled:opacity-40"
            disabled={!skippable}
            onClick={onDone}
          >
            {skippable ? "Enter studio" : "Skip in a moment"}
          </button>
          <span className="font-mono text-xs text-muted tabular-nums" aria-hidden>
            {Math.min(5, elapsed).toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
}
