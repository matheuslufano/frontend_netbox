import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LuCircleCheck, LuCopy, LuExternalLink, LuEye, LuLink, LuPencilLine, LuTrash2, LuUpload } from 'react-icons/lu';
import { isArticlePublic, menuPosition } from '../catalogUtils';
import type { Article } from '../types';
import styles from '../catalog.module.css';

export type MenuAnchor = { x: number; y: number; trigger: HTMLElement };
export type CatalogAction = 'open' | 'edit' | 'preview' | 'duplicate' | 'copy' | 'publication' | 'delete';
/** One portal menu serves pointer, touch and keyboard actions for the selected article. */
export default function CatalogActionMenu({ article, anchor, onClose, onAction }: { article: Article; anchor: MenuAnchor; onClose: (restore?: boolean) => void; onAction: (action: CatalogAction, article: Article) => void }) {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const { left, top } = menuPosition(anchor.x, anchor.y, rect.width, rect.height, window.innerWidth, window.innerHeight);
    element.style.left = `${left}px`; element.style.top = `${top}px`;
    element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [anchor.x, anchor.y, article.id]);
  useEffect(() => {
    const outside = (event: Event) => { if (!root.current?.contains(event.target as Node)) onClose(); };
    const resize = () => onClose();
    document.addEventListener('pointerdown', outside, true); document.addEventListener('focusin', outside); document.addEventListener('scroll', outside, true); window.addEventListener('resize', resize);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); document.removeEventListener('scroll', outside, true); window.removeEventListener('resize', resize); };
  }, [onClose]);
  const actions = [
    { id: 'open', label: 'Abrir artigo publicado', Icon: LuExternalLink, disabled: !isArticlePublic(article) },
    { id: 'edit', label: 'Editar', Icon: LuPencilLine },
    { id: 'preview', label: 'Ver prévia', Icon: LuEye },
    { id: 'duplicate', label: 'Duplicar', Icon: LuCopy },
    { id: 'copy', label: 'Copiar link', Icon: LuLink },
    { id: 'publication', label: isArticlePublic(article) ? 'Despublicar' : 'Publicar', Icon: isArticlePublic(article) ? LuCircleCheck : LuUpload },
    { id: 'delete', label: 'Excluir', Icon: LuTrash2 },
  ] as const;
  return createPortal(<div ref={root} id="blog-article-actions" className={styles.contextMenu} style={{ left: anchor.x, top: anchor.y }} role="menu" aria-label={`Ações de ${article.title}`} onContextMenu={e => e.preventDefault()} onKeyDown={e => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(true); return; }
    if (e.key === 'Tab') { onClose(true); return; }
    const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'ArrowDown' ? (index + 1) % buttons.length : e.key === 'ArrowUp' ? (index + buttons.length - 1) % buttons.length : e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : -1;
    if (next >= 0) { e.preventDefault(); buttons[next]?.focus(); }
  }}>{actions.map(({ id, label, Icon, ...item }) => <button key={id} role="menuitem" tabIndex={-1} type="button" disabled={'disabled' in item && item.disabled} data-danger={id === 'delete'} onClick={() => { onClose(true); onAction(id, article); }}><Icon aria-hidden="true" />{label}</button>)}</div>, document.body);
}
