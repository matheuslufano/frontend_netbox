"use client";

import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Ativar modo claro" : "Ativar modo escuro";
  return <button type="button" className={className} onClick={toggleTheme} aria-label={label} title={label} aria-pressed={dark}>{dark ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}</button>;
}
