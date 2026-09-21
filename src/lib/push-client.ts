/** Klientsida: registrera service worker och prenumerera på push. */

function b64uToUint8(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function bytesToB64u(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  let s = "";
  for (const b of new Uint8Array(buffer)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type PushOutcome =
  | { status: "ok"; endpoint: string; p256dh: string; auth: string; label: string }
  | { status: "unsupported" | "denied" | "no-key" | "open-in-tab"; message: string };

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    typeof Notification !== "undefined"
  );
}

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iPhone/iPad";
  if (/Android/.test(ua)) return "Android-telefon";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Den här enheten";
}

export async function enablePush(publicKey: string | null): Promise<PushOutcome> {
  if (!pushSupported()) {
    return { status: "unsupported", message: "Den här webbläsaren stöder inte notiser." };
  }
  if (!publicKey) {
    return { status: "no-key", message: "Notisnycklarna saknas på servern." };
  }
  if (window.top !== window.self) {
    return {
      status: "open-in-tab",
      message: "Öppna Dagsform i en egen flik eller från hemskärmen för att slå på notiser.",
    };
  }

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    return { status: "denied", message: "Notiser är blockerade. Slå på dem för sidan i telefonens inställningar." };
  }

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64uToUint8(publicKey) as unknown as BufferSource,
    }));

  const json = subscription.toJSON() as { keys?: { p256dh?: string; auth?: string } };
  return {
    status: "ok",
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh ?? bytesToB64u(subscription.getKey("p256dh")),
    auth: json.keys?.auth ?? bytesToB64u(subscription.getKey("auth")),
    label: deviceLabel(),
  };
}

export async function disablePush(): Promise<string | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
