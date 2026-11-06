"use client";
import { useEffect, useState } from "react";
import {
  LuArrowLeft,
  LuCalendarDays,
  LuChartNoAxesCombined,
  LuList,
  LuRefreshCw,
} from "react-icons/lu";
import { getApiErrorMessage } from "@/lib/api";
import { getAnalytics } from "../../analytics/api";
import type { AnalyticsReport } from "../../analytics/types";
import AnalyticsMetrics from "./AnalyticsMetrics";
import AnalyticsLineChart from "./AnalyticsLineChart";
import AnalyticsDonut from "./AnalyticsDonut";
import AnalyticsTable from "./AnalyticsTable";
import styles from "./Analytics.module.css";

function today() {
  return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
}
function ago(days: number) {
  return new Date(Date.parse(today() + "T12:00:00Z") - (days - 1) * 86400000)
    .toISOString()
    .slice(0, 10);
}
const date = (value: string) =>
  new Date(value + "T12:00:00Z").toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
export default function AnalyticsDashboard() {
  const [preset, setPreset] = useState("7");
  const [start, setStart] = useState(() => ago(7)),
    [end, setEnd] = useState(today);
  const [compare, setCompare] = useState(true),
    [mode, setMode] = useState<"overview" | "articles">("overview");
  const [selected, setSelected] = useState("");
  const [data, setData] = useState<AnalyticsReport | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      if (!start || !end || start > end || end > today()) {
        setError("Informe um intervalo válido, sem datas futuras.");
        setLoading(false);
        return;
      }
      getAnalytics(
        { start, end, ...(selected ? { articleId: selected } : {}) },
        controller.signal,
      )
        .then((result) => {
          if (!controller.signal.aborted) setData(result);
        })
        .catch((reason) => {
          if (!controller.signal.aborted)
            setError(
              getApiErrorMessage(
                reason,
                "Não foi possível carregar o desempenho.",
              ),
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [start, end, selected, refresh]);
  const pending =
    loading ||
    Boolean(
      data &&
      (data.period.start !== start ||
        data.period.end !== end ||
        (data.selectedArticle?.id || "") !== selected),
    );
  const summary = mode === "overview" || Boolean(selected);
  const empty =
    data &&
    data.metrics.views.value +
      data.metrics.shares.value +
      data.metrics.trailers.value +
      data.metrics.continuations.value ===
      0;
  return (
    <div className={styles.analytics}>
      <header className={styles.heading}>
        <div>
          <small>INTELIGÊNCIA EDITORIAL</small>
          <h1>Desempenho do Blog</h1>
          <p>Audiência e interações registradas nos artigos.</p>
        </div>
        <button
          type="button"
          className={styles.button}
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          <LuRefreshCw aria-hidden="true" />
          Atualizar
        </button>
      </header>
      <section className={styles.period} aria-label="Período de análise">
        <label>
          <LuCalendarDays aria-hidden="true" />
          <span className={styles.srOnly}>Período</span>
          <select
            value={preset}
            onChange={(event) => {
              const value = event.target.value;
              setPreset(value);
              if (value !== "custom") {
                setStart(ago(Number(value)));
                setEnd(today());
              }
            }}
          >
            {[7, 15, 30, 90].map((days) => (
              <option key={days} value={days}>
                Últimos {days} dias
              </option>
            ))}
            <option value="custom">Personalizado</option>
          </select>
        </label>
        {preset === "custom" && (
          <>
            <label>
              De
              <input
                type="date"
                value={start}
                max={end || today()}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={end}
                min={start}
                max={today()}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </>
        )}
        <span>
          {start && end
            ? `${date(start)} a ${date(end)}`
            : "Selecione as datas"}
        </span>
        <label className={styles.compare}>
          <input
            type="checkbox"
            checked={compare}
            onChange={(event) => setCompare(event.target.checked)}
          />
          Comparar período anterior
        </label>
      </section>
      <div
        className={styles.segment}
        role="group"
        aria-label="Visualização de desempenho"
      >
        <button
          type="button"
          aria-pressed={mode === "overview"}
          onClick={() => {
            setMode("overview");
            setSelected("");
          }}
        >
          <LuChartNoAxesCombined aria-hidden="true" />
          Visão geral
        </button>
        <button
          type="button"
          aria-pressed={mode === "articles"}
          onClick={() => setMode("articles")}
        >
          <LuList aria-hidden="true" />
          Por artigo
        </button>
      </div>
      {selected && (
        <div className={styles.detailHeading}>
          <button
            type="button"
            className={styles.button}
            onClick={() => setSelected("")}
          >
            <LuArrowLeft aria-hidden="true" />
            Voltar aos artigos
          </button>
          <h2>{data?.selectedArticle?.title || "Detalhes do artigo"}</h2>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {pending && !error && (
        <div
          className={styles.skeleton}
          role="status"
          aria-label="Carregando indicadores e gráficos"
        >
          <span>Carregando desempenho…</span>
          <div />
          <div />
        </div>
      )}
      {data && !pending && !error && (
        <>
          {compare && (
            <p className={styles.note}>
              Comparação com {date(data.period.previousStart)} a{" "}
              {date(data.period.previousEnd)} · {data.period.timeZone}
            </p>
          )}
          {empty && (
            <p className={styles.empty}>
              Ainda não há eventos registrados neste período. O histórico
              anterior à instalação não é reconstruído.
            </p>
          )}
          {summary && (
            <>
              <AnalyticsMetrics
                data={data}
                compare={compare}
                detail={Boolean(selected)}
              />
              <AnalyticsLineChart data={data.daily} />
              <div className={styles.donutGrid}>
                {!selected && (
                  <AnalyticsDonut
                    title="Visualizações por categoria"
                    items={data.categories}
                  />
                )}
                <AnalyticsDonut
                  title={
                    selected
                      ? "Leitores deste artigo"
                      : "Comportamento dos leitores"
                  }
                  items={[
                    { name: "Apenas um artigo", value: data.readers.single },
                    {
                      name: "Dois ou mais artigos",
                      value: data.readers.multiple,
                    },
                  ]}
                />
              </div>
            </>
          )}
          {selected && (
            <section className={styles.panel}>
              <h2>Artigos acessados depois deste</h2>
              <p className={styles.note}>
                Transições observadas na mesma sessão. Acesso não significa
                leitura completa.
              </p>
              {data.navigation.length ? (
                <div className={styles.tableScroll}>
                  <table>
                    <thead>
                      <tr>
                        <th>Artigo de destino</th>
                        <th>Visitantes</th>
                        <th>Navegações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.navigation.map((row) => (
                        <tr key={row.id}>
                          <td>{row.title}</td>
                          <td>{row.visitors.toLocaleString("pt-BR")}</td>
                          <td>{row.events.toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.empty}>
                  Nenhuma continuação de navegação registrada neste período.
                </p>
              )}
            </section>
          )}
        </>
      )}
      {data && (
        <div hidden={Boolean(selected) || pending || Boolean(error)}>
          <AnalyticsTable
            articles={data.articles}
            onSelect={(id) => {
              setMode("articles");
              setSelected(id);
            }}
          />
        </div>
      )}
      {data && !error && (
        <footer className={styles.dataNote}>
          <p>
            Atualizado em {new Date(data.updatedAt).toLocaleString("pt-BR")} ·
            Eventos retidos por {data.tracking.retentionDays} dias.
            {data.tracking.firstEventAt &&
              ` Primeiro evento registrado em ${new Date(data.tracking.firstEventAt).toLocaleDateString("pt-BR")}.`}
          </p>
          <p>
            Visitantes são identificadores deste navegador com consentimento,
            não pessoas identificadas. Compartilhamentos contam acionamentos;
            trailers contam somente inícios confirmados pela API do YouTube.
            Bloqueadores e recusas de consentimento reduzem a cobertura.
            “Múltiplos artigos” não indica leitura completa.
          </p>
        </footer>
      )}
    </div>
  );
}
