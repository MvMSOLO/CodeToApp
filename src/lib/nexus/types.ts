export type Mode = "html" | "json" | "flutter";

export type ThemeName = "dark" | "light" | "oled";

export interface HistItem {
  id: string;
  at: number;
  mode: Mode;
  title: string;
  code: string;
}

export interface Snip {
  id: string;
  name: string;
  mode: Mode;
  code: string;
}

export interface LivePayload {
  id: string;
  at: number;
  mode: Mode;
  code: string;
  title: string;
}

export const MODES: Mode[] = ["html", "json", "flutter"];

export const MODE_LABEL: Record<Mode, string> = {
  html: "HTML",
  json: "JSON",
  flutter: "Flutter",
};

export function nid(): string {
  return Math.random().toString(36).slice(2, 10);
}
