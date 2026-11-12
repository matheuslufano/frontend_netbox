'use client';
import { useEffect, useRef, useState } from 'react';
import { FiGlobe, FiMonitor, FiRefreshCw, FiSmartphone } from 'react-icons/fi';
import type { Article } from '../types';
import { previewSites } from '../previewSites';
import styles from './ArticlePreview.module.css';

/** Drafts travel to the institutional iframe in memory, without saving or publishing. */
export default function ArticlePreview({ article, previewId, fullSize = false }: { article: Article; previewId: string; fullSize?: boolean }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [connected, setConnected] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [destination, setDestination] = useState<keyof typeof previewSites>('official');
  const site = previewSites[destination];
  const nextDestination = destination === 'official' ? 'vercel' : 'official';
  function reload() {
    setConnected(false);
    setTimedOut(false);
    setAttempt(value => value + 1);
  }
  useEffect(() => {
    const origin = site.origin;
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'netbox:preview-article', article }, origin);
    function receive(event: MessageEvent) {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'netbox:preview-ready') send();
      if (event.data?.type === 'netbox:preview-applied') setConnected(true);
    }
    window.addEventListener('message', receive);
    const update = window.setTimeout(send, 150);
    return () => { window.removeEventListener('message', receive); window.clearTimeout(update); };
  }, [article, attempt, site.origin]);
  useEffect(() => { const timer = window.setTimeout(() => setTimedOut(true), 12000); return () => window.clearTimeout(timer); }, [attempt]);
  return <div id={previewId} className={`${styles.preview}${fullSize ? ` ${styles.fullSize}` : ''}`} data-component="article-preview" data-destination={destination}>
    <div id={`${previewId}-toolbar`} className={styles.toolbar}>
      <span role="status"><i data-connected={connected} />{connected ? 'Prévia em tempo real' : 'Conectando ao blog…'}</span>
      <div className={styles.controls} role="group" aria-label="Controles da prévia">
        <button id={`${previewId}-site-toggle`} type="button" className={styles.siteToggle} title={`Alternar para ${previewSites[nextDestination].label}`} aria-label={`Site da prévia: ${site.label}. Alternar para ${previewSites[nextDestination].label}`} onClick={() => { setDestination(nextDestination); reload(); }}><FiGlobe aria-hidden="true" /><span>{site.label}</span></button>
        <button id={`${previewId}-desktop`} type="button" title="Prévia no computador" aria-label="Prévia no computador" aria-pressed={!mobile} onClick={() => setMobile(false)}><FiMonitor aria-hidden="true" /></button>
        <button id={`${previewId}-mobile`} type="button" title="Prévia no celular" aria-label="Prévia no celular" aria-pressed={mobile} onClick={() => setMobile(true)}><FiSmartphone aria-hidden="true" /></button>
        <button id={`${previewId}-reload`} type="button" title="Recarregar prévia" aria-label="Recarregar prévia" onClick={reload}><FiRefreshCw aria-hidden="true" /></button>
      </div>
    </div>
    {!connected && timedOut && <p role="alert" className={styles.error}>Não foi possível conectar a prévia em {site.label}. Confira se esse site permite prévias deste painel ou alterne o destino pelo botão acima.</p>}
    <div className={styles.viewport} data-mobile={mobile}><iframe id={`${previewId}-frame`} key={`${destination}-${attempt}`} ref={frame} src={`${site.origin}/site/blog/preview/editor?editor=${attempt}`} title={`Página completa do artigo — prévia em ${site.label}`} className={styles.frame} referrerPolicy="no-referrer" /></div>
  </div>;
}
