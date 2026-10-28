export type ThemeColorRole = "background" | "surface" | "text" | "border" | "semantic";

const colorCache = new Map<string, string>();
const protectedBrandColors = new Set(["#ff5f34", "#ff7043", "#f97316"]);

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function parseColor(value: string): [number, number, number] | null {
  const color = value.trim().toLowerCase();
  const shortHex = /^#([\da-f])([\da-f])([\da-f])$/i.exec(color);
  if (shortHex) return shortHex.slice(1).map((part) => parseInt(part + part, 16)) as [number, number, number];
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (hex) return hex.slice(1).map((part) => parseInt(part, 16)) as [number, number, number];
  const rgb = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)/i.exec(color);
  if (rgb) return rgb.slice(1).map((part) => clamp(Number(part), 0, 255)) as [number, number, number];
  return null;
}

function rgbToHsl([red, green, blue]: [number, number, number]) {
  const [r, g, b] = [red / 255, green / 255, blue / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  const lightness = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  return { h: Math.round((hue * 60 + 360) % 360), s: saturation * 100, l: lightness * 100 };
}

/** Converts legacy UI colors without touching images, videos, logos or canvas content. */
export function getDarkThemeColor(originalColor: string, role: ThemeColorRole): string {
  const key = `${role}:${originalColor.trim().toLowerCase()}`;
  const cached = colorCache.get(key);
  if (cached) return cached;
  const rgb = parseColor(originalColor);
  if (!rgb) return originalColor;
  const normalizedHex = `#${rgb.map((part) => Math.round(part).toString(16).padStart(2, "0")).join("")}`;
  const { h, s, l } = rgbToHsl(rgb);
  // Brand fills keep white labels readable; pale legacy surfaces use a shared graphite hue.
  if (protectedBrandColors.has(normalizedHex) && role !== "text" && role !== "border") {
    return originalColor;
  }
  const isNeutral = s < 22 || (l > 86 && s < 45) || (role === "text" && s < 50);
  let nextHue = isNeutral ? 252 : h;
  let nextSaturation = isNeutral ? 16 : clamp(s * 0.5, 24, 48);
  let nextLightness = 13;

  if (role === "background") nextLightness = 7;
  if (role === "surface") nextLightness = 13;
  if (role === "border") {
    nextLightness = 25;
    nextSaturation = isNeutral ? 12 : 30;
  }
  if (role === "text") {
    nextLightness = isNeutral ? (l < 25 ? 94 : 75) : 74;
    nextSaturation = isNeutral ? 18 : clamp(s * 0.8, 50, 85);
  }
  if (role === "semantic") {
    nextHue = h;
    nextLightness = clamp(l, 58, 72);
    nextSaturation = clamp(s, 52, 90);
  }
  const result = `hsl(${nextHue} ${Math.round(nextSaturation)}% ${Math.round(nextLightness)}%)`;
  colorCache.set(key, result);
  return result;
}
