import type { Article, Catalog } from './types';

type PublicationApi = {
  list: (params: Record<string, string | number>) => Promise<Catalog>;
  publish: (article: Article, action: string) => Promise<Article>;
};
export type PublicationProgress = { completed: number; total: number };

/** Collect every page before writing so publication updates cannot reorder pagination. */
export async function updatePublishedArticles(api: PublicationApi, onProgress: (progress: PublicationProgress) => void) {
  const articles = new Map<string, Article>();
  let page = 1;
  let pages = 1;
  do {
    const catalog = await api.list({ status: 'published', sort: 'createdAt', pageSize: 48, page });
    for (const article of catalog.items) {
      if (article.status === 'published') articles.set(article.id, article);
    }
    pages = catalog.pages;
    page += 1;
  } while (page <= pages);

  const failures: { article: Article; reason: unknown }[] = [];
  let updated = 0;
  onProgress({ completed: 0, total: articles.size });
  for (const article of articles.values()) {
    try {
      // Preserve the captured revision: concurrent edits must produce a conflict, not be overwritten.
      await api.publish(article, 'publish');
      updated += 1;
    } catch (reason) {
      failures.push({ article, reason });
      const status = (reason as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        return { updated, failures, total: articles.size, interrupted: true };
      }
    }
    onProgress({ completed: updated + failures.length, total: articles.size });
  }
  return { updated, failures, total: articles.size, interrupted: false };
}
