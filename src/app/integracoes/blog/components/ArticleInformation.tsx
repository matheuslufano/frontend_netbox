import { useEffect, useRef } from 'react';
import { FiFileText, FiFilm, FiImage, FiSettings, FiUser } from 'react-icons/fi';
import { slugify, type Article, type Author, type ArticleUpdate, type Category } from '../types';
import ImagePicker from './ImagePicker';
import Avatar from '@/components/profile/Avatar';
import styles from './ArticleInformation.module.css';
import { isSupportedTrailerUrl } from '../trailer';

/** Metadata is kept mounted across tabs, including any in-progress cover upload. */
export default function ArticleInformation({ article, categories, authors, existing, onChange, onBusyChange }: {
  article: Article; categories: Category[]; authors: Author[]; existing: boolean;
  onChange: (value: ArticleUpdate) => void; onBusyChange: (busy: boolean) => void;
}) {
  const trailerInput = useRef<HTMLInputElement>(null);
  const trailerUrl = article.spotlight?.trailerUrl || '';
  const trailerError = 'Use um link HTTPS do YouTube: youtube.com/watch?v=… ou youtu.be/… com um vídeo válido.';
  useEffect(() => { trailerInput.current?.setCustomValidity(isSupportedTrailerUrl(trailerUrl) ? '' : trailerError); }, [trailerUrl]);
  function patchArtwork(value: Partial<NonNullable<Article['spotlight']>>) {
    onChange(current => ({ spotlight: { title: current.title, poster: '', ...current.spotlight, ...value } }));
  }
  function changeTitle(title: string) {
    onChange({ title, ...(!existing && !article.createdAt ? { slug: slugify(title) } : {}), ...(article.spotlight && (!article.spotlight.title || article.spotlight.title === article.title) ? { spotlight: { ...article.spotlight, title } } : {}) });
  }
  return <div className={styles.layout} data-ui="blog-article-information">
    <div className={styles.detailsGrid}>
      <section className={styles.section} aria-labelledby="article-details-title">
        <header className={styles.sectionHeader}><span className={styles.sectionIcon}><FiFileText aria-hidden="true" /></span><div><h2 id="article-details-title">Sobre o artigo</h2><p>Apresente a história que você quer contar.</p></div></header>
        <div className={styles.fields}>
          <label>Título do artigo *<input required maxLength={200} placeholder="Dê um título ao seu artigo" value={article.title} onChange={e => changeTitle(e.target.value)} /></label>
          <label>Resumo<textarea maxLength={1000} rows={5} placeholder="Uma breve apresentação para despertar a curiosidade de quem vai ler." value={article.summary} onChange={e => onChange({ summary: e.target.value })} /></label>
          <div className={styles.fieldHint}><span>Uma apresentação curta para os cards e destaques.</span><span>{article.summary.length}/1000</span></div>
          <label><span className={styles.fieldLabel}><FiFilm aria-hidden="true" />Link do trailer</span><input ref={trailerInput} type="url" maxLength={2000} value={trailerUrl} onChange={e => { e.currentTarget.setCustomValidity(isSupportedTrailerUrl(e.target.value) ? '' : trailerError); patchArtwork({ trailerUrl: e.target.value }); }} placeholder="https://www.youtube.com/watch?v=…" aria-describedby="article-trailer-hint" spellCheck={false} /></label>
          <small id="article-trailer-hint">Vídeo exibido pelo botão “Assistir trailer” no slide do site. Use YouTube ou youtu.be; deixe vazio para remover.</small>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="article-organization-title">
        <header className={styles.sectionHeader}><span className={styles.sectionIcon}><FiSettings aria-hidden="true" /></span><div><h2 id="article-organization-title">Organização</h2><p>Defina onde o artigo será encontrado.</p></div></header>
        <div className={styles.fields}>
          <label>Categoria *<select required value={article.category} onChange={e => onChange({ category: e.target.value })}><option value="">Selecione uma categoria</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label>
          {!categories.length && <p className={styles.emptyNotice}>Cadastre uma categoria na listagem antes de criar o artigo.</p>}
          <label><span className={styles.fieldLabel}><FiUser aria-hidden="true" />Autor</span>
            <select value={article.authorId ?? ''} onChange={e => {
              const author = authors.find(person => person.id === Number(e.target.value));
              if (author) onChange({ authorId: author.id, author: author.name, authorUser: { photoUrl: author.photoUrl } });
            }} aria-describedby="article-author-hint">
              <option value="" disabled>{article.author || 'Seu usuário ao salvar'}</option>
              {article.authorId && !authors.some(person => person.id === article.authorId) && <option value={article.authorId}>{article.author} (inativo)</option>}
              {authors.map(author => <option key={author.id} value={author.id}>{author.name} (#{author.id})</option>)}
            </select>
          </label>
          {article.author && <div className={styles.authorIdentity}><Avatar name={article.author} photoUrl={article.authorUser?.photoUrl} alt={`Foto de ${article.author}`} className={styles.authorAvatar} /><span>{article.author}</span></div>}
          <small id="article-author-hint">Selecione o responsável. A foto do perfil acompanha o autor na prévia e na publicação.</small>
        </div>
      </section>
    </div>
    <section className={styles.mediaSection} aria-labelledby="article-images-title">
      <header className={styles.sectionHeader}><span className={styles.sectionIcon}><FiImage aria-hidden="true" /></span><div><h2 id="article-images-title">Imagens do artigo</h2><p>Uma imagem para identificar a obra, outra para destacar seu artigo.</p></div></header>
      <div className={styles.mediaGrid}>
        <ImagePicker category={article.category} title="Capa da obra" description="A capa original do filme, série, HQ ou jogo." variant="poster" value={article.spotlight?.poster || ''} alt={article.spotlight?.posterAlt || ''} onChange={poster => patchArtwork({ poster })} onAltChange={posterAlt => patchArtwork({ posterAlt })} onBusyChange={onBusyChange} />
        <ImagePicker category={article.category} title="Imagem de slide/caixa" description="Imagem horizontal exibida nos slides e cards de artigos." variant="landscape" value={article.cover} alt={article.coverAlt} onChange={cover => onChange({ cover })} onAltChange={coverAlt => onChange({ coverAlt })} onBusyChange={onBusyChange} />
      </div>
      <p className={styles.mediaNote}>As proporções são sugestões de composição. Remover uma imagem desvincula somente este artigo.</p>
    </section>
  </div>;
}
