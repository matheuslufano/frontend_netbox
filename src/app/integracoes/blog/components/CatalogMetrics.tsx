import { LuCircleCheck, LuFileText, LuLayers, LuPencilLine } from 'react-icons/lu';
import type { Catalog } from '../types';
import styles from '../catalog.module.css';

export default function CatalogMetrics({ metrics }: { metrics?: Catalog['metrics'] }) {
  const items = [
    { value: metrics?.total, label: 'Artigos', Icon: LuFileText },
    { value: metrics?.published, label: 'Publicados', Icon: LuCircleCheck, success: true },
    { value: metrics?.drafts, label: 'Rascunhos', Icon: LuPencilLine },
    { value: metrics?.categories, label: 'Categorias', Icon: LuLayers },
  ];
  return <section className={styles.metrics} aria-label="Visão geral do Blog">{items.map(({ value, label, Icon, success }) => <div key={label} data-success={success}><Icon aria-hidden="true" /><strong>{value ?? '—'}</strong><span>{label}</span></div>)}</section>;
}
