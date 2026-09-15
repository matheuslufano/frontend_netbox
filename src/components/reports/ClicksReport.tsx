"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FiDownload,
  FiCheckCircle,
  FiCopy,
  FiExternalLink,
  FiFilter,
  FiGlobe,
  FiLink,
  FiMousePointer,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { BsMegaphoneFill } from "react-icons/bs";
import {
  Campaign,
  ClickFilters,
  ClickMetrics,
  ClickRankingItem,
  ClickRecord,
  ClickTimelineItem,
  LinkItem,
  WhatsAppLinkItem,
  exportarCliques,
  getApiErrorMessage,
  listarAfiliados,
  listarCampanhas,
  listarLinks,
  listarLinksWhatsApp,
  listarCliques,
  apagarLink,
  obterClique,
  obterMetricasCliques,
  obterRankingCliques,
  obterTimelineCliques,
} from "@/lib/api";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";
import {
  EmptyState,
  ReportHeader,
  ReportKpiCard,
  ReportSection,
  reportStyles as styles,
} from "./ReportsUi";

const defaults: ClickFilters = { limit: 20, order: "desc", sort: "createdAt" };
const dateInput = (date: Date) => date.toISOString().slice(0, 10);
const formatNumber = new Intl.NumberFormat("pt-BR");
const formatDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default function ClicksReport() {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const [filters, setFilters] = useState<ClickFilters>(() => ({
    ...defaults,
    ...Object.fromEntries(query.entries()),
  }));
  const [data, setData] = useState<ClickRecord[]>([]);
  const [metrics, setMetrics] = useState<ClickMetrics | null>(null);
  const [timeline, setTimeline] = useState<ClickTimelineItem[]>([]);
  const [ranking, setRanking] = useState<ClickRankingItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [affiliates, setAffiliates] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [campaigns, setCampaigns] = useState<Campaign[]>(
    [],
  );
  const [individualLinks, setIndividualLinks] = useState<LinkItem[]>([]);
  const [whatsappLinks, setWhatsappLinks] = useState<WhatsAppLinkItem[]>([]);
  const campaignOptions = useMemo(
    () =>
      campaigns
        .filter(
          (campaign) =>
            !filters.affiliateId ||
            campaign.links.some(
              (link) => link.affiliate?.id === Number(filters.affiliateId),
            ),
        )
        .map((campaign) => ({ id: campaign.id, name: campaign.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [campaigns, filters.affiliateId],
  );
  const linkOptions = useMemo(
    () =>
      [
        ...individualLinks
          .filter(
            (link) =>
              !link.campaignId &&
              !/netbox/i.test(link.originalUrl) &&
              (!filters.affiliateId ||
                link.affiliate?.id === Number(filters.affiliateId)),
          )
          .map((link) => ({
            id: link.id,
            name: link.name?.trim() || link.shortCode,
          })),
        ...whatsappLinks
          .filter(
            (link) =>
              !filters.affiliateId ||
              link.affiliate?.id === Number(filters.affiliateId),
          )
          .map((link) => ({
            id: link.link.id,
            name: link.name?.trim() || `WhatsApp - ${link.whatsappNumber}`,
          })),
      ]
        .filter(
          (link, index, options) =>
            options.findIndex((item) => item.id === link.id) === index,
        )
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [filters.affiliateId, individualLinks, whatsappLinks],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<
    (ClickRecord & Record<string, unknown>) | null
  >(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<number | null>(null);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const request = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(filters).filter(
          ([, value]) => value !== "" && value !== undefined,
        ),
      ),
    [filters],
  );
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // O ranking permanece global para que o usuário possa trocar de afiliado
      // sem perder as demais opções. Os demais painéis usam o filtro selecionado.
      const rankingRequest = { ...request };
      delete rankingRequest.affiliateId;
      const [list, nextMetrics, nextTimeline, nextRanking] = await Promise.all([
        listarCliques(request),
        obterMetricasCliques(request),
        obterTimelineCliques({ ...request, group: "day" }),
        obterRankingCliques(rankingRequest),
      ]);
      setData(list.data);
      setPagination(list.pagination);
      setMetrics(nextMetrics);
      setTimeline(nextTimeline);
      setRanking(nextRanking);
    } catch (reason) {
      setError(
        getApiErrorMessage(
          reason,
          "Não foi possível carregar o relatório de cliques.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [request]);
  const refreshFromEvent = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    if (realtimeRefreshTimerRef.current !== null) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }
    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      void refresh();
    }, 250);
  }, [refresh]);
  useRealtimeEvents(refreshFromEvent);
  useEffect(
    () => () => {
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
    },
    [],
  );
  useEffect(() => {
    Promise.all([
      listarAfiliados(),
      listarCampanhas(),
      listarLinks(),
      listarLinksWhatsApp(),
    ])
      .then(([a, c, links, whatsapp]) => {
        setAffiliates(a.map(({ id, name }) => ({ id, name })));
        setCampaigns(c);
        setIndividualLinks(links);
        setWhatsappLinks(whatsapp);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(refresh, filters.search ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [filters.search, refresh]);
  const change = (name: keyof ClickFilters, value: string | number) =>
    setFilters((current) => {
      const next = {
        ...current,
        [name]: value || undefined,
        page: 1,
      };

      if (name === "affiliateId" && value && current.trackingLinkId) {
        const linkBelongsToAffiliate = campaigns
          .flatMap((campaign) => campaign.links || [])
          .some(
            (link) =>
              String(link.id) === String(current.trackingLinkId) &&
              link.affiliate?.id === Number(value),
          );

        if (!linkBelongsToAffiliate) next.trackingLinkId = undefined;
      }

      if (name === "affiliateId" && value && current.campaignId) {
        const campaignBelongsToAffiliate = campaigns.some(
          (campaign) =>
            String(campaign.id) === String(current.campaignId) &&
            campaign.links.some((link) => link.affiliate?.id === Number(value)),
        );

        if (!campaignBelongsToAffiliate) next.campaignId = undefined;
      }

      return next;
    });
  const apply = () => {
    const next = new URLSearchParams(
      Object.entries(filters)
        .filter(([, value]) => value !== "" && value !== undefined)
        .map(([key, value]) => [key, String(value)]),
    );
    router.replace(`${pathname}?${next.toString()}`);
    refresh();
  };
  const clear = () => {
    setFilters(defaults);
    router.replace(pathname);
  };
  const selectAffiliate = (affiliateId: number) => {
    const linkBelongsToAffiliate = campaigns
      .flatMap((campaign) => campaign.links || [])
      .some(
        (link) =>
          String(link.id) === String(filters.trackingLinkId) &&
          link.affiliate?.id === affiliateId,
      );
    const campaignBelongsToAffiliate = campaigns.some(
      (campaign) =>
        String(campaign.id) === String(filters.campaignId) &&
        campaign.links.some((link) => link.affiliate?.id === affiliateId),
    );
    const nextFilters = {
      ...filters,
      affiliateId: String(affiliateId),
      trackingLinkId: linkBelongsToAffiliate ? filters.trackingLinkId : undefined,
      campaignId: campaignBelongsToAffiliate ? filters.campaignId : undefined,
      page: 1,
    };
    setFilters(nextFilters);
    const next = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => value !== "" && value !== undefined).map(([key, value]) => [key, String(value)]));
    router.replace(`${pathname}?${next.toString()}`);
  };
  const open = async (click: ClickRecord) => {
    setDrawerLoading(true);
    setSelected(click);
    try {
      setSelected(await obterClique(click.id));
    } catch (reason) {
      setError(
        getApiErrorMessage(reason, "Não foi possível carregar o detalhe."),
      );
    } finally {
      setDrawerLoading(false);
    }
  };
  const completeAction = (id: number) => {
    setActionFeedback(id);
    window.setTimeout(() => setActionFeedback((current) => current === id ? null : current), 900);
  };
  const openOriginal = (click: ClickRecord) => {
    window.open(click.link.originalUrl, "_blank", "noopener,noreferrer");
    completeAction(click.id);
  };
  const copyPromo = async (click: ClickRecord) => {
    try {
      await navigator.clipboard.writeText(click.link.promoLink);
      completeAction(click.id);
    } catch {
      setError("Não foi possível copiar o link de divulgação.");
    }
  };
  const removeLink = async (click: ClickRecord) => {
    if (!window.confirm("Apagar este link e o histórico de cliques associado?")) return;
    try {
      await apagarLink(click.link.id);
      setData((current) => current.filter((item) => item.link.id !== click.link.id));
      completeAction(click.id);
      window.setTimeout(() => void refresh(), 900);
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Não foi possível apagar o link."));
    }
  };
  const exportReport = async (format: "csv" | "xlsx") => {
    try {
      const blob = await exportarCliques(request, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-links-clicados.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(
        getApiErrorMessage(reason, "Não foi possível exportar os dados."),
      );
    }
  };
  const sources = [
    ...new Set(data.map((item) => item.source).filter(Boolean)),
  ] as string[];
  const cities = [
    ...new Set(data.map((item) => item.geoCity).filter(Boolean)),
  ] as string[];

  return (
    <main className={styles.page}>
      <div className={styles.surface}>
        <div className={styles.clicksHeader}>
          <ReportHeader
            title="Relatório de Links Clicados"
            subtitle="Acompanhe cliques, parâmetros, afiliados e desempenho dos links em tempo real."
            current="Links clicados"
          />
          <details className={styles.exportMenu}>
            <summary>
              <FiDownload /> Exportar relatório
            </summary>
            <div>
              <button onClick={() => exportReport("csv")}>Exportar CSV</button>
              <button onClick={() => exportReport("xlsx")}>
                Exportar XLSX
              </button>
            </div>
          </details>
        </div>
        <div className={styles.clickFilters}>
          <label>
            Início
            <input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => change("startDate", e.target.value)}
            />
          </label>
          <label>
            Fim
            <input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => change("endDate", e.target.value)}
            />
          </label>
          <Select
            label="Status"
            value={filters.status || ""}
            onChange={(value) => change("status", value)}
            options={[
              { id: "valid", name: "Válido" },
              { id: "invalid", name: "Inválido" },
              { id: "suspected", name: "Suspeito" },
              { id: "converted", name: "Convertido" },
              { id: "not-converted", name: "Não convertido" },
            ]}
          />
          <Select
            label="Origem"
            value={filters.source || ""}
            onChange={(value) => change("source", value)}
            options={sources.map((name) => ({ id: name, name }))}
          />
          <Select
            label="Dispositivo"
            value={filters.deviceType || ""}
            onChange={(value) => change("deviceType", value)}
            options={["mobile", "desktop", "tablet", "other"].map((name) => ({
              id: name,
              name,
            }))}
          />
          <Select
            label="Cidade"
            value={filters.geoCity || ""}
            onChange={(value) => change("geoCity", value)}
            options={cities.map((name) => ({ id: name, name }))}
          />
          <div className={styles.clickFilterActions}>
            <button className={styles.primaryAction} onClick={apply}>
              <FiFilter /> Filtrar
            </button>
            <button className={styles.secondaryAction} onClick={clear}>
              Limpar
            </button>
          </div>
        </div>
        <div className={styles.quickPeriods}>
          <button
            onClick={() => {
              const end = new Date();
              const start = new Date();
              start.setDate(end.getDate() - 6);
              setFilters((f) => ({
                ...f,
                startDate: dateInput(start),
                endDate: dateInput(end),
                page: 1,
              }));
            }}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => {
              const end = new Date();
              const start = new Date();
              start.setDate(end.getDate() - 29);
              setFilters((f) => ({
                ...f,
                startDate: dateInput(start),
                endDate: dateInput(end),
                page: 1,
              }));
            }}
          >
            Últimos 30 dias
          </button>
          <button onClick={refresh} aria-label="Atualizar relatório">
            <FiRefreshCw /> Atualizar
          </button>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.kpiGrid}>
          <ReportKpiCard
            label="Total de cliques"
            value={formatNumber.format(metrics?.totalClicks || 0)}
            hint={
              metrics?.previousPeriodComparison == null
                ? "Sem comparação"
                : `${metrics.previousPeriodComparison >= 0 ? "↑" : "↓"} ${Math.abs(metrics.previousPeriodComparison).toFixed(1)}% vs. período anterior`
            }
            icon={FiMousePointer}
          />
          <ReportKpiCard
            label="Links ativos"
            value={metrics?.activeLinks || 0}
            hint={`${metrics?.activeLinks || 0} de ${metrics?.totalLinks || 0} cadastrados`}
            icon={FiFilter}
          />
          <ReportKpiCard
            label="Afiliados com cliques"
            value={metrics?.affiliatesWithClicks || 0}
            hint="No período selecionado"
            icon={FiMousePointer}
          />
          <ReportKpiCard
            label="Taxa de conversão"
            value={`${(metrics?.conversionRate || 0).toFixed(1)}%`}
            hint="Conversões / cliques válidos"
            icon={FiFilter}
          />
          <ReportKpiCard
            label="Cliques no WhatsApp"
            value={metrics?.whatsappClicks || 0}
            hint={`${(metrics?.whatsappPercentage || 0).toFixed(1)}% do total`}
            icon={FiMousePointer}
          />
        </div>
        <div className={styles.clickInsights}>
          <ReportSection title="Tendência de cliques por dia">
            <Timeline rows={timeline} />
          </ReportSection>
          <ReportSection title="Ranking de afiliados (por cliques)">
            <div className={styles.clickRanking}>
              {ranking.slice(0, 5).map((row, index) => (
                <button type="button" className={styles.clickRankingRow} key={row.affiliateId} onClick={() => selectAffiliate(row.affiliateId)} aria-label={`Filtrar cliques de ${row.affiliateName}`}>
                  <b>{index + 1}º</b>
                  {row.avatar ? <img className={styles.clickRankingAvatar} src={row.avatar} alt="" /> : <span className={styles.clickRankingAvatar}>{row.affiliateName.slice(0, 1).toUpperCase()}</span>}
                  <span>{row.affiliateName}</span>
                  <strong>{formatNumber.format(row.clicks)}</strong>
                  <i style={{ width: `${Math.min(100, row.percentage)}%` }} />
                </button>
              ))}
              {!ranking.length && <EmptyState />}
            </div>
          </ReportSection>
        </div>
        <ReportSection
          title={`Lista de cliques dos últimos (${formatNumber.format(pagination.total)}) registros encontrados:`}
        >
          <div className={styles.clickTableTools}>
            <input
              value={filters.search || ""}
              onChange={(event) => change("search", event.target.value)}
              placeholder="Buscar por ID, afiliado, link, campanha..."
              aria-label="Buscar cliques"
            />
            <Select
              label="Nome do afiliado"
              value={filters.affiliateId || ""}
              onChange={(value) => change("affiliateId", value)}
              options={affiliates}
            />
            <Select
              label="Nome do link"
              value={filters.trackingLinkId || ""}
              onChange={(value) => change("trackingLinkId", value)}
              options={linkOptions}
            />
            <Select
              label="Campanha"
              value={filters.campaignId || ""}
              onChange={(value) => change("campaignId", value)}
              options={campaignOptions}
            />
            <button type="button" className={styles.columnsButton}>
              ▥ Colunas
            </button>
            <Select
              label="Itens"
              value={String(filters.limit || 20)}
              onChange={(value) => change("limit", value)}
              options={[20, 50, 100, 200].map((id) => ({
                id,
                name: String(id),
              }))}
            />
          </div>
          {loading ? (
            <div className={styles.loading}>Carregando cliques...</div>
          ) : data.length ? (
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.clicksTable}`}>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Data e hora</th>
                    <th>Campanha</th>
                    <th>Cliques</th>
                    <th>Afiliado</th>
                    <th>Cód. afiliado</th>
                    <th>Destino</th>
                    <th>Origem</th>
                    <th>Medium</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((click) => (
                    <tr
                      key={click.id}
                      tabIndex={0}
                      onClick={() => open(click)}
                      onKeyDown={(event) =>
                        event.key === "Enter" && open(click)
                      }
                    >
                      <td><LinkTypeBadge type={click.link.linkType} /></td>
                      <td>{formatDate.format(new Date(click.clickedAt))}</td>
                      <td>{click.link.campaign?.name || "—"}</td>
                      <td>{click.link.clickPosition ? `${click.link.clickPosition}º` : "—"}</td>
                      <td>{click.link.affiliate?.name || "—"}</td>
                      <td>
                        {click.link.affiliate
                          ? `AFI${String(click.link.affiliate.id).padStart(3, "0")}`
                          : "—"}
                      </td>
                      <td
                        title={click.destinationUrl || click.link.originalUrl}
                      >
                        {formatDestination(click.destinationUrl || click.link.originalUrl)}
                      </td>
                      <td>{click.source || "Direto"}</td>
                      <td>{click.utmMedium || "—"}</td>
                      <td className={styles.linkActions} onClick={(event) => event.stopPropagation()}>
                        <button type="button" title="Abrir destino original" aria-label="Abrir destino original" onClick={() => openOriginal(click)}><FiExternalLink aria-hidden="true" /></button>
                        <button type="button" title="Copiar link de divulgação" aria-label="Copiar link de divulgação" onClick={() => void copyPromo(click)}><FiCopy aria-hidden="true" /></button>
                        <button type="button" title="Apagar link" aria-label="Apagar link" onClick={() => void removeLink(click)}><FiTrash2 aria-hidden="true" /></button>
                        {actionFeedback === click.id && <span className={styles.actionSuccess} role="status"><FiCheckCircle aria-hidden="true" /> Concluído</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState text="Nenhum clique encontrado para os filtros selecionados." />
          )}
          <div className={styles.clickPagination}>
            <button
              disabled={pagination.page <= 1}
              onClick={() => change("page", pagination.page - 1)}
            >
              Anterior
            </button>
            <span>
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => change("page", pagination.page + 1)}
            >
              Próxima
            </button>
          </div>
        </ReportSection>
        {selected && (
          <ClickDrawer
            click={selected}
            loading={drawerLoading}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </main>
  );
}

function LinkTypeBadge({ type }: { type: ClickRecord["link"]["linkType"] }) {
  const meta = type === "whatsapp"
    ? { label: "WhatsApp", Icon: FaWhatsapp }
    : type === "campaign"
      ? { label: "Campanha", Icon: BsMegaphoneFill }
      : type === "official"
        ? { label: "Site oficial Netbox", Icon: FiGlobe }
        : { label: "Individual", Icon: FiLink };
  const Icon = meta.Icon;
  return <span className={`${styles.linkTypeBadge} ${styles[`linkTypeBadge${type.charAt(0).toUpperCase()}${type.slice(1)}`]}`} title={meta.label} aria-label={meta.label}><Icon aria-hidden="true" /></span>;
}

function formatDestination(destination: string | null | undefined) {
  const value = destination?.trim();
  if (!value) return "—";

  const phone = getWhatsAppPhone(value);
  return phone || value;
}

function getWhatsAppPhone(destination: string) {
  if (!/whatsapp\.com|wa\.me/i.test(destination)) return null;

  let rawPhone = "";
  try {
    const url = new URL(destination);
    rawPhone = url.searchParams.get("phone") || "";
    if (!rawPhone && /(^|\.)wa\.me$/i.test(url.hostname)) {
      rawPhone = url.pathname.split("/").filter(Boolean)[0] || "";
    }
  } catch {
    rawPhone = destination.match(/(?:phone=|wa\.me\/)([^&?#]+)/i)?.[1] || "";
  }

  const digits = decodeURIComponent(rawPhone).replace(/\D/g, "");
  if (!digits) return null;

  const national = digits.startsWith("55") && [12, 13].includes(digits.length)
    ? digits.slice(2)
    : digits;
  if (![10, 11].includes(national.length)) return digits;

  const area = national.slice(0, 2);
  const subscriber = national.slice(2);
  const split = national.length === 11 ? 5 : 4;
  return `(${area}) ${subscriber.slice(0, split)}-${subscriber.slice(split)}`;
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string | number; name: string }[];
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Timeline({ rows }: { rows: ClickTimelineItem[] }) {
  if (!rows.length) return <EmptyState />;
  const width = 760;
  const height = 180;
  const padding = 22;
  const max = Math.max(1, ...rows.map((row) => row.clicks));
  const points = rows.map((row, index) => ({
    ...row,
    x: padding + (index * (width - padding * 2)) / Math.max(1, rows.length - 1),
    y: height - padding - (row.clicks / max) * (height - padding * 2),
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`;
  return (
    <div className={styles.clickTimelineLine}>
      <div className={styles.chartYAxis} aria-hidden="true">
        {[max, Math.round(max * 0.66), Math.round(max * 0.33), 0].map((value) => (
          <span key={value}>{formatNumber.format(value)}</span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Tendência de cliques por dia"
        preserveAspectRatio="none"
      >
        {[0, 1, 2, 3].map((lineIndex) => (
          <line
            key={lineIndex}
            x1={padding}
            x2={width - padding}
            y1={padding + lineIndex * 42}
            y2={padding + lineIndex * 42}
            className={styles.chartGridLine}
          />
        ))}
        <polygon points={area} className={styles.chartArea} />
        <polyline points={line} className={styles.chartLine} />
        {points.map((point) => (
          <circle
            key={point.date}
            cx={point.x}
            cy={point.y}
            r="3"
            className={styles.chartPoint}
          >
            <title>{`${point.date}: ${point.clicks} cliques`}</title>
          </circle>
        ))}
      </svg>
      <div className={styles.chartLabels}>
        {points
          .filter(
            (_, index) =>
              index % Math.max(1, Math.ceil(points.length / 18)) === 0,
          )
          .map((point) => (
            <span key={point.date}>
              {point.date.slice(8, 10)}/{point.date.slice(5, 7)}
            </span>
          ))}
      </div>
    </div>
  );
}
function ClickDrawer({
  click,
  loading,
  onClose,
}: {
  click: ClickRecord & Record<string, unknown>;
  loading: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState("Detalhes");
  const copy = (value: string) => navigator.clipboard?.writeText(value);
  return (
    <aside
      className={styles.clickDrawer}
      role="dialog"
      aria-modal="true"
      aria-label="Detalhes do clique"
    >
      <header>
        <strong>Detalhes do clique</strong>
        <button onClick={onClose} aria-label="Fechar detalhes">
          <FiX />
        </button>
      </header>
      <div className={styles.drawerIdentity}>
        <div>
          <strong>{click.clickCode}</strong>
          <span>{formatDate.format(new Date(click.clickedAt))}</span>
        </div>
        <b>{click.status}</b>
      </div>
      {loading ? (
        <div className={styles.loading}>Carregando detalhes...</div>
      ) : (
        <>
          <nav>
            {["Detalhes", "UTM", "Funil", "Técnico"].map((item) => (
              <button
                key={item}
                className={tab === item ? styles.drawerTabActive : ""}
                onClick={() => setTab(item)}
              >
                {item === "UTM" ? "Parâmetros UTM" : item}
              </button>
            ))}
          </nav>
          {tab === "Detalhes" && (
            <dl>
              <dt>Link completo</dt>
              <dd>
                <button onClick={() => copy(click.link.originalUrl)}>
                  {click.link.originalUrl}
                </button>
              </dd>
              <dt>URL curta</dt>
              <dd>
                <button onClick={() => copy(click.link.shortCode)}>
                  {click.link.shortCode}
                </button>
              </dd>
              <dt>Destino</dt>
              <dd>{click.destinationUrl || click.link.originalUrl}</dd>
              <dt>Referrer</dt>
              <dd>{click.referrer || "Direto"}</dd>
              <dt>Afiliado</dt>
              <dd>{click.link.affiliate?.name || "Não atribuído"}</dd>
              <dt>Campanha</dt>
              <dd>{click.link.campaign?.name || "Sem campanha"}</dd>
              <dt>Telefone do lead</dt>
              <dd>
                {click.conversions[0]?.visitorPhone || "Não identificado"}
              </dd>
              <dt>Status no funil</dt>
              <dd>
                <span className={styles.drawerFunnelStatus}>
                  {click.conversions.length
                    ? "Convertido"
                    : "Clique registrado"}
                </span>
              </dd>
            </dl>
          )}
          {tab === "UTM" && (
            <dl>
              <dt>utm_source</dt>
              <dd>{click.utmSource || "—"}</dd>
              <dt>utm_medium</dt>
              <dd>{click.utmMedium || "—"}</dd>
              <dt>utm_campaign</dt>
              <dd>{click.utmCampaign || "—"}</dd>
              <dt>Origem</dt>
              <dd>{click.source || "—"}</dd>
            </dl>
          )}
          {tab === "Funil" && (
            <ol className={styles.funnelSteps}>
              <li>✓ Clique</li>
              <li>✓ Redirecionamento</li>
              <li className={click.conversions.length ? styles.funnelDone : ""}>
                {click.conversions.length ? "✓" : "○"} Lead / conversão
              </li>
            </ol>
          )}
          {tab === "Técnico" && (
            <dl>
              <dt>Dispositivo</dt>
              <dd>{click.deviceType || "—"}</dd>
              <dt>Cidade</dt>
              <dd>{click.geoCity || "—"}</dd>
              <dt>Estado</dt>
              <dd>{click.geoRegion || "—"}</dd>
              <dt>Click ID</dt>
              <dd>{click.clickCode}</dd>
              <dt>Data UTC</dt>
              <dd>{click.clickedAt}</dd>
            </dl>
          )}
        </>
      )}
    </aside>
  );
}
