import Link from 'next/link';
import { LuCalendarDays, LuCircleAlert, LuCircleCheck, LuEllipsisVertical, LuImage, LuUserRound } from 'react-icons/lu';
import type { Article } from '../types';
import { articleAvailability, formatArticleDate } from '../catalogUtils';
import EditorialImage from './EditorialImage';
import type { MenuAnchor } from './CatalogActionMenu';
import styles from '../catalog.module.css';

const labels = { draft: 'Rascunho', published: 'Publicado', archived: 'Arquivado', demo: 'Demonstrativo' };
export default function CatalogArticleCard({ article, category, disabled, expanded, onMenu }: { article: Article; category: string; disabled: boolean; expanded: boolean; onMenu: (article: Article, anchor: MenuAnchor) => void }) {
  const availability = articleAvailability(article);
  return <article className={styles.card} aria-busy={disabled} onContextMenu={e => { e.preventDefault(); if (!disabled) onMenu(article, { x: e.clientX, y: e.clientY, trigger: e.currentTarget.querySelector('a') || e.currentTarget }); }} onKeyDown={e => { if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); if (!disabled) onMenu(article, { x: rect.left + 12, y: rect.top + 40, trigger: e.target as HTMLElement }); } }}>
    <Link className={styles.cardLink} href={`/integracoes/blog/${article.id}`}>
      <div className={styles.cardImage}>{article.cover ? <EditorialImage src={article.cover} alt={article.coverAlt} className={styles.cover} /> : <LuImage className={styles.emptyImage} aria-hidden="true" />}</div>
      <div className={styles.cardBody}>
        <div className={styles.badges}><span>{category}</span><span data-status={article.status}>{labels[article.status]}</span></div>
        <h2 title={article.title}>{article.title}</h2>
        <p className={styles.summary}>{article.summary || 'Sem resumo definido.'}</p>
        <span className={styles.author}><LuUserRound aria-hidden="true" />{article.author || 'Autor não definido'}</span>
      </div>
      <footer className={styles.cardFooter}>
        <span title={`Criado: ${formatArticleDate(article.createdAt)} · Publicado: ${formatArticleDate(article.publishedAt)} · Última disponibilização: ${formatArticleDate(article.syncedAt)}`}><LuCalendarDays aria-hidden="true" /><time dateTime={article.updatedAt}>Atualizado: {formatArticleDate(article.updatedAt)}</time></span>
        <span data-tone={availability.tone} title={availability.detail}>{availability.tone === 'success' ? <LuCircleCheck aria-hidden="true" /> : <LuCircleAlert aria-hidden="true" />}{availability.label}</span>
      </footer>
    </Link>
    <button type="button" className={styles.menuTrigger} disabled={disabled} aria-label={`Ações de ${article.title}`} title="Ações do artigo" aria-haspopup="menu" aria-expanded={expanded} aria-controls={expanded ? 'blog-article-actions' : undefined} onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); onMenu(article, { x: rect.right - 216, y: rect.bottom + 6, trigger: e.currentTarget }); }}><LuEllipsisVertical aria-hidden="true" /></button>
  </article>;
}
