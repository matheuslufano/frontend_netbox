import type { Article } from './types';

export const isArticlePublic = (article: Article) => article.status === 'published' || article.status === 'demo';
export function publicArticleUrl(article: Article) {
  return (process.env.NEXT_PUBLIC_BLOG_SITE_URL || 'https://netbox.net.br').replace(/\/$/, '') + '/site/blog/' + encodeURIComponent(article.slug);
}
export function articleAvailability(article: Article) {
  if (article.syncError) return { label: 'Falha na publicação', tone: 'error', detail: article.syncError };
  if (!isArticlePublic(article)) return { label: 'Fora da API pública', tone: 'muted', detail: 'Este artigo ainda não está disponível na API pública.' };
  if (article.status === 'published' && article.publishedRevision !== article.revision) return { label: 'Alterações pendentes', tone: 'warning', detail: 'A versão anterior está na API; há alterações ainda não publicadas.' };
  return { label: 'Disponível na API', tone: 'success', detail: 'Disponível na API pública. A exibição no site depende da configuração dele.' };
}
export function formatArticleDate(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return '—';
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
/** Clamp against the measured menu size, including very small viewports. */
export function menuPosition(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  return { left: Math.max(8, Math.min(x, viewportWidth - width - 8)), top: Math.max(8, Math.min(y, viewportHeight - height - 8)) };
}
export function paginationPages(page: number, pages: number) {
  return [...new Set([1, page - 1, page, page + 1, pages])].filter(value => value > 0 && value <= pages).sort((a, b) => a - b);
}
