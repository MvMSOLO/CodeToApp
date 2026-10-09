import { useEffect, useRef } from "react";

export function Scene3D({ height = 180 }: { height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let dead = false;
    let raf = 0;
    let renderer: { dispose: () => void; domElement: HTMLCanvasElement; setSize: (w: number, h: number, update?: boolean) => void; render: (s: unknown, c: unknown) => void } | null = null;
    const disposers: Array<() => void> = [];

    void (async () => {
      const THREE = await import("three");
      if (dead || !ref.current) return;
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim() || "#ff6a3d";
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 40);
      camera.position.set(0, 0.2, 4.2);
      const webgl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer = webgl;
      webgl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      host.appendChild(webgl.domElement);
      const ambient = new THREE.AmbientLight("#f3f0e8", 0.7);
      const key = new THREE.DirectionalLight("#fff4ea", 1.4);
      key.position.set(2, 3, 4);
      scene.add(ambient, key);
      const metal = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.55, roughness: 0.32 });
      const wire = new THREE.MeshBasicMaterial({ color: "#9aa3b2", wireframe: true });
      disposers.push(() => metal.dispose(), () => wire.dispose());
      const group = new THREE.Group();
      const ico = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), metal);
      const torus = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.012, 12, 64), wire);
      const box = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), metal);
      box.position.set(1.15, 0.45, 0.2);
      group.add(ico, torus, box);
      scene.add(group);
      for (const mesh of [ico, torus, box]) disposers.push(() => mesh.geometry.dispose());

      const fit = () => {
        const w = host.clientWidth || 320;
        const h = host.clientHeight || height;
        webgl.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      };
      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(host);
      disposers.push(() => ro.disconnect());

      const loop = (t: number) => {
        group.rotation.y = t * 0.00045;
        group.rotation.x = Math.sin(t * 0.0003) * 0.18;
        torus.rotation.x = t * 0.0008;
        webgl.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      for (const dispose of disposers) dispose();
      renderer?.dispose();
      host.replaceChildren();
    };
  }, [height]);

  return <div ref={ref} style={{ width: "100%", height }} aria-hidden />;
}
