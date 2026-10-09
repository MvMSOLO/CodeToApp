import { useEffect } from "react";
import { Toaster } from "sonner";
import { hydrateNexus, inkFor, useNexus } from "@/lib/nexus/store";

export function ThemeBridge() {
  const hydrated = useNexus((s) => s.hydrated);
  const theme = useNexus((s) => s.theme);
  const accent = useNexus((s) => s.accent);
  const contrast = useNexus((s) => s.contrast);
  const fontScale = useNexus((s) => s.fontScale);

  useEffect(() => {
    hydrateNexus();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.contrast = contrast ? "high" : "normal";
    root.dataset.scale = String(fontScale);
    root.style.setProperty("--color-accent", accent);
    root.style.setProperty("--color-accent-ink", inkFor(accent));
    root.style.colorScheme = theme === "light" ? "light" : "dark";
  }, [hydrated, theme, accent, contrast, fontScale]);

  return <Toaster theme={theme === "light" ? "light" : "dark"} position="top-center" />;
}
