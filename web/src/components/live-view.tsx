"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Pause, Play, Radio } from "lucide-react";

export function LiveView({ printerId, snapshotUrl }: { printerId: string; snapshotUrl: string | null }) {
  const [playing, setPlaying] = useState(true);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"connecting" | "live" | "waiting">("connecting");

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    if (!playing) return;
    const load = () => {
      const url = `/api/media/${printerId}/live?frame=${Date.now()}`;
      const next = new window.Image();
      next.onload = () => {
        if (cancelled) return;
        setLiveUrl(url);
        setPhase("live");
        timer = window.setTimeout(load, 1000);
      };
      next.onerror = () => {
        if (cancelled) return;
        setPhase("waiting");
        timer = window.setTimeout(load, 1500);
      };
      next.src = url;
    };
    load();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [playing, printerId]);

  const displayPhase = playing ? phase : "paused";
  const label = displayPhase === "live" ? "NEAR LIVE · 1 FPS" : displayPhase === "paused" ? "PAUSED" : displayPhase === "waiting" ? "WAITING FOR FRAMES" : "CONNECTING";

  return (
    <div className="relative aspect-video overflow-hidden bg-black">
      {liveUrl ? <Image unoptimized priority fill sizes="(min-width: 1024px) 70vw, 100vw" className="object-cover" src={liveUrl} alt={`${printerId} 준실시간 영상`} /> : snapshotUrl ? <Image unoptimized priority fill sizes="(min-width: 1024px) 70vw, 100vw" className="object-cover" src={snapshotUrl} alt={`${printerId} 최근 촬영 이미지`} /> : <div className="grid h-full place-items-center bg-chrome"><div className="text-center"><Radio className="mx-auto mb-3 text-muted" size={28} /><p className="text-sm text-muted">카메라 연결 대기 중</p></div></div>}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <span className={`flex items-center gap-2 font-mono text-xs ${displayPhase === "live" ? "text-success" : "text-white"}`}><span className={`h-2 w-2 rounded-full ${displayPhase === "live" ? "bg-success" : "bg-white/50"}`} />{label}</span>
        <button onClick={() => setPlaying((value) => !value)} className="flex h-9 items-center gap-2 rounded-control border border-white/20 bg-black/50 px-3 text-xs font-medium text-white backdrop-blur">{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? "일시정지" : "재생"}</button>
      </div>
    </div>
  );
}
