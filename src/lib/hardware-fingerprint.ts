/**
 * Cross-browser, hardware-only device fingerprint.
 *
 * Only OS/hardware level traits are used (GPU, CPU, memory, display, locale,
 * installed system fonts). User agent, browser name, canvas raster output,
 * AudioContext DSP output and any network/IP data are deliberately excluded,
 * because those differ between rendering engines — which would break the id
 * when the user switches from Chrome to Firefox to Edge. The remaining signals
 * come from the physical machine, so the id is identical across browsers,
 * private windows and with a VPN enabled.
 */

export type HardwareTraits = {
  gpuVendor: string;
  gpuRenderer: string;
  cpuCores: number;
  deviceMemory: string;
  screen: string;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
  timezone: string;
  languages: string;
  fonts: string;
  touchPoints: number;
  displayMode: string;
};

export type HardwareFingerprint = {
  id: string;
  traits: HardwareTraits;
};

/** Standard OS-shipped font families; the detected set reveals the host OS build. */
const FONT_CANDIDATES = [
  "Arial",
  "Arial Narrow",
  "Cambria",
  "Calibri",
  "Courier New",
  "Georgia",
  "Helvetica Neue",
  "Lucida Grande",
  "MS Gothic",
  "Noto Naskh Arabic",
  "Palatino",
  "San Francisco",
  "Segoe UI",
  "Tahoma",
  "Times New Roman",
  "Traditional Arabic",
  "Trebuchet MS",
  "Verdana",
];

const EMPTY_TRAITS: HardwareTraits = {
  gpuVendor: "",
  gpuRenderer: "",
  cpuCores: 0,
  deviceMemory: "",
  screen: "",
  colorDepth: 0,
  pixelDepth: 0,
  devicePixelRatio: 0,
  timezone: "",
  languages: "",
  fonts: "",
  touchPoints: 0,
  displayMode: "",
};

async function sha256(input: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    // Non-crypto fallback for insecure contexts.
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0").repeat(4);
  }
}

function collectGpu(): { gpuVendor: string; gpuRenderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return { gpuVendor: "unsupported", gpuRenderer: "unsupported" };
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = info
      ? String(gl.getParameter(info.UNMASKED_VENDOR_WEBGL))
      : String(gl.getParameter(gl.VENDOR));
    const renderer = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    return { gpuVendor: normalize(vendor), gpuRenderer: normalize(renderer) };
  } catch {
    return { gpuVendor: "unavailable", gpuRenderer: "unavailable" };
  }
}

/**
 * Normalizes GPU strings so engine-specific decorations (ANGLE wrappers,
 * driver/API versions, "Direct3D11 vs Metal") do not change the hash.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/angle\s*\(([^)]*)\)/g, "$1")
    .replace(/direct3d\d*|d3d\d*|opengl(\s*es)?|metal|vulkan/g, " ")
    .replace(/vs_\d+_\d+|ps_\d+_\d+/g, " ")
    .replace(/\d+(\.\d+)+/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detects locally installed fonts; presence-only, so per-engine metrics don't matter. */
function collectFonts(): string {
  const found: string[] = [];
  try {
    const checker = document.fonts;
    if (checker && typeof checker.check === "function") {
      for (const font of FONT_CANDIDATES) {
        try {
          if (checker.check(`16px "${font}"`)) found.push(font);
        } catch {
          /* ignore single font failure */
        }
      }
      if (found.length) return found.sort().join(",");
    }

    // Fallback: width comparison against generic families.
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "unsupported";
    const width = (family: string) => {
      ctx.font = `16px ${family}`;
      return Math.round(ctx.measureText("mmmmmmmmmmlliWWW").width);
    };
    const base = width("monospace");
    for (const font of FONT_CANDIDATES) {
      if (width(`"${font}", monospace`) !== base) found.push(font);
    }
    return found.sort().join(",");
  } catch {
    return "unavailable";
  }
}

/** Reduces GPU strings to a coarse family every engine agrees on. */
function gpuFamily(vendor: string, renderer: string): string {
  const text = `${vendor} ${renderer}`.toLowerCase();
  const brand = /nvidia|geforce|rtx|gtx/.test(text)
    ? "nvidia"
    : /amd|radeon|ati/.test(text)
      ? "amd"
      : /intel|iris|uhd|hd graphics/.test(text)
        ? "intel"
        : /apple|m1|m2|m3/.test(text)
          ? "apple"
          : /adreno/.test(text)
            ? "adreno"
            : /mali/.test(text)
              ? "mali"
              : /powervr/.test(text)
                ? "powervr"
                : "generic";
  const model = text.match(/(rtx|gtx|radeon|iris|adreno|mali|apple)[a-z0-9 -]{0,12}/)?.[0] ?? "";
  return `${brand}:${model.replace(/\s+/g, "")}`;
}

/** Coarse OS family from userAgentData/platform; identical across browsers. */
function platformFamily(): string {
  const nav = navigator as unknown as { userAgentData?: { platform?: string }; platform?: string };
  const raw = `${nav.userAgentData?.platform ?? ""} ${nav.platform ?? ""}`.toLowerCase();
  if (/win/.test(raw)) return "windows";
  if (/android/.test(raw)) return "android";
  if (/iphone|ipad|ipod|ios/.test(raw)) return "ios";
  if (/mac/.test(raw)) return "macos";
  if (/linux|x11/.test(raw)) return "linux";
  return "unknown";
}

let cached: Promise<HardwareFingerprint> | null = null;

/** Collects hardware-only traits and returns the cross-browser device id. */
export function getHardwareFingerprint(force = false): Promise<HardwareFingerprint> {
  if (typeof window === "undefined") {
    return Promise.resolve({ id: "", traits: EMPTY_TRAITS });
  }
  if (force) cached = null;
  if (!cached) {
    cached = (async () => {
      // Yield first so collection never blocks the first paint.
      await new Promise((r) => setTimeout(r, 0));

      const { gpuVendor, gpuRenderer } = collectGpu();
      const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;

      const traits: HardwareTraits = {
        gpuVendor,
        gpuRenderer,
        cpuCores: navigator.hardwareConcurrency ?? 0,
        deviceMemory: typeof memory === "number" ? `${memory}GB` : "unknown",
        screen: `${window.screen.width}x${window.screen.height}`,
        colorDepth: window.screen.colorDepth ?? 0,
        pixelDepth: window.screen.pixelDepth ?? 0,
        devicePixelRatio: Math.round((window.devicePixelRatio ?? 1) * 100) / 100,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
        languages: [
          ...new Set((navigator.languages ?? [navigator.language]).map((l) => l.split("-")[0])),
        ]
          .sort()
          .join(","),
        fonts: collectFonts(),
        touchPoints: navigator.maxTouchPoints ?? 0,
        displayMode: window.matchMedia("(display-mode: standalone)").matches
          ? "standalone"
          : "browser",
      };

      // Values are deliberately coarse to remain stable across browser and
      // network changes while still separating different hardware profiles.
      const stable = [
        `gpu=${gpuFamily(gpuVendor, gpuRenderer)}`,
        `screen=${Math.max(window.screen.width, window.screen.height)}x${Math.min(window.screen.width, window.screen.height)}`,
        `depth=${traits.colorDepth}`,
        `cores=${traits.cpuCores}`,
        `touch=${traits.touchPoints}`,
        `tz=${traits.timezone}`,
        `platform=${platformFamily()}`,
      ];
      const payload = stable.sort().join("|");

      return { id: await sha256(payload), traits };
    })();
  }
  return cached;
}
