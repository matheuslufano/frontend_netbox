import { useMemo, useState } from "react";
import { LuArrowDownUp, LuChartNoAxesCombined, LuSearch } from "react-icons/lu";
import EditorialImage from "../EditorialImage";
import type { AnalyticsArticle } from "../../analytics/types";
import styles from "./Analytics.module.css";
type Sort =
  | "title"
  | "categoryLabel"
  | "visitors"
  | "views"
  | "shares"
  | "trailers"
  | "continuations"
  | "updatedAt";
export default function AnalyticsTable({
  articles,
  onSelect,
}: {
  articles: AnalyticsArticle[];
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("");
  const [sort, setSort] = useState<Sort>("views"),
    [descending, setDescending] = useState(true);
  const categories = [
    ...new Map(
      articles.map((row) => [row.category, row.categoryLabel]),
    ).entries(),
  ];
  const rows = useMemo(
    () =>
      articles
        .filter(
          (row) =>
            (!category || row.category === category) &&
            row.title
              .toLocaleLowerCase("pt-BR")
              .includes(query.toLocaleLowerCase("pt-BR")),
        )
        .sort((a, b) => {
          const av = a[sort] ?? "",
            bv = b[sort] ?? "";
          const difference =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv), "pt-BR");
          return descending ? -difference : difference;
        }),
    [articles, query, category, sort, descending],
  );
  const columns: { key: Sort; label: string; optional?: boolean }[] = [
    { key: "title", label: "Artigo" },
    { key: "categoryLabel", label: "Categoria", optional: true },
    { key: "visitors", label: "Únicos" },
    { key: "views", label: "Visualizações" },
    { key: "shares", label: "Compart.", optional: true },
    { key: "trailers", label: "Trailers", optional: true },
    { key: "continuations", label: "Seguiram", optional: true },
    { key: "updatedAt", label: "Atualização", optional: true },
  ];
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <h2>Desempenho por artigo</h2>
        <span>{rows.length} artigos</span>
      </div>
      <div className={styles.tableFilters}>
        <label>
          <span className={styles.srOnly}>Buscar título</span>
          <LuSearch aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título…"
          />
        </label>
        <label>
          <span className={styles.srOnly}>Filtrar categoria</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categories.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.tableScroll}>
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.optional ? styles.optional : undefined}
                  aria-sort={
                    sort === column.key
                      ? descending
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      setDescending(sort === column.key ? !descending : true);
                      setSort(column.key);
                    }}
                  >
                    {column.label}
                    <LuArrowDownUp aria-hidden="true" />
                  </button>
                </th>
              ))}
              <th>
                <span className={styles.srOnly}>Detalhes</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className={styles.tableArticle}>
                    {row.cover && <EditorialImage src={row.cover} alt="" />}
                    <strong>{row.title}</strong>
                  </div>
                </td>
                <td className={styles.optional}>{row.categoryLabel}</td>
                <td>{row.visitors.toLocaleString("pt-BR")}</td>
                <td>{row.views.toLocaleString("pt-BR")}</td>
                <td className={styles.optional}>
                  {row.shares.toLocaleString("pt-BR")}
                </td>
                <td className={styles.optional}>
                  {row.trailers.toLocaleString("pt-BR")}
                </td>
                <td className={styles.optional}>
                  {row.continuations.toLocaleString("pt-BR")}
                </td>
                <td className={styles.optional}>
                  {row.updatedAt
                    ? new Date(
                        row.updatedAt.length === 10
                          ? row.updatedAt + "T12:00:00Z"
                          : row.updatedAt,
                      ).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Ver desempenho de ${row.title}`}
                    title="Ver detalhes"
                    onClick={() => onSelect(row.id)}
                  >
                    <LuChartNoAxesCombined aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className={styles.empty}>Nenhum artigo corresponde aos filtros.</p>
      )}
    </section>
  );
}
