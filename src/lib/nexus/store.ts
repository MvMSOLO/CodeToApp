import { create } from "zustand";
import { flutterExample, htmlExample, jsonExample } from "./examples";
import type { HistItem, Mode, Snip, ThemeName } from "./types";
import { nid } from "./types";

const KEY = "nexus-runner-v1";
const SCALES = [0.875, 1, 1.125, 1.25] as const;

export interface NexusStore {
  hydrated: boolean;
  mode: Mode;
  code: Record<Mode, string>;
  theme: ThemeName;
  accent: string;
  contrast: boolean;
  haptics: boolean;
  fontScale: number;
  history: HistItem[];
  snippets: Snip[];
  coach: boolean;
  displayName: string;
  setMode: (mode: Mode) => void;
  setCode: (mode: Mode, code: string) => void;
  setTheme: (theme: ThemeName) => void;
  setAccent: (accent: string) => void;
  setContrast: (contrast: boolean) => void;
  setHaptics: (haptics: boolean) => void;
  setFontScale: (fontScale: number) => void;
  setDisplayName: (name: string) => void;
  setCoach: (coach: boolean) => void;
  pushHistory: (item: HistItem) => void;
  restoreHistory: (id: string) => void;
  saveSnippet: (name: string) => void;
  deleteSnippet: (id: string) => void;
  applySnippet: (id: string) => void;
  loadShowcase: (mode?: Mode) => void;
  applyShared: (mode: Mode, code: string) => void;
}

const showcases: Record<Mode, string> = {
  html: htmlExample,
  json: jsonExample,
  flutter: flutterExample,
};

export const useNexus = create<NexusStore>((set, get) => ({
  hydrated: false,
  mode: "html",
  code: { ...showcases },
  theme: "dark",
  accent: "#ff6a3d",
  contrast: false,
  haptics: true,
  fontScale: 1,
  history: [],
  snippets: [],
  coach: false,
  displayName: "Guest",
  setMode: (mode) => set({ mode }),
  setCode: (mode, code) => set((s) => ({ code: { ...s.code, [mode]: code } })),
  setTheme: (theme) => set({ theme }),
  setAccent: (accent) => set({ accent }),
  setContrast: (contrast) => set({ contrast }),
  setHaptics: (haptics) => set({ haptics }),
  setFontScale: (fontScale) => set({ fontScale }),
  setDisplayName: (displayName) => set({ displayName: displayName.slice(0, 24) }),
  setCoach: (coach) => set({ coach }),
  pushHistory: (item) =>
    set((s) => {
      const latest = s.history[0];
      if (latest && latest.mode === item.mode && latest.code === item.code) return s;
      const history = [{ ...item, code: item.code.slice(0, 100_000) }, ...s.history].slice(0, 20);
      return { history };
    }),
  restoreHistory: (id) => {
    const item = get().history.find((entry) => entry.id === id);
    if (!item) return;
    set((s) => ({ mode: item.mode, code: { ...s.code, [item.mode]: item.code } }));
  },
  saveSnippet: (name) => {
    const { mode, code, snippets } = get();
    const snip: Snip = { id: nid(), name: name.slice(0, 40) || "Untitled", mode, code: code[mode].slice(0, 100_000) };
    set({ snippets: [snip, ...snippets].slice(0, 40) });
  },
  deleteSnippet: (id) => set((s) => ({ snippets: s.snippets.filter((snip) => snip.id !== id) })),
  applySnippet: (id) => {
    const snip = get().snippets.find((item) => item.id === id);
    if (!snip) return;
    set((s) => ({ mode: snip.mode, code: { ...s.code, [snip.mode]: snip.code } }));
  },
  loadShowcase: (mode) => {
    const target = mode ?? get().mode;
    set((s) => ({ mode: target, code: { ...s.code, [target]: showcases[target] } }));
  },
  applyShared: (mode, code) => set((s) => ({ mode, code: { ...s.code, [mode]: code } })),
}));

