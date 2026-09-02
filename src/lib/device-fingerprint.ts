import FingerprintJS from "@fingerprintjs/fingerprintjs";

export type FingerprintSignals = {
  visitorId: string;
  userAgent: string;
  platform: string;
  screen: string;
  colorDepth: number;
  timezone: string;
  languages: string;
  gpuVendor: string;
  gpuRenderer: string;
  cpuCores: number;
  deviceMemory: number;
  canvasHash: string;
  audioHash: string;
};

export type DeviceFingerprint = {
  /** Final deterministic fingerprint string. */
  fingerprint: string;
  /** Raw parameters used to build the fingerprint. */
  signals: FingerprintSignals;
};

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fastHash(input: string): string {
  let h1 = 0x9e3779b1;
  for (let i = 0; i < input.length; i += 1) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x85ebca6b);
    h1 ^= h1 >>> 13;
  }
  return (h1 >>> 0).toString(16);
}

function getWebGL(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return { vendor: "none", renderer: "none" };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor: String(ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)),
      renderer: String(
        ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      ),
    };
  } catch {
    return { vendor: "error", renderer: "error" };
  }
}

function getCanvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "none";
    ctx.textBaseline = "top";
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 120, 30);
    ctx.fillStyle = "#069";
    ctx.fillText("Device-FP-1234567890", 4, 8);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("Device-FP-1234567890", 6, 22);
    return fastHash(canvas.toDataURL());
  } catch {
    return "error";
  }
}

async function getAudioHash(): Promise<string> {
  try {
    const Ctx =
      (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext })
        .OfflineAudioContext ??
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    if (!Ctx) return "none";
    const ctx = new Ctx(1, 44100, 44100);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 10000;
    const comp = ctx.createDynamicsCompressor();
    osc.connect(comp);
    comp.connect(ctx.destination);
    osc.start(0);
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0).subarray(4500, 5000);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) sum += Math.abs(data[i] ?? 0);
    return fastHash(sum.toString());
  } catch {
    return "error";
  }
}

async function getVisitorId(): Promise<string> {
  try {
    const agent = await FingerprintJS.load();
    const { visitorId } = await agent.get();
    return visitorId;
  } catch {
    return "";
  }
}

let cached: Promise<DeviceFingerprint> | null = null;

/**
 * Generates a stable, unique device fingerprint from FingerprintJS plus
 * hardware/runtime signals, and returns both the raw signals and final hash.
 */
export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  if (typeof window === "undefined") {
    return {
      fingerprint: "",
      signals: {
        visitorId: "",
        userAgent: "",
        platform: "",
        screen: "",
        colorDepth: 0,
        timezone: "",
        languages: "",
        gpuVendor: "",
        gpuRenderer: "",
        cpuCores: 0,
        deviceMemory: 0,
        canvasHash: "",
        audioHash: "",
      },
    };
  }

  if (!cached) {
    cached = (async () => {
      const nav = navigator as Navigator & { deviceMemory?: number };
      const gpu = getWebGL();
      const [visitorId, audioHash] = await Promise.all([getVisitorId(), getAudioHash()]);

      const signals: FingerprintSignals = {
        visitorId,
        userAgent: nav.userAgent,
        platform: nav.platform ?? "",
        screen: `${screen.width}x${screen.height}@${window.devicePixelRatio}`,
        colorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
        languages: (nav.languages ?? [nav.language]).join(","),
        gpuVendor: gpu.vendor,
        gpuRenderer: gpu.renderer,
        cpuCores: nav.hardwareConcurrency ?? 0,
        deviceMemory: nav.deviceMemory ?? 0,
        canvasHash: getCanvasHash(),
        audioHash,
      };

      const payload = Object.entries(signals)
        .map(([key, value]) => `${key}=${value}`)
        .join("|");

      return { fingerprint: await sha256(payload), signals };
    })();
  }

  return cached;
}
