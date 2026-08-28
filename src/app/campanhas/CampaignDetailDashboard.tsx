"use client";

import { useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiBarChart2,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiCopy,
  FiDownload,
  FiExternalLink,
  FiFilter,
  FiLink,
  FiMessageCircle,
  FiPhone,
  FiSearch,
  FiTarget,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import {
  Campaign,
  CampaignConversionEvent,
  CampaignLink,
} from "@/lib/api";
import styles from "./campanhas.module.css";

type PeriodKey = "today" | "7d" | "30d" | "month" | "all" | "custom";
type SgpFilter = "all" | "converted" | "negotiation" | "pending" | "lost" | "unverified";
type ChartMetric = "conversions" | "leads" | "whatsapp" | "clicks";

type CustomerRow = CampaignConversionEvent & {
  affiliateId: number | null;
  affiliateName: string;
  linkId: number;
  linkName: string;
  shortCode: string;
  promoLink: string;
};

const STATUS_LABELS: Record<CampaignConversionEvent["status"], string> = {
  WHATSAPP_STARTED: "Abriu o WhatsApp",
  ATTENDANCE_STARTED: "Iniciou atendimento",
  LEAD_IDENTIFIED: "Lead identificado",
  IN_NEGOTIATION: "Em negociação",
  CONVERTED: "Convertido",
  LOST: "Não convertido",
  NOT_IDENTIFIED: "Não identificado",
};

const SGP_LABELS: Record<CampaignConversionEvent["sgpStatus"], string> = {
  CONVERTED: "Convertido",
  AWAITING_CONVERSION: "Aguardando conversão",
  IN_NEGOTIATION: "Em negociação",
  NOT_CONVERTED: "Não convertido",
  NOT_VERIFIED: "Não verificado",
};

export function CampaignDetailDashboard({
  campaign,
  deleting,
  onBack,
  onCopyLink,
  onDelete,
}: {
  campaign: Campaign;
  deleting: boolean;
  onBack: () => void;
  onCopyLink: (link: string) => void;
  onDelete: () => void;
}) {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [affiliateId, setAffiliateId] = useState("all");
  const [city, setCity] = useState("all");
  const [linkId, setLinkId] = useState("all");
  const [source, setSource] = useState("all");
  const [sgpFilter, setSgpFilter] = useState<SgpFilter>("all");
  const [search, setSearch] = useState("");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("conversions");
  const [expandedAffiliateIds, setExpandedAffiliateIds] = useState<Set<number>>(new Set());
  const [showLinks, setShowLinks] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);

  const periodRange = useMemo(
    () => getPeriodRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const allCustomers = useMemo(() => customersFromCampaign(campaign), [campaign]);

  const filteredLinks = useMemo(
    () =>
      campaign.links.filter((link) => {
        if (affiliateId !== "all" && String(link.affiliate?.id) !== affiliateId) return false;
        if (linkId !== "all" && String(link.id) !== linkId) return false;
        return true;
      }),
    [campaign.links, affiliateId, linkId]
  );

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return allCustomers.filter((customer) => {
      if (!dateInRange(customer.convertedAt, periodRange)) return false;
      if (affiliateId !== "all" && String(customer.affiliateId) !== affiliateId) return false;
      if (linkId !== "all" && String(customer.linkId) !== linkId) return false;
      if (city !== "all" && customer.city !== city) return false;
      if (source !== "all" && customer.source !== source) return false;
      if (!matchesSgpFilter(customer, sgpFilter)) return false;
      if (
        normalizedSearch &&
        !normalizeText(
          [customer.customerName, customer.customerPhone, customer.affiliateName, customer.shortCode]
            .filter(Boolean)
            .join(" ")
        ).includes(normalizedSearch)
      ) {
        return false;
      }
      return true;
    });
  }, [allCustomers, periodRange, affiliateId, linkId, city, source, sgpFilter, search]);

  const clickEvents = useMemo(
    () =>
      filteredLinks.flatMap((link) =>
        (link.clickEvents || []).filter(
          (click) =>
            dateInRange(click.clickedAt, periodRange) &&
            (city === "all" || click.city === city) &&
            (source === "all" || click.source === source)
        )
      ),
    [filteredLinks, periodRange, city, source]
  );

  const metrics = useMemo(() => calculateMetrics(clickEvents.length, filteredCustomers), [clickEvents, filteredCustomers]);
  const ranking = useMemo(
    () => buildRanking(filteredLinks, filteredCustomers),
    [filteredLinks, filteredCustomers]
  );
  const chartData = useMemo(
    () => buildChartData(chartMetric, clickEvents, filteredCustomers),
    [chartMetric, clickEvents, filteredCustomers]
  );
  const insights = useMemo(() => buildInsights(metrics, ranking), [metrics, ranking]);

  const cities = uniqueValues(allCustomers.map((item) => item.city));
  const sources = uniqueValues(allCustomers.map((item) => item.source));
  const hasFilters =
    period !== "30d" || affiliateId !== "all" || city !== "all" || linkId !== "all" ||
    source !== "all" || sgpFilter !== "all" || Boolean(search);

  function clearFilters() {
    setPeriod("30d");
    setCustomStart("");
    setCustomEnd("");
    setAffiliateId("all");
    setCity("all");
    setLinkId("all");
    setSource("all");
    setSgpFilter("all");
    setSearch("");
  }

  function exportReport() {
    const headers = ["Cliente", "Telefone", "Afiliado", "Código", "Status", "Status SGP", "Cidade", "Plano"];
    const rows = filteredCustomers.map((item) => [
      item.customerName,
      item.customerPhone || "",
      item.affiliateName,
      item.shortCode,
      STATUS_LABELS[item.status],
      SGP_LABELS[item.sgpStatus],
      item.city || "",
      item.plan || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${campaign.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-conversoes.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={styles.dashboard}>
      <header className={styles.dashboardHeader}>
        <div className={styles.headerMain}>
          <button type="button" className={styles.iconBackButton} onClick={onBack} aria-label="Voltar para campanhas">
            <FiArrowLeft aria-hidden="true" />
          </button>
          <div className={styles.campaignIdentity}>
            <div className={styles.eyebrow}>Painel de performance da campanha</div>
            <h1>{campaign.name}</h1>
            <div className={styles.campaignMeta}>
              <span className={styles.neutralBadge}>Status não cadastrado</span>
              <span>Criada em {formatDate(campaign.createdAt)}</span>
              <span>{campaign.totalAffiliates} afiliados</span>
              <span>{cities.length ? cities.join(", ") : "Região não informada"}</span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => onCopyLink(campaign.destinationUrl)}>
            <FiCopy aria-hidden="true" /> Copiar destino
          </button>
          <button type="button" className={styles.secondaryButton} onClick={exportReport}>
            <FiDownload aria-hidden="true" /> Exportar
          </button>
          <button type="button" className={styles.dangerGhostButton} onClick={onDelete} disabled={deleting}>
            {deleting ? "Apagando..." : "Apagar"}
          </button>
        </div>
      </header>

      <FilterBar
        period={period}
        setPeriod={setPeriod}
        customStart={customStart}
        customEnd={customEnd}
        setCustomStart={setCustomStart}
        setCustomEnd={setCustomEnd}
        affiliateId={affiliateId}
        setAffiliateId={setAffiliateId}
        city={city}
        setCity={setCity}
        linkId={linkId}
        setLinkId={setLinkId}
        source={source}
        setSource={setSource}
        campaign={campaign}
        cities={cities}
        sources={sources}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
      />

      <KpiGrid metrics={metrics} />

      <div className={styles.twoColumnLayout}>
        <Funnel metrics={metrics} onSelectStatus={setSgpFilter} />
        <Highlights ranking={ranking} customers={filteredCustomers} />
      </div>

      <PerformanceChart metric={chartMetric} setMetric={setChartMetric} data={chartData} />

      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>Leitura rápida</span><h2>Insights da campanha</h2></div>
        </div>
        <div className={styles.insightsGrid}>
          {insights.map((insight) => (
            <div key={insight.title} className={styles.insightCard}>
              <span className={styles.insightIcon}>{insight.icon}</span>
              <div><strong>{insight.title}</strong><p>{insight.description}</p></div>
            </div>
          ))}
        </div>
      </section>

      <AffiliateRanking
        ranking={ranking}
        expandedIds={expandedAffiliateIds}
        setExpandedIds={setExpandedAffiliateIds}
        onOpenCustomer={setSelectedCustomer}
      />

      <CustomersTable
        customers={filteredCustomers}
        search={search}
        setSearch={setSearch}
        sgpFilter={sgpFilter}
        setSgpFilter={setSgpFilter}
        onOpenCustomer={setSelectedCustomer}
      />

      <section className={styles.panel}>
        <button type="button" className={styles.collapsibleHeader} onClick={() => setShowLinks((value) => !value)} aria-expanded={showLinks}>
          <span><FiLink aria-hidden="true" /><span><strong>Destino e links da campanha</strong><small>{campaign.destinationUrl}</small></span></span>
          {showLinks ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
        </button>
        {showLinks && (
          <div className={styles.linksTableWrap}>
            <table className={styles.dataTable}>
              <thead><tr><th>Afiliado</th><th>Código</th><th>Link de divulgação</th><th>Cliques</th><th>Ação</th></tr></thead>
              <tbody>
                {campaign.links.map((link) => (
                  <tr key={link.id}>
                    <td><strong>{link.affiliate?.name || "Sem afiliado"}</strong></td>
                    <td><code>{link.shortCode}</code></td>
                    <td><a href={link.promoLink} target="_blank" rel="noreferrer">{link.promoLink}</a></td>
                    <td>{link.clicks}</td>
                    <td><button type="button" className={styles.tableAction} onClick={() => onCopyLink(link.promoLink)}>Copiar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedCustomer && <ConversionDrawer customer={selectedCustomer} campaign={campaign} onClose={() => setSelectedCustomer(null)} />}
    </section>
  );
}

export function CampaignSummaryDashboard({
  campaign,
  onCopyLink,
}: {
  campaign: Campaign;
  onCopyLink: (link: string) => void;
}) {
  const [expandedAffiliateIds, setExpandedAffiliateIds] = useState<Set<number>>(new Set());
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [search, setSearch] = useState("");
  const [sgpFilter, setSgpFilter] = useState<SgpFilter>("all");
  const customers = useMemo(() => customersFromCampaign(campaign), [campaign]);
  const filteredCustomers = useMemo(
    () => customers.filter((customer) => {
      const matchesSearch = !search.trim() || normalizeText(
        [customer.customerName, customer.customerPhone, customer.affiliateName, customer.shortCode]
          .filter(Boolean)
          .join(" ")
      ).includes(normalizeText(search.trim()));
      return matchesSearch && matchesSgpFilter(customer, sgpFilter);
    }),
    [customers, search, sgpFilter]
  );
  const ranking = useMemo(
    () => buildRanking(campaign.links, customers),
    [campaign.links, customers]
  );

  return (
    <div className={styles.dashboard}>
      <AffiliateRanking
        ranking={ranking}
        expandedIds={expandedAffiliateIds}
        setExpandedIds={setExpandedAffiliateIds}
        onOpenCustomer={setSelectedCustomer}
      />

      <section className={styles.panel}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>Destino da divulgação</span><h2>Links da campanha</h2></div>
          <a href={campaign.destinationUrl} target="_blank" rel="noreferrer">{campaign.destinationUrl}</a>
        </div>
        <div className={styles.linksTableWrap}>
          <table className={styles.dataTable}>
            <thead><tr><th>Afiliado</th><th>Código</th><th>Link de divulgação</th><th>Cliques</th><th>Ação</th></tr></thead>
            <tbody>{campaign.links.map((link) => (
              <tr key={link.id}>
                <td><strong>{link.affiliate?.name || "Sem afiliado"}</strong></td>
                <td><code>{link.shortCode}</code></td>
                <td><a href={link.promoLink} target="_blank" rel="noreferrer">{link.promoLink}</a></td>
                <td>{link.clicks}</td>
                <td><button type="button" className={styles.tableAction} onClick={() => onCopyLink(link.promoLink)}>Copiar</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <CustomersTable
        customers={filteredCustomers}
        search={search}
        setSearch={setSearch}
        sgpFilter={sgpFilter}
        setSgpFilter={setSgpFilter}
        onOpenCustomer={setSelectedCustomer}
      />

      {selectedCustomer && (
        <ConversionDrawer
          customer={selectedCustomer}
          campaign={campaign}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
}

function FilterBar(props: {
  period: PeriodKey; setPeriod: (value: PeriodKey) => void;
  customStart: string; customEnd: string; setCustomStart: (value: string) => void; setCustomEnd: (value: string) => void;
  affiliateId: string; setAffiliateId: (value: string) => void; city: string; setCity: (value: string) => void;
  linkId: string; setLinkId: (value: string) => void; source: string; setSource: (value: string) => void;
  campaign: Campaign; cities: string[]; sources: string[]; hasFilters: boolean; clearFilters: () => void;
}) {
  const periodOptions: { value: PeriodKey; label: string }[] = [
    { value: "today", label: "Hoje" }, { value: "7d", label: "7 dias" },
    { value: "30d", label: "30 dias" }, { value: "month", label: "Este mês" },
    { value: "all", label: "Todo período" }, { value: "custom", label: "Personalizado" },
  ];
  return (
    <section className={styles.filterPanel} aria-label="Filtros da campanha">
      <div className={styles.periodTabs}>
        <FiFilter aria-hidden="true" />
        {periodOptions.map((option) => (
          <button key={option.value} type="button" className={props.period === option.value ? styles.periodActive : ""} onClick={() => props.setPeriod(option.value)}>{option.label}</button>
        ))}
      </div>
      {props.period === "custom" && <div className={styles.customDates}><label>De<input type="date" value={props.customStart} onChange={(event) => props.setCustomStart(event.target.value)} /></label><label>Até<input type="date" value={props.customEnd} onChange={(event) => props.setCustomEnd(event.target.value)} /></label></div>}
      <div className={styles.selectFilters}>
        <select value={props.affiliateId} onChange={(event) => props.setAffiliateId(event.target.value)} aria-label="Filtrar por afiliado"><option value="all">Todos os afiliados</option>{props.campaign.links.filter((link) => link.affiliate).map((link) => <option key={link.id} value={link.affiliate!.id}>{link.affiliate!.name}</option>)}</select>
        <select value={props.city} onChange={(event) => props.setCity(event.target.value)} aria-label="Filtrar por cidade"><option value="all">Todas as cidades</option>{props.cities.map((value) => <option key={value}>{value}</option>)}</select>
        <select value={props.linkId} onChange={(event) => props.setLinkId(event.target.value)} aria-label="Filtrar por link"><option value="all">Todos os links</option>{props.campaign.links.map((link) => <option key={link.id} value={link.id}>{link.shortCode} · {link.affiliate?.name || "Sem afiliado"}</option>)}</select>
        <select value={props.source} onChange={(event) => props.setSource(event.target.value)} aria-label="Filtrar por origem"><option value="all">Todas as origens</option>{props.sources.map((value) => <option key={value}>{value}</option>)}</select>
        {props.hasFilters && <button type="button" className={styles.clearButton} onClick={props.clearFilters}><FiX aria-hidden="true" /> Limpar filtros</button>}
      </div>
    </section>
  );
}

function KpiGrid({ metrics }: { metrics: ReturnType<typeof calculateMetrics> }) {
  const cards = [
    { label: "Conversões SGP", value: metrics.conversions, note: "clientes confirmados", icon: <FiCheckCircle />, tone: "success" },
    { label: "Oportunidades abertas", value: metrics.opportunities, note: "leads recuperáveis", icon: <FiTarget />, tone: "warning" },
    { label: "Taxa de conversão", value: `${formatPercent(metrics.conversionRate)}%`, note: "conversões ÷ leads", icon: <FiTrendingUp />, tone: "info" },
    { label: "Leads identificados", value: metrics.leads, note: "com nome ou telefone", icon: <FiUserCheck />, tone: "neutral" },
    { label: "Conversas WhatsApp", value: metrics.whatsapp, note: "aberturas rastreadas", icon: <FiMessageCircle />, tone: "neutral" },
    { label: "Cliques", value: metrics.clicks, note: "métrica de divulgação", icon: <FiBarChart2 />, tone: "muted" },
  ];
  return <div className={styles.kpiGrid}>{cards.map((card) => <article key={card.label} className={`${styles.kpiCard} ${styles[`kpi_${card.tone}`]}`}><div className={styles.kpiIcon}>{card.icon}</div><div><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></div></article>)}</div>;
}

function Funnel({ metrics, onSelectStatus }: { metrics: ReturnType<typeof calculateMetrics>; onSelectStatus: (value: SgpFilter) => void }) {
  const steps = [
    { label: "Cliques", value: metrics.clicks, filter: "all" as SgpFilter },
    { label: "WhatsApp", value: metrics.whatsapp, filter: "all" as SgpFilter },
    { label: "Atendimentos", value: metrics.attendances, filter: "all" as SgpFilter },
    { label: "Leads", value: metrics.leads, filter: "all" as SgpFilter },
    { label: "Oportunidades", value: metrics.opportunities, filter: "pending" as SgpFilter },
    { label: "Convertidos no SGP", value: metrics.conversions, filter: "converted" as SgpFilter },
  ];
  return <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Jornada comercial</span><h2>Funil da campanha</h2></div></div><div className={styles.funnel}>{steps.map((step, index) => { const previous = index ? steps[index - 1].value : step.value; const rate = previous ? (step.value / previous) * 100 : 0; return <button type="button" key={step.label} className={styles.funnelStep} style={{ width: `${Math.max(54, 100 - index * 7)}%` }} onClick={() => onSelectStatus(step.filter)}><span>{step.label}</span><strong>{step.value}</strong>{index > 0 && <small>{formatPercent(rate)}% da etapa anterior</small>}</button>; })}</div></section>;
}

function Highlights({ ranking, customers }: { ranking: ReturnType<typeof buildRanking>; customers: CustomerRow[] }) {
  const best = ranking[0];
  const bestRate = ranking.filter((item) => item.leads >= 3).slice().sort((a, b) => b.rate - a.rate)[0];
  const converted = customers.filter((item) => item.convertedInSgp && item.sgpConvertedAt);
  const averageMs = converted.length ? converted.reduce((sum, item) => { const start = new Date(item.attendanceStartedAt || item.whatsappStartedAt || item.convertedAt).getTime(); const end = new Date(item.sgpConvertedAt!).getTime(); return sum + Math.max(0, end - start); }, 0) / converted.length : null;
  return <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Destaques</span><h2>Resultado comercial</h2></div></div><div className={styles.highlightsGrid}><Highlight label="Melhor afiliado" value={best?.affiliateName || "Sem dados"} detail={best ? `${best.conversions} clientes convertidos` : "Nenhuma conversão"} /><Highlight label="Melhor taxa" value={bestRate ? `${formatPercent(bestRate.rate)}%` : "Sem volume mínimo"} detail={bestRate?.affiliateName || "Mínimo de 3 leads"} /><Highlight label="Tempo médio" value={averageMs === null ? "Não calculável" : formatDuration(averageMs)} detail="atendimento até SGP" /><Highlight label="Melhor link" value={best?.shortCode || "Sem dados"} detail={best ? `${best.conversions} conversões` : "Nenhuma conversão"} /></div></section>;
}

function Highlight({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className={styles.highlight}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>; }

function PerformanceChart({ metric, setMetric, data }: { metric: ChartMetric; setMetric: (value: ChartMetric) => void; data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Evolução diária</span><h2>Performance ao longo do tempo</h2></div><div className={styles.metricTabs}>{(["conversions", "leads", "whatsapp", "clicks"] as ChartMetric[]).map((value) => <button key={value} type="button" className={metric === value ? styles.metricTabActive : ""} onClick={() => setMetric(value)}>{({ conversions: "Conversões", leads: "Leads", whatsapp: "WhatsApp", clicks: "Cliques" })[value]}</button>)}</div></div>{data.length === 0 ? <EmptyState title="Sem atividade neste período" description="Altere o período ou os filtros para consultar outros registros." /> : <div className={styles.barChart}>{data.map((item) => <div key={item.label} className={styles.barColumn}><span className={styles.barValue}>{item.value}</span><div className={styles.barTrack}><div className={styles.barFill} style={{ height: `${Math.max(item.value ? 8 : 0, (item.value / max) * 100)}%` }} /></div><small>{item.label}</small></div>)}</div>}</section>;
}

function AffiliateRanking({ ranking, expandedIds, setExpandedIds, onOpenCustomer }: { ranking: ReturnType<typeof buildRanking>; expandedIds: Set<number>; setExpandedIds: (value: Set<number>) => void; onOpenCustomer: (customer: CustomerRow) => void }) {
  return <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Resultado por parceiro</span><h2>Ranking de conversão dos afiliados</h2></div><span className={styles.sortHint}>Ordenado por conversões</span></div>{ranking.length === 0 ? <EmptyState title="Nenhum afiliado no filtro" description="Limpe os filtros para visualizar o ranking completo." /> : <div className={styles.rankingTable}>{ranking.map((item, index) => { const open = expandedIds.has(item.linkId); return <div key={item.linkId} className={styles.rankingRowGroup}><button type="button" className={styles.rankingRow} onClick={() => { const next = new Set(expandedIds); open ? next.delete(item.linkId) : next.add(item.linkId); setExpandedIds(next); }} aria-expanded={open}><span className={styles.rankPosition}>{index + 1}º</span><span className={styles.rankName}><strong>{item.affiliateName}</strong><small>{item.shortCode}</small></span><RankMetric label="Cliques" value={item.clicks} /><RankMetric label="WhatsApp" value={item.whatsapp} /><RankMetric label="Leads" value={item.leads} /><span className={styles.conversionBadge}>{item.conversions} conversões</span><RankMetric label="Taxa" value={`${formatPercent(item.rate)}%`} />{open ? <FiChevronUp /> : <FiChevronDown />}</button>{open && <div className={styles.affiliateCustomers}>{item.customers.length === 0 ? <p>Nenhum cliente identificado neste período.</p> : item.customers.map((customer) => <button type="button" key={customer.id} onClick={() => onOpenCustomer(customer)}><span><strong>{customer.customerName}</strong><small>{formatPhone(customer.customerPhone)}</small></span><StatusBadge customer={customer} /></button>)}</div>}</div>; })}</div>}</section>;
}

function RankMetric({ label, value }: { label: string; value: string | number }) { return <span className={styles.rankMetric}><small>{label}</small><strong>{value}</strong></span>; }

function CustomersTable({ customers, search, setSearch, sgpFilter, setSgpFilter, onOpenCustomer }: { customers: CustomerRow[]; search: string; setSearch: (value: string) => void; sgpFilter: SgpFilter; setSgpFilter: (value: SgpFilter) => void; onOpenCustomer: (customer: CustomerRow) => void }) {
  const tabs: { value: SgpFilter; label: string }[] = [{ value: "all", label: "Todos" }, { value: "converted", label: "Convertidos" }, { value: "negotiation", label: "Em negociação" }, { value: "pending", label: "Aguardando" }, { value: "lost", label: "Não convertidos" }, { value: "unverified", label: "Não verificados" }];
  return <section className={styles.panel}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>Evidências da campanha</span><h2>Clientes e conversões</h2></div><strong className={styles.resultCount}>{customers.length} registros</strong></div><div className={styles.customerToolbar}><div className={styles.statusTabs}>{tabs.map((tab) => <button key={tab.value} type="button" className={sgpFilter === tab.value ? styles.statusTabActive : ""} onClick={() => setSgpFilter(tab.value)}>{tab.label}</button>)}</div><label className={styles.customerSearch}><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, telefone, afiliado ou código" /></label></div>{customers.length === 0 ? <EmptyState title="Nenhum cliente encontrado" description="Não há registros compatíveis com os filtros selecionados." /> : <div className={styles.customerTableWrap}><table className={styles.dataTable}><thead><tr><th>Cliente</th><th>Telefone</th><th>Afiliado</th><th>Origem</th><th>Atendimento</th><th>Status SGP</th><th>Conversão</th><th></th></tr></thead><tbody>{customers.map((customer) => <tr key={`${customer.linkId}-${customer.id}`}><td><button type="button" className={styles.customerNameButton} onClick={() => onOpenCustomer(customer)}><strong>{customer.customerName}</strong><small>{customer.city || "Cidade não informada"}</small></button></td><td>{customer.customerPhone ? <a className={styles.phoneLink} href={whatsappUrl(customer.customerPhone)} target="_blank" rel="noreferrer"><FiPhone />{formatPhone(customer.customerPhone)}</a> : "Não informado"}</td><td>{customer.affiliateName}</td><td><code>{customer.shortCode}</code></td><td><span className={styles.attendanceBadge}>{STATUS_LABELS[customer.status]}</span></td><td><StatusBadge customer={customer} /></td><td>{formatDateTime(customer.sgpConvertedAt)}</td><td><button type="button" className={styles.tableAction} onClick={() => onOpenCustomer(customer)}>Ver jornada</button></td></tr>)}</tbody></table></div>}</section>;
}

function StatusBadge({ customer }: { customer: CustomerRow }) { return <span className={`${styles.sgpBadge} ${styles[`sgp_${customer.sgpStatus.toLowerCase()}`]}`}>{SGP_LABELS[customer.sgpStatus]}</span>; }

function ConversionDrawer({ customer, campaign, onClose }: { customer: CustomerRow; campaign: Campaign; onClose: () => void }) {
  const timeline = [
    { label: "WhatsApp aberto", date: customer.whatsappStartedAt, detail: "Evento rastreado pelo link da campanha" },
    { label: "Atendimento identificado", date: customer.attendanceStartedAt, detail: customer.attendanceId ? `Attendance ID: ${customer.attendanceId}` : "Attendance ID não informado" },
    { label: "Lead criado no CRM", date: customer.leadCreatedAt, detail: customer.stageName || customer.statusName || "Etapa não informada" },
    ...customer.history.map((item) => ({ label: item.message, date: item.createdAt, detail: "Histórico do CRM" })),
    { label: "Cliente confirmado no SGP", date: customer.sgpConvertedAt, detail: customer.sgpCustomerId ? `Cliente SGP: ${customer.sgpCustomerId}` : "Não confirmado no SGP" },
  ].filter((item) => item.date);
  return <div className={styles.drawerBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Jornada da conversão"><div className={styles.drawerHeader}><div><span className={styles.eyebrow}>Jornada da conversão</span><h2>{customer.customerName}</h2><p>{formatPhone(customer.customerPhone)}</p></div><button type="button" onClick={onClose} aria-label="Fechar"><FiX /></button></div><div className={styles.drawerBody}><StatusBadge customer={customer} />{customer.customerPhone && <a className={styles.whatsappButton} href={whatsappUrl(customer.customerPhone)} target="_blank" rel="noreferrer"><FiMessageCircle /> Abrir WhatsApp <FiExternalLink /></a>}<section><h3>Linha do tempo</h3>{timeline.length ? <div className={styles.timeline}>{timeline.map((item, index) => <div key={`${item.label}-${index}`} className={styles.timelineItem}><span /><div><time>{formatDateTime(item.date)}</time><strong>{item.label}</strong><p>{item.detail}</p></div></div>)}</div> : <p className={styles.drawerMuted}>Nenhum evento temporal disponível.</p>}</section><section><h3>Origem e atribuição</h3><dl className={styles.auditGrid}><Audit label="Campanha" value={campaign.name} /><Audit label="Afiliado" value={customer.affiliateName} /><Audit label="Código" value={customer.shortCode} /><Audit label="Telefone" value={formatPhone(customer.customerPhone)} /><Audit label="Attendance ID" value={customer.attendanceId || "Não informado"} /><Audit label="Cliente SGP" value={customer.sgpCustomerId || "Não informado"} /><Audit label="Atribuição" value={customer.attributionStatus === "VERIFIED" ? "Verificada" : customer.attributionStatus === "TRACKED" ? "Rastreada, pendente de confirmação" : "Não identificada"} /></dl></section><section><h3>Dados comerciais</h3><dl className={styles.auditGrid}><Audit label="Plano" value={customer.plan || "Não informado"} /><Audit label="Cidade" value={customer.city || "Não informada"} /><Audit label="Vendedor" value={customer.seller || "Não informado"} /><Audit label="Tempo até conversão" value={conversionDuration(customer)} /></dl></section></div></aside></div>;
}

function Audit({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className={styles.dashboardEmpty}><FiBarChart2 /><strong>{title}</strong><p>{description}</p></div>; }

function customersFromCampaign(campaign: Campaign): CustomerRow[] {
  return campaign.links.flatMap((link) => (link.conversionEvents || []).map((event) => ({ ...event, affiliateId: link.affiliate?.id || null, affiliateName: link.affiliate?.name || "Sem afiliado", linkId: link.id, linkName: link.name || link.shortCode, shortCode: link.shortCode, promoLink: link.promoLink })));
}

function calculateMetrics(clicks: number, customers: CustomerRow[]) {
  const whatsapp = customers.length;
  const attendances = customers.filter((item) => item.attendanceId).length;
  const leads = customers.filter((item) => item.customerPhone || item.customerName !== "Cliente não identificado").length;
  const conversions = customers.filter((item) => item.convertedInSgp).length;
  const opportunities = customers.filter((item) => !item.convertedInSgp && item.status !== "LOST").length;
  return { clicks, whatsapp, attendances, leads, conversions, opportunities, conversionRate: leads ? (conversions / leads) * 100 : 0 };
}

function buildRanking(links: CampaignLink[], customers: CustomerRow[]) {
  return links.filter((link) => link.affiliate).map((link) => { const affiliateCustomers = customers.filter((item) => item.linkId === link.id); const leads = affiliateCustomers.filter((item) => item.customerPhone || item.customerName !== "Cliente não identificado").length; const conversions = affiliateCustomers.filter((item) => item.convertedInSgp).length; return { linkId: link.id, affiliateName: link.affiliate!.name, shortCode: link.shortCode, clicks: (link.clickEvents || []).length, whatsapp: affiliateCustomers.length, leads, conversions, rate: leads ? (conversions / leads) * 100 : 0, customers: affiliateCustomers }; }).sort((a, b) => b.conversions - a.conversions || b.rate - a.rate || b.leads - a.leads);
}

function buildChartData(metric: ChartMetric, clicks: { clickedAt: string }[], customers: CustomerRow[]) {
  const counts = new Map<string, number>();
  const add = (date: string | null) => { if (!date) return; const parsed = new Date(date); if (Number.isNaN(parsed.getTime())) return; const key = parsed.toISOString().slice(0, 10); counts.set(key, (counts.get(key) || 0) + 1); };
  if (metric === "clicks") clicks.forEach((item) => add(item.clickedAt));
  else customers.filter((item) => metric === "conversions" ? item.convertedInSgp : metric === "leads" ? Boolean(item.customerPhone || item.customerName !== "Cliente não identificado") : true).forEach((item) => add(metric === "conversions" ? item.sgpConvertedAt : item.convertedAt));
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, value]) => ({ label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T12:00:00`)), value }));
}

function buildInsights(metrics: ReturnType<typeof calculateMetrics>, ranking: ReturnType<typeof buildRanking>) {
  const leader = ranking[0];
  return [
    { icon: "🏆", title: leader ? `${leader.affiliateName} lidera a campanha` : "Ranking ainda sem líder", description: leader ? `${leader.conversions} clientes confirmados no SGP e taxa de ${formatPercent(leader.rate)}%.` : "Ainda não há conversões confirmadas suficientes." },
    { icon: "⚠️", title: `${metrics.opportunities} oportunidades abertas`, description: "Leads rastreados que ainda não possuem confirmação de conversão no SGP." },
    { icon: "💬", title: `${metrics.whatsapp} interações rastreadas`, description: metrics.clicks ? `${formatPercent((metrics.whatsapp / metrics.clicks) * 100)}% em relação aos cliques registrados.` : "Não há cliques no período para calcular a taxa." },
  ];
}

function matchesSgpFilter(customer: CustomerRow, filter: SgpFilter) { if (filter === "all") return true; if (filter === "converted") return customer.sgpStatus === "CONVERTED"; if (filter === "negotiation") return customer.sgpStatus === "IN_NEGOTIATION"; if (filter === "pending") return !customer.convertedInSgp && customer.status !== "LOST"; if (filter === "lost") return customer.sgpStatus === "NOT_CONVERTED"; return customer.sgpStatus === "NOT_VERIFIED"; }
function getPeriodRange(period: PeriodKey, start: string, end: string) { const now = new Date(); let from: Date | null = null; let to: Date | null = now; if (period === "today") from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); if (period === "7d" || period === "30d") { from = new Date(now); from.setDate(now.getDate() - (period === "7d" ? 6 : 29)); from.setHours(0, 0, 0, 0); } if (period === "month") from = new Date(now.getFullYear(), now.getMonth(), 1); if (period === "all") { from = null; to = null; } if (period === "custom") { from = start ? new Date(`${start}T00:00:00`) : null; to = end ? new Date(`${end}T23:59:59`) : null; } return { from, to }; }
function dateInRange(value: string | null, range: { from: Date | null; to: Date | null }) { if (!value) return false; const date = new Date(value); if (Number.isNaN(date.getTime())) return false; return (!range.from || date >= range.from) && (!range.to || date <= range.to); }
function uniqueValues(values: (string | null)[]) { return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b)); }
function normalizeText(value: string) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function formatPercent(value: number) { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Number.isFinite(value) ? value : 0); }
function formatDate(value: string | null) { if (!value) return "Não informado"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Não informado" : new Intl.DateTimeFormat("pt-BR").format(date); }
function formatDateTime(value: string | null) { if (!value) return "Não informado"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "Não informado" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date); }
function formatPhone(value: string | null) { if (!value) return "Número não informado"; const digits = value.replace(/\D/g, ""); if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`; if (digits.length === 13 && digits.startsWith("55")) return `(${digits.slice(2, 4)}) ${digits.slice(4, 5)} ${digits.slice(5, 9)}-${digits.slice(9)}`; return value; }
function whatsappUrl(phone: string) { const digits = phone.replace(/\D/g, ""); return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`; }
function formatDuration(ms: number) { const hours = Math.floor(ms / 3600000); const minutes = Math.floor((ms % 3600000) / 60000); return `${hours}h ${minutes}min`; }
function conversionDuration(customer: CustomerRow) { if (!customer.sgpConvertedAt) return "Ainda não convertido"; const start = new Date(customer.attendanceStartedAt || customer.whatsappStartedAt || customer.convertedAt).getTime(); const end = new Date(customer.sgpConvertedAt).getTime(); return Number.isFinite(start) && Number.isFinite(end) ? formatDuration(Math.max(0, end - start)) : "Não calculável"; }
