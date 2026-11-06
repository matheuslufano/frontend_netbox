import { useState } from 'react';
import { FiEdit3, FiFolder, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { getApiErrorMessage } from '@/lib/api';
import { blogApi } from '../api';
import { Category, slugify } from '../types';
import styles from '../blog.module.css';
import local from './Categories.module.css';
export default function Categories({ items, onSaved }: { items: Category[]; onSaved: (removedSlug?: string) => void }) {
  const [form, setForm] = useState<Partial<Category>>({ name: '', slug: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function remove(category: Category) {
    if (busy || !window.confirm(`Excluir a categoria “${category.name}”? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    setMessage('');
    try {
      await blogApi.removeCategory(category.id);
      if (form.id === category.id) setForm({ name: '', slug: '', description: '' });
      setMessage(`Categoria “${category.name}” excluída.`);
      onSaved(category.slug);
    } catch (error) {
      setMessage(getApiErrorMessage(error, 'Erro ao excluir categoria.'));
    } finally { setBusy(false); }
  }
  return <details className={styles.panel}><summary><FiFolder aria-hidden="true" /> Gerenciar categorias ({items.length})</summary>
    <div className={local.list}>{items.map(c => <div key={c.id} className={local.item}>
      <span className={local.name}>{c.name} <small>({c._count?.articles || 0} artigos)</small></span>
      <div className={styles.actions}>
        <button disabled={busy} type="button" onClick={() => { setForm(c); setMessage(''); }} aria-label={`Editar categoria ${c.name}`}><FiEdit3 aria-hidden="true" />Editar</button>
        <button className={local.remove} disabled={busy || Boolean(c._count?.articles)} type="button" onClick={() => void remove(c)} aria-label={`Excluir categoria ${c.name}`} title={c._count?.articles ? 'Mova os artigos para outra categoria antes de excluir.' : `Excluir ${c.name}`}><FiTrash2 aria-hidden="true" />Excluir</button>
      </div>
    </div>)}</div>
    <p className={local.hint}>Para excluir uma categoria com artigos, primeiro mova os artigos para outra categoria.</p>
    <form className={styles.stack} onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(''); try { await blogApi.saveCategory(form); setForm({ name: '', slug: '', description: '' }); setMessage('Categoria salva.'); onSaved(); } catch (error) { setMessage(getApiErrorMessage(error, 'Erro ao salvar categoria.')); } finally { setBusy(false); } }}>
      <div className={styles.row}><label>Nome da categoria<input disabled={busy} required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value, ...(!form.id ? { slug: slugify(e.target.value) } : {}) })} /></label><label>Slug (permanente)<input required disabled={busy || Boolean(form.id)} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></label></div>
      <label>Descrição<input disabled={busy} maxLength={500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <div className={styles.actions}><button disabled={busy}><FiSave aria-hidden="true" />{form.id ? 'Salvar categoria' : 'Criar categoria'}</button><button disabled={busy} type="button" onClick={() => setForm({ name: '', slug: '', description: '' })}><FiX aria-hidden="true" />Limpar / cancelar</button></div>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}
