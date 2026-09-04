"use client";

import { useEffect } from "react";
import { getDarkThemeColor } from "@/lib/themeColors";
import { useTheme } from "./ThemeProvider";

type Rgba = { red: number; green: number; blue: number; alpha: number };

const DARK_ATTRIBUTES = [
  "data-nb-dark-background",
  "data-nb-dark-gradient",
  "data-nb-dark-text",
  "data-nb-dark-border",
  "data-nb-dark-shadow",
] as const;

const DARK_PROPERTIES = [
  "--nb-dynamic-background",
  "--nb-dynamic-gradient",
  "--nb-dynamic-text",
  "--nb-dynamic-border-top",
  "--nb-dynamic-border-right",
  "--nb-dynamic-border-bottom",
  "--nb-dynamic-border-left",
  "--nb-dynamic-shadow",
] as const;

const EXCLUDED_SELECTOR = [
  "img", "picture", "video", "canvas", "iframe", "object", "embed",
  "[data-dark-mode='preserve']", "[data-theme-protected]", "[data-brand-color]",
  "[class*='logo']", "[class*='Logo']", "[class*='qrcode']", "[class*='qrCode']",
  "[class*='thumbnail']", "[class*='Thumbnail']", "[class*='avatarPhoto']",
].join(",");

const IGNORED_TAGS = new Set(["SCRIPT", "STYLE", "LINK", "META", "NOSCRIPT", "SOURCE"]);
const COLOR_PATTERN = /rgba?\([^)]*\)|#[\da-f]{3,8}\b/gi;

function parseRgba(value: string): Rgba | null {
  const match = /^rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*(?:,|\/)\s*([\d.]+)%?)?\s*\)$/i.exec(value.trim());
  if (!match) {
    const hex = value.trim().replace("#", "");
    if (!/^[\da-f]{3,8}$/i.test(hex)) return null;
    const expanded = hex.length === 3 || hex.length === 4
      ? hex.split("").map((part) => part + part).join("")
      : hex;
    return {
      red: parseInt(expanded.slice(0, 2), 16),
      green: parseInt(expanded.slice(2, 4), 16),
      blue: parseInt(expanded.slice(4, 6), 16),
      alpha: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
    };
  }
  return {
    red: Number(match[1]),
    green: Number(match[2]),
    blue: Number(match[3]),
    alpha: match[4] === undefined ? 1 : Number(match[4]) / (match[0].includes("%") ? 100 : 1),
  };
}

function relativeLuminance(color: Rgba) {
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return channel(color.red) * 0.2126 + channel(color.green) * 0.7152 + channel(color.blue) * 0.0722;
}

function toRgb(color: Rgba) {
  return `rgb(${Math.round(color.red)}, ${Math.round(color.green)}, ${Math.round(color.blue)})`;
}

function withAlpha(color: string, alpha: number) {
  return alpha >= 0.999 ? color : color.replace(/\)$/, ` / ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`);
}

function convertColor(value: string, role: "background" | "surface" | "text" | "border") {
  const rgba = parseRgba(value);
  if (!rgba || rgba.alpha < 0.04) return value;
  return withAlpha(getDarkThemeColor(toRgb(rgba), role), rgba.alpha);
}

function convertGradient(value: string) {
  if (!value.includes("gradient(")) return null;
  let changed = false;
  const converted = value.replace(COLOR_PATTERN, (color) => {
    const rgba = parseRgba(color);
    if (!rgba || rgba.alpha < 0.08 || relativeLuminance(rgba) < 0.54) return color;
    changed = true;
    return convertColor(color, "surface");
  });
  return changed ? converted : null;
}

function hasDirectText(element: HTMLElement) {
  if (/^(INPUT|TEXTAREA|SELECT|OPTION|BUTTON|LABEL)$/.test(element.tagName)) return true;
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  );
}

function isExcluded(element: HTMLElement) {
  return IGNORED_TAGS.has(element.tagName) || Boolean(element.closest(EXCLUDED_SELECTOR));
}

function setDynamicValue(element: HTMLElement, attribute: string, property: string, value: string) {
  element.setAttribute(attribute, "");
  element.style.setProperty(property, value);
}

