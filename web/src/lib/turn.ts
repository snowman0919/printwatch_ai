import "server-only";

export type IceServer = { urls: string | string[]; username?: string; credential?: string };

export async function iceServers(): Promise<IceServer[]> {
  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID;
  const token = process.env.CLOUDFLARE_TURN_API_TOKEN;
  if (!keyId || !token) return [{ urls: "stun:stun.cloudflare.com:3478" }];
  const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ ttl: 3600 }), cache: "no-store" });
  if (!response.ok) throw new Error(`TURN credential request failed: HTTP ${response.status}`);
  const data = await response.json() as { iceServers: IceServer[] };
  return data.iceServers.map((entry) => ({ ...entry, urls: Array.isArray(entry.urls) ? entry.urls.filter((url) => !url.includes(":53")) : entry.urls }));
}
