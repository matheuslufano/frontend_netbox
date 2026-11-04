import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api';
import { blogApi } from '../api';
import { Category, slugify } from '../types';
import styles from '../blog.module.css';
export default function Categories({ items, onSaved }: { items: Category[]; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Category>>({ name: '', slug: '', description: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  return <details className={styles.panel}><summary>Gerenciar categorias ({items.length})</summary>
    <div className={styles.actions}>{items.map(c => <button key={c.id} type="button" onClick={() => setForm(c)}>{c.name} ({c._count?.articles || 0}) · Editar</button>)}</div>
    <form className={styles.stack} onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(''); try { await blogApi.saveCategory(form); setForm({ name: '', slug: '', description: '' }); setMessage('Categoria salva.'); onSaved(); } catch (error) { setMessage(getApiErrorMessage(error, 'Erro ao salvar categoria.')); } finally { setBusy(false); } }}>
      <div className={styles.row}><label>Nome da categoria<input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value, ...(!form.id ? { slug: slugify(e.target.value) } : {}) })} /></label><label>Slug (permanente)<input required disabled={Boolean(form.id)} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></label></div>
      <label>Descrição<input maxLength={500} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <div className={styles.actions}><button disabled={busy}>{form.id ? 'Salvar categoria' : 'Criar categoria'}</button><button type="button" onClick={() => setForm({ name: '', slug: '', description: '' })}>Limpar / cancelar</button></div>
      {message && <p role="status">{message}</p>}
    </form>
  </details>;
}
