import { useId, useState } from "react";
import { LuCheck } from "react-icons/lu";
import type { Daily } from "../../analytics/types";
import styles from "./Analytics.module.css";
type Key = Exclude<keyof Daily, "date">;
const series: { key: Key; label: string; color: string }[] = [
  { key: "visitors", label: "Visitantes únicos", color: "#2563eb" },
  { key: "views", label: "Visualizações", color: "#b45309" },
  { key: "shares", label: "Compartilhamentos", color: "#15803d" },
  { key: "trailers", label: "Trailers iniciados", color: "#7c3aed" },
  { key: "multiReaders", label: "Múltiplos artigos por dia", color: "#a21caf" },
];
const day = (value: string) => value.slice(8, 10) + "/" + value.slice(5, 7);
export default function AnalyticsLineChart({ data }: { data: Daily[] }) {
  const id = useId();
  const [enabled, setEnabled] = useState<Key[]>(series.map((item) => item.key));
  const [hover, setHover] = useState<number | null>(null);
  const active = Math.max(
    0,
    Math.min(hover ?? data.length - 1, data.length - 1),
  );
  const max = Math.max(
    4,
    ...data.flatMap((row) => enabled.map((key) => row[key])),
  );
  const ceiling = Math.ceil(max / 4) * 4;
  const x = (index: number) =>
    52 + (data.length > 1 ? (index / (data.length - 1)) * 780 : 390);
  const y = (value: number) => 218 - (value / ceiling) * 180;
  const row = data[active];
  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <div className={styles.panelHeading}>
        <h2 id={`${id}-title`}>Evolução diária</h2>
        <small>Use a legenda para escolher as séries</small>
      </div>
      <div className={styles.legend}>
        {series.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={enabled.includes(item.key)}
            onClick={() =>
              setEnabled((current) =>
                current.includes(item.key)
                  ? current.filter((key) => key !== item.key)
                  : [...current, item.key],
              )
            }
          >
            <span style={{ background: item.color }}>
              {enabled.includes(item.key) && <LuCheck aria-hidden="true" />}
            </span>
            {item.label}
          </button>
        ))}
      </div>
      <svg
        className={styles.lineChart}
        viewBox="0 0 880 260"
        role="img"
        aria-label="Evolução diária. Use as setas esquerda e direita para consultar os valores de cada dia."
        aria-describedby={`${id}-values`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setHover(
              Math.max(
                0,
                Math.min(
                  data.length - 1,
                  active + (event.key === "ArrowLeft" ? -1 : 1),
                ),
              ),
            );
          }
        }}
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <g key={index}>
            <line
              x1={52}
              x2={832}
              y1={y((index * ceiling) / 4)}
              y2={y((index * ceiling) / 4)}
              className={styles.gridLine}
            />
            <text x={42} y={y((index * ceiling) / 4) + 4} textAnchor="end">
              {new Intl.NumberFormat("pt-BR").format((index * ceiling) / 4)}
            </text>
          </g>
        ))}
        {series
          .filter((item) => enabled.includes(item.key))
          .map((item) => (
            <polyline
              key={item.key}
              fill="none"
              stroke={item.color}
              strokeWidth={2.5}
              points={data
                .map((row, index) => `${x(index)},${y(row[item.key])}`)
                .join(" ")}
            />
          ))}
        {data.map((row, index) => (
          <g key={row.date}>
            {(index === 0 ||
              index === data.length - 1 ||
              index % Math.max(1, Math.ceil(data.length / 6)) === 0) && (
              <text x={x(index)} y={245} textAnchor="middle">
                {day(row.date)}
              </text>
            )}
            <rect
              x={x(index) - (data.length > 1 ? 390 / (data.length - 1) : 390)}
              y={30}
              width={data.length > 1 ? 780 / (data.length - 1) : 780}
              height={194}
              fill="transparent"
              onMouseEnter={() => setHover(index)}
              onClick={() => setHover(index)}
            />
          </g>
        ))}
        {row && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={32}
            y2={220}
            className={styles.cursorLine}
          />
        )}
      </svg>
      {row && (
        <div
          className={styles.chartValues}
          id={`${id}-values`}
          aria-live="polite"
        >
          <strong>
            {new Date(row.date + "T12:00:00Z").toLocaleDateString("pt-BR", {
              timeZone: "UTC",
            })}
          </strong>
          {series
            .filter((item) => enabled.includes(item.key))
            .map((item) => (
              <span key={item.key}>
                <i style={{ background: item.color }} />
                {item.label}: <b>{row[item.key].toLocaleString("pt-BR")}</b>
              </span>
            ))}
        </div>
      )}
      <small className={styles.note}>
        Visitantes diários não devem ser somados para obter os únicos do
        período. Múltiplos artigos por dia considera dois artigos diferentes no
        mesmo dia.
      </small>
    </section>
  );
}
