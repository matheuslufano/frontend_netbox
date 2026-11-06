"use client";
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuArrowLeft, LuCircleAlert, LuFileText, LuPlus } from 'react-icons/lu';
import { getApiErrorMessage } from '@/lib/api';
import { blogApi } from './api';
import type { Article, Catalog, CatalogFilters as Filters, Category } from './types';
import { isArticlePublic, publicArticleUrl } from './catalogUtils';
import Categories from './components/Categories';
import CatalogMetrics from './components/CatalogMetrics';
import CatalogFilters from './components/CatalogFilters';
import CatalogArticleCard from './components/CatalogArticleCard';
import CatalogActionMenu, { type CatalogAction, type MenuAnchor } from './components/CatalogActionMenu';
import CatalogPagination from './components/CatalogPagination';
import base from './blog.module.css';
import styles from './catalog.module.css';
import ManagementTabs, {type ManagementTab} from './components/ManagementTabs';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';

export default function BlogPage() {
  const [tab,setTab]=useState<ManagementTab>('articles');
  const [analyticsMounted,setAnalyticsMounted]=useState(false);
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState<Filters>({ q: '', category: '', status: '', sort: 'updatedAt', page: 1, pageSize: 12 });
  const [grouped, setGrouped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [menu, setMenu] = useState<{ article: Article; anchor: MenuAnchor } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError(''); setLoadFailed(false);
      Promise.all([blogApi.list(filters, controller.signal), blogApi.categories()]).then(([data, list]) => {
        if (controller.signal.aborted) return;
        if (filters.page > Math.max(1, data.pages)) { setFilters(current => ({ ...current, page: Math.max(1, data.pages) })); return; }
        setCatalog(data); setCategories(list);
      }).catch(e => { if (!controller.signal.aborted) { setLoadFailed(true); setError(getApiErrorMessage(e, 'Não foi possível carregar os artigos.')); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [filters, refresh]);
  const closeMenu = useCallback((restore = false) => { if (restore) menu?.anchor.trigger.focus(); setMenu(null); }, [menu]);
  function openMenu(article: Article, anchor: MenuAnchor) { setMenu({ article, anchor }); }
  async function action(kind: CatalogAction, article: Article) {
    if (busy) return;
    if (kind === 'edit' || kind === 'preview') { router.push(`/integracoes/blog/${article.id}${kind === 'preview' ? '?preview=1' : ''}`); return; }
    if (kind === 'open') { window.open(publicArticleUrl(article), '_blank', 'noopener,noreferrer'); return; }
    if (kind === 'delete' && !window.confirm(`Excluir definitivamente "${article.title}"? O artigo sairá também da API pública. As imagens compartilhadas serão preservadas.`)) return;
    if (kind === 'publication' && !window.confirm(`${isArticlePublic(article) ? 'Despublicar' : 'Publicar'} "${article.title}"?`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (kind === 'copy') { await navigator.clipboard.writeText(publicArticleUrl(article)); setMessage(isArticlePublic(article) ? 'Link do artigo copiado.' : 'Link copiado. O artigo ainda não está disponível publicamente.'); return; }
      if (kind === 'duplicate') { await blogApi.duplicate(article, crypto.randomUUID()); setMessage('Cópia criada como rascunho.'); }
      if (kind === 'delete') { await blogApi.remove(article); setMessage('Artigo excluído. Os arquivos de imagem foram preservados.'); }
      if (kind === 'publication') { const withdrawing = isArticlePublic(article); await blogApi.publish(article, withdrawing ? 'unpublish' : 'publish'); setMessage(withdrawing ? 'Artigo retirado da API pública.' : 'Artigo disponibilizado na API pública.'); }
      setRefresh(value => value + 1);
    } catch (e) { setError(getApiErrorMessage(e, 'Não foi possível concluir a ação. Atualize a listagem e tente novamente.')); }
    finally { setBusy(false); }
  }
  const groups = grouped ? categories.map(c => ({ name: c.name, items: catalog?.items.filter(article => article.category === c.slug) || [] })).filter(group => group.items.length) : [{ name: '', items: catalog?.items || [] }];
  return <main className={`${base.page} ${styles.dashboard}`} data-ui="blog-management">
    <Link className={styles.back} href="/integracoes"><LuArrowLeft aria-hidden="true" />Integrações</Link>
    <ManagementTabs value={tab} onChange={value=>{setTab(value);if(value==='analytics')setAnalyticsMounted(true);}} />
    <section id="blog-panel-articles" role="tabpanel" aria-labelledby="blog-tab-articles" hidden={tab!=='articles'}>
    <header className={styles.header}><div><small>CONTEÚDO NETBOX</small><h1>Blog Institucional</h1><p>Crie, organize e disponibilize artigos para o site institucional.</p></div><Link className={styles.newArticle} href="/integracoes/blog/novo"><LuPlus aria-hidden="true" />Novo artigo</Link></header>
    <CatalogMetrics metrics={catalog?.metrics} />
    <CatalogFilters value={filters} categories={categories} grouped={grouped} loading={loading || busy} onChange={setFilters} onGroup={setGrouped} onRefresh={() => setRefresh(value => value + 1)} />
    {message && <p role="status" className={styles.notice}>{message}</p>}
    {error && <p role="alert" className={styles.error}><LuCircleAlert aria-hidden="true" />{error}</p>}
    <div aria-busy={loading || busy} className={styles.results}>
      {loading ? <div className={styles.empty} role="status"><LuFileText aria-hidden="true" />Carregando artigos…</div> : !loadFailed && <>
        {!catalog?.items.length && <div className={styles.empty}><LuFileText aria-hidden="true" /><strong>Nenhum artigo encontrado</strong><span>Crie um artigo ou ajuste os filtros.</span></div>}
        {groups.map(group => <section key={group.name} className={styles.articleGroup}>{group.name && <h2 className={styles.groupTitle}>{group.name}</h2>}<div className={styles.articleGrid}>{group.items.map(article => <CatalogArticleCard key={article.id} article={article} category={categories.find(category => category.slug === article.category)?.name || article.category} disabled={busy} expanded={menu?.article.id === article.id} onMenu={openMenu} />)}</div></section>)}
      </>}
    </div>
    {catalog && <CatalogPagination catalog={catalog} filters={filters} loading={loading || busy} onChange={setFilters} />}
    <p className={styles.apiNote}>Disponível na API indica publicação no backend. A exibição no site depende da configuração dele.</p>
    <Categories items={categories} onSaved={removedSlug => {
      if (removedSlug) setFilters(current => current.category === removedSlug ? { ...current, category: '', page: 1 } : current);
      setRefresh(value => value + 1);
    }} />
    </section>
    <section id="blog-panel-analytics" role="tabpanel" aria-labelledby="blog-tab-analytics" hidden={tab!=='analytics'}>{analyticsMounted&&<AnalyticsDashboard/>}</section>
    {menu && <CatalogActionMenu article={menu.article} anchor={menu.anchor} onClose={closeMenu} onAction={(kind, article) => { void action(kind, article); }} />}
  </main>;
}
