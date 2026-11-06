import { useState } from "react";
import styles from "./Analytics.module.css";
const colors = [
  "#2563eb",
  "#b45309",
  "#15803d",
  "#7c3aed",
  "#a21caf",
  "#0e7490",
  "#be123c",
];
export default function AnalyticsDonut({
  title,
  items,
}: {
  title: string;
  items: { name: string; value: number }[];
}) {
  const [active, setActive] = useState(0);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const selected = items[Math.min(active, items.length - 1)];
  return (
    <section className={styles.panel}>
      <h2>{title}</h2>
      <div className={styles.donutLayout}>
        <svg
          viewBox="0 0 120 120"
          className={styles.donut}
          role="img"
          aria-label={
            total
              ? `${title}: ${total.toLocaleString("pt-BR")} no total`
              : `${title}: sem dados`
          }
        >
          <circle
            cx={60}
            cy={60}
            r={43}
            fill="none"
            stroke="var(--border)"
            strokeWidth={14}
          />
          {total > 0 &&
            items.map((item, index) => {
              const length = (item.value / total) * 270.177;
              const start = offset;
              offset += length;
              return (
                <circle
                  key={item.name}
                  cx={60}
                  cy={60}
                  r={43}
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth={index === active ? 17 : 14}
                  strokeDasharray={`${length} ${270.177 - length}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 60 60)"
                  onMouseEnter={() => setActive(index)}
                >
                  <title>
                    {item.name}: {item.value} (
                    {((item.value / total) * 100).toFixed(1)}%)
                  </title>
                </circle>
              );
            })}
          <text x={60} y={58} textAnchor="middle" className={styles.donutTotal}>
            {total.toLocaleString("pt-BR")}
          </text>
          <text x={60} y={74} textAnchor="middle">
            {total ? "no período" : "sem dados"}
          </text>
        </svg>
        <div className={styles.donutLegend}>
          {items.map((item, index) => (
            <button
              key={item.name}
              type="button"
              aria-pressed={index === active}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
            >
              <i style={{ background: colors[index % colors.length] }} />
              <span>{item.name}</span>
              <strong>{item.value.toLocaleString("pt-BR")}</strong>
              <small>
                {total
                  ? ((item.value / total) * 100).toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                    })
                  : "0"}
                %
              </small>
            </button>
          ))}
        </div>
      </div>
      {selected && total > 0 && (
        <p className={styles.note}>
          {selected.name}: {selected.value.toLocaleString("pt-BR")} de{" "}
          {total.toLocaleString("pt-BR")}.
        </p>
      )}
    </section>
  );
}
