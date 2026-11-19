'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { FiDownload, FiExternalLink, FiFilm, FiImage, FiSearch, FiX } from 'react-icons/fi';
import { blogApi } from '../api';
import type { FreeMediaImage, FreeMediaMode } from '../freeMedia';
import { getApiErrorMessage } from '@/lib/api';
import styles from './ImageSearchModal.module.css';

const formats: { value: FreeMediaMode; label: string }[] = [
  { value: 'portrait', label: 'Vertical' },
  { value: 'landscape', label: 'Horizontal' },
  { value: 'gif', label: 'GIF transparente' },
];
type Props = {
  variant: 'poster' | 'landscape';
  onClose: () => void;
  onSelect: (url: string, alt: string) => void;
  onBusyChange: (busy: boolean) => void;
};

/** Search/import stays server-side; closing the native dialog cancels pending searches. */
export default function FreeMediaModal({ variant, onClose, onSelect, onBusyChange }: Props) {
  const prefix = `article-${variant}-free-media`;
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const importLock = useRef(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<FreeMediaMode>(variant === 'poster' ? 'portrait' : 'landscape');
  const [searched, setSearched] = useState('');
  const [results, setResults] = useState<FreeMediaImage[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal(); input.current?.focus();
    return () => { request.current?.abort(); element?.close(); };
  }, []);

  async function search(selectedMode = mode, offset = 0, term = query.trim()) {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setMode(selectedMode); setError(''); setWarning('');
    if (!offset) { setResults([]); setNextOffset(null); setSearched(term); }
    if (!term) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await blogApi.searchFreeMedia(term, selectedMode, offset, controller.signal);
      if (controller.signal.aborted) return;
      setResults(current => offset ? [...new Map([...current, ...data.results].map(item => [item.id, item])).values()] : data.results);
      setNextOffset(data.nextOffset); setWarning(data.warning || '');
    } catch (error) {
      if (!controller.signal.aborted) setError(getApiErrorMessage(error, 'Não foi possível buscar imagens livres.'));
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  async function select(item: FreeMediaImage) {
    if (importLock.current) return;
    importLock.current = true; setImporting(item.id); onBusyChange(true); setError('');
    try {
      const saved = await blogApi.importFreeMedia(item.id, mode);
      onSelect(saved.url, saved.alt); onClose();
    } catch (error) { setError(getApiErrorMessage(error, 'Não foi possível importar a imagem.')); }
    finally { importLock.current = false; setImporting(null); onBusyChange(false); }
  }

  return <dialog id={`${prefix}-dialog`} ref={dialog} className={styles.modal} aria-labelledby={`${prefix}-title`} data-component="free-media-search" onCancel={event => { event.preventDefault(); if (!importLock.current) onClose(); }}>
    <header><div><h2 id={`${prefix}-title`}><FiImage aria-hidden="true" />Imagens livres</h2><p>Busque por qualquer tema no Wikimedia Commons.</p></div><button id={`${prefix}-close`} type="button" disabled={importing !== null} onClick={onClose} aria-label="Fechar busca de imagens livres"><FiX aria-hidden="true" /></button></header>
    <p className={styles.licenseNotice}>Somente arquivos indicados pela fonte como CC0 ou domínio público. Confira a origem e eventuais direitos de imagem ou marcas antes de usar.</p>
    <div className={styles.search}><label htmlFor={`${prefix}-query`}>Tema da imagem</label><div><input ref={input} id={`${prefix}-query`} placeholder="Ex.: natureza, internet, espaço…" maxLength={120} value={query} disabled={importing !== null} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (!loading) void search(); } }} /><button id={`${prefix}-search`} type="button" disabled={!query.trim() || loading || importing !== null} onClick={() => void search()}><FiSearch aria-hidden="true" />Buscar</button></div></div>
    <div className={styles.tabs} role="group" aria-label="Formato da imagem">{formats.map(option => <button id={`${prefix}-${option.value}`} type="button" key={option.value} aria-pressed={mode === option.value} disabled={importing !== null} onClick={() => void search(option.value)}>{option.value === 'gif' ? <FiFilm aria-hidden="true" /> : <FiImage aria-hidden="true" />}{option.label}</button>)}</div>
    {mode === 'gif' && <p>GIFs animados com transparência declarada em todos os quadros. Confira o recorte na prévia quadriculada; a busca não remove fundos.</p>}
    {error && <p role="alert">{error}</p>}
    {warning && <p role="status">{warning}</p>}
    <div role="status" aria-live="polite">{importing !== null ? 'Importando imagem…' : loading ? 'Buscando e verificando arquivos…' : searched ? `${results.length} resultado(s) para “${searched}”.` : 'Digite um tema para começar.'}</div>
    <div id={`${prefix}-results`} className={styles.grid} data-free-media aria-busy={loading || importing !== null}>
      {results.map(item => <article className={styles.resultCard} key={item.id} data-media-id={item.id}>
        <div className={styles.freePreview} data-dark-mode="preserve"><Image src={item.preview} alt={item.title} width={item.width} height={item.height} unoptimized /></div>
        <strong>{item.title}</strong><small>{item.width} × {item.height} · {item.license === 'CC0' ? 'CC0' : 'Domínio público'}</small>
        <small className={styles.author} title={item.author}>Autor: {item.author}</small>
        <a href={item.source} target="_blank" rel="noopener noreferrer"><FiExternalLink aria-hidden="true" />Origem e licença</a>
        <button id={`${prefix}-import-${item.id}`} type="button" disabled={loading || importing !== null} aria-label={`Usar imagem: ${item.title}`} onClick={() => void select(item)}><FiDownload aria-hidden="true" />{importing === item.id ? 'Importando…' : 'Usar imagem'}</button>
      </article>)}
    </div>
    {!loading && !error && searched && !results.length && <p>Nenhum arquivo compatível neste lote. {nextOffset !== null ? 'Carregue mais resultados ou tente outro termo.' : 'Tente outro termo, inclusive em inglês.'}</p>}
    {nextOffset !== null && <nav aria-label="Mais imagens livres"><button id={`${prefix}-more`} type="button" disabled={loading || importing !== null} onClick={() => void search(mode, nextOffset, searched)}>Carregar mais resultados</button></nav>}
    <footer>Importa o arquivo original de até 8 MB para a biblioteca do Blog, preservando a animação. Depois, salve ou atualize o artigo.</footer>
  </dialog>;
}
