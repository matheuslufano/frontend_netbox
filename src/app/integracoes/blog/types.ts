export type TextRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; href?: string; font?: 'sans' | 'serif' | 'mono'; size?: 'small' | 'normal' | 'large' };
export type RichBlock = { type: 'paragraph' | 'heading' | 'list-item' | 'image' | 'video'; level?: 2 | 3; align?: 'left' | 'center' | 'right'; width?: number; content?: TextRun[]; src?: string; alt?: string };
export type Section = { heading: string; level?: 2 | 3; paragraphs: string[]; list?: string[]; link?: { label: string; href: string }; image?: { src: string; alt: string }; document?: RichBlock[] };
export type Category = { id: number; name: string; slug: string; description: string; _count?: { articles: number } };
export type Article = {
  id: string; title: string; slug: string; summary: string; content: Section[];
  category: string; cover: string; coverAlt: string; author: string;
  /** Original artwork is separate from the horizontal cover used by slides and article cards. */
  spotlight?: { title: string; poster: string; posterAlt?: string; trailerUrl?: string } | null;
  status: 'draft' | 'published' | 'archived' | 'demo'; revision: number; publishedRevision?: number;
  createdAt: string; updatedAt: string; publishedAt: string; syncedAt?: string; syncError?: string;
};
/** Functional patches preserve newer nested metadata when an asynchronous upload completes. */
export type ArticleUpdate = Partial<Article> | ((article: Article) => Partial<Article>);
export type Catalog = { items: Article[]; total: number; page: number; pages: number; metrics: { total: number; published: number; drafts: number; categories: number } };
export const statusLabel = { draft: 'Rascunho', published: 'Publicado na API', archived: 'Arquivado', demo: 'Demonstrativo' };
export const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