function clearElementDynamicTheme(element: HTMLElement) {
  DARK_ATTRIBUTES.forEach((attribute) => element.removeAttribute(attribute));
  DARK_PROPERTIES.forEach((property) => element.style.removeProperty(property));
}

function processElement(element: HTMLElement) {
  clearElementDynamicTheme(element);
  if (isExcluded(element)) return;
  const computed = getComputedStyle(element);
  if (computed.display === "none" || computed.visibility === "hidden") return;

  const background = parseRgba(computed.backgroundColor);
  const backgroundIsLight = background && background.alpha > 0.05 && relativeLuminance(background) > 0.58;
  if (backgroundIsLight) {
    const role = element === document.body || element.tagName === "MAIN" ? "background" : "surface";
    setDynamicValue(element, "data-nb-dark-background", "--nb-dynamic-background", convertColor(computed.backgroundColor, role));
  }

  const gradient = convertGradient(computed.backgroundImage);
  if (gradient) setDynamicValue(element, "data-nb-dark-gradient", "--nb-dynamic-gradient", gradient);

  const foreground = parseRgba(computed.color);
  if (foreground && foreground.alpha > 0.1 && relativeLuminance(foreground) < 0.34 && hasDirectText(element)) {
    setDynamicValue(element, "data-nb-dark-text", "--nb-dynamic-text", convertColor(computed.color, "text"));
  }

  const borderSides = ["Top", "Right", "Bottom", "Left"] as const;
  let changedBorder = false;
  for (const side of borderSides) {
    const width = Number.parseFloat(computed[`border${side}Width`]);
    const colorValue = computed[`border${side}Color`];
    const color = parseRgba(colorValue);
    if (width > 0 && color && color.alpha > 0.06 && relativeLuminance(color) > 0.5) {
      element.style.setProperty(`--nb-dynamic-border-${side.toLowerCase()}`, convertColor(colorValue, "border"));
      changedBorder = true;
    }
  }
  if (changedBorder) element.setAttribute("data-nb-dark-border", "");

  if (computed.boxShadow !== "none" && !computed.boxShadow.includes("inset")) {
    let changed = false;
    const shadow = computed.boxShadow.replace(COLOR_PATTERN, (color) => {
      const rgba = parseRgba(color);
      if (!rgba || relativeLuminance(rgba) < 0.48) return color;
      changed = true;
      return `rgba(0, 0, 0, ${Math.max(0.18, rgba.alpha * 0.55).toFixed(3)})`;
    });
    if (changed) setDynamicValue(element, "data-nb-dark-shadow", "--nb-dynamic-shadow", shadow);
  }
}

function clearDynamicTheme() {
  document.querySelectorAll<HTMLElement>(DARK_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(","))
    .forEach(clearElementDynamicTheme);
}

export default function DynamicDarkMode() {
  const { theme } = useTheme();

  useEffect(() => {
    if (theme !== "dark") {
      clearDynamicTheme();
      return;
    }

    const queue = new Set<HTMLElement>();
    const processed = new WeakSet<HTMLElement>();
    let scheduled = false;

    const flush = () => {
      scheduled = false;
      let count = 0;
      for (const element of queue) {
        queue.delete(element);
        if (!processed.has(element) && element.isConnected) {
          processed.add(element);
          processElement(element);
        }
        if (++count >= 250) break;
      }
      if (queue.size) schedule();
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      const browserWindow = window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      };
      if (browserWindow.requestIdleCallback) browserWindow.requestIdleCallback(flush, { timeout: 120 });
      else globalThis.setTimeout(flush, 16);
    };

    const enqueueTree = (root: ParentNode) => {
      if (root instanceof HTMLElement) queue.add(root);
      root.querySelectorAll<HTMLElement>("*").forEach((element) => queue.add(element));
      schedule();
    };

    enqueueTree(document.body);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
          processed.delete(mutation.target);
          queue.add(mutation.target);
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) enqueueTree(node);
        });
      }
      schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      queue.clear();
      clearDynamicTheme();
    };
  }, [theme]);

  return null;
}
