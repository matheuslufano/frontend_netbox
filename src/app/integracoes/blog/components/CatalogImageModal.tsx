'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { FiArrowLeft, FiArrowRight, FiDownload, FiFilm, FiBookOpen, FiMonitor, FiImage, FiSearch, FiX } from 'react-icons/fi';
import { blogApi } from '../api';
import { catalogLabels, type CatalogProvider, type CatalogWork, type CatalogImage } from '../imageCatalog';
import { getApiErrorMessage } from '@/lib/api';
import styles from './ImageSearchModal.module.css';

/** Native modal traps focus and restores it to the image-picker trigger on close. */
export default function CatalogImageModal({ provider, variant, onClose, onSelect, onBusyChange }: { provider: CatalogProvider; variant: 'poster' | 'landscape'; onClose: () => void; onSelect: (url: string, alt: string) => void; onBusyChange?: (busy: boolean) => void }) {
  const labels = catalogLabels[provider];
  const Icon = provider === 'metron' ? FiBookOpen : provider === 'igdb' ? FiMonitor : FiFilm;
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const titleId = useId();
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [works, setWorks] = useState<CatalogWork[]>([]);
  const [work, setWork] = useState<CatalogWork | null>(null);
  const [images, setImages] = useState<CatalogImage[]>([]);
  const [type, setType] = useState(variant);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { request.current?.abort(); element?.close(); }; }, []);
  async function load(selected?: CatalogWork, nextPage = 1) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      if (selected) { setWork(selected); setImages([]); setImages((await blogApi.workImages(selected, controller.signal, provider)).images); }
      else { const term = nextPage === 1 ? query.trim() : searched; if (!term) return; setWork(null); setWorks([]); setSearched(term); const result = await blogApi.searchImages(term, nextPage, controller.signal, provider); setWorks(result.results); setPage(result.page); setPages(result.pages); }
    } catch (e) { if (!controller.signal.aborted) setError(getApiErrorMessage(e, 'Não foi possível consultar o catálogo.')); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  async function select(image: CatalogImage) {
    if (!work || importing) return;
    setImporting(true); onBusyChange?.(true); setError('');
    try { const result = await blogApi.importImage(work, image, provider); onSelect(result.url, result.alt); onClose(); }
    catch (e) { setError(getApiErrorMessage(e, 'Não foi possível salvar a imagem.')); }
    finally { setImporting(false); onBusyChange?.(false); }
  }
  return <dialog ref={dialog} className={styles.modal} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!importing) onClose(); }}>
    <header><div><h2 id={titleId}><Icon aria-hidden="true" />Catálogo de imagens</h2><p>{labels.title}</p></div><button type="button" disabled={importing} onClick={onClose} aria-label="Fechar busca de imagens"><FiX /></button></header>
    <div className={styles.search}><label htmlFor={`${titleId}-query`}>{labels.search}</label><div><input autoFocus id={`${titleId}-query`} maxLength={200} value={query} disabled={importing} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void load(); } }} /><button type="button" title="Buscar obra" aria-label="Buscar obra" disabled={!query.trim() || loading || importing} onClick={() => void load()}><FiSearch aria-hidden="true" /></button></div></div>
    {error && <p role="alert">{error}</p>}
    {(loading || importing) && <p role="status">{importing ? 'Baixando e salvando imagem no banco…' : 'Consultando catálogo…'}</p>}
    {work ? <>
      <button type="button" disabled={importing || loading} onClick={() => setWork(null)}><FiArrowLeft aria-hidden="true" />Resultados</button><h3>{work.title}</h3>
      <div className={styles.tabs} aria-label="Formato das imagens">{(provider === 'metron' ? ['poster'] as const : ['poster', 'landscape'] as const).map(option => <button key={option} type="button" aria-pressed={type === option} disabled={importing} onClick={() => setType(option)}><FiImage aria-hidden="true" />{option === 'poster' ? 'Pôsteres' : 'Horizontais'}</button>)}</div>
      <div className={styles.grid}>{images.filter(image => image.type === type).map(image => <button className={styles.image} title="Importar imagem" aria-label={`Importar imagem de ${work.title}, ${image.width} por ${image.height}`} type="button" disabled={importing || loading} key={image.path} onClick={() => void select(image)}><Image src={image.preview} alt={`${work.title} — ${image.type === 'poster' ? 'Pôster' : 'Imagem horizontal'}`} width={image.width || 500} height={image.height || 750} unoptimized /><span><FiDownload aria-hidden="true" />{image.width && image.height ? `${image.width} × ${image.height}` : 'Capa'}</span></button>)}</div>
      {!loading && !error && !images.some(image => image.type === type) && <p>Nenhuma imagem disponível neste formato.</p>}
    </> : <><div className={styles.results}>{works.map(item => <button type="button" key={`${item.kind}-${item.id}`} disabled={loading || importing} onClick={() => void load(item)}><Icon aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.kind === 'movie' ? 'Filme' : item.kind === 'tv' ? 'Série' : item.kind === 'game' ? 'Jogo' : 'Edição'} {item.year}</small></span><FiArrowRight aria-hidden="true" /></button>)}</div>
      {!loading && !error && searched && !works.length && <p>Nenhuma obra encontrada.</p>}
      {!error && pages > 1 && <nav aria-label="Páginas dos resultados"><button type="button" title="Página anterior" aria-label="Página anterior" disabled={page <= 1 || loading || importing} onClick={() => void load(undefined, page - 1)}><FiArrowLeft aria-hidden="true" /></button><span>{page} / {pages}</span><button type="button" title="Próxima página" aria-label="Próxima página" disabled={page >= pages || loading || importing} onClick={() => void load(undefined, page + 1)}><FiArrowRight aria-hidden="true" /></button></nav>}</>}
    <footer>{labels.credit}</footer>
  </dialog>;
}
