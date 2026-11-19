'use client';
import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { LuCircleAlert, LuImage, LuImages, LuLink, LuLoaderCircle, LuSearch, LuTrash2, LuUpload } from 'react-icons/lu';
import CatalogImageModal from './CatalogImageModal';
import FreeMediaModal from './FreeMediaModal';
import { imageCatalog, catalogLabels } from '../imageCatalog';
import { blogApi } from '../api';
import { getApiErrorMessage } from '@/lib/api';
import { resolveEditorialImageSource } from './EditorialImage';
import styles from './ImagePicker.module.css';

type Props = {
  value: string; alt: string; title: string; description: string; variant: 'poster' | 'landscape';
  onChange: (src: string) => void; onAltChange: (alt: string) => void;
  onBusyChange?: (busy: boolean) => void;
  category?: string;
};

/** Removing a selection never deletes a server asset that another article might share. */
export default function ImagePicker({ value, alt, title, description, variant, category, onChange, onAltChange, onBusyChange }: Props) {
  const provider = imageCatalog(category);
  const catalogAvailable = provider !== 'metron' || variant === 'poster';
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [freeMediaOpen, setFreeMediaOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const urlInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [failedSource, setFailedSource] = useState('');
  const source = resolveEditorialImageSource(value);
  const hasImage = Boolean(source && failedSource !== source);
  const broken = Boolean(value && !hasImage);
  function change(src: string) { setFailedSource(''); setError(''); onChange(src); }
  return <section className={styles.card} data-variant={variant} data-ui={`blog-image-${variant}`} aria-labelledby={`${id}-title`}>
    <header className={styles.header} title={description}><div><h3 id={`${id}-title`}>{title}</h3><p>{description}</p></div><span className={styles.ratio}>{variant === 'poster' ? '2:3' : '16:9'}</span></header>
    <div className={styles.workspace}>
    <div className={styles.stage} aria-busy={busy}>
      {hasImage ? <div className={styles.frame}><Image key={source} src={source} alt={alt || title} fill sizes={variant === 'poster' ? '(max-width: 767px) 65vw, 28vw' : '(max-width: 767px) 90vw, 55vw'} unoptimized className={styles.image} onError={() => setFailedSource(source)} /></div> : <div className={styles.placeholder}>
        {broken ? <LuCircleAlert aria-hidden="true" /> : <LuImage aria-hidden="true" />}
        <strong>{broken ? 'Não foi possível carregar a imagem' : variant === 'poster' ? 'Adicione a capa original' : 'Adicione uma imagem horizontal'}</strong>
        <span>{broken ? 'Confira a URL ou envie outro arquivo.' : variant === 'poster' ? 'Capa do filme, série, HQ ou jogo' : 'Uma boa composição para slides e cards'}</span>
      </div>}
      {busy && <span className={styles.uploading} role="status"><LuLoaderCircle className={styles.spinner} aria-hidden="true" />Enviando imagem…</span>}
    </div>
      <div className={styles.actions} role="group" aria-label={`Ações da ${title.toLowerCase()}`}>
        <button id={`article-${variant}-free-media-button`} type="button" disabled={busy} onClick={() => setFreeMediaOpen(true)} title="Buscar imagens livres e GIFs transparentes" aria-label={`Buscar imagens livres para ${title.toLowerCase()}`}><LuSearch aria-hidden="true" /><span className={styles.actionLabel}>Imagens livres</span></button>
        <button type="button" disabled={busy || !catalogAvailable} onClick={() => setCatalogOpen(true)} title={catalogAvailable ? `Buscar imagens: ${catalogLabels[provider].title}` : 'A Metron fornece capas de HQs. Envie a imagem horizontal ou use um link.'} aria-label={`Buscar imagens: ${catalogLabels[provider].title}`}><LuImages aria-hidden="true" /><span className={styles.actionLabel}>Catálogo</span></button>
        <button type="button" className={styles.uploadButton} disabled={busy} onClick={() => fileInput.current?.click()} title={value ? 'Trocar imagem' : 'Enviar imagem'} aria-label={`Enviar ${title.toLowerCase()} do computador`}><LuUpload aria-hidden="true" /><span className={styles.actionLabel}>{value ? 'Trocar' : 'Enviar'}</span></button>
        <button type="button" disabled={busy} aria-expanded={linkOpen} aria-controls={`${id}-url`} onClick={() => { setLinkOpen(!linkOpen); if (!linkOpen) requestAnimationFrame(() => urlInput.current?.focus()); }} title="Usar link de imagem" aria-label="Usar link de imagem"><LuLink aria-hidden="true" /><span className={styles.actionLabel}>Link</span></button>
        <button type="button" disabled={busy || !value} onClick={() => change('')} title="Remover imagem" aria-label={`Remover ${title.toLowerCase()}`}><LuTrash2 aria-hidden="true" /><span className={styles.actionLabel}>Remover</span></button>
        <input ref={fileInput} className={styles.fileInput} type="file" aria-label={`Arquivo da ${title.toLowerCase()}`} accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
          setError(''); setBusy(true); onBusyChange?.(true);
          try { change((await blogApi.uploadImage(file)).url); }
          catch (error) { setError(getApiErrorMessage(error, 'Não foi possível enviar a imagem.')); }
          finally { setBusy(false); onBusyChange?.(false); }
        }} />
      </div>
    </div>
    <div className={styles.body}>
      <div id={`${id}-url`} hidden={!linkOpen} className={styles.urlField}><label>URL da {title.toLowerCase()}<input ref={urlInput} value={value} onChange={e => change(e.target.value)} disabled={busy} placeholder="https://… ou /blog/…" spellCheck={false} /></label></div>
      <label className={styles.altField}>Descrição da imagem<input value={alt} maxLength={500} onChange={e => onAltChange(e.target.value)} placeholder={variant === 'poster' ? 'Descrição da capa…' : 'Descrição do banner…'} aria-describedby={`${id}-hint`} aria-label={`Descrição da ${title.toLowerCase()}`} /></label>
      <small id={`${id}-hint`} className={styles.hint}>Descreva a imagem para leitores de tela. JPG, PNG, WebP ou GIF · até 8 MB.</small>
      {!catalogAvailable && <small className={styles.hint}>HQs: a Metron fornece capas. Para slides e cards horizontais, envie uma arte ou use um link.</small>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
    {catalogOpen && catalogAvailable && <CatalogImageModal key={provider} provider={provider} variant={variant} onClose={() => setCatalogOpen(false)} onBusyChange={active => { setBusy(active); onBusyChange?.(active); }} onSelect={(url, description) => { change(url); onAltChange(description); }} />}
    {freeMediaOpen && <FreeMediaModal variant={variant} onClose={() => setFreeMediaOpen(false)} onBusyChange={active => { setBusy(active); onBusyChange?.(active); }} onSelect={(url, description) => { change(url); onAltChange(description); }} />}
  </section>;
}
