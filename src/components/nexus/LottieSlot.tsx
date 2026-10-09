import { useEffect, useRef, useState } from "react";

const PULSE = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 90,
  w: 120,
  h: 120,
  nm: "pulse",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "ring",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [60, 60, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [70, 70, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
            { t: 45, s: [110, 110, 100], i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
            { t: 90, s: [70, 70, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          nm: "g",
          it: [
            { ty: "el", p: { a: 0, k: [0, 0] }, s: { a: 0, k: [54, 54] }, nm: "e" },
            { ty: "st", c: { a: 0, k: [1, 0.416, 0.239, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2, nm: "st" },
            { ty: "tr", p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 }, nm: "tr" },
          ],
        },
      ],
      ip: 0,
      op: 90,
      st: 0,
      bm: 0,
    },
  ],
  markers: [],
};

export function LottieSlot({
  width = 88,
  height = 88,
  animation,
}: {
  width?: number;
  height?: number;
  animation?: object;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let dead = false;
    let item: { destroy: () => void } | null = null;
    void (async () => {
      try {
        const mod = await import("lottie-web");
        const player = mod.default ?? (mod as unknown as typeof mod.default);
        if (dead || !ref.current) return;
        item = player.loadAnimation({
          container: ref.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: animation ?? PULSE,
        });
      } catch {
        if (!dead) setFailed(true);
      }
    })();
    return () => {
      dead = true;
      item?.destroy();
      host.replaceChildren();
    };
  }, [animation]);

  if (failed) {
    return (
      <div
        className="nx-pulse"
        style={{ width, height, borderRadius: 999, border: "3px solid var(--color-accent)" }}
        aria-hidden
      />
    );
  }
  return <div ref={ref} style={{ width, height }} aria-hidden />;
}
