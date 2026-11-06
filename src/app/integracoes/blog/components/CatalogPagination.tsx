import { Fragment } from 'react';
import { LuChevronLeft, LuChevronRight, LuChevronsLeft, LuChevronsRight, LuList } from 'react-icons/lu';
import type { Catalog, CatalogFilters } from '../types';
import { paginationPages } from '../catalogUtils';
import styles from '../catalog.module.css';

export default function CatalogPagination({ catalog, filters, loading, onChange }: { catalog: Catalog; filters: CatalogFilters; loading: boolean; onChange: (value: CatalogFilters) => void }) {
  const page = filters.page, pages = catalog.pages;
  const numbers = paginationPages(page, pages);
  const navigate = (next: number) => onChange({ ...filters, page: next });
  return <footer className={styles.pagination}>
    <span>Mostrando {catalog.total ? (page - 1) * filters.pageSize + 1 : 0}–{Math.min(page * filters.pageSize, catalog.total)} de {catalog.total} artigos</span>
    <nav aria-label="Paginação dos artigos">
      <button type="button" disabled={loading || page <= 1} title="Primeira página" aria-label="Primeira página" onClick={() => navigate(1)}><LuChevronsLeft /></button>
      <button type="button" disabled={loading || page <= 1} title="Página anterior" aria-label="Página anterior" onClick={() => navigate(page - 1)}><LuChevronLeft /></button>
      {numbers.map((number, index) => <Fragment key={number}>{index > 0 && number - numbers[index - 1] > 1 && <span aria-hidden="true">…</span>}<button type="button" disabled={loading} aria-label={`Página ${number}`} aria-current={page === number ? 'page' : undefined} onClick={() => navigate(number)}>{number}</button></Fragment>)}
      <button type="button" disabled={loading || page >= pages} title="Próxima página" aria-label="Próxima página" onClick={() => navigate(page + 1)}><LuChevronRight /></button>
      <button type="button" disabled={loading || page >= pages} title="Última página" aria-label="Última página" onClick={() => navigate(pages)}><LuChevronsRight /></button>
    </nav>
    <label><LuList aria-hidden="true" /><span className={styles.srOnly}>Artigos por página</span><select value={filters.pageSize} disabled={loading} onChange={e => onChange({ ...filters, pageSize: Number(e.target.value), page: 1 })}>{[12,24,48].map(size => <option key={size} value={size}>{size} por página</option>)}</select></label>
  </footer>;
}
