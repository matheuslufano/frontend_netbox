"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "@/lib/api";
import { blogApi } from "./api";
import { Catalog, Category, statusLabel } from "./types";
import Categories from "./components/Categories";
import EditorialImage from "./components/EditorialImage";
import styles from "./blog.module.css";
const date = (value?: string) =>
  value ? new Date(value).toLocaleString("pt-BR") : "—";
export default function BlogPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    status: "",
    sort: "updatedAt",
    page: 1,
  });
  const [grouped, setGrouped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      Promise.all([
        blogApi.list(filters, controller.signal),
        blogApi.categories(),
      ])
        .then(([data, list]) => {
          if (!controller.signal.aborted) {
            setCatalog(data);
            setCategories(list);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted)
            setError(
              getApiErrorMessage(e, "Não foi possível carregar os artigos."),
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, refresh]);
  const groups = grouped
    ? categories
        .map((c) => ({
          name: c.name,
          items: catalog?.items.filter((a) => a.category === c.slug) || [],
        }))
        .filter((g) => g.items.length)
    : [{ name: "", items: catalog?.items || [] }];
  return (
    <main className={styles.page} data-ui="blog-management">
      <Link href="/integracoes">← Integrações</Link>
      <header className={styles.header}>
        <div>
          <small>CONTEÚDO NETBOX</small>
          <h1>Blog Institucional</h1>
          <p>
            Crie, organize e disponibilize artigos para o site institucional.
          </p>
        </div>
        <Link className={styles.primary} href="/integracoes/blog/novo">
          + Novo artigo
        </Link>
      </header>
      <p className={styles.notice}>
        O site consome a API pública deste backend. “Publicado na API” confirma
        a disponibilidade do conteúdo; não confirma que o site já o exibiu.
      </p>
      {catalog && (
        <section className={styles.metrics} aria-label="Visão geral">
          {[
            [catalog.metrics.total, "Artigos"],
            [catalog.metrics.published, "Publicados"],
            [catalog.metrics.drafts, "Rascunhos"],
            [catalog.metrics.categories, "Categorias"],
          ].map(([value, label]) => (
            <div className={styles.panel} key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>
      )}
      <section className={styles.filters} aria-label="Filtros">
        <label>
          Busca por título ou conteúdo
          <input
            type="search"
            value={filters.q}
            onChange={(e) =>
              setFilters({ ...filters, q: e.target.value, page: 1 })
            }
          />
        </label>
        <label>
          Categoria
          <select
            value={filters.category}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value, page: 1 })
            }
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value, page: 1 })
            }
          >
            <option value="">Todos</option>
            {Object.entries(statusLabel).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ordenação
          <select
            value={filters.sort}
            onChange={(e) =>
              setFilters({ ...filters, sort: e.target.value, page: 1 })
            }
          >
            <option value="updatedAt">Última atualização</option>
            <option value="createdAt">Criação</option>
            <option value="publishedAt">Publicação</option>
          </select>
        </label>
      </section>
      <div className={styles.actions}>
        <label>
          <input
            type="checkbox"
            checked={grouped}
            onChange={(e) => setGrouped(e.target.checked)}
          />{" "}
          Agrupar esta página por categoria
        </label>
        <button onClick={() => setRefresh((value) => value + 1)}>
          Atualizar
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando artigos…</p>
      ) : (
        !error && (
          <>
            {!catalog?.items.length && (
              <div className={styles.panel}>
                Nenhum artigo encontrado. Crie um artigo ou ajuste os filtros.
              </div>
            )}
            {groups.map((group) => (
              <section key={group.name}>
                {group.name && <h2>{group.name}</h2>}
                <div className={styles.grid}>
                  {group.items.map((article) => (
                    <article className={styles.card} key={article.id}>
                      {article.cover && (
                        <EditorialImage
                          src={article.cover}
                          alt={article.coverAlt}
                          className={styles.cover}
                        />
                      )}
                      <div className={styles.cardBody}>
                        <small>
                          {categories.find((c) => c.slug === article.category)
                            ?.name || article.category}{" "}
                          · {statusLabel[article.status]}
                        </small>
                        <h2>{article.title}</h2>
                        <p>{article.summary}</p>
                        <p>Por {article.author}</p>
                        <dl>
                          <dt>Criado</dt>
                          <dd>{date(article.createdAt)}</dd>
                          <dt>Atualizado</dt>
                          <dd>{date(article.updatedAt)}</dd>
                          <dt>Publicado</dt>
                          <dd>
                            {["published", "demo"].includes(article.status)
                              ? date(article.publishedAt)
                              : "—"}
                          </dd>
                          <dt>Última disponibilização</dt>
                          <dd>{date(article.syncedAt)}</dd>
                        </dl>
                        <p>
                          {article.syncError ||
                            (article.status === "published"
                              ? article.revision === article.publishedRevision
                                ? "Versão atual disponível na API"
                                : "Há alterações locais pendentes de publicação"
                              : "Conteúdo fora da publicação regular")}
                        </p>
                        <Link href={`/integracoes/blog/${article.id}`}>
                          Editar artigo →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {catalog && catalog.pages > 1 && (
              <nav className={styles.actions} aria-label="Paginação">
                <button
                  disabled={filters.page <= 1}
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page - 1 })
                  }
                >
                  Anterior
                </button>
                <span>
                  Página {filters.page} de {catalog.pages} · {catalog.total}{" "}
                  artigos
                </span>
                <button
                  disabled={filters.page >= catalog.pages}
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page + 1 })
                  }
                >
                  Próxima
                </button>
              </nav>
            )}
          </>
        )
      )}
      <Categories
        items={categories}
        onSaved={() => setRefresh((value) => value + 1)}
      />
    </main>
  );
}
  