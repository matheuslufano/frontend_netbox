import Image from 'next/image';
/** Relative assets belong to the institutional site, not to the admin application's origin. */
export function resolveEditorialImageSource(src: string) {
  const base = (process.env.NEXT_PUBLIC_BLOG_SITE_URL || 'https://netbox.net.br').replace(/\/$/, '');
  if (!/^https?:\/\//i.test(src) && !/^\/(?!\/)[^\s\\]*$/.test(src)) return '';
  try { const url = new URL(src.startsWith('/') ? base + src : src); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; }
}
export default function EditorialImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const source = resolveEditorialImageSource(src);
  if (!source) return null;
  return <Image src={source} alt={alt} width={1200} height={675} unoptimized className={className} style={{ maxWidth: '100%', height: 'auto' }} />;
}
