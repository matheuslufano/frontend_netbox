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
  let nextLightness = l;
  let nextSaturation = s;
  if (role === "background") nextLightness = l > 65 ? 16 + (100 - l) * 0.12 : clamp(l * 0.62, 14, 35);
  if (role === "surface") nextLightness = l > 65 ? 24 + (100 - l) * 0.1 : clamp(l * 0.72, 18, 42);
  if (role === "border") nextLightness = l > 55 ? 34 + (100 - l) * 0.08 : clamp(l, 30, 48);
  if (role === "text") nextLightness = l < 58 ? 91 - l * 0.12 : clamp(l, 68, 94);
  if (role === "semantic" || protectedBrandColors.has(normalizedHex)) {
    nextLightness = clamp(l, 48, 68);
    nextSaturation = clamp(s, 52, 100);
  } else if (role !== "text") nextSaturation = clamp(s * 0.82, 0, 72);
  const result = `hsl(${h} ${Math.round(nextSaturation)}% ${Math.round(nextLightness)}%)`;
  colorCache.set(key, result);
  return result;
}