export function hydrateNexus() {
  if (typeof window === "undefined") return;
  if (useNexus.getState().hydrated) return;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      useNexus.setState({ hydrated: true });
      return;
    }
    const data = JSON.parse(raw) as Partial<Persisted>;
    useNexus.setState({ ...sanitize(data), hydrated: true });
  } catch {
    useNexus.setState({ hydrated: true });
  }
}

interface Persisted {
  mode?: Mode;
  code?: Partial<Record<Mode, string>>;
  theme?: ThemeName;
  accent?: string;
  contrast?: boolean;
  haptics?: boolean;
  fontScale?: number;
  history?: HistItem[];
  snippets?: Snip[];
  coach?: boolean;
  displayName?: string;
}

function sanitize(data: Persisted): Partial<NexusStore> {
  const mode = data.mode === "html" || data.mode === "json" || data.mode === "flutter" ? data.mode : "html";
  const code: Record<Mode, string> = {
    html: typeof data.code?.html === "string" ? data.code.html : htmlExample,
    json: typeof data.code?.json === "string" ? data.code.json : jsonExample,
    flutter: typeof data.code?.flutter === "string" ? data.code.flutter : flutterExample,
  };
  const theme = data.theme === "light" || data.theme === "oled" || data.theme === "dark" ? data.theme : "dark";
  const accent = typeof data.accent === "string" && /^#[0-9a-fA-F]{6}$/.test(data.accent) ? data.accent : "#ff6a3d";
  const fontScale = SCALES.includes(data.fontScale as (typeof SCALES)[number]) ? (data.fontScale as number) : 1;
  const history = Array.isArray(data.history)
    ? data.history.filter(isHist).slice(0, 20)
    : [];
  const snippets = Array.isArray(data.snippets) ? data.snippets.filter(isSnip).slice(0, 40) : [];
  return {
    mode,
    code,
    theme,
    accent,
    contrast: Boolean(data.contrast),
    haptics: data.haptics !== false,
    fontScale,
    history,
    snippets,
    coach: Boolean(data.coach),
    displayName: typeof data.displayName === "string" && data.displayName.trim() ? data.displayName.slice(0, 24) : "Guest",
  };
}

function isHist(item: unknown): item is HistItem {
  if (!item || typeof item !== "object") return false;
  const row = item as HistItem;
  return (row.mode === "html" || row.mode === "json" || row.mode === "flutter") && typeof row.code === "string" && typeof row.id === "string";
}

function isSnip(item: unknown): item is Snip {
  if (!item || typeof item !== "object") return false;
  const row = item as Snip;
  return (row.mode === "html" || row.mode === "json" || row.mode === "flutter") && typeof row.code === "string" && typeof row.name === "string";
}

let saveTimer = 0;
if (typeof window !== "undefined") {
  useNexus.subscribe((state) => {
    if (!state.hydrated) return;
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const payload: Persisted = {
        mode: state.mode,
        code: state.code,
        theme: state.theme,
        accent: state.accent,
        contrast: state.contrast,
        haptics: state.haptics,
        fontScale: state.fontScale,
        history: state.history,
        snippets: state.snippets,
        coach: state.coach,
        displayName: state.displayName,
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(payload));
      } catch {
        /* quota — drop history and retry once */
        try {
          payload.history = payload.history?.slice(0, 5).map((item) => ({ ...item, code: item.code.slice(0, 20_000) }));
          localStorage.setItem(KEY, JSON.stringify(payload));
        } catch {
          /* give up quietly */
        }
      }
    }, 280);
  });
}

export function inkFor(hex: string): string {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return "#1a0d08";
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return y > 0.62 ? "#141820" : "#fffaf6";
}

export function buzz(kind: "tap" | "ok" | "warn" = "tap") {
  const { haptics } = useNexus.getState();
  if (!haptics || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = kind === "ok" ? [10, 24, 12] : kind === "warn" ? [16, 30, 16] : [8];
  navigator.vibrate(pattern);
}
