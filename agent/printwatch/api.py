import asyncio
from datetime import datetime, timezone
import json

import aiohttp
from aiortc import RTCConfiguration, RTCIceServer, RTCPeerConnection, RTCSessionDescription
from .camera import Camera, CameraTrack
from .config import Config


class ServerApi:
    def __init__(self, config: Config, camera: Camera) -> None:
        self.config = config
        self.camera = camera
        self.session = aiohttp.ClientSession(headers={"Authorization": f"Bearer {config.device_token}"})
        self.peers: dict[str, RTCPeerConnection] = {}

    async def close(self) -> None:
        await self.session.close()
        await asyncio.gather(*(peer.close() for peer in self.peers.values()), return_exceptions=True)

    async def upload(self, image: bytes, telemetry: dict, analyze: bool) -> dict:
        form = aiohttp.FormData()
        form.add_field("printerId", self.config.printer_id)
        form.add_field("capturedAt", datetime.now(timezone.utc).isoformat())
        form.add_field("telemetry", json.dumps(telemetry))
        form.add_field("requestAnalysis", "true" if analyze else "false")
        form.add_field("image", image, filename="snapshot.jpg", content_type="image/jpeg")
        async with self.session.post(f"{self.config.server_url}/api/device/snapshot", data=form, timeout=aiohttp.ClientTimeout(total=110)) as response:
            response.raise_for_status()
            return await response.json()

    async def _ice(self) -> list[RTCIceServer]:
        async with self.session.get(f"{self.config.server_url}/api/device/turn", params={"printerId": self.config.printer_id}) as response:
            response.raise_for_status()
            body = await response.json()
        return [RTCIceServer(urls=entry["urls"], username=entry.get("username"), credential=entry.get("credential")) for entry in body["iceServers"]]

    async def answer_pending(self) -> None:
        async with self.session.get(f"{self.config.server_url}/api/device/sessions", params={"printerId": self.config.printer_id}, timeout=10) as response:
            response.raise_for_status()
            sessions = (await response.json())["sessions"]
        for item in sessions:
            if item["id"] in self.peers:
                continue
            peer = RTCPeerConnection(RTCConfiguration(iceServers=await self._ice()))
            self.peers[item["id"]] = peer
            peer.addTrack(CameraTrack(self.camera, fps=2.0))

            @peer.on("connectionstatechange")
            async def connection_state(peer=peer, session_id=item["id"]):
                if peer.connectionState in {"failed", "closed", "disconnected"}:
                    await peer.close()
                    self.peers.pop(session_id, None)

            offer = item["offer"]
            await peer.setRemoteDescription(RTCSessionDescription(sdp=offer["sdp"], type=offer["type"]))
            await peer.setLocalDescription(await peer.createAnswer())
            answer = {"type": peer.localDescription.type, "sdp": peer.localDescription.sdp}
            async with self.session.post(f"{self.config.server_url}/api/device/sessions/{item['id']}/answer", json={"printerId": self.config.printer_id, "answer": answer}, timeout=10) as response:
                response.raise_for_status()
