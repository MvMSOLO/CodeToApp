import type { LivePayload } from "./types";

export const LIVE_KEY = "nexus:live";
const CHANNEL = "nexus-hot";

export function publishLive(payload: LivePayload) {
  const raw = JSON.stringify(payload);
  try {
    sessionStorage.setItem(LIVE_KEY, raw);
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(LIVE_KEY, raw);
  } catch {
    /* quota */
  }
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage(payload);
    bc.close();
  } catch {
    /* unsupported */
  }
}

export function readLive(): LivePayload | null {
  const raw = sessionStorage.getItem(LIVE_KEY) || localStorage.getItem(LIVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as LivePayload;
    if (!data || typeof data.code !== "string") return null;
    if (data.mode !== "html" && data.mode !== "json" && data.mode !== "flutter") return null;
    return data;
  } catch {
    return null;
  }
}

export function subscribeLive(onPayload: (payload: LivePayload) => void): () => void {
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (ev: MessageEvent<LivePayload>) => {
      const data = ev.data;
      if (data && typeof data.code === "string") onPayload(data);
    };
  } catch {
    bc = null;
  }
  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== LIVE_KEY || !ev.newValue) return;
    try {
      onPayload(JSON.parse(ev.newValue) as LivePayload);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    bc?.close();
    window.removeEventListener("storage", onStorage);
  };
}
