import { useState } from "react";
import {
  FiCopy,
  FiCreditCard,
  FiGrid,
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

type AffiliateViewMode =
  (typeof affiliateViewOptions)[number]["value"];

type AffiliateLink = AffiliateDetail["links"][number];

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
}: AffiliateDetailsProps) {
  const [deletingLinkId, setDeletingLinkId] =
    useState<number | null>(null);
  const [viewMode, setViewMode] =
    useState<AffiliateViewMode>("detailed");

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

        </div>
      </div>

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
          Nenhum afiliado encontrado no relatorio.
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
              <th className={styles.smallCell}>Nome do link</th>
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
                  <strong>{l.name || "Sem nome"}</strong>
                </td>

                <td className={styles.smallCell}>
                  <div className={styles.linkInfo}>
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

function getAffiliateInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "AF";
}
