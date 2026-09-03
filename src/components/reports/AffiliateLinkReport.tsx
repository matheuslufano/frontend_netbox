"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";
import { BsMegaphoneFill } from "react-icons/bs";
import {
  FiCheck,
  FiChevronRight,
  FiFilter,
  FiLink,
  FiMousePointer,
  FiSearch,
  FiTarget,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import type {
  Campaign,
  CampaignConversionEvent,
  CampaignLink,
} from "@/lib/api";
import {
  EmptyState,
  ReportKpiCard,
  ReportSection,
  reportStyles as styles,
} from "./ReportsUi";

type Period = "today" | "7" | "30" | "custom";
type Status =
  | "all"
  | "converted"
  | "not-converted"
  | "attendance"
  | "no-attendance";
type RankedLink = {
  link: CampaignLink;
  campaign: Campaign;
  clicks: number;
  events: CampaignConversionEvent[];
  attendances: number;
  leads: number;
  conversions: number;
  rate: number;
};

export default function AffiliateLinkReport({
  campaigns,
}: {
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<number | null>(
    () => readSelectedId("affiliateId"),
  );
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(() =>
    readSelectedId("linkId"),
  );

  const bounds = useMemo(
    () => periodBounds(period, from, to),
    [period, from, to],
  );
  const allRows = useMemo(
    () =>
      campaigns
        .flatMap((campaign) =>
          campaign.links.map((link) => buildRankedLink(link, campaign, bounds)),
        )
        .filter((row) => {
          const haystack =
            `${row.link.affiliate?.name || ""} ${row.link.shortCode} ${linkDisplayName(row.link)} ${row.campaign.name}`.toLocaleLowerCase(
              "pt-BR",
            );
          return (
            (!campaignId || String(row.campaign.id) === campaignId) &&
            (!search.trim() ||
              haystack.includes(search.trim().toLocaleLowerCase("pt-BR"))) &&
            matchesStatus(row, status)
          );
        })
        .sort(
          (a, b) =>
            b.conversions - a.conversions ||
            b.attendances - a.attendances ||
            b.clicks - a.clicks,
        ),
    [bounds, campaignId, campaigns, search, status],
  );

  const affiliates = [
    ...new Map(
      allRows
        .filter((row) => row.link.affiliate)
        .map((row) => [row.link.affiliate!.id, row.link.affiliate!]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const activeAffiliateId =
    selectedAffiliateId &&
    affiliates.some((affiliate) => affiliate.id === selectedAffiliateId)
      ? selectedAffiliateId
      : affiliates[0]?.id || null;
  const rows = allRows.filter(
    (row) => row.link.affiliate?.id === activeAffiliateId,
  );
  const selected =
    rows.find(
      (row) =>
        row.link.id === selectedLinkId &&
        row.link.affiliate?.id === selectedAffiliateId,
    ) ||
    rows[0] ||
    null;
  const affiliateLinks = selected ? rows : [];

  function selectRow(row: RankedLink, navigate = true) {
    const nextAffiliateId = row.link.affiliate?.id || null;
    setSelectedAffiliateId(nextAffiliateId);
    setSelectedLinkId(row.link.id);
    if (navigate && nextAffiliateId)
      router.push(
        `/links-campanhas/relatorios/link?affiliateId=${nextAffiliateId}&linkId=${row.link.id}`,
        { scroll: false },
      );
  }

  function selectAffiliate(nextAffiliateId: number) {
    const firstLink = allRows.find(
      (row) => row.link.affiliate?.id === nextAffiliateId,
    );
    setSelectedAffiliateId(nextAffiliateId);
    setSelectedLinkId(firstLink?.link.id || null);
    router.push(
      `/links-campanhas/relatorios/link?affiliateId=${nextAffiliateId}${firstLink ? `&linkId=${firstLink.link.id}` : ""}`,
      { scroll: false },
    );
  }

  return (
    <>
      <section className={styles.affiliateReportFilters}>
        <div className={styles.filterTitle}>
          <FiFilter aria-hidden="true" /> Filtros do relatório
        </div>
        <label className={styles.field}>
          Período
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            <option value="today">Hoje</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        {period === "custom" && (
          <>
            <label className={styles.field}>
              De
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              Até
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </>
        )}
        <label className={styles.field}>
          Campanha
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            <option value="">Todas</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            <option value="all">Todos</option>
            <option value="converted">Com conversão</option>
            <option value="not-converted">Sem conversão</option>
            <option value="attendance">Com atendimento</option>
            <option value="no-attendance">Sem atendimento</option>
          </select>
        </label>
        <label className={`${styles.field} ${styles.reportSearch}`}>
          <span>Buscar afiliado ou link</span>
          <span>
            <FiSearch aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, código, link ou campanha"
            />
          </span>
        </label>
      </section>

      <AffiliatePicker
        affiliates={affiliates}
        activeAffiliateId={activeAffiliateId}
        onSelect={selectAffiliate}
      />

      <div className={styles.affiliateReportLayout}>
        <ReportRanking
          rows={rows}
          selectedLinkId={selected?.link.id || null}
          onSelect={selectRow}
        />
        <div className={styles.individualReport}>
          {selected ? (
            <AffiliateDetail
              row={selected}
              affiliateLinks={affiliateLinks}
              onSelect={selectRow}
              boundsLabel={bounds.label}
            />
          ) : (
            <EmptyState text="Nenhum afiliado ou link encontrado para os filtros selecionados." />
          )}
        </div>
      </div>
    </>
  );
}

function AffiliatePicker({
  affiliates,
  activeAffiliateId,
  onSelect,
}: {
  affiliates: CampaignLink["affiliate"][];
  activeAffiliateId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <section className={styles.affiliatePicker}>
      <div>
        <span>Afiliados</span>
        <strong>Selecione um perfil</strong>
      </div>
      <div className={styles.affiliatePickerList}>
        {affiliates
          .filter(
            (affiliate): affiliate is NonNullable<CampaignLink["affiliate"]> =>
              Boolean(affiliate),
          )
          .map((affiliate) => (
            <button
              type="button"
              key={affiliate.id}
              className={
                affiliate.id === activeAffiliateId
                  ? styles.affiliatePickerActive
                  : ""
              }
              onClick={() => onSelect(affiliate.id)}
              aria-pressed={affiliate.id === activeAffiliateId}
              title={affiliate.name}
            >
              <AffiliateAvatar
                name={affiliate.name}
                photoUrl={affiliate.photoUrl}
              />
              <span>{affiliate.name}</span>
              {affiliate.id === activeAffiliateId && (
                <FiCheck aria-hidden="true" />
              )}
            </button>
          ))}
      </div>
    </section>
  );
}

function ReportRanking({
  rows,
  selectedLinkId,
  onSelect,
}: {
  rows: RankedLink[];
  selectedLinkId: number | null;
  onSelect: (row: RankedLink) => void;
}) {
  const positions = new Map(rows.map((row, index) => [row.link.id, index + 1]));
  return (
    <aside className={styles.affiliateRanking}>
      <div className={styles.rankingTitle}>
        <div>
          <span>Ranking</span>
          <h2>Links do afiliado</h2>
        </div>
        <strong>{rows.length}</strong>
      </div>
      {rows.length ? (
        <div className={styles.rankingList}>
          {groupRankedLinks(rows).map((group) => (
            <section className={styles.linkTypeGroup} key={group.type}>
              <LinkTypeHeading type={group.type} count={group.rows.length} />
              {group.rows.map((row) => {
                const active = row.link.id === selectedLinkId;
                return (
                  <button
                    type="button"
                    key={`${row.campaign.id}-${row.link.id}`}
                    className={`${styles.rankingSelector} ${active ? styles.rankingSelectorActive : ""}`}
                    onClick={() => onSelect(row)}
                    aria-pressed={active}
                  >
                    <span className={styles.rankingNumber}>
                      {positions.get(row.link.id)}º
                    </span>
                    <span className={styles.rankingBody}>
                      <span className={styles.rankingIdentity}>
                        <strong title={row.link.name || row.link.shortCode}>
                          {row.link.name || row.link.shortCode}
                        </strong>
                        {active && (
                          <small>
                            <FiCheck /> Visualizando
                          </small>
                        )}
                      </span>
                      <span>Campanha: {row.campaign.name}</span>
                      <span>Código: {row.link.shortCode}</span>
                      <span className={styles.rankingMetrics}>
                        <b>{row.clicks} cliques</b>
                        <b>{row.attendances} atendimentos</b>
                        <b>{row.conversions} conversões</b>
                        <b>{formatPercent(row.rate)}</b>
                      </span>
                    </span>
                    <FiChevronRight
                      className={styles.rankingArrow}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState text="Este afiliado não possui links para os filtros selecionados." />
      )}
    </aside>
  );
}

function AffiliateDetail({
  row,
  affiliateLinks,
  onSelect,
  boundsLabel,
}: {
  row: RankedLink;
  affiliateLinks: RankedLink[];
  onSelect: (row: RankedLink) => void;
  boundsLabel: string;
}) {
  const affiliate = row.link.affiliate;
  return (
    <>
      <section className={styles.affiliateReportHero}>
        <AffiliateAvatar
          name={affiliate?.name || "Sem afiliado"}
          photoUrl={affiliate?.photoUrl}
          large
        />
        <div>
          <span>Desempenho do Afiliado</span>
          <h2>{affiliate?.name || "Sem afiliado"}</h2>
          <p>
            {row.campaign.name} · {row.link.name || "Link sem nome"}
          </p>
          <div className={styles.reportMeta}>
            <span>
              Código <b>{row.link.shortCode}</b>
            </span>
            <span>
              Período <b>{boundsLabel}</b>
            </span>
          </div>
        </div>
      </section>
      <div className={styles.individualKpiGrid}>
        <ReportKpiCard
          label="Cliques"
          value={row.clicks}
          icon={FiMousePointer}
        />
        <ReportKpiCard
          label="Cliques únicos"
          value="—"
          hint="Aguardando API"
          icon={FiUsers}
        />
        <ReportKpiCard
          label="Atendimentos"
          value={row.attendances}
          icon={FaWhatsapp}
        />
        <ReportKpiCard label="Leads" value={row.leads} icon={FiUser} />
        <ReportKpiCard
          label="Conversões"
          value={row.conversions}
          icon={FiCheck}
        />
        <ReportKpiCard
          label="Taxa de conversão"
          value={formatPercent(row.rate)}
          hint="Conversões / atendimentos"
          icon={FiTarget}
        />
      </div>
      <ConversionFunnel row={row} />
      <ReportSection
        title="Links do afiliado"
        description="Clique em uma linha para detalhar outro link mantendo o afiliado como contexto."
      >
        <AffiliateLinksTable
          rows={affiliateLinks}
          selectedLinkId={row.link.id}
          onSelect={onSelect}
        />
      </ReportSection>
    </>
  );
}

function AffiliateLinksTable({
  rows,
  selectedLinkId,
  onSelect,
}: {
  rows: RankedLink[];
  selectedLinkId: number;
  onSelect: (row: RankedLink) => void;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={`${styles.table} ${styles.clickableTable}`}>
        <thead>
          <tr>
            <th>Link</th>
            <th>Campanha</th>
            <th>Cliques</th>
            <th>Atendimentos</th>
            <th>Conversões</th>
            <th>Taxa</th>
          </tr>
        </thead>
        {groupRankedLinks(rows).map((group) => (
          <tbody key={group.type}>
            <tr className={styles.linkTypeTableRow}>
              <th colSpan={6}>
                <LinkTypeHeading type={group.type} count={group.rows.length} />
              </th>
            </tr>
            {group.rows.map((item) => (
              <tr
                key={`${item.campaign.id}-${item.link.id}`}
                className={
                  item.link.id === selectedLinkId ? styles.selectedTableRow : ""
                }
                onClick={() => onSelect(item)}
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    onSelect(item);
                }}
              >
                <td>
                  <span
                    className={styles.tableLinkName}
                    title={item.link.name || item.link.shortCode}
                  >
                    {item.link.name || item.link.shortCode}
                  </span>
                </td>
                <td>{item.campaign.name}</td>
                <td>{item.clicks}</td>
                <td>{item.attendances}</td>
                <td>{item.conversions}</td>
                <td>{formatPercent(item.rate)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function LinkTypeHeading({
  type,
  count,
}: {
  type: CampaignLink["linkType"];
  count: number;
}) {
  const meta =
    type === "whatsapp"
      ? { label: "WhatsApp", Icon: FaWhatsapp }
      : type === "campaign"
        ? { label: "Links de campanhas", Icon: BsMegaphoneFill }
        : { label: "Links individuais", Icon: FiLink };
  const Icon = meta.Icon;
  return (
    <span
      className={`${styles.linkTypeHeading} ${styles[`linkTypeHeading${type.charAt(0).toUpperCase()}${type.slice(1)}`]}`}
    >
      <Icon aria-hidden="true" /> {meta.label}
      <small>{count}</small>
    </span>
  );
}

function groupRankedLinks(rows: RankedLink[]) {
  return (["individual", "whatsapp", "campaign"] as const)
    .map((type) => ({
      type,
      rows: rows.filter((row) => row.link.linkType === type),
    }))
    .filter((group) => group.rows.length > 0);
}

function ConversionFunnel({ row }: { row: RankedLink }) {
  const stages = [
    { label: "Cliques", value: row.clicks, icon: FiMousePointer },
    { label: "WhatsApp", value: row.attendances, icon: FaWhatsapp },
    { label: "Leads", value: row.leads, icon: FiUsers },
    { label: "Conversões", value: row.conversions, icon: FiCheck },
  ];
  return (
    <ReportSection
      title="Funil de conversão"
      description="Progressão do link selecionado no período."
    >
      <div className={styles.conversionFunnel}>
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const previous = index ? stages[index - 1].value : 0;
          return (
            <div className={styles.funnelStage} key={stage.label}>
              <div>
                <Icon aria-hidden="true" />
                <span>{stage.label}</span>
                <strong>{stage.value}</strong>
              </div>
              {index < stages.length - 1 && (
                <span className={styles.funnelArrow}>
                  <FiChevronRight />
                  <small>
                    {previous
                      ? formatPercent(
                          (stages[index + 1].value / previous) * 100,
                        )
                      : "0%"}
                  </small>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </ReportSection>
  );
}

function AffiliateAvatar({
  name,
  photoUrl,
  large = false,
}: {
  name: string;
  photoUrl?: string | null;
  large?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`${styles.reportAvatar} ${large ? styles.reportAvatarLarge : ""}`}
      style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}
      role={photoUrl ? "img" : undefined}
      aria-label={photoUrl ? `Foto de ${name}` : undefined}
    >
      {!photoUrl && initials}
    </span>
  );
}
function buildRankedLink(
  link: CampaignLink,
  campaign: Campaign,
  bounds: ReturnType<typeof periodBounds>,
): RankedLink {
  const clicks = link.clickEvents.filter((event) =>
    inBounds(event.clickedAt, bounds),
  );
  const events = link.conversionEvents.filter((event) =>
    inBounds(event.convertedAt, bounds),
  );
  const attendances = events.filter(
    (event) => event.whatsappStartedAt || event.attendanceStartedAt,
  ).length;
  const leads = events.filter(
    (event) =>
      event.leadCreatedAt || event.customerPhone || event.customerDocument,
  ).length;
  const conversions = events.filter(
    (event) => event.convertedInSgp || event.status === "CONVERTED",
  ).length;
  return {
    link: { ...link, name: linkDisplayName(link) },
    campaign,
    clicks: clicks.length,
    events,
    attendances,
    leads,
    conversions,
    rate: attendances ? (conversions / attendances) * 100 : 0,
  };
}
function linkDisplayName(link: CampaignLink) {
  return link.displayName?.trim() || link.name?.trim() || link.shortCode;
}
function matchesStatus(row: RankedLink, status: Status) {
  if (status === "converted") return row.conversions > 0;
  if (status === "not-converted") return row.conversions === 0;
  if (status === "attendance") return row.attendances > 0;
  if (status === "no-attendance") return row.attendances === 0;
  return true;
}
function periodBounds(period: Period, from: string, to: string) {
  const end =
    period === "custom" && to ? new Date(`${to}T23:59:59.999`) : new Date();
  let start: Date | null = null;
  if (period === "custom") start = from ? new Date(`${from}T00:00:00`) : null;
  else {
    start = new Date();
    start.setHours(0, 0, 0, 0);
    if (period !== "today")
      start.setDate(start.getDate() - (Number(period) - 1));
  }
  return {
    start: start?.getTime() || null,
    end: end.getTime(),
    label:
      period === "today"
        ? "Hoje"
        : period === "custom"
          ? `${from || "Início"} a ${to || "Hoje"}`
          : `Últimos ${period} dias`,
  };
}
function inBounds(
  value: string | null,
  bounds: ReturnType<typeof periodBounds>,
) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return (!bounds.start || time >= bounds.start) && time <= bounds.end;
}
function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}
function readSelectedId(key: string) {
  if (typeof window === "undefined") return null;
  const value = Number(new URLSearchParams(window.location.search).get(key));
  return value > 0 ? value : null;
}
