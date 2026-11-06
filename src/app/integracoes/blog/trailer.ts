/** Match the HTTPS YouTube links accepted by the institutional slide player. Empty removes the trailer. */
export function isSupportedTrailerUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return false;
    const id = ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)
      ? url.pathname === '/watch' ? url.searchParams.get('v') : null
      : url.hostname === 'youtu.be' ? url.pathname.slice(1) : null;
    return Boolean(id && /^[a-zA-Z0-9_-]{11}$/.test(id));
  } catch { return false; }
}
