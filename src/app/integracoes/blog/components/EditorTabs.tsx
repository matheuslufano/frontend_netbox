import { useRef } from 'react';
import { FiArrowLeft, FiEdit3, FiEye, FiFileText } from 'react-icons/fi';
import styles from './EditorTabs.module.css';

export type EditorTab = 'information' | 'content' | 'preview';
const tabs = [
  { id: 'information', label: 'Informações', icon: FiFileText },
  { id: 'content', label: 'Conteúdo', icon: FiEdit3 },
  { id: 'preview', label: 'Prévia', icon: FiEye },
] as const;

/** Tabs keep their panels mounted so switching views preserves native editing history and uploads. */
export default function EditorTabs({
  active,
  onChange,
  onBack,
  showTabs = true,
}: {
  active: EditorTab;
  onChange: (tab: EditorTab) => void;
  onBack: () => void;
  showTabs?: boolean;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  return <div className={styles.tabs} data-ui="blog-editor-tabs">
    <button className={styles.back} type="button" onClick={onBack}>
      <FiArrowLeft aria-hidden="true" />
      Voltar
    </button>
    {showTabs && <div className={styles.tabList} role="tablist" aria-label="Etapas do artigo">
      {tabs.map(({ id, label, icon: Icon }, index) => <button
      key={id} ref={node => { buttons.current[index] = node; }} className={styles.tab}
      id={`article-tab-${id}`} type="button" role="tab" aria-selected={active === id}
      aria-controls={`article-panel-${id}`} tabIndex={active === id ? 0 : -1}
      onClick={() => onChange(id)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return;
        event.preventDefault(); onChange(tabs[next].id); buttons.current[next]?.focus();
      }}>
      <Icon aria-hidden="true" /><span>{label}</span>
      </button>)}
    </div>}
  </div>;
}
