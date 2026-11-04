import type { Section, TextRun, RichBlock } from './types';
export type { TextRun, RichBlock } from './types';

export const fonts = { sans: 'Arial, sans-serif', serif: 'Georgia, serif', mono: 'monospace' };
export const sizes = { small: '13px', normal: '16px', large: '24px' };
export function safeHref(value: string, relative = false) {
  if (relative && /^\/(?!\/)[^\s\\]*$/.test(value)) return value;
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch { return ''; }
}
/** Only known video providers become embeds; arbitrary iframe HTML is never stored. */
export function videoSource(value: string) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return '';
    const host = url.hostname.replace(/^www\./, '');
    const id = host === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host) ? url.searchParams.get('v') || url.pathname.split('/').at(-1) : '';
    if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    if (['vimeo.com', 'player.vimeo.com'].includes(host) && /^\d+$/.test(url.pathname.split('/').at(-1) || '')) return `https://player.vimeo.com/video/${url.pathname.split('/').at(-1)}`;
    return /\.(mp4|webm)$/i.test(url.pathname) ? url.href : '';
  } catch { return ''; }
}

/** Legacy sections are converted in memory; opening an article alone never changes its saved content. */
export function toDocument(sections: Section[]): RichBlock[] {
  return sections.flatMap(section => section.document ?? [
    ...(section.heading ? [{ type: 'heading' as const, level: section.level || 2, content: [{ text: section.heading }] }] : []),
    ...section.paragraphs.map(text => ({ type: 'paragraph' as const, content: [{ text }] })),
    ...(section.list ?? []).map(text => ({ type: 'list-item' as const, content: [{ text }] })),
    ...(section.link?.href ? [{ type: 'paragraph' as const, content: [{ text: section.link.label, href: section.link.href }] }] : []),
    ...(section.image ? [{ type: 'image' as const, ...section.image }] : []),
  ]);
}

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** This HTML is only the editable canvas; publication uses typed JSON rendered through React. */
export function documentHtml(blocks: RichBlock[], imageUrl: (src: string) => string) {
  return blocks.map(block => {
    if (block.type === 'image' || block.type === 'video') {
      const src = safeHref(block.src || '', block.type === 'image');
      if (!src) return '';
      const width = Number.isInteger(block.width) && block.width! >= 20 && block.width! <= 100 ? block.width! : 100;
      const align = ['left', 'center', 'right'].includes(block.align || '') ? block.align! : 'center';
      return `<figure tabindex="0" contenteditable="false" draggable="true" data-media="${block.type}" data-src="${escape(src)}" data-alt="${escape(block.alt || '')}" data-width="${width}" data-align="${align}" style="width:${width}%;margin-left:${align === 'left' ? '0' : 'auto'};margin-right:${align === 'right' ? '0' : 'auto'}" aria-label="${block.type === 'image' ? 'Imagem' : 'Vídeo'}: selecione para ajustar ou arraste para mover">${block.type === 'image' ? `<img draggable="false" src="${escape(imageUrl(src))}" alt="${escape(block.alt || '')}" />` : `<span>Vídeo: ${escape(src)}</span>`}</figure>`;
    }
    const tag = block.type === 'heading' ? (block.level === 3 ? 'h3' : 'h2') : block.type === 'list-item' ? 'li' : 'p';
    const content = (block.content || []).map(run => {
      let value = escape(run.text).replace(/\n/g, '<br>');
      if (run.bold) value = `<strong>${value}</strong>`;
      if (run.italic) value = `<em>${value}</em>`;
      if (run.underline) value = `<u>${value}</u>`;
      if (run.font || run.size) value = `<span style="${run.font ? `font-family:${fonts[run.font]};` : ''}${run.size ? `font-size:${sizes[run.size]};` : ''}">${value}</span>`;
      const href = run.href && safeHref(run.href);
      return href ? `<a href="${escape(href)}">${value}</a>` : value;
    }).join('');
    const html = `<${tag} style="text-align:${block.align || 'left'}">${content || '<br>'}</${tag}>`;
    return block.type === 'list-item' ? `<ul>${html}</ul>` : html;
  }).join('').replaceAll('</ul><ul>', '') || '<p><br></p>';
}

