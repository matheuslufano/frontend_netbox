import { useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiCreditCard,
  FiGitBranch,
  FiGrid,
  FiLink,
  FiList,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import { apagarLink, getApiErrorMessage } from "@/lib/api";
import { formatDisplayLink } from "@/lib/links";
import { AffiliateDetail } from "./useRelatorios";
import styles from "./relatorios.module.css";

interface AffiliateDetailsProps {
  details: AffiliateDetail[];
  refresh: () => void;
  refreshing: boolean;
  emptyMessage?: string;
}

const affiliateViewOptions = [
  {
    value: "compact",
    label: "Visualizacao compacta",
    icon: FiList,
  },
  {
    value: "medium",
    label: "Visualizacao media",
    icon: FiCreditCard,
  },
  {
    value: "detailed",
    label: "Visualizacao detalhada",
    icon: FiGrid,
  },
] as const;

const detailTabOptions = [
  {
    value: "links",
    label: "Links",
    icon: FiLink,
  },
  {
    value: "conversions",
    label: "Conversoes",
    icon: FiGitBranch,
  },
] as const;

type AffiliateViewMode =
  (typeof affiliateViewOptions)[number]["value"];

type DetailTab = (typeof detailTabOptions)[number]["value"];

type AffiliateLink = AffiliateDetail["links"][number];

type AffiliateConversion =
  AffiliateDetail["conversionEvents"][number];

type ConversionWithAffiliate = AffiliateConversion & {
  affiliate: string;
  affiliateId: number;
};

type AffiliateCardProps = {
  block: AffiliateDetail;
  deletingLinkId: number | null;
  refreshingReport: boolean;
  onRefreshReport: () => void;
  onCopyLink: (link: string) => Promise<void>;
  onDeleteLink: (
    id: number,
    name?: string | null
  ) => Promise<void>;
};

export default function AffiliateDetails({
  details,
  refresh,
  refreshing,
  emptyMessage = "Nenhum afiliado encontrado no relatorio.",
}: AffiliateDetailsProps) {
  const [deletingLinkId, setDeletingLinkId] =
    useState<number | null>(null);
  const [viewMode, setViewMode] =
    useState<AffiliateViewMode>("detailed");
  const [detailTab, setDetailTab] =
    useState<DetailTab>("links");

  const conversionRanking = details
    .filter((affiliate) => (affiliate.totalConversions ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.totalConversions ?? 0) - (a.totalConversions ?? 0)
    );

  const totalConversions = details.reduce(
    (sum, affiliate) =>
      sum + (affiliate.totalConversions ?? 0),
    0
  );

  const conversionEvents = useMemo(
    () =>
      details
        .flatMap((affiliate) =>
          (affiliate.conversionEvents ?? []).map((conversion) => ({
            ...conversion,
            affiliate: affiliate.affiliate,
            affiliateId: affiliate.affiliateId,
          }))
        )
        .sort(
          (a, b) =>
            new Date(b.convertedAt).getTime() -
            new Date(a.convertedAt).getTime()
        ),
    [details]
  );

  const affiliateListClass = [
    styles.affiliateList,
    viewMode === "compact"
      ? styles.affiliateListCompact
      : "",
    viewMode === "medium"
      ? styles.affiliateListMedium
      : "",
    viewMode === "detailed"
      ? styles.affiliateListDetailed
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copiado com sucesso!");
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      alert("Erro ao copiar o link.");
    }
  };

  const handleDeleteLink = async (id: number, name?: string | null) => {
    const label = name || `ID #${id}`;
    const confirmed = window.confirm(
      `Deseja apagar o link "${label}"? Essa acao tambem remove os cliques desse link.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingLinkId(id);

    try {
      await apagarLink(id);
      refresh();
    } catch (error) {
      alert(
        getApiErrorMessage(
          error,
          "Nao foi possivel apagar o link."
        )
      );
    } finally {
      setDeletingLinkId(null);
    }
  };

  return (
    <>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Detalhe por afiliado</h2>

        <div className={styles.headerActions}>
          <div
            className={styles.detailTabs}
            aria-label="Dados do detalhe"
            role="tablist"
          >
            {detailTabOptions.map((option) => {
              const Icon = option.icon;
              const isActive = detailTab === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.detailTab} ${
                    isActive ? styles.detailTabActive : ""
                  }`}
                  onClick={() => setDetailTab(option.value)}
                  aria-selected={isActive}
                  role="tab"
                >
                  <Icon aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          {detailTab === "links" && (
            <div
              className={styles.viewSwitcher}
              aria-label="Visualizacao dos afiliados"
              role="group"
            >
              {affiliateViewOptions.map((option) => {
                const Icon = option.icon;
                const isActive = viewMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.viewButton} ${
                      isActive ? styles.viewButtonActive : ""
                    }`}
                    onClick={() => setViewMode(option.value)}
                    aria-label={option.label}
                    aria-pressed={isActive}
                    title={option.label}
                  >
                    <Icon aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {detailTab === "links" ? (
        <>
          <div className={styles.conversionSummary}>
        <div className={styles.conversionHero}>
          <span>Conversoes pelo WhatsApp</span>
          <strong>{totalConversions}</strong>
          <p>
            Cliques no botao da landing que vieram de links de divulgacao.
          </p>
        </div>

        <div className={styles.conversionRanking}>
          <div className={styles.rankingHeader}>
            <strong>Afiliados que converteram</strong>
            <span>{conversionRanking.length} com conversao</span>
          </div>

          {conversionRanking.length === 0 ? (
            <p className={styles.emptyText}>
              Nenhum afiliado gerou conversao ainda.
            </p>
          ) : (
            <div className={styles.rankingList}>
              {conversionRanking.map((affiliate, index) => (
                <div
                  key={affiliate.affiliateId}
                  className={styles.rankingItem}
                >
                  <span className={styles.rankBadge}>#{index + 1}</span>

                  <div>
                    <strong>{affiliate.affiliate}</strong>
                    <p>ID #{affiliate.affiliateId}</p>
                  </div>

                  <span className={styles.conversionBadge}>
                    {affiliate.totalConversions}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {details.length === 0 ? (
        <p className={styles.emptyText}>
          {emptyMessage}
        </p>
      ) : (
        <div className={affiliateListClass}>
          {details.map((block) => {
            if (viewMode === "compact") {
              return (
                <AffiliateCompactCard
                  key={block.affiliateId}
                  block={block}
                  deletingLinkId={deletingLinkId}
                  refreshingReport={refreshing}
                  onRefreshReport={refresh}
                  onCopyLink={handleCopyLink}
                  onDeleteLink={handleDeleteLink}
                />
              );
            }

            if (viewMode === "medium") {
              return (
                <AffiliateMediumCard
                  key={block.affiliateId}
                  block={block}
                  deletingLinkId={deletingLinkId}
                  refreshingReport={refreshing}
                  onRefreshReport={refresh}
                  onCopyLink={handleCopyLink}
                  onDeleteLink={handleDeleteLink}
                />
              );
            }

            return (
              <AffiliateDetailedCard
                key={block.affiliateId}
                block={block}
                deletingLinkId={deletingLinkId}
                refreshingReport={refreshing}
                onRefreshReport={refresh}
                onCopyLink={handleCopyLink}
                onDeleteLink={handleDeleteLink}
              />
            );
          })}
        </div>
      )}
        </>
      ) : (
        <ConversionFlowPanel
          conversionEvents={conversionEvents}
          emptyMessage={emptyMessage}
          totalConversions={totalConversions}
        />
      )}
    </>
  );
}

function ConversionFlowPanel({
  conversionEvents,
  emptyMessage,
  totalConversions,
}: {
  conversionEvents: ConversionWithAffiliate[];
  emptyMessage: string;
  totalConversions: number;
}) {
  const whatsappConversions =
    conversionEvents.filter(hasWhatsappStage).length;
  const chatmixConversions =
    conversionEvents.filter(hasChatmixValidation).length;
  const sgpConversions =
    conversionEvents.filter(hasSgpSale).length;

  return (
    <section className={styles.conversionFlowPanel} role="tabpanel">
      <div className={styles.conversionFlowOverview}>
        <FlowMetric label="Conversoes" value={totalConversions} />
        <FlowMetric label="WhatsApp" value={whatsappConversions} />
        <FlowMetric label="Chatmix" value={chatmixConversions} />
        <FlowMetric label="SGP" value={sgpConversions} />
      </div>

      {conversionEvents.length === 0 ? (
        <p className={styles.emptyText}>
          {emptyMessage}
        </p>
      ) : (
        <div className={styles.conversionFlowList}>
          {conversionEvents.map((conversion) => {
            const steps = getConversionFlowSteps(conversion);
            const finalStatus = getConversionFinalStatus(conversion);

            return (
              <article
                key={conversion.id}
                className={styles.conversionFlowCard}
              >
                <div className={styles.conversionFlowHeader}>
                  <div className={styles.conversionIdentity}>
                    <span>Conversao #{conversion.id}</span>
                    <h3>{conversion.affiliate}</h3>
                    <p>
                      {conversion.linkName || "Link sem nome"} - codigo{" "}
                      {conversion.shortCode}
                    </p>
                  </div>

                  <span
                    className={`${styles.finalStatusBadge} ${
                      finalStatus.className
                    }`}
                  >
                    {finalStatus.label}
                  </span>
                </div>

                <div className={styles.conversionMetaGrid}>
                  <MetaItem
                    label="Evento"
                    value={formatEventType(conversion.type)}
                  />
                  <MetaItem
                    label="Produto"
                    value={conversion.product || "Nao informado"}
                  />
                  <MetaItem
                    label="Destino"
                    value={
                      conversion.destination
                        ? formatDisplayLink(conversion.destination)
                        : "Nao informado"
                    }
                    title={conversion.destination || undefined}
                  />
                  <MetaItem
                    label="Data"
                    value={formatDateTime(conversion.convertedAt)}
                  />
                </div>

                <ol className={styles.flowSteps}>
                  {steps.map((step, index) => {
                    const Icon = step.completed
                      ? FiCheckCircle
                      : FiClock;

                    return (
                      <li
                        key={step.title}
                        className={`${styles.flowStep} ${
                          step.completed
                            ? styles.flowStepDone
                            : styles.flowStepPending
                        }`}
                      >
                        <span className={styles.stepMarker}>
                          <Icon aria-hidden="true" />
                        </span>

                        <div className={styles.stepContent}>
                          <span className={styles.stepNumber}>
                            {index + 1} etapa
                          </span>
                          <strong>{step.title}</strong>
                          <p>{step.description}</p>
                          <small>{step.detail}</small>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FlowMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className={styles.flowMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetaItem({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div className={styles.metaItem} title={title}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AffiliateCompactCard({
  block,
  deletingLinkId,
  refreshingReport,
  onRefreshReport,
  onCopyLink,
  onDeleteLink,
}: AffiliateCardProps) {
  const primaryLink = block.links[0];

  return (
    <article
      className={`${styles.affiliateCard} ${styles.affiliateCardCompact}`}
    >
      <div className={styles.compactHeader}>
        <span className={styles.initialBadge}>
          {getAffiliateInitials(block.affiliate)}
        </span>

        <div className={styles.compactIdentity}>
          <h3 className={styles.affiliateName}>{block.affiliate}</h3>
          <span className={styles.affiliateId}>
            ID #{block.affiliateId}
          </span>
        </div>

        <RefreshReportButton
          refreshing={refreshingReport}
          onRefresh={onRefreshReport}
          compact
        />
      </div>

      <div className={styles.compactStats}>
        <MiniStat label="Links" value={block.totalLinks} />
        <MiniStat label="Cliques" value={block.totalClicks} />
        <MiniStat
          label="Conversoes"
          value={block.totalConversions ?? 0}
        />
      </div>

      {primaryLink ? (
        <div className={styles.compactLink}>
          <div className={styles.linkPreviewText}>
            <strong>{primaryLink.name || "Link sem nome"}</strong>
            <a
              href={primaryLink.promoLink}
              target="_blank"
              rel="noopener noreferrer"
              title={primaryLink.promoLink}
            >
              {formatDisplayLink(primaryLink.promoLink)}
            </a>
          </div>

          <LinkIconActions
            link={primaryLink}
            deletingLinkId={deletingLinkId}
            onCopyLink={onCopyLink}
            onDeleteLink={onDeleteLink}
          />
        </div>
      ) : (
        <p className={styles.emptyInlineText}>Nenhum link cadastrado.</p>
      )}
    </article>
  );
}

function AffiliateMediumCard({
  block,
  deletingLinkId,
  refreshingReport,
  onRefreshReport,
  onCopyLink,
  onDeleteLink,
}: AffiliateCardProps) {
  const previewLinks = block.links.slice(0, 3);
  const hiddenLinks = Math.max(block.links.length - previewLinks.length, 0);

  return (
    <article
      className={`${styles.affiliateCard} ${styles.affiliateCardMedium}`}
    >
      <div className={styles.affiliateHeader}>
        <div>
          <h3 className={styles.affiliateName}>{block.affiliate}</h3>

          <span className={styles.affiliateId}>
            ID #{block.affiliateId}
          </span>
        </div>

        <RefreshReportButton
          refreshing={refreshingReport}
          onRefresh={onRefreshReport}
        />
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <span>Links</span>
          <strong>{block.totalLinks}</strong>
        </div>

        <div className={styles.statBox}>
          <span>Cliques</span>
          <strong>{block.totalClicks}</strong>
        </div>

        <div className={styles.statBox}>
          <span>Conversoes</span>
          <strong>{block.totalConversions ?? 0}</strong>
        </div>
      </div>

      <div className={styles.linkPreviewHeader}>
        <h4>Links de divulgacao</h4>
        <span>{block.links.length} links</span>
      </div>

      {previewLinks.length === 0 ? (
        <p className={styles.emptyInlineText}>Nenhum link cadastrado.</p>
      ) : (
        <div className={styles.linkPreviewList}>
          {previewLinks.map((link) => (
            <div key={link.id} className={styles.linkPreviewRow}>
              <div className={styles.linkPreviewText}>
                <strong>{link.name || "Link sem nome"}</strong>
                <a
                  href={link.promoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.promoLink}
                >
                  {formatDisplayLink(link.promoLink)}
                </a>
              </div>

              <div className={styles.previewMetrics}>
                <span className={styles.clickBadge}>
                  {link.clicks}
                </span>
                <span
                  className={
                    (link.conversions ?? 0) > 0
                      ? styles.conversionBadge
                      : styles.zeroBadge
                  }
                >
                  {link.conversions ?? 0}
                </span>
              </div>

              <LinkIconActions
                link={link}
                deletingLinkId={deletingLinkId}
                onCopyLink={onCopyLink}
                onDeleteLink={onDeleteLink}
              />
            </div>
          ))}

          {hiddenLinks > 0 && (
            <p className={styles.moreLinksText}>
              +{hiddenLinks} links cadastrados
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function AffiliateDetailedCard({
  block,
  deletingLinkId,
  refreshingReport,
  onRefreshReport,
  onCopyLink,
  onDeleteLink,
}: AffiliateCardProps) {
  return (
    <article className={styles.affiliateCard}>
      <div className={styles.affiliateHeader}>
        <div>
          <h3 className={styles.affiliateName}>{block.affiliate}</h3>

          <span className={styles.affiliateId}>
            ID #{block.affiliateId}
          </span>
        </div>

        <RefreshReportButton
          refreshing={refreshingReport}
          onRefresh={onRefreshReport}
        />
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <span>Links</span>
          <strong>{block.totalLinks}</strong>
        </div>

        <div className={styles.statBox}>
          <span>Cliques</span>
          <strong>{block.totalClicks}</strong>
        </div>

        <div className={styles.statBox}>
          <span>Conversoes</span>
          <strong>{block.totalConversions ?? 0}</strong>
        </div>
      </div>

      <div className={styles.linksSection}>
        <h4>Links de divulgacao</h4>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHead}>
              <th className={styles.smallCell}>Links dos afiliados</th>
              <th className={styles.smallCell}>Cliques</th>
              <th className={styles.smallCell}>Conversoes</th>
              <th className={styles.smallCell}>Copiar Link</th>
              <th className={styles.smallCell}>Apagar</th>
            </tr>
          </thead>

          <tbody>
            {block.links.map((l) => (
              <tr key={l.id} className={styles.tableRow}>
                <td className={styles.smallCell}>
                  <div className={styles.linkInfo}>
                    <strong className={styles.linkNameHighlight}>
                      {l.name || "Link sem nome"}
                    </strong>

                    <div className={styles.linkGroup}>
                      <span className={styles.linkLabel}>
                        Destino:
                      </span>

                      <span className={styles.breakWord}>
                        <span title={l.originalUrl}>
                          {formatDisplayLink(l.originalUrl)}
                        </span>
                      </span>
                    </div>

                    <div className={styles.linkGroup}>
                      <span className={styles.linkLabel}>
                        Afiliado:
                      </span>

                      <a
                        href={l.promoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.link} ${styles.breakWord}`}
                        title={l.promoLink}
                      >
                        {formatDisplayLink(l.promoLink)}
                      </a>
                    </div>
                  </div>
                </td>

                <td className={styles.smallCell}>
                  <span className={styles.clickBadge}>
                    {l.clicks}
                  </span>
                </td>

                <td className={styles.smallCell}>
                  <span
                    className={
                      (l.conversions ?? 0) > 0
                        ? styles.conversionBadge
                        : styles.zeroBadge
                    }
                  >
                    {l.conversions ?? 0}
                  </span>
                </td>

                <td className={styles.smallCell}>
                  <button
                    type="button"
                    className={styles.copyButton}
                    onClick={() => onCopyLink(l.promoLink)}
                  >
                    <FiCopy aria-hidden="true" />
                    Copiar
                  </button>
                </td>

                <td className={styles.smallCell}>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDeleteLink(l.id, l.name)}
                    disabled={deletingLinkId === l.id}
                  >
                    <FiTrash2 aria-hidden="true" />
                    {deletingLinkId === l.id ? "Apagando..." : "Apagar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className={styles.miniStat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LinkIconActions({
  link,
  deletingLinkId,
  onCopyLink,
  onDeleteLink,
}: {
  link: AffiliateLink;
  deletingLinkId: number | null;
  onCopyLink: (link: string) => Promise<void>;
  onDeleteLink: (
    id: number,
    name?: string | null
  ) => Promise<void>;
}) {
  const deleting = deletingLinkId === link.id;

  return (
    <div className={styles.inlineActions}>
      <button
        type="button"
        className={styles.iconActionButton}
        onClick={() => onCopyLink(link.promoLink)}
        aria-label={`Copiar link ${link.name || link.shortCode}`}
        title="Copiar link"
      >
        <FiCopy aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`${styles.iconActionButton} ${styles.iconDangerButton}`}
        onClick={() => onDeleteLink(link.id, link.name)}
        disabled={deleting}
        aria-label={`Apagar link ${link.name || link.shortCode}`}
        title="Apagar link"
      >
        <FiTrash2 aria-hidden="true" />
      </button>
    </div>
  );
}

function RefreshReportButton({
  refreshing,
  onRefresh,
  compact = false,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  compact?: boolean;
}) {
  const label = refreshing ? "Atualizando..." : "Atualizar relatorio";

  return (
    <button
      type="button"
      className={`${styles.refreshButton} ${
        styles.affiliateRefreshButton
      } ${compact ? styles.compactRefreshButton : ""}`}
      onClick={onRefresh}
      disabled={refreshing}
      aria-label={label}
      title={label}
    >
      <FiRefreshCw
        aria-hidden="true"
        className={refreshing ? styles.spinningIcon : undefined}
      />
      {!compact && <span>{label}</span>}
    </button>
  );
}

function getConversionFlowSteps(conversion: ConversionWithAffiliate) {
  const hasVisit =
    Boolean(conversion.latestClickAt) || conversion.totalClicks > 0;
  const hasWhatsapp = hasWhatsappStage(conversion);
  const hasChatmix = hasChatmixValidation(conversion);
  const hasSgp = hasSgpSale(conversion);
  const eventDate = formatDateTime(conversion.convertedAt);

  return [
    {
      title: "Visita na landing page",
      description: "Visitante acessou a landing page do link.",
      completed: hasVisit,
      detail: hasVisit
        ? conversion.latestClickAt
          ? `Ultima visita: ${formatDateTime(conversion.latestClickAt)}`
          : `${conversion.totalClicks} visita(s) registradas`
        : "Aguardando visita",
    },
    {
      title: "Clique no WhatsApp",
      description: "Entrou no atendimento pelo botao de WhatsApp.",
      completed: hasWhatsapp,
      detail: hasWhatsapp
        ? isWhatsappEvent(conversion)
          ? `Registrado: ${eventDate}`
          : "Confirmado por etapa posterior"
        : "Aguardando clique",
    },
    {
      title: "Validacao no Chatmix",
      description: "Webhook confirmou o atendimento no Chatmix.",
      completed: hasChatmix,
      detail: hasChatmix ? `Validado: ${eventDate}` : "Aguardando webhook",
    },
    {
      title: "Registro no SGP",
      description: "Venda concluida e registrada no SGP.",
      completed: hasSgp,
      detail: hasSgp ? `Concluido: ${eventDate}` : "Aguardando venda",
    },
  ];
}

function getConversionFinalStatus(conversion: ConversionWithAffiliate) {
  if (hasSgpSale(conversion)) {
    return {
      label: "Venda concluida",
      className: styles.finalStatusDone,
    };
  }

  if (hasChatmixValidation(conversion)) {
    return {
      label: "Validado no Chatmix",
      className: styles.finalStatusActive,
    };
  }

  if (hasWhatsappStage(conversion)) {
    return {
      label: "Em atendimento",
      className: styles.finalStatusActive,
    };
  }

  return {
    label: "Pendente",
    className: styles.finalStatusPending,
  };
}

function hasWhatsappStage(conversion: ConversionWithAffiliate) {
  return (
    isWhatsappEvent(conversion) ||
    hasChatmixValidation(conversion) ||
    hasSgpSale(conversion)
  );
}

function isWhatsappEvent(conversion: ConversionWithAffiliate) {
  return /whatsapp|wa\.me|api\.whatsapp/.test(
    getConversionSearchText(conversion)
  );
}

function hasChatmixValidation(conversion: ConversionWithAffiliate) {
  return (
    /chatmix|webhook/.test(getConversionSearchText(conversion)) ||
    hasSgpSale(conversion)
  );
}

function hasSgpSale(conversion: ConversionWithAffiliate) {
  return /sgp|spg|venda|sale|concluid|aprovad|contrato|finalizad/.test(
    getConversionSearchText(conversion)
  );
}

function getConversionSearchText(conversion: ConversionWithAffiliate) {
  return [
    conversion.type,
    conversion.product,
    conversion.destination,
    conversion.userAgent,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatEventType(type: string) {
  if (!type) {
    return "Nao informado";
  }

  return type
    .replace(/^chatmix:/, "Chatmix - ")
    .replace(/_/g, " ");
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data invalida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getAffiliateInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "AF";
}
