import { useState } from 'react';
import { FiFileText, FiImage, FiSettings } from 'react-icons/fi';
import { slugify, type Article, type ArticleUpdate, type Category } from '../types';
import ImagePicker from './ImagePicker';
import styles from './ArticleInformation.module.css';

/** Metadata is kept mounted across tabs, including any in-progress cover upload. */
export default function ArticleInformation({ article, categories, existing, onChange, onBusyChange }: {
  article: Article; categories: Category[]; existing: boolean;
  onChange: (value: ArticleUpdate) => void; onBusyChange: (busy: boolean) => void;
}) {
  const [manualSlug, setManualSlug] = useState(existing);
  function patchArtwork(value: Partial<NonNullable<Article['spotlight']>>) {
    onChange(current => ({ spotlight: { title: current.title, poster: '', ...current.spotlight, ...value } }));
  }
  function changeTitle(title: string) {
    onChange({ title, ...(!manualSlug ? { slug: slugify(title) } : {}), ...(article.spotlight && (!article.spotlight.title || article.spotlight.title === article.title) ? { spotlight: { ...article.spotlight, title } } : {}) });
  }
  return <div className={styles.layout} data-ui="blog-article-information">
    <div className={styles.detailsGrid}>
      <section className={styles.section} aria-labelledby="article-details-title">
        <header className={styles.sectionHeader}><span className={styles.sectionIcon}><FiFileText aria-hidden="true" /></span><div><h2 id="article-details-title">Sobre o artigo</h2><p>Apresente a história que você quer contar.</p></div></header>
        <div className={styles.fields}>
          <label>Título do artigo *<input required maxLength={200} placeholder="Dê um título ao seu artigo" value={article.title} onChange={e => changeTitle(e.target.value)} /></label>
          <label>Resumo<textarea maxLength={1000} rows={5} placeholder="Uma breve apresentação para despertar a curiosidade de quem vai ler." value={article.summary} onChange={e => onChange({ summary: e.target.value })} /></label>
          <div className={styles.fieldHint}><span>Uma apresentação curta para os cards e destaques.</span><span>{article.summary.length}/1000</span></div>
          <label>Endereço do artigo (slug) *<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={article.slug} onChange={e => { setManualSlug(true); onChange({ slug: e.target.value }); }} spellCheck={false} /></label>
          <small className={styles.route}>/site/blog/{article.slug || 'titulo-do-artigo'}</small>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="article-organization-title">
        <header className={styles.sectionHeader}><span className={styles.sectionIcon}><FiSettings aria-hidden="true" /></span><div><h2 id="article-organization-title">Organização</h2><p>Defina onde o artigo será encontrado.</p></div></header>
        <div className={styles.fields}>
          <label>Categoria *<select required value={article.category} onChange={e => onChange({ category: e.target.value })}><option value="">Selecione uma categoria</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
          {!categories.length && <p className={styles.emptyNotice}>Cadastre uma categoria na listagem antes de criar o artigo.</p>}
          <label>Autor<input readOnly value={article.author || 'Definido ao salvar'} /></label>
          <small>A autoria é vinculada ao usuário que criou o artigo.</small>
        </div>
      </section>
    </div>
    <section className={styles.mediaSection} aria-labelledby="article-images-title">
      <header className={styles.sectionHeader}><span className={styles.sectionIcon}><FiImage aria-hidden="true" /></span><div><h2 id="article-images-title">Imagens do artigo</h2><p>Uma imagem para identificar a obra, outra para destacar seu artigo.</p></div></header>
      <div className={styles.mediaGrid}>
        <ImagePicker title="Capa da obra" description="A capa original do filme, série ou jogo." variant="poster" value={article.spotlight?.poster || ''} alt={article.spotlight?.posterAlt || ''} onChange={poster => patchArtwork({ poster })} onAltChange={posterAlt => patchArtwork({ posterAlt })} onBusyChange={onBusyChange} />
        <ImagePicker title="Imagem de slide/caixa" description="Imagem horizontal exibida nos slides e cards de artigos." variant="landscape" value={article.cover} alt={article.coverAlt} onChange={cover => onChange({ cover })} onAltChange={coverAlt => onChange({ coverAlt })} onBusyChange={onBusyChange} />
      </div>
      <p className={styles.mediaNote}>As proporções são sugestões de composição. Remover uma imagem desvincula somente este artigo.</p>
    </section>
  </div>;
}
