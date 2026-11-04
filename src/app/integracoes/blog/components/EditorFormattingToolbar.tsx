import { useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { FiAlignCenter, FiAlignLeft, FiAlignRight, FiBold, FiImage, FiItalic, FiLink, FiList, FiRotateCcw, FiRotateCw, FiType, FiUnderline, FiVideo } from 'react-icons/fi';
import { LuCaseSensitive, LuHeading, LuUnlink } from 'react-icons/lu';
import { fonts } from '../richDocument';
import styles from './EditorFormattingToolbar.module.css';

type Props = {
  onCommand: (command: string, value?: string) => void;
  onInsert: (type: 'image' | 'video' | 'link') => void;
  onRememberSelection: () => void;
};
const formattingGroups: { icon: IconType; label: string; command: string }[][] = [
  [{ icon: FiRotateCcw, label: 'Desfazer', command: 'undo' }, { icon: FiRotateCw, label: 'Refazer', command: 'redo' }],
  [{ icon: FiBold, label: 'Negrito', command: 'bold' }, { icon: FiItalic, label: 'Itálico', command: 'italic' }, { icon: FiUnderline, label: 'Sublinhado', command: 'underline' }],
  [{ icon: FiAlignLeft, label: 'Alinhar à esquerda', command: 'justifyLeft' }, { icon: FiAlignCenter, label: 'Centralizar', command: 'justifyCenter' }, { icon: FiAlignRight, label: 'Alinhar à direita', command: 'justifyRight' }, { icon: FiList, label: 'Lista com marcadores', command: 'insertUnorderedList' }],
];
const pickers = [
  { id: 'style', label: 'Estilo do texto', icon: LuHeading, command: 'formatBlock', options: [{ label: 'Parágrafo', value: 'p' }, { label: 'Título', value: 'h2' }, { label: 'Subtítulo', value: 'h3' }] },
  { id: 'font', label: 'Fonte', icon: FiType, command: 'fontName', options: [{ label: 'Arial', value: fonts.sans }, { label: 'Georgia', value: fonts.serif }, { label: 'Monoespaçada', value: fonts.mono }] },
  { id: 'size', label: 'Tamanho da fonte', icon: LuCaseSensitive, command: 'fontSize', options: [{ label: 'Pequeno', value: '2' }, { label: 'Normal', value: '3' }, { label: 'Grande', value: '5' }] },
];

/** Icon-only controls expose names through accessible labels and hover/focus tooltips. */
export default function EditorFormattingToolbar({ onCommand, onInsert, onRememberSelection }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!toolbar.current?.contains(event.target as Node)) setOpen(null); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  function tool(Icon: IconType, label: string, action: () => void) {
    return <button key={label} type="button" className={styles.toolButton} aria-label={label} title={label} onMouseDown={event => event.preventDefault()} onClick={() => { setOpen(null); action(); }}><Icon aria-hidden="true" /><span className={styles.tooltip} aria-hidden="true">{label}</span></button>;
  }
  return <div ref={toolbar} className={styles.toolbar} role="group" aria-label="Ferramentas de edição" data-ui="blog-formatting-toolbar">
    <div className={styles.group}>{formattingGroups[0].map(({ icon, label, command }) => tool(icon, label, () => onCommand(command)))}</div>
    <div className={styles.group}>{pickers.map(({ id, label, icon: Icon, command, options }) => <div className={styles.picker} key={id}>
      <button type="button" className={styles.toolButton} aria-label={label} title={label} aria-expanded={open === id} aria-controls={`article-format-${id}`} onMouseDown={event => event.preventDefault()} onClick={() => { onRememberSelection(); setOpen(open === id ? null : id); }}><Icon aria-hidden="true" /><span className={styles.tooltip} aria-hidden="true">{label}</span></button>
      {open === id && <div className={styles.popover} id={`article-format-${id}`} role="group" aria-label={label} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(null); toolbar.current?.querySelector<HTMLButtonElement>(`[aria-controls="article-format-${id}"]`)?.focus(); } }}>
        <span className={styles.pickerLabel}>{label}</span>
        {options.map(option => <button type="button" key={option.value} onMouseDown={event => event.preventDefault()} onClick={() => { onCommand(command, option.value); setOpen(null); }}>{option.label}</button>)}
      </div>}
    </div>)}</div>
    {formattingGroups.slice(1).map((group, index) => <div className={styles.group} key={index}>{group.map(({ icon, label, command }) => tool(icon, label, () => onCommand(command)))}</div>)}
    <div className={styles.group}>
      {tool(FiLink, 'Adicionar link', () => onInsert('link'))}
      {tool(LuUnlink, 'Remover link', () => onCommand('unlink'))}
      {tool(FiImage, 'Adicionar imagem', () => onInsert('image'))}
      {tool(FiVideo, 'Adicionar vídeo', () => onInsert('video'))}
    </div>
  </div>;
}
