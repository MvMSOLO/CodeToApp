import type { Mode } from "./types";

export interface SharePayload {
  mode: Mode;
  code: string;
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const pad = b64.length % 4 === 0 ? b64 : b64 + "=".repeat(4 - (b64.length % 4));
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function toUrl(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromUrl(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return b64;
}

export async function packShare(payload: SharePayload): Promise<string | null> {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  try {
    if (typeof CompressionStream === "undefined") {
      const token = `0${toUrl(bytesToB64(bytes))}`;
      return token.length > 6500 ? null : token;
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
    const zipped = new Uint8Array(await new Response(stream).arrayBuffer());
    const token = `1${toUrl(bytesToB64(zipped))}`;
    return token.length > 6500 ? null : token;
  } catch {
    return null;
  }
}

export async function unpackShare(token: string): Promise<SharePayload | null> {
  try {
    const kind = token[0];
    const bytes = b64ToBytes(fromUrl(token.slice(1)));
    let text = "";
    if (kind === "1" && typeof DecompressionStream !== "undefined") {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      text = await new Response(stream).text();
    } else if (kind === "0") {
      text = new TextDecoder().decode(bytes);
    } else return null;
    const data = JSON.parse(text) as SharePayload;
    if (data.mode !== "html" && data.mode !== "json" && data.mode !== "flutter") return null;
    if (typeof data.code !== "string" || data.code.length > 500_000) return null;
    return data;
  } catch {
    return null;
  }
}

export function shareUrl(token: string): string {
  const path = window.location.pathname || "/";
  return `${window.location.origin}${path}#s=${token}`;
}
