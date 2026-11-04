import { FiAlignCenter, FiAlignLeft, FiAlignRight, FiArrowDown, FiArrowUp, FiMaximize2, FiMove, FiTrash2, FiX } from 'react-icons/fi';
import styles from './MediaToolbar.module.css';

export type MediaLayout = { width: number; align: 'left' | 'center' | 'right' };

/** Keyboard controls are an alternative to dragging, including on touch devices. */
export default function MediaToolbar({ value, onLayout, onMove, onRemove, onClose, disabled }: {
  value: MediaLayout; onLayout: (value: Partial<MediaLayout>) => void;
  onMove: (direction: -1 | 1) => void; onRemove: () => void; onClose: () => void; disabled: boolean;
}) {
  return <div className={styles.toolbar} role="group" aria-label="Ajustar mídia selecionada">
    <span className={styles.caption}><FiMove aria-hidden="true" />Mídia selecionada</span>
    <label className={styles.width}><FiMaximize2 aria-hidden="true" /><span>Largura</span><input type="range" min="20" max="100" step="1" value={value.width} disabled={disabled} onChange={e => onLayout({ width: Number(e.target.value) })} /><output>{value.width}%</output></label>
    <div className={styles.group}>{([{ align: 'left', Icon: FiAlignLeft, label: 'Alinhar mídia à esquerda' }, { align: 'center', Icon: FiAlignCenter, label: 'Centralizar mídia' }, { align: 'right', Icon: FiAlignRight, label: 'Alinhar mídia à direita' }] as const).map(({ align, Icon, label }) => <button key={align} type="button" title={label} aria-label={label} aria-pressed={value.align === align} disabled={disabled} onClick={() => onLayout({ align })}><Icon aria-hidden="true" /></button>)}</div>
    <div className={styles.group}><button type="button" title="Mover mídia para cima" aria-label="Mover mídia para cima" disabled={disabled} onClick={() => onMove(-1)}><FiArrowUp aria-hidden="true" /></button><button type="button" title="Mover mídia para baixo" aria-label="Mover mídia para baixo" disabled={disabled} onClick={() => onMove(1)}><FiArrowDown aria-hidden="true" /></button></div>
    <button type="button" title="Remover mídia" aria-label="Remover mídia" disabled={disabled} onClick={onRemove}><FiTrash2 aria-hidden="true" /></button>
    <button type="button" title="Fechar ajustes da mídia" aria-label="Fechar ajustes da mídia" onClick={onClose}><FiX aria-hidden="true" /></button>
  </div>;
}
