import {
  LuArrowDownRight,
  LuArrowUpRight,
  LuArrowRight,
  LuEye,
  LuPlay,
  LuRepeat2,
  LuShare2,
  LuUsers,
  LuWaypoints,
} from "react-icons/lu";
import type { AnalyticsReport, MetricKey } from "../../analytics/types";
import styles from "./Analytics.module.css";
const format = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
export default function AnalyticsMetrics({
  data,
  compare,
  detail,
}: {
  data: AnalyticsReport;
  compare: boolean;
  detail: boolean;
}) {
  const items = [
    { key: "visitors", label: "Visitantes únicos", Icon: LuUsers },
    { key: "views", label: "Visualizações", Icon: LuEye },
    { key: "shares", label: "Compartilhamentos", Icon: LuShare2 },
    { key: "trailers", label: "Trailers iniciados", Icon: LuPlay },
    {
      key: "multiReaders",
      label: "Leitores de múltiplos artigos",
      Icon: LuRepeat2,
    },
    detail
      ? {
          key: "continuations",
          label: "Seguiram para outro artigo",
          Icon: LuWaypoints,
        }
      : {
          key: "multiRate",
          label: "Taxa de leitura múltipla",
          Icon: LuWaypoints,
        },
  ] as const;
  return (
    <div className={styles.metrics}>
      {items.map(({ key, label, Icon }) => {
        const metric = data.metrics[key as MetricKey];
        const change = metric.change;
        return (
          <div className={styles.metric} key={key}>
            <span>
              <Icon aria-hidden="true" />
              {label}
            </span>
            <strong>
              {format.format(metric.value)}
              {key === "multiRate" ? "%" : ""}
            </strong>
            {compare && (
              <small
                data-direction={
                  change === null
                    ? "new"
                    : change > 0
                      ? "up"
                      : change < 0
                        ? "down"
                        : "same"
                }
              >
                {change === null ? (
                  <LuArrowUpRight aria-hidden="true" />
                ) : change > 0 ? (
                  <LuArrowUpRight aria-hidden="true" />
                ) : change < 0 ? (
                  <LuArrowDownRight aria-hidden="true" />
                ) : (
                  <LuArrowRight aria-hidden="true" />
                )}
                {change === null
                  ? "Novo no período"
                  : `${format.format(Math.abs(change))}% ${change < 0 ? "a menos" : change > 0 ? "a mais" : "de variação"}`}
              </small>
            )}
          </div>
        );
      })}
    </div>
  );
}
