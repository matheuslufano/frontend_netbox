import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import styles from "./Avatar.module.css";

type AvatarProps = {
  name?: string | null;
  photoUrl?: string | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  title?: string;
  seed?: string;
};

function profileInitials(value?: string | null) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join("").toLocaleUpperCase("pt-BR");
  return `${Array.from(parts[0])[0] || ""}${Array.from(parts.at(-1) || "")[0] || ""}`.toLocaleUpperCase("pt-BR");
}

/** Foto do perfil ou avatar Glass animado com iniciais quando não há foto. */
export default function Avatar({ name, photoUrl, alt = "Avatar", className, style, title, seed: requestedSeed }: AvatarProps) {
  const [failedPhoto, setFailedPhoto] = useState("");
  const fallbackSeed = (requestedSeed || name || "usuario").trim() || "usuario";
  const currentPhoto = photoUrl?.trim() || "";
  let generatedSeed = fallbackSeed;
  let isGeneratedAvatar = !currentPhoto || failedPhoto === currentPhoto;

  useEffect(() => {
    setFailedPhoto("");
  }, [currentPhoto]);

  if (currentPhoto) {
    try {
      const currentUrl = new URL(currentPhoto);
      isGeneratedAvatar = currentUrl.hostname === "api.dicebear.com" &&
        /^\/\d+\.x\/(?:glass|planets|waves|sprouts)\/svg\/?$/i.test(currentUrl.pathname);
      generatedSeed = currentUrl.searchParams.get("seed") || fallbackSeed;
    } catch {
      isGeneratedAvatar = false;
    }
  }

  const src = isGeneratedAvatar
    ? `https://api.dicebear.com/10.x/glass/svg?seed=${encodeURIComponent(generatedSeed)}&animationVariant=medium`
    : currentPhoto;

  if (!isGeneratedAvatar) {
    return <img src={src} alt={alt} className={className} style={style} title={title} loading="lazy" decoding="async" onError={() => setFailedPhoto(currentPhoto)} />;
  }

  return (
    <span className={`${styles.generatedAvatar}${className ? ` ${className}` : ""}`} style={style} title={title} role="img" aria-label={`${alt} com as iniciais ${profileInitials(name)}`}>
      <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      <span className={styles.initials} aria-hidden="true">{profileInitials(name)}</span>
    </span>
  );
}
