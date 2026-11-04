import api from '@/lib/api';
import type { Article, Catalog, Category } from './types';
const base = '/admin/blog';
export const blogApi = {
  uploadImage: async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 8 * 1024 * 1024 || !file.size) throw new Error('Escolha uma imagem JPG, PNG, WebP ou GIF de até 8 MB.');
    return (await api.post<{ url: string }>(`${base}/media`, file, { headers: { 'Content-Type': file.type } })).data;
  },
  list: async (params: Record<string, string | number>, signal?: AbortSignal) => (await api.get<Catalog>(`${base}/articles`, { params, signal })).data,
  categories: async () => (await api.get<Category[]>(`${base}/categories`)).data,
  article: async (id: string) => (await api.get<Article>(`${base}/articles/${id}`)).data,
  save: async (article: Article, creating: boolean) => (await (creating ? api.post<Article>(`${base}/articles`, article) : api.put<Article>(`${base}/articles/${article.id}`, article))).data,
  publish: async (article: Article, action: string) => (await api.post<Article>(`${base}/articles/${article.id}/publication`, { revision: article.revision, action })).data,
  saveCategory: async (category: Partial<Category>) => (await (category.id ? api.put<Category>(`${base}/categories/${category.id}`, category) : api.post<Category>(`${base}/categories`, category))).data,
};
