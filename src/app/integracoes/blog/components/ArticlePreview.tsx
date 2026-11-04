'use client';
import { useEffect, useRef, useState } from 'react';
import { FiMonitor, FiRefreshCw, FiSmartphone } from 'react-icons/fi';
import type { Article } from '../types';
import styles from './ArticlePreview.module.css';

const site = (process.env.NEXT_PUBLIC_BLOG_SITE_URL || 'https://netbox.net.br').replace(/\/$/, '');

/** Drafts travel to the institutional iframe in memory, without saving or publishing. */
export default function ArticlePreview({ article }: { article: Article }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [connected, setConnected] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const origin = new URL(site).origin;
    const send = () => frame.current?.contentWindow?.postMessage({ type: 'netbox:preview-article', article }, origin);
    function receive(event: MessageEvent) {
      if (event.origin !== origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === 'netbox:preview-ready') send();
      if (event.data?.type === 'netbox:preview-applied') setConnected(true);
    }
    window.addEventListener('message', receive);
    const update = window.setTimeout(send, 150);
    return () => { window.removeEventListener('message', receive); window.clearTimeout(update); };
  }, [article, attempt]);
  useEffect(() => { const timer = window.setTimeout(() => setTimedOut(true), 12000); return () => window.clearTimeout(timer); }, [attempt]);
  return <div className={styles.preview}>
    <div className={styles.toolbar}>
      <span role="status"><i data-connected={connected} />{connected ? 'Prévia em tempo real' : 'Conectando ao blog…'}</span>
      <div role="group" aria-label="Tamanho da prévia"><button type="button" title="Prévia no computador" aria-label="Prévia no computador" aria-pressed={!mobile} onClick={() => setMobile(false)}><FiMonitor aria-hidden="true" /></button><button type="button" title="Prévia no celular" aria-label="Prévia no celular" aria-pressed={mobile} onClick={() => setMobile(true)}><FiSmartphone aria-hidden="true" /></button><button type="button" title="Recarregar prévia" aria-label="Recarregar prévia" onClick={() => { setConnected(false); setTimedOut(false); setAttempt(value => value + 1); }}><FiRefreshCw aria-hidden="true" /></button></div>
    </div>
    {!connected && timedOut && <p role="alert" className={styles.error}>Não foi possível conectar a prévia. Confira a conexão e a configuração do site institucional.</p>}
    <div className={styles.viewport} data-mobile={mobile}><iframe key={attempt} ref={frame} src={`${site}/site/blog/preview/editor?editor=${attempt}`} title="Página completa do artigo — prévia em tempo real" className={styles.frame} referrerPolicy="no-referrer" /></div>
  </div>;
}
