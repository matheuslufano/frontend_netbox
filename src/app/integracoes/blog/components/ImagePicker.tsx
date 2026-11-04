'use client';
import { useId, useRef, useState } from 'react';
import Image from 'next/image';
import { FiAlertCircle, FiImage, FiLink, FiLoader, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import { blogApi } from '../api';
import { getApiErrorMessage } from '@/lib/api';
import { resolveEditorialImageSource } from './EditorialImage';
import styles from './ImagePicker.module.css';

type Props = {
  value: string; alt: string; title: string; description: string; variant: 'poster' | 'landscape';
  onChange: (src: string) => void; onAltChange: (alt: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

/** Removing a selection never deletes a server asset that another article might share. */
export default function ImagePicker({ value, alt, title, description, variant, onChange, onAltChange, onBusyChange }: Props) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [failedSource, setFailedSource] = useState('');
  const source = resolveEditorialImageSource(value);
  const hasImage = Boolean(source && failedSource !== source);
  const broken = Boolean(value && !hasImage);
  function change(src: string) { setFailedSource(''); setError(''); onChange(src); }
  return <section className={styles.card} data-variant={variant} data-ui={`blog-image-${variant}`} aria-labelledby={`${id}-title`}>
    <header className={styles.header}><div><h3 id={`${id}-title`}>{title}</h3><p>{description}</p></div><span className={styles.ratio}>{variant === 'poster' ? '2:3' : '16:9'}</span></header>
    <div className={styles.stage} aria-busy={busy}>
      {hasImage ? <div className={styles.frame}><Image key={source} src={source} alt={alt || title} fill sizes={variant === 'poster' ? '176px' : '(max-width: 650px) 90vw, 480px'} unoptimized className={styles.image} onError={() => setFailedSource(source)} /></div> : <div className={styles.placeholder}>
        {broken ? <FiAlertCircle aria-hidden="true" /> : <FiImage aria-hidden="true" />}
        <strong>{broken ? 'Não foi possível carregar a imagem' : variant === 'poster' ? 'Adicione a capa original' : 'Adicione uma imagem horizontal'}</strong>
        <span>{broken ? 'Confira a URL ou envie outro arquivo.' : variant === 'poster' ? 'Pôster do filme, série ou jogo' : 'Uma boa composição para slides e cards'}</span>
      </div>}
      {busy && <span className={styles.uploading} role="status"><FiLoader className={styles.spinner} aria-hidden="true" />Enviando imagem…</span>}
    </div>
    <div className={styles.body}>
      <div className={styles.actions}>
        <button type="button" className={styles.uploadButton} disabled={busy} onClick={() => fileInput.current?.click()} aria-label={`Enviar ${title.toLowerCase()} do computador`}><FiUploadCloud aria-hidden="true" />{value ? 'Trocar imagem' : 'Enviar imagem'}</button>
        {value && <button type="button" disabled={busy} onClick={() => change('')} aria-label={`Remover ${title.toLowerCase()}`}><FiTrash2 aria-hidden="true" />Remover</button>}
        <input ref={fileInput} className={styles.fileInput} type="file" aria-label={`Arquivo da ${title.toLowerCase()}`} accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
          setError(''); setBusy(true); onBusyChange?.(true);
          try { change((await blogApi.uploadImage(file)).url); }
          catch (error) { setError(getApiErrorMessage(error, 'Não foi possível enviar a imagem.')); }
          finally { setBusy(false); onBusyChange?.(false); }
        }} />
      </div>
      <small className={styles.hint}>JPG, PNG, WebP ou GIF · até 8 MB</small>
      <details className={styles.urlField}><summary><FiLink aria-hidden="true" />Usar URL ou caminho de imagem</summary><label>URL da {title.toLowerCase()}<input value={value} onChange={e => change(e.target.value)} disabled={busy} placeholder="https://… ou /blog/…" spellCheck={false} /></label></details>
      <label className={styles.altField}>Descrição da imagem<input value={alt} maxLength={500} onChange={e => onAltChange(e.target.value)} placeholder={variant === 'poster' ? 'Ex.: Capa original da obra' : 'Ex.: Personagens em uma cena do filme'} aria-label={`Descrição da ${title.toLowerCase()}`} /></label>
      <small className={styles.hint}>Descreva o que aparece na imagem para leitores de tela.</small>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  </section>;
}
