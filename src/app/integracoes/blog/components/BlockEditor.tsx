'use client';
import { useEffect, useRef, useState } from 'react';
import type { Section } from '../types';
import { documentHtml, documentSections, readDocument, safeHref, toDocument, videoSource } from '../richDocument';
import EditorFormattingToolbar from './EditorFormattingToolbar';
import MediaToolbar, { type MediaLayout } from './MediaToolbar';
import { FiCheck, FiX } from 'react-icons/fi';
import { blogApi } from '../api';
import { getApiErrorMessage } from '@/lib/api';
import styles from '../blog.module.css';

/** Browser editing retains undo and selection; only whitelisted JSON leaves the canvas. */
export default function BlockEditor({ value, onChange, onBusyChange, disabled = false, sidePreview, onToggleSidePreview }: { value: Section[]; onChange: (sections: Section[]) => void; onBusyChange?: (busy: boolean) => void; disabled?: boolean; sidePreview: boolean; onToggleSidePreview: () => void }) {
  const canvas = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const emitted = useRef<Section[] | null>(null);
  const [insert, setInsert] = useState<'image' | 'video' | 'link' | null>(null);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<{ element: HTMLElement; layout: MediaLayout } | null>(null);
  const dragged = useRef<HTMLElement | null>(null);
  const dropTarget = useRef<HTMLElement | null>(null);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    if (!canvas.current || value === emitted.current) return;
    const base = (process.env.NEXT_PUBLIC_BLOG_SITE_URL || 'https://netbox.net.br').replace(/\/$/, '');
    canvas.current.innerHTML = documentHtml(toDocument(value), src => src.startsWith('/') ? base + src : src);
  }, [value]);
  function sync() {
    if (!canvas.current) return;
    emitted.current = documentSections(readDocument(canvas.current));
    onChange(emitted.current);
  }
  function selectMedia(element: HTMLElement | null) {
    canvas.current?.querySelector('[data-selected]')?.removeAttribute('data-selected');
    if (element) element.dataset.selected = 'true';
    setMedia(element ? { element, layout: { width: Number(element.dataset.width) || 100, align: (element.dataset.align || 'center') as MediaLayout['align'] } } : null);
  }
  function layoutMedia(value: Partial<MediaLayout>) {
    if (!media || disabled || !canvas.current?.contains(media.element)) return;
    const layout = { ...media.layout, ...value };
    Object.assign(media.element.dataset, { width: String(layout.width), align: layout.align });
    Object.assign(media.element.style, { width: `${layout.width}%`, marginLeft: layout.align === 'left' ? '0' : 'auto', marginRight: layout.align === 'right' ? '0' : 'auto' });
    setMedia({ ...media, layout }); sync();
  }
  function moveMedia(direction: -1 | 1) {
    if (!media || disabled || !canvas.current?.contains(media.element)) return;
    const sibling = direction === -1 ? media.element.previousElementSibling : media.element.nextElementSibling;
    if (!sibling) return;
    if (direction === -1) sibling.before(media.element); else sibling.after(media.element);
    media.element.scrollIntoView({ block: 'nearest' }); sync(); setAnnouncement(direction === -1 ? 'Mídia movida para cima.' : 'Mídia movida para baixo.');
  }
  function clearDrag() {
    dropTarget.current?.removeAttribute('data-drop');
    dragged.current?.removeAttribute('data-dragging');
    dropTarget.current = null; dragged.current = null;
  }
  function remember() {
    const current = window.getSelection();
    if (current?.rangeCount && canvas.current?.contains(current.anchorNode)) selection.current = current.getRangeAt(0).cloneRange();
  }
  function restore() {
    canvas.current?.focus();
    const current = window.getSelection();
    if (selection.current && canvas.current?.contains(selection.current.commonAncestorContainer)) { current?.removeAllRanges(); current?.addRange(selection.current); }
  }
  function command(name: string, argument?: string) {
    restore(); document.execCommand(name, false, argument); remember(); sync();
  }
  function open(type: typeof insert) { remember(); setInsert(type); setUrl(''); setLabel(window.getSelection()?.toString() || ''); setError(''); }
  function add() {
    const href = insert === 'video' ? videoSource(url) : safeHref(url, true);
    if (!href) { setError(insert === 'video' ? 'Use YouTube, Vimeo ou um arquivo MP4/WebM.' : 'Informe uma URL HTTP(S) válida.'); return; }
    if (insert !== 'video' && !label.trim()) { setError(insert === 'image' ? 'Descreva a imagem.' : 'Informe o texto do link.'); return; }
    restore();
    if (insert === 'link') {
      const a = document.createElement('a'); a.href = href; a.textContent = label;
      document.execCommand('insertHTML', false, a.outerHTML);
    } else {
      const html = documentHtml([{ type: insert === 'video' ? 'video' : 'image', src: href, alt: label }], src => src.startsWith('/') ? (process.env.NEXT_PUBLIC_BLOG_SITE_URL || 'https://netbox.net.br').replace(/\/$/, '') + src : src);
      document.execCommand('insertHTML', false, html + '<p><br></p>');
    }
    remember(); sync(); setInsert(null);
  }
  return <section className={styles.richEditor} aria-label="Editor de conteúdo">
    <EditorFormattingToolbar onCommand={command} onInsert={open} onRememberSelection={remember} sidePreview={sidePreview} onToggleSidePreview={onToggleSidePreview} />
    {insert && <div className={styles.insertPanel}>
      <strong>{insert === 'image' ? 'Inserir imagem' : insert === 'video' ? 'Inserir vídeo' : 'Inserir link'}</strong>
      <label>{insert === 'image' ? 'URL ou caminho da imagem' : 'URL'}<input value={url} onChange={e => setUrl(e.target.value)} /></label>
      {insert !== 'video' && <label>{insert === 'image' ? 'Descrição da imagem' : 'Texto do link'}<input value={label} onChange={e => setLabel(e.target.value)} /></label>}
      {insert === 'image' && <label>Enviar imagem do computador<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
        setUploading(true); onBusyChange?.(true); setError('');
        try { setUrl((await blogApi.uploadImage(file)).url); }
        catch (error) { setError(getApiErrorMessage(error, 'Não foi possível enviar a imagem.')); }
        finally { setUploading(false); onBusyChange?.(false); }
      }} /></label>}
      <div className={styles.actions}><button type="button" disabled={uploading || disabled} onClick={add}><FiCheck aria-hidden="true" />{uploading ? 'Enviando…' : 'Inserir'}</button><button type="button" disabled={uploading} onClick={() => setInsert(null)}><FiX aria-hidden="true" />Cancelar</button></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>}
    <p className={styles.mediaHint}>Selecione uma imagem ou vídeo para ajustar o tamanho e o alinhamento. Arraste a mídia para mudar sua posição ou use as setas.</p>
    {media && <MediaToolbar value={media.layout} onLayout={layoutMedia} onMove={moveMedia} onRemove={() => { if (!disabled) { media.element.remove(); selectMedia(null); sync(); } }} onClose={() => selectMedia(null)} disabled={disabled} />}
    <span role="status" className={styles.srOnly}>{announcement}</span>
    <div className={styles.documentStage}>
    <div className={styles.documentRuler} aria-hidden="true" />
    <div ref={canvas} className={styles.editableCanvas} data-ui="blog-rich-editor" contentEditable={!disabled} suppressContentEditableWarning role="textbox" aria-label="Texto do artigo" aria-multiline="true" aria-disabled={disabled} spellCheck onInput={sync} onKeyUp={remember} onMouseUp={remember}
      onClick={e => { const target = e.target as HTMLElement; selectMedia(target.closest<HTMLElement>('figure[data-media]')); if (target.closest('a')) e.preventDefault(); }}
      onFocusCapture={e => { if ((e.target as HTMLElement).matches('figure[data-media]')) selectMedia(e.target as HTMLElement); }}
      onKeyDown={e => { if (e.key === 'Escape') selectMedia(null); if (e.altKey && ['ArrowUp', 'ArrowDown'].includes(e.key) && media) { e.preventDefault(); moveMedia(e.key === 'ArrowUp' ? -1 : 1); } }}
      onPaste={e => { e.preventDefault(); if (!disabled) { document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); sync(); } }}
      onDragStart={e => {
        const figure = (e.target as HTMLElement).closest<HTMLElement>('figure[data-media]');
        if (!figure || disabled) { e.preventDefault(); return; }
        dragged.current = figure; figure.dataset.dragging = 'true'; selectMedia(figure);
        e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('application/x-netbox-media', 'move');
      }}
      onDragOver={e => {
        e.preventDefault(); if (!dragged.current || disabled || !canvas.current) return;
        e.dataTransfer.dropEffect = 'move';
        let target = e.target as HTMLElement;
        while (target.parentElement && target.parentElement !== canvas.current) target = target.parentElement;
        if (target === canvas.current) {
          const children = Array.from(canvas.current.children).filter(child => child !== dragged.current) as HTMLElement[];
          target = children.find(child => child.getBoundingClientRect().bottom >= e.clientY) || children.at(-1) || canvas.current;
        }
        dropTarget.current?.removeAttribute('data-drop');
        dropTarget.current = target !== canvas.current && target !== dragged.current && target.parentElement === canvas.current ? target : null;
        if (dropTarget.current) { const rect = target.getBoundingClientRect(); target.setAttribute('data-drop', e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'); }
      }}
      onDragEnd={clearDrag}
      onDrop={e => {
        e.preventDefault();
        if (!disabled && dragged.current && canvas.current) {
          const target = dropTarget.current;
          if (target) { if (target.dataset.drop === 'before') target.before(dragged.current); else target.after(dragged.current); }
          else if (e.target === canvas.current) canvas.current.append(dragged.current);
          sync(); setAnnouncement('Posição da mídia atualizada.');
        }
        clearDrag();
      }} />
    </div>
  </section>;
}
