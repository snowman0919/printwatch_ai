"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Radio, RefreshCw } from "lucide-react";

type IceServer = { urls: string | string[]; username?: string; credential?: string };
async function gatheringComplete(peer: RTCPeerConnection) { if (peer.iceGatheringState === "complete") return; await new Promise<void>((resolve) => { const timeout = window.setTimeout(resolve, 8000); const listener = () => { if (peer.iceGatheringState === "complete") { clearTimeout(timeout); peer.removeEventListener("icegatheringstatechange", listener); resolve(); } }; peer.addEventListener("icegatheringstatechange", listener); }); }

export function LiveView({ printerId, snapshotUrl }: { printerId: string; snapshotUrl: string | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const [phase, setPhase] = useState<"snapshot" | "connecting" | "live" | "error">("snapshot");
  useEffect(() => () => peerRef.current?.close(), [printerId]);

  async function connect() {
    peerRef.current?.close();
    setPhase("connecting");
    try {
      const turn = await fetch("/api/app/turn", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error("TURN configuration failed"); return response.json() as Promise<{iceServers: IceServer[]}>; });
      const peer = new RTCPeerConnection({ iceServers: turn.iceServers });
      peerRef.current = peer;
      peer.addTransceiver("video", { direction: "recvonly" });
      peer.ontrack = (event) => { if (videoRef.current) { videoRef.current.srcObject = event.streams[0]; setPhase("live"); } };
      peer.onconnectionstatechange = () => { if (["failed", "disconnected", "closed"].includes(peer.connectionState)) setPhase("error"); };
      await peer.setLocalDescription(await peer.createOffer());
      await gatheringComplete(peer);
      const created = await fetch(`/api/app/streams/${printerId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ offer: peer.localDescription }) });
      if (!created.ok) throw new Error("Signaling failed");
      const { sessionId } = await created.json() as {sessionId:string};
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await fetch(`/api/app/streams/${printerId}?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        if (response.status === 202) continue;
        if (!response.ok) throw new Error("Signaling failed");
        const { answer } = await response.json();
        await peer.setRemoteDescription(answer);
        return;
      }
      throw new Error("Camera agent did not answer");
    } catch { setPhase("error"); peerRef.current?.close(); }
  }

  return (
    <div className="relative aspect-video overflow-hidden bg-black">
      {snapshotUrl ? <Image unoptimized priority fill sizes="(min-width: 1024px) 70vw, 100vw" className={`object-cover ${phase === "live" ? "hidden" : "block"}`} src={snapshotUrl} alt={`${printerId} 최근 촬영 이미지`} /> : <div className="grid h-full place-items-center bg-chrome"><div className="text-center"><Radio className="mx-auto mb-3 text-muted" size={28} /><p className="text-sm text-muted">카메라 연결 대기 중</p></div></div>}
      <video ref={videoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${phase === "live" ? "block" : "hidden"}`} />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <span className={`flex items-center gap-2 font-mono text-xs ${phase === "live" ? "text-success" : "text-white"}`}><span className={`h-2 w-2 rounded-full ${phase === "live" ? "bg-success" : "bg-white/50"}`} />{phase === "live" ? "WEBRTC LIVE" : phase === "connecting" ? "CONNECTING" : phase === "error" ? "CONNECTION LOST" : "LATEST FRAME"}</span>
        <button onClick={connect} disabled={phase === "connecting"} className="flex h-9 items-center gap-2 border border-white/20 bg-black/50 px-3 text-xs font-medium text-white backdrop-blur disabled:opacity-50"><RefreshCw size={14} className={phase === "connecting" ? "animate-spin" : ""} />{phase === "live" ? "재연결" : "실시간 연결"}</button>
      </div>
    </div>
  );
}
