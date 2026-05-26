from __future__ import annotations

import argparse
import asyncio
import fractions
import time

import cv2
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from av import VideoFrame
from google.cloud import firestore

from camera import Camera
from config import load_config


class CameraTrack(VideoStreamTrack):
    def __init__(self, width: int, height: int, fps: int) -> None:
        super().__init__()
        self.camera = Camera(width, height).__enter__()
        self.fps = max(1, min(5, fps))
        self.frame_index = 0

    async def recv(self) -> VideoFrame:
        await asyncio.sleep(1 / self.fps)
        image = self.camera.capture()
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        frame = VideoFrame.from_ndarray(image, format="rgb24")
        frame.pts = self.frame_index
        frame.time_base = fractions.Fraction(1, self.fps)
        self.frame_index += 1
        return frame


async def run(config_path: str) -> None:
    config = load_config(config_path)
    db = firestore.Client()
    active_sessions: set[str] = set()
    width = 640
    height = 480
    fps = 2

    while True:
        sessions = (
            db.collection("webrtcSessions")
            .where("printerId", "==", config.printer_id)
            .where("status", "==", "offered")
            .stream()
        )
        for session in sessions:
            if session.id in active_sessions:
                continue
            active_sessions.add(session.id)
            asyncio.create_task(answer_session(db, session.reference, width, height, fps))
        await asyncio.sleep(2)


async def answer_session(db: firestore.Client, session_ref, width: int, height: int, fps: int) -> None:
    data = session_ref.get().to_dict() or {}
    offer = data.get("offer")
    if not offer:
        return

    pc = RTCPeerConnection()
    pc.addTrack(CameraTrack(width, height, fps))

    @pc.on("icecandidate")
    async def on_icecandidate(candidate) -> None:
        if candidate is None:
            return
        session_ref.collection("calleeCandidates").add({
            "candidate": candidate.to_sdp(),
            "sdpMid": candidate.sdpMid,
            "sdpMLineIndex": candidate.sdpMLineIndex,
            "createdAt": firestore.SERVER_TIMESTAMP,
        })

    await pc.setRemoteDescription(RTCSessionDescription(sdp=offer["sdp"], type=offer["type"]))
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    session_ref.update({
        "status": "answered",
        "answer": {"type": pc.localDescription.type, "sdp": pc.localDescription.sdp},
        "updatedAt": firestore.SERVER_TIMESTAMP,
    })

    caller_candidates = session_ref.collection("callerCandidates")
    seen: set[str] = set()
    while True:
        if session_ref.get().get("status") in {"closed", "failed"}:
            await pc.close()
            return
        for candidate_doc in caller_candidates.stream():
            if candidate_doc.id in seen:
                continue
            seen.add(candidate_doc.id)
            candidate = candidate_doc.to_dict()
            await pc.addIceCandidate(candidate)
        await asyncio.sleep(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    asyncio.run(run(args.config))


if __name__ == "__main__":
    main()