/** Whitelist DOM formatting into JSON, discarding scripts, event handlers and unknown markup. */
export function readDocument(root: HTMLElement): RichBlock[] {
  const blocks: RichBlock[] = [];
  function runs(node: Node, inherited: Omit<TextRun, 'text'> = {}): TextRun[] {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ? [{ ...inherited, text: node.textContent }] : [];
    if (!(node instanceof HTMLElement) || ['SCRIPT', 'STYLE', 'IFRAME', 'BUTTON'].includes(node.tagName)) return [];
    if (node.tagName === 'BR') return [{ ...inherited, text: '\n' }];
    const marks = { ...inherited };
    if (['B', 'STRONG'].includes(node.tagName) || Number(node.style.fontWeight) >= 600) marks.bold = true;
    if (['I', 'EM'].includes(node.tagName)) marks.italic = true;
    if (node.tagName === 'U' || node.style.textDecoration.includes('underline')) marks.underline = true;
    if (node.style.fontStyle === 'italic') marks.italic = true;
    if (node.tagName === 'A') marks.href = safeHref(node.getAttribute('href') || '');
    const family = node.getAttribute('face') || node.style.fontFamily;
    if (/georgia|serif/i.test(family) && !/sans/i.test(family)) marks.font = 'serif';
    else if (/mono/i.test(family)) marks.font = 'mono';
    else if (family) marks.font = 'sans';
    const size = node.getAttribute('size');
    if (size || node.style.fontSize) marks.size = size === '2' || node.style.fontSize === '13px' ? 'small' : size === '5' || node.style.fontSize === '24px' ? 'large' : 'normal';
    return Array.from(node.childNodes).flatMap(child => runs(child, marks));
  }
  function visit(node: Node) {
    if (node instanceof HTMLElement && node.dataset.media) {
      const type = node.dataset.media;
      if (type === 'image' || type === 'video') {
        const width = Number(node.dataset.width);
        const align = node.dataset.align;
        blocks.push({ type, src: node.dataset.src || '', alt: node.dataset.alt || '', ...(Number.isInteger(width) && width >= 20 && width <= 100 ? { width } : {}), ...(['left', 'center', 'right'].includes(align || '') ? { align: align as RichBlock['align'] } : {}) });
      }
    } else if (node instanceof HTMLElement && ['UL', 'OL', 'DIV'].includes(node.tagName) && Array.from(node.children).some(child => /^(P|DIV|H[1-6]|LI|FIGURE|UL|OL)$/.test(child.tagName))) {
      Array.from(node.childNodes).forEach(visit);
    } else {
      const content = runs(node);
      const tag = node instanceof HTMLElement ? node.tagName : '';
      const align = node instanceof HTMLElement ? node.style.textAlign || node.getAttribute('align') || '' : '';
      if (content.length || tag === 'P' || tag === 'DIV') blocks.push({ type: /^H[1-6]$/.test(tag) ? 'heading' : tag === 'LI' ? 'list-item' : 'paragraph', ...(/^H/.test(tag) ? { level: tag === 'H3' ? 3 : 2 } : {}), ...(['left', 'center', 'right'].includes(align) ? { align: align as RichBlock['align'] } : {}), content });
    }
  }
  Array.from(root.childNodes).forEach(visit);
  return blocks;
}

export function documentSections(document: RichBlock[]): Section[] {
  // Plain text remains available to search, reading-time calculation and older API consumers.
  return [{ heading: '', paragraphs: document.filter(b => b.type === 'paragraph' || b.type === 'heading' || b.type === 'list-item').map(b => (b.content || []).map(r => r.text).join('')), document }];
}
