import { LuArrowDownUp, LuCircleCheck, LuFolder, LuLayers, LuRefreshCw, LuSearch } from 'react-icons/lu';
import type { CatalogFilters as Filters, Category } from '../types';
import { statusLabel } from '../types';
import styles from '../catalog.module.css';

export default function CatalogFilters({ value, categories, grouped, loading, onChange, onGroup, onRefresh }: { value: Filters; categories: Category[]; grouped: boolean; loading: boolean; onChange: (value: Filters) => void; onGroup: (value: boolean) => void; onRefresh: () => void }) {
  return <section className={styles.toolbar} aria-label="Filtros de artigos">
    <div className={styles.filterRow}>
      <label className={styles.search}><span className={styles.srOnly}>Buscar por título ou conteúdo</span><LuSearch aria-hidden="true" /><input type="search" maxLength={160} placeholder="Buscar por título ou conteúdo…" value={value.q} onChange={e => onChange({ ...value, q: e.target.value, page: 1 })} /></label>
      <label className={styles.filter}><span>Categoria</span><div><LuFolder aria-hidden="true" /><select value={value.category} onChange={e => onChange({ ...value, category: e.target.value, page: 1 })}><option value="">Todas</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></div></label>
      <label className={styles.filter}><span>Status</span><div><LuCircleCheck aria-hidden="true" /><select value={value.status} onChange={e => onChange({ ...value, status: e.target.value, page: 1 })}><option value="">Todos</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div></label>
      <label className={styles.filter}><span>Ordenação</span><div><LuArrowDownUp aria-hidden="true" /><select value={value.sort} onChange={e => onChange({ ...value, sort: e.target.value, page: 1 })}><option value="updatedAt">Última atualização</option><option value="createdAt">Criação</option><option value="publishedAt">Publicação</option></select></div></label>
      <button className={styles.refresh} type="button" disabled={loading} onClick={onRefresh}><LuRefreshCw aria-hidden="true" className={loading ? styles.spinning : ''} />Atualizar</button>
    </div>
    <label className={styles.groupToggle}><input type="checkbox" checked={grouped} onChange={e => onGroup(e.target.checked)} /><LuLayers aria-hidden="true" />Agrupar por categoria</label>
  </section>;
}
