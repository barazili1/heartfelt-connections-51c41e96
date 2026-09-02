/**
 * Native Android bridge.
 *
 * The Android WebView app injects an object named `KajoAndroid` that exposes
 * the real ANDROID_ID (Settings.Secure.ANDROID_ID). When it is present it
 * fully replaces the browser fingerprint: the device identity is the phone
 * itself, not the rendering engine.
 */

type KajoAndroidBridge = {
  getAndroidId?: () => string;
  getAppVersion?: () => string;
};

function getBridge(): KajoAndroidBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { KajoAndroid?: KajoAndroidBridge }).KajoAndroid;
  return bridge && typeof bridge.getAndroidId === "function" ? bridge : null;
}

/** True when the page runs inside the official Android app. */
export function isAndroidApp(): boolean {
  return getRawAndroidId() !== "";
}

/** Raw ANDROID_ID exactly as reported by the device (16 hex chars), or "". */
export function getRawAndroidId(): string {
  try {
    const id = getBridge()?.getAndroidId?.() ?? "";
    return typeof id === "string" && id.length >= 8 ? id.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Stable device id derived from ANDROID_ID.
 * Prefixed so native ids never collide with browser fingerprints.
 */
export function getAndroidDeviceId(): string {
  const raw = getRawAndroidId();
  return raw ? `and_${raw}` : "";
}

/** App version reported by the native shell (empty in a normal browser). */
export function getAndroidAppVersion(): string {
  try {
    return getBridge()?.getAppVersion?.() ?? "";
  } catch {
    return "";
  }
}
