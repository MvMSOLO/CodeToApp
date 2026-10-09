import { useEffect, useRef } from "react";
import { useP2PRoom } from "@/lib/multiplayer/use-p2p-room";
import type { Mode } from "@/lib/nexus/types";

export interface RoomSnap {
  from: string;
  mode: Mode;
  code: string;
}

export function RoomBridge({
  room,
  name,
  mode,
  code,
  onSnapshot,
  onStatus,
  onBind,
}: {
  room: string;
  name: string;
  mode: Mode;
  code: string;
  onSnapshot: (snap: RoomSnap) => void;
  onStatus: (status: { joined: boolean; peers: { id: string; name: string; state: string; rtt: number | null }[] }) => void;
  onBind: (push: ((payload: unknown) => void) | null) => void;
}) {
  const p2p = useP2PRoom({ room, name });
  const modeRef = useRef(mode);
  const codeRef = useRef(code);
  modeRef.current = mode;
  codeRef.current = code;
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    onBind((payload) => p2p.send(payload));
    return () => onBind(null);
  }, [onBind, p2p.send]);

  useEffect(() => {
    onStatus({
      joined: p2p.joined,
      peers: p2p.peers.map((peer) => ({
        id: peer.id,
        name: peer.name || "Runner",
        state: peer.connectionState,
        rtt: peer.rttMs,
      })),
    });
  }, [onStatus, p2p.joined, p2p.peers]);

  useEffect(
    () =>
      p2p.onMessage((from, data, channel) => {
        if (channel !== "reliable" || !data || typeof data !== "object") return;
        const msg = data as { type?: string; mode?: Mode; code?: string };
        if (msg.type !== "snapshot" || typeof msg.code !== "string") return;
        if (msg.mode !== "html" && msg.mode !== "json" && msg.mode !== "flutter") return;
        onSnapshot({ from, mode: msg.mode, code: msg.code });
      }),
    [onSnapshot, p2p.onMessage],
  );

  useEffect(() => {
    const ids = new Set(p2p.peers.map((peer) => peer.id));
    if (!primed.current) {
      primed.current = true;
      seen.current = ids;
      return;
    }
    const newcomers = [...ids].filter((id) => !seen.current.has(id));
    const already = [p2p.selfId, ...seen.current];
    seen.current = ids;
    if (!newcomers.length || codeRef.current.length > 80_000) return;
    const smallest = [...already].sort()[0];
    if (smallest === p2p.selfId) {
      p2p.send({ type: "snapshot", mode: modeRef.current, code: codeRef.current });
    }
  }, [p2p.peers, p2p.selfId, p2p.send]);

  return null;
}
