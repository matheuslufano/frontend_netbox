/** Explicit preview destinations shared by article and seasonal-theme controls. */
export const previewSites = {
  official: { label: 'Site oficial', origin: new URL(process.env.NEXT_PUBLIC_BLOG_SITE_URL || 'https://netbox.net.br').origin },
  vercel: { label: 'Vercel', origin: 'https://site-institucional-net-box-chi.vercel.app' },
};
