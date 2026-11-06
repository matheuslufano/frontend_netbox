import api from '@/lib/api';
import type { Article, Author, Catalog, Category } from './types';
import type { CatalogProvider, CatalogWork, CatalogImage } from './imageCatalog';
const base = '/admin/blog';
const catalogBase = (provider: CatalogProvider) => provider === 'tmdb' ? `${base}/tmdb` : `${base}/catalog/${provider}`;
export const blogApi = {
  authors: async () => (await api.get<Author[]>(`${base}/authors`)).data,
  searchImages: async (q: string, page: number, signal?: AbortSignal, provider: CatalogProvider = 'tmdb') => (await api.get<{ page: number; pages: number; results: CatalogWork[] }>(`${catalogBase(provider)}/search`, { params: { q, page }, signal })).data,
  workImages: async (work: CatalogWork, signal?: AbortSignal, provider: CatalogProvider = 'tmdb') => (await api.get<{ title: string; images: CatalogImage[] }>(`${catalogBase(provider)}/${work.kind}/${work.id}/images`, { signal })).data,
  importImage: async (work: CatalogWork, image: CatalogImage, provider: CatalogProvider = 'tmdb') => (await api.post<{ url: string; alt: string }>(`${catalogBase(provider)}/import`, { kind: work.kind, id: work.id, path: image.path })).data,
  uploadImage: async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 8 * 1024 * 1024 || !file.size) throw new Error('Escolha uma imagem JPG, PNG, WebP ou GIF de até 8 MB.');
    return (await api.post<{ url: string }>(`${base}/media`, file, { headers: { 'Content-Type': file.type } })).data;
  },
  list: async (params: Record<string, string | number>, signal?: AbortSignal) => (await api.get<Catalog>(`${base}/articles`, { params, signal })).data,
  categories: async () => (await api.get<Category[]>(`${base}/categories`)).data,
  article: async (id: string) => (await api.get<Article>(`${base}/articles/${id}`)).data,
  save: async (article: Article, creating: boolean) => (await (creating ? api.post<Article>(`${base}/articles`, article) : api.put<Article>(`${base}/articles/${article.id}`, article))).data,
  publish: async (article: Article, action: string) => (await api.post<Article>(`${base}/articles/${article.id}/publication`, { revision: article.revision, action })).data,
  duplicate: async (article: Article, id: string) => (await api.post<Article>(`${base}/articles/${article.id}/duplicate`, { revision: article.revision, id })).data,
  remove: async (article: Article) => { await api.delete(`${base}/articles/${article.id}`, { data: { revision: article.revision } }); },
  saveCategory: async (category: Partial<Category>) => (await (category.id ? api.put<Category>(`${base}/categories/${category.id}`, category) : api.post<Category>(`${base}/categories`, category))).data,
  removeCategory: async (id: number) => { await api.delete(`${base}/categories/${id}`); },
};
