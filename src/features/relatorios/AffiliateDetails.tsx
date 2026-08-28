import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type {
  ComponentType,
  CSSProperties,
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";
import {
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiCreditCard,
  FiEdit2,
  FiGitBranch,
  FiGrid,
  FiLink,
  FiList,
  FiMessageCircle,
  FiRefreshCw,
  FiSave,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";

import {
  apagarConversao,
  apagarLink,
  type AffiliateContact,
  consultarClienteSgp,
  editarConversao,
  getApiErrorMessage,
} from "@/lib/api";
import { formatDisplayLink } from "@/lib/links";
import { AffiliateDetail } from "./useRelatorios";
import styles from "./relatorios.module.css";

interface AffiliateDetailsProps {
  details: AffiliateDetail[];
  refresh: () => void;
  refreshing: boolean;
  emptyMessage?: string;
  initialDetailTab?: DetailTab;
  initialConversionReportView?: ConversionReportView;
  hideAffiliateSelector?: boolean;
  hideAffiliatePanel?: boolean;
}

type AffiliateLink = AffiliateDetail["links"][number];
type AffiliateConversion = AffiliateDetail["conversionEvents"][number];

type ConversionWithAffiliate = AffiliateConversion & {
  affiliate: string;
  affiliateId: number;
};

type ConversionEditForm = {
  visitorName: string;
  visitorPhone: string;
  visitorDocument: string;
  visitorCity: string;
  product: string;
};

type ConversionStepDataItem = {
  label: string;
  value: string;
};

type ConversionStep = {
  title: string;
  description: string;
  completed: boolean;
  detail: string;
  dateLabel: string;
  dataItems?: ConversionStepDataItem[];
};

type StageStatusOverrides = Record<string, boolean>;

type SgpStageCheckStatus =
  | "checking"
  | "not_found"
  | "active"
  | "inactive"
  | "divergent"
  | "error";

type SgpStageCheck = {
  status: SgpStageCheckStatus;
  document: string;
  statusLabel: string;
  messages?: string[];
};

type SgpStageChecks = Record<number, SgpStageCheck>;

type SelectOption<T extends string> = {
  value: T;
  label: string;
  icon: ComponentType<{ "aria-hidden"?: true; className?: string }>;
};

type AffiliateViewMode = "compact" | "medium" | "detailed";
type DetailTab = "links" | "conversions";
type ClientDataTab = "main" | "access" | "device";
type ConversionLinkFilter = Pick<AffiliateLink, "id" | "name" | "shortCode">;
type ConversionReportView = "objective" | "flow";
type SaleStatusKind = "sold" | "in_progress" | "lost" | "pending";
type ConversionStatusFilter = "all" | SaleStatusKind;

type SaleStatusInfo = {
  kind: SaleStatusKind;
  label: string;
  description: string;
};

const DEFAULT_EMPTY_MESSAGE = "Nenhum afiliado encontrado no relatório.";

const AFFILIATE_VIEW_OPTIONS: SelectOption<AffiliateViewMode>[] = [
  { value: "compact", label: "Visualização compacta", icon: FiList },
  { value: "medium", label: "Visualização média", icon: FiCreditCard },
  { value: "detailed", label: "Visualização detalhada", icon: FiGrid },
];

const DETAIL_TAB_OPTIONS: SelectOption<DetailTab>[] = [
  { value: "links", label: "Links", icon: FiLink },
  { value: "conversions", label: "Conv.", icon: FiGitBranch },
];

const CONVERSION_STAGE_ICONS = [
  FiLink,
  FiMessageCircle,
  FiGitBranch,
  FiCreditCard,
] as const;

const CONVERSION_STAGE_IMAGES: Record<number, string> = {
  1: "/conversion-icons/whatsapp.png",
  2: "/conversion-icons/chatmix.png",
  3: "/conversion-icons/sgp.png",
};

const INITIAL_CONVERSION_FORM: ConversionEditForm = {
  visitorName: "",
  visitorPhone: "",
  visitorDocument: "",
  visitorCity: "",
  product: "",
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export default function AffiliateDetails({
  details,
  refresh,
  refreshing,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  initialDetailTab = "links",
  initialConversionReportView = "objective",
  hideAffiliateSelector = false,
  hideAffiliatePanel = false,
}: AffiliateDetailsProps) {
  const [deletingLinkId, setDeletingLinkId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<AffiliateViewMode>("detailed");
  const [detailTab, setDetailTab] = useState<DetailTab>(initialDetailTab);
  const [conversionLinkFilter, setConversionLinkFilter] =
    useState<ConversionLinkFilter | null>(null);

  const conversionEvents = useConversionEvents(details);
  const conversionRanking = useConversionRanking(details);
  const totalConversions = useTotalConversions(details);

  const affiliateListClassName = cx(
    styles.affiliateList,
    viewMode === "compact" && styles.affiliateListCompact,
    viewMode === "medium" && styles.affiliateListMedium,
    viewMode === "detailed" && styles.affiliateListDetailed,
  );

  async function handleCopyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      alert("Link copiado com sucesso!");
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      alert("Erro ao copiar o link.");
    }
  }

  async function handleDeleteLink(id: number, name?: string | null) {
    const label = name || `ID #${id}`;
    const confirmed = window.confirm(
      `Deseja apagar o link "${label}"? Essa ação também remove os cliques desse link.`,
    );

    if (!confirmed) return;

    setDeletingLinkId(id);

    try {
      await apagarLink(id);
      refresh();
    } catch (error) {
      alert(getApiErrorMessage(error, "Não foi possível apagar o link."));
    } finally {
      setDeletingLinkId(null);
    }
  }

  function handleChangeDetailTab(tab: DetailTab) {
    if (tab === "conversions") {
      setConversionLinkFilter(null);
    }

    setDetailTab(tab);
  }

  function handleOpenLinkConversions(link: AffiliateLink) {
    if ((link.conversions ?? 0) <= 0) return;

    setConversionLinkFilter({
      id: link.id,
      name: link.name,
      shortCode: link.shortCode,
    });
    setDetailTab("conversions");
  }

  return (
    <section className={styles.affiliateDetailsSurface}>
      <DetailsHeader
        activeTab={detailTab}
        activeViewMode={viewMode}
        onChangeTab={handleChangeDetailTab}
        onChangeViewMode={setViewMode}
      />

      {detailTab === "links" ? (
        <LinksTab
          details={details}
          emptyMessage={emptyMessage}
          affiliateListClassName={affiliateListClassName}
          conversionRanking={conversionRanking}
          totalConversions={totalConversions}
          deletingLinkId={deletingLinkId}
          refreshing={refreshing}
          onRefresh={refresh}
          onCopyLink={handleCopyLink}
          onDeleteLink={handleDeleteLink}
          onOpenLinkConversions={handleOpenLinkConversions}
          viewMode={viewMode}
        />
      ) : (
        <ConversionFlowPanel
          details={details}
          conversionEvents={conversionEvents}
          emptyMessage={emptyMessage}
          totalConversions={totalConversions}
          onRefresh={refresh}
          linkFilter={conversionLinkFilter}
          onClearLinkFilter={() => setConversionLinkFilter(null)}
          initialView={initialConversionReportView}
          hideAffiliateSelector={hideAffiliateSelector}
          hideAffiliatePanel={hideAffiliatePanel}
        />
      )}
    </section>
  );
}

function DetailsHeader({
  activeTab,
  activeViewMode,
  onChangeTab,
  onChangeViewMode,
}: {
  activeTab: DetailTab;
  activeViewMode: AffiliateViewMode;
  onChangeTab: (value: DetailTab) => void;
  onChangeViewMode: (value: AffiliateViewMode) => void;
}) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionTitle}>Afiliados</h2>

      <div className={styles.headerActions}>
        <SegmentedControl
          ariaLabel="Dados do detalhe"
          role="tablist"
          options={DETAIL_TAB_OPTIONS}
          value={activeTab}
          onChange={onChangeTab}
          buttonClassName={styles.detailTab}
          activeClassName={styles.detailTabActive}
          renderLabel
        />

        {activeTab === "links" && (
          <SegmentedControl
            ariaLabel="Visualização dos afiliados"
            role="group"
            options={AFFILIATE_VIEW_OPTIONS}
            value={activeViewMode}
            onChange={onChangeViewMode}
            buttonClassName={styles.viewButton}
            activeClassName={styles.viewButtonActive}
          />
        )}
      </div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  ariaLabel,
  role,
  options,
  value,
  onChange,
  buttonClassName,
  activeClassName,
  renderLabel = false,
}: {
  ariaLabel: string;
  role: "group" | "tablist";
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  buttonClassName: string;
  activeClassName: string;
  renderLabel?: boolean;
}) {
  const containerClassName =
    role === "tablist" ? styles.detailTabs : styles.viewSwitcher;

  return (
    <div className={containerClassName} aria-label={ariaLabel} role={role}>
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            className={cx(buttonClassName, isActive && activeClassName)}
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={role === "group" ? isActive : undefined}
            aria-selected={role === "tablist" ? isActive : undefined}
            role={role === "tablist" ? "tab" : undefined}
            title={option.label}
          >
            <Icon aria-hidden={true} />
            {renderLabel && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

function LinksTab({
  details,
  emptyMessage,
  affiliateListClassName,
  conversionRanking,
  totalConversions,
  deletingLinkId,
  refreshing,
  onRefresh,
  onCopyLink,
  onDeleteLink,
  onOpenLinkConversions,
  viewMode,
}: {
  details: AffiliateDetail[];
  emptyMessage: string;
  affiliateListClassName: string;
  conversionRanking: AffiliateDetail[];
  totalConversions: number;
  deletingLinkId: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  onCopyLink: (link: string) => Promise<void>;
  onDeleteLink: (id: number, name?: string | null) => Promise<void>;
  onOpenLinkConversions: (link: AffiliateLink) => void;
  viewMode: AffiliateViewMode;
}) {
  return (
    <>
      <ConversionSummary
        totalConversions={totalConversions}
        ranking={conversionRanking}
      />

      {details.length === 0 ? (
        <p className={styles.emptyText}>{emptyMessage}</p>
      ) : (
        <div className={affiliateListClassName}>
          {details.map((affiliate) => (
            <AffiliateCardByViewMode
              key={affiliate.affiliateId}
              block={affiliate}
              viewMode={viewMode}
              deletingLinkId={deletingLinkId}
              refreshingReport={refreshing}
              onRefreshReport={onRefresh}
              onCopyLink={onCopyLink}
              onDeleteLink={onDeleteLink}
              onOpenLinkConversions={onOpenLinkConversions}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ConversionSummary({
  totalConversions,
  ranking,
}: {
  totalConversions: number;
  ranking: AffiliateDetail[];
}) {
  return (
    <div className={styles.conversionSummary}>
      <div className={styles.conversionHero}>
        <span>Conv. WhatsApp</span>
        <strong>{totalConversions}</strong>
        <p>Cliques no botao da landing que vieram de links de divulgação.</p>
      </div>

      <div className={styles.conversionRanking}>
        <div className={styles.rankingHeader}>
          <strong>Top afiliados</strong>
          <span>{ranking.length} conv.</span>
        </div>

        {ranking.length === 0 ? (
          <p className={styles.emptyText}>
            Nenhum afiliado gerou conversão ainda.
          </p>
        ) : (
          <div className={styles.rankingList}>
            {ranking.map((affiliate, index) => (
              <div key={affiliate.affiliateId} className={styles.rankingItem}>
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
  );
}

function AffiliateCardByViewMode({
  viewMode,
  ...cardProps
}: AffiliateCardProps & { viewMode: AffiliateViewMode }) {
  const CardComponent = {
    compact: AffiliateCompactCard,
    medium: AffiliateMediumCard,
    detailed: AffiliateDetailedCard,
  }[viewMode];

  return <CardComponent {...cardProps} />;
}

type AffiliateCardProps = {
  block: AffiliateDetail;
  deletingLinkId: number | null;
  refreshingReport: boolean;
  onRefreshReport: () => void;
  onCopyLink: (link: string) => Promise<void>;
  onDeleteLink: (id: number, name?: string | null) => Promise<void>;
  onOpenLinkConversions: (link: AffiliateLink) => void;
};

function AffiliateCompactCard({
  block,
  deletingLinkId,
  refreshingReport,
  onRefreshReport,
  onCopyLink,
  onDeleteLink,
  onOpenLinkConversions,
}: AffiliateCardProps) {
  const primaryLink = block.links[0];

  return (
    <article className={cx(styles.affiliateCard, styles.affiliateCardCompact)}>
      <div className={styles.compactHeader}>
        <span className={styles.initialBadge}>
          {getAffiliateInitials(block.affiliate)}
        </span>

        <AffiliateIdentity
          name={block.affiliate}
          id={block.affiliateId}
          compact
        />

        <RefreshReportButton
          refreshing={refreshingReport}
          onRefresh={onRefreshReport}
          compact
        />
      </div>

      <AffiliateStats
        links={block.totalLinks}
        clicks={block.totalClicks}
        conversions={block.totalConversions ?? 0}
        compact
      />

      {primaryLink ? (
        <div className={styles.compactLink}>
          <LinkPreview link={primaryLink} />

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
  onOpenLinkConversions,
}: AffiliateCardProps) {
  const previewLinks = block.links.slice(0, 3);
  const hiddenLinks = Math.max(block.links.length - previewLinks.length, 0);

  return (
    <article className={cx(styles.affiliateCard, styles.affiliateCardMedium)}>
      <AffiliateCardHeader
        block={block}
        refreshing={refreshingReport}
        onRefresh={onRefreshReport}
      />

      <AffiliateStats
        links={block.totalLinks}
        clicks={block.totalClicks}
        conversions={block.totalConversions ?? 0}
      />

      <div className={styles.linkPreviewHeader}>
        <h4>Links de divulgação</h4>
        <span>{block.links.length} links</span>
      </div>

      {previewLinks.length === 0 ? (
        <p className={styles.emptyInlineText}>Nenhum link cadastrado.</p>
      ) : (
        <div className={styles.linkPreviewList}>
          {previewLinks.map((link) => (
            <div key={link.id} className={styles.linkPreviewRow}>
              <LinkPreview link={link} />

              <LinkMetrics
                link={link}
                onOpenConversions={onOpenLinkConversions}
              />

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

function AffiliateShowcaseAvatar({ block }: { block: AffiliateDetail }) {
  const photoUrl = getAffiliatePhotoUrl(block);
  const initials = getAffiliateInitials(block.affiliate);
  const avatarPalette = getAffiliateAvatarPalette(
    block.affiliate,
    block.affiliateId,
  );

  const avatarStyle = {
    "--avatar-bg": avatarPalette.background,
    "--avatar-color": avatarPalette.color,
  } as CSSProperties;

  return (
    <div className={styles.showcaseAvatar}>
      <div className={styles.showcaseAvatarCircle} style={avatarStyle}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`Foto de ${block.affiliate}`}
            className={styles.showcaseAvatarImage}
          />
        ) : (
          <span className={styles.showcaseAvatarInitials}>{initials}</span>
        )}
      </div>

      <strong title={block.affiliate}>{block.affiliate}</strong>
      <span className={styles.showcaseAvatarHint}>
        {photoUrl ? "Foto do afiliado" : "Iniciais do afiliado"}
      </span>
    </div>
  );
}

function AffiliateDetailedCard({
  block,
  deletingLinkId,
  onCopyLink,
  onDeleteLink,
  onOpenLinkConversions,
}: AffiliateCardProps) {
  const contacts =
    block.contacts?.length > 0
      ? block.contacts
      : contactsFromConversions(block.conversionEvents ?? []);
  const totalContacts = contacts.length;

  return (
    <article className={styles.affiliateLinkShowcase}>
      <AffiliateShowcaseAvatar block={block} />

      <div className={styles.showcaseAffiliatePanel}>
        <strong className={styles.showcaseDetailTitle}>Detalhe</strong>
        <div className={styles.showcaseAffiliateFields}>
          <div>
            <strong>Links</strong>
            <span>{block.totalLinks}</span>
          </div>
          <div>
            <strong>Cliques</strong>
            <span>{block.totalClicks}</span>
          </div>
          <div>
            <strong>Atendimentos</strong>
            <span>{block.totalConversions ?? 0}</span>
          </div>
          <div>
            <strong>Clientes</strong>
            <span>{totalContacts}</span>
          </div>
        </div>
      </div>

      <div className={styles.showcaseLinksPanel}>
        <div className={styles.showcaseTopBar}>
          <strong>Links do afiliado</strong>
        </div>

        {block.links.length === 0 ? (
          <p className={styles.emptyInlineText}>Nenhum link cadastrado.</p>
        ) : (
          <div className={styles.showcaseLinkList}>
            {block.links.map((link) => (
              <AffiliateShowcaseLink
                key={link.id}
                link={link}
                deleting={deletingLinkId === link.id}
                onCopyLink={onCopyLink}
                onDeleteLink={onDeleteLink}
                onOpenConversions={onOpenLinkConversions}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.showcaseContactsPanel}>
        <div className={styles.showcaseTopBar}>
          <strong>Clientes alcançados</strong>
          <span className={styles.showcaseContactCount}>
            <FiUsers aria-hidden="true" /> {totalContacts}
          </span>
        </div>

        {contacts.length === 0 ? (
          <p className={styles.emptyInlineText}>
            Nenhum cliente identificado nas conversões.
          </p>
        ) : (
          <div className={styles.showcaseContactList}>
            {contacts.map((contact) => (
              <article className={styles.showcaseContactCard} key={contact.id}>
                <span className={styles.showcaseContactAvatar} aria-hidden="true">
                  {(contact.name || contact.phone || "C").trim().charAt(0).toUpperCase()}
                </span>
                <div className={styles.showcaseContactIdentity}>
                  <strong>{contact.name || "Cliente não identificado"}</strong>
                  <span>
                    {contact.phone
                      ? formatPhone(contact.phone)
                      : contact.document
                        ? formatDocument(contact.document)
                        : "Contato não informado"}
                  </span>
                  <small>
                    {contact.shortCodes.map((code) => `#${code}`).join(" ")}
                  </small>
                </div>
                <div className={styles.showcaseContactMetric}>
                  <strong>{contact.totalAttendances}</strong>
                  <span>
                    {contact.totalAttendances === 1
                      ? "atendimento"
                      : "atendimentos"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function AffiliateShowcaseLink({
  link,
  deleting,
  onCopyLink,
  onDeleteLink,
  onOpenConversions,
}: {
  link: AffiliateLink;
  deleting: boolean;
  onCopyLink: (link: string) => Promise<void>;
  onDeleteLink: (id: number, name?: string | null) => Promise<void>;
  onOpenConversions: (link: AffiliateLink) => void;
}) {
  const hasConversions = (link.conversions ?? 0) > 0;

  return (
    <section
      className={cx(
        styles.showcaseLinkCard,
        hasConversions && styles.showcaseLinkCardConverted,
      )}
    >
      <div className={styles.showcaseLinkInfo}>
        <strong>Nome: {link.name || "Link sem nome"}</strong>
        <span title={link.originalUrl}>
          Destino: {formatDisplayLink(link.originalUrl)}
        </span>
        <a
          href={link.promoLink}
          target="_blank"
          rel="noopener noreferrer"
          title={link.promoLink}
        >
          Afiliado: {formatDisplayLink(link.promoLink)}
        </a>
      </div>

      <div
        className={cx(
          styles.showcaseMetrics,
          hasConversions && styles.showcaseMetricsConverted,
        )}
      >
        <span>
          Links: <strong>{link.shortCode}</strong>
        </span>
        <span>
          Cliques: <strong>{link.clicks}</strong>
        </span>
        {hasConversions ? (
          <button
            type="button"
            className={cx(
              styles.showcaseMetricButton,
              styles.showcaseMetricButtonActive,
            )}
            onClick={() => onOpenConversions(link)}
            aria-label={`Ver ${link.conversions} conversões do link ${
              link.name || link.shortCode
            }`}
            title="Ver fluxograma e dados coletados"
          >
            Conversões: <strong>{link.conversions ?? 0}</strong>
          </button>
        ) : (
          <span>
            Conversões: <strong>0</strong>
          </span>
        )}
      </div>

      <div className={styles.showcaseLinkActions}>
        <button
          type="button"
          onClick={() => onDeleteLink(link.id, link.name)}
          disabled={deleting}
          aria-label={`Apagar link ${link.name || link.shortCode}`}
          title="Apagar link"
        >
          <FiTrash2 aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onCopyLink(link.promoLink)}
          aria-label={`Copiar link ${link.name || link.shortCode}`}
          title="Copiar link"
        >
          <FiCopy aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function AffiliateCardHeader({
  block,
  refreshing,
  onRefresh,
}: {
  block: AffiliateDetail;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className={styles.affiliateHeader}>
      <AffiliateIdentity name={block.affiliate} id={block.affiliateId} />

      <RefreshReportButton refreshing={refreshing} onRefresh={onRefresh} />
    </div>
  );
}

function AffiliateIdentity({
  name,
  id,
  compact = false,
}: {
  name: string;
  id: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? styles.compactIdentity : undefined}>
      <h3 className={styles.affiliateName}>{name}</h3>
      <span className={styles.affiliateId}>ID #{id}</span>
    </div>
  );
}

function AffiliateStats({
  links,
  clicks,
  conversions,
  compact = false,
}: {
  links: number;
  clicks: number;
  conversions: number;
  compact?: boolean;
}) {
  const stats = [
    { label: "Links", value: links },
    { label: "Cliques", value: clicks },
    { label: "Conversões", value: conversions },
  ];

  if (compact) {
    return (
      <div className={styles.compactStats}>
        {stats.map((stat) => (
          <MiniStat key={stat.label} {...stat} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.statsGrid}>
      {stats.map((stat) => (
        <div key={stat.label} className={styles.statBox}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </div>
      ))}
    </div>
  );
}

function AffiliateLinksTable({
  links,
  deletingLinkId,
  onCopyLink,
  onDeleteLink,
}: {
  links: AffiliateLink[];
  deletingLinkId: number | null;
  onCopyLink: (link: string) => Promise<void>;
  onDeleteLink: (id: number, name?: string | null) => Promise<void>;
}) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.tableHead}>
            <th className={styles.smallCell}>Links dos afiliados</th>
            <th className={styles.smallCell}>Cliques</th>
            <th className={styles.smallCell}>Conversões</th>
            <th className={styles.smallCell}>Copiar Link</th>
            <th className={styles.smallCell}>Apagar</th>
          </tr>
        </thead>

        <tbody>
          {links.map((link) => (
            <AffiliateLinkRow
              key={link.id}
              link={link}
              deleting={deletingLinkId === link.id}
              onCopyLink={onCopyLink}
              onDeleteLink={onDeleteLink}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AffiliateLinkRow({
  link,
  deleting,
  onCopyLink,
  onDeleteLink,
}: {
  link: AffiliateLink;
  deleting: boolean;
  onCopyLink: (link: string) => Promise<void>;
  onDeleteLink: (id: number, name?: string | null) => Promise<void>;
}) {
  const hasConversions = (link.conversions ?? 0) > 0;

  return (
    <tr
      className={cx(
        styles.tableRow,
        hasConversions && styles.tableRowConverted,
      )}
    >
      <td className={styles.smallCell}>
        <div className={styles.linkInfo}>
          <strong className={styles.linkNameHighlight}>
            {link.name || "Link sem nome"}
          </strong>

          <LinkInfo label="Destino">
            <span className={styles.breakWord} title={link.originalUrl}>
              {formatDisplayLink(link.originalUrl)}
            </span>
          </LinkInfo>

          <LinkInfo label="Afiliado">
            <a
              href={link.promoLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cx(styles.link, styles.breakWord)}
              title={link.promoLink}
            >
              {formatDisplayLink(link.promoLink)}
            </a>
          </LinkInfo>
        </div>
      </td>

      <td className={styles.smallCell}>
        <span className={styles.clickBadge}>{link.clicks}</span>
      </td>

      <td className={styles.smallCell}>
        <ConversionCountBadge value={link.conversions ?? 0} />
      </td>

      <td className={styles.smallCell}>
        <button
          type="button"
          className={styles.copyButton}
          onClick={() => onCopyLink(link.promoLink)}
        >
          <FiCopy aria-hidden="true" />
          Copiar
        </button>
      </td>

      <td className={styles.smallCell}>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={() => onDeleteLink(link.id, link.name)}
          disabled={deleting}
        >
          <FiTrash2 aria-hidden="true" />
          {deleting ? "Apagando..." : "Apagar"}
        </button>
      </td>
    </tr>
  );
}

function LinkInfo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.linkGroup}>
      <span className={styles.linkLabel}>{label}:</span>
      {children}
    </div>
  );
}

function LinkPreview({ link }: { link: AffiliateLink }) {
  return (
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
  );
}

function LinkMetrics({
  link,
  onOpenConversions,
}: {
  link: AffiliateLink;
  onOpenConversions: (link: AffiliateLink) => void;
}) {
  return (
    <div className={styles.previewMetrics}>
      <span className={styles.clickBadge}>{link.clicks}</span>
      <ConversionCountBadge
        value={link.conversions ?? 0}
        onClick={() => onOpenConversions(link)}
      />
    </div>
  );
}

function ConversionCountBadge({
  value,
  onClick,
}: {
  value: number;
  onClick?: () => void;
}) {
  if (value > 0 && onClick) {
    return (
      <button
        type="button"
        className={cx(styles.conversionBadge, styles.conversionBadgeButton)}
        onClick={onClick}
        title="Ver fluxograma e dados coletados"
      >
        {value}
      </button>
    );
  }

  return (
    <span className={value > 0 ? styles.conversionBadge : styles.zeroBadge}>
      {value}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
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
  onDeleteLink: (id: number, name?: string | null) => Promise<void>;
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
        className={cx(styles.iconActionButton, styles.iconDangerButton)}
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
  const label = refreshing ? "Atualizando..." : "Atualizar relatório";

  return (
    <button
      type="button"
      className={cx(
        styles.refreshButton,
        styles.affiliateRefreshButton,
        compact && styles.compactRefreshButton,
      )}
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

function ConversionFlowPanel({
  details,
  conversionEvents,
  emptyMessage,
  totalConversions,
  onRefresh,
  linkFilter,
  onClearLinkFilter,
  initialView,
  hideAffiliateSelector,
  hideAffiliatePanel,
}: {
  details: AffiliateDetail[];
  conversionEvents: ConversionWithAffiliate[];
  emptyMessage: string;
  totalConversions: number;
  onRefresh: () => void;
  linkFilter: ConversionLinkFilter | null;
  onClearLinkFilter: () => void;
  initialView: ConversionReportView;
  hideAffiliateSelector: boolean;
  hideAffiliatePanel: boolean;
}) {
  const [editingConversionId, setEditingConversionId] = useState<number | null>(
    null,
  );
  const [savingConversionId, setSavingConversionId] = useState<number | null>(
    null,
  );
  const [deletingConversionId, setDeletingConversionId] = useState<
    number | null
  >(null);
  const [validatingSgpId, setValidatingSgpId] = useState<number | null>(null);
  const [stageStatusOverrides, setStageStatusOverrides] =
    useState<StageStatusOverrides>({});
  const [sgpStageChecks, setSgpStageChecks] = useState<SgpStageChecks>({});
  const [selectedAffiliateId, setSelectedAffiliateId] = useState("all");
  const [codeFilter, setCodeFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ConversionStatusFilter>("all");
  const [conversionReportView, setConversionReportView] =
    useState<ConversionReportView>(initialView);
  const [selectedConversionForData, setSelectedConversionForData] =
    useState<ConversionWithAffiliate | null>(null);
  const [activeClientTab, setActiveClientTab] = useState<ClientDataTab>("main");
  const [editForm, setEditForm] = useState<ConversionEditForm>(
    INITIAL_CONVERSION_FORM,
  );

  const selectedAffiliate = useMemo(
    () =>
      selectedAffiliateId === "all"
        ? null
        : (details.find(
            (detail) => String(detail.affiliateId) === selectedAffiliateId,
          ) ?? null),
    [details, selectedAffiliateId],
  );
  const affiliateOptions = details.map((detail) => ({
    id: detail.affiliateId,
    name: detail.affiliate,
  }));
  const affiliateScopedConversionEvents = useMemo(
    () =>
      conversionEvents.filter(
        (conversion) =>
          selectedAffiliateId === "all" ||
          String(conversion.affiliateId) === selectedAffiliateId,
      ),
    [conversionEvents, selectedAffiliateId],
  );
  const codeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          affiliateScopedConversionEvents
            .map((conversion) => conversion.shortCode)
            .filter(Boolean),
        ),
      ).sort(),
    [affiliateScopedConversionEvents],
  );
  const effectiveCodeFilter = codeFilter || linkFilter?.shortCode || "";
  const filteredConversionEvents = useMemo(
    () =>
      affiliateScopedConversionEvents.filter((conversion) => {
        const matchesCode =
          !effectiveCodeFilter || conversion.shortCode === effectiveCodeFilter;
        const matchesDate =
          !dateFilter ||
          getDateInputValue(conversion.convertedAt) === dateFilter;

        return matchesCode && matchesDate;
      }),
    [affiliateScopedConversionEvents, dateFilter, effectiveCodeFilter],
  );
  const visibleDetails = selectedAffiliate ? [selectedAffiliate] : details;
  const reportStats = getConversionReportStats(
    visibleDetails,
    filteredConversionEvents,
    sgpStageChecks,
    stageStatusOverrides,
  );
  const flowMetrics: Array<{
    label: string;
    value: number;
    filter: ConversionStatusFilter;
  }> = [
    {
      label: "Conv.",
      value: filteredConversionEvents.length,
      filter: "all",
    },
    {
      label: "Atendimento",
      value: reportStats.inProgress,
      filter: "in_progress",
    },
    { label: "Vendidas", value: reportStats.sold, filter: "sold" },
    { label: "Perdidas", value: reportStats.lost, filter: "lost" },
  ];
  const statusFilteredConversionEvents = useMemo(
    () =>
      filteredConversionEvents.filter((conversion) => {
        if (statusFilter === "all") return true;

        const steps = getStepsWithOverrides(conversion, stageStatusOverrides);
        const saleStatus = getSaleStatusInfo(
          conversion,
          steps,
          sgpStageChecks[conversion.id],
        );

        return saleStatus.kind === statusFilter;
      }),
    [
      filteredConversionEvents,
      sgpStageChecks,
      stageStatusOverrides,
      statusFilter,
    ],
  );

  function startEditingConversion(conversion: ConversionWithAffiliate) {
    setEditingConversionId(conversion.id);
    setEditForm({
      visitorName: conversion.visitorName || "",
      visitorPhone: conversion.visitorPhone || "",
      visitorDocument: conversion.visitorDocument || "",
      visitorCity: conversion.visitorCity || "",
      product: conversion.product || "",
    });
  }

  function cancelEditingConversion() {
    setEditingConversionId(null);
    setEditForm(INITIAL_CONVERSION_FORM);
  }

  async function saveConversion(id: number) {
    setSavingConversionId(id);

    try {
      await editarConversao(id, normalizeConversionForm(editForm));
      cancelEditingConversion();
      setSelectedConversionForData(null);
      onRefresh();
    } catch (error) {
      alert(
        getApiErrorMessage(error, "Não foi possível atualizar a conversão."),
      );
    } finally {
      setSavingConversionId(null);
    }
  }

  async function deleteConversion(conversion: ConversionWithAffiliate) {
    const confirmed = window.confirm(
      `Apagar a conversão #${conversion.id}? Essa ação remove o pré-cadastro salvo.`,
    );

    if (!confirmed) return;

    setDeletingConversionId(conversion.id);

    try {
      await apagarConversao(conversion.id);
      onRefresh();
    } catch (error) {
      alert(getApiErrorMessage(error, "Não foi possível apagar a conversão."));
    } finally {
      setDeletingConversionId(null);
    }
  }

  function toggleStageStatus(conversionId: number, stepIndex: number) {
    setStageStatusOverrides((current) => {
      const key = getStageStatusKey(conversionId, stepIndex);
      const originalValue = getOriginalStageStatus(
        conversionEvents,
        conversionId,
        stepIndex,
      );

      return {
        ...current,
        [key]: !(current[key] ?? originalValue),
      };
    });
  }

  const validateSgpConversion = useCallback(
    async (
      conversion: ConversionWithAffiliate,
      options: { showAlert?: boolean; showLoading?: boolean } = {},
    ) => {
      const { showAlert = true, showLoading = true } = options;
      const document = onlyDigits(conversion.visitorDocument || "");
      const sgpStepIndex = 3;

      if (![11, 14].includes(document.length)) {
        setSgpStageChecks((current) => ({
          ...current,
          [conversion.id]: {
            status: "error",
            document,
            statusLabel: "CPF/CNPJ inválido",
          },
        }));
        if (showAlert) {
          alert(
            "Informe um CPF ou CNPJ válido no pré-cadastro para validar automaticamente no SGP.",
          );
        }
        return;
      }

      setSgpStageChecks((current) => ({
        ...current,
        [conversion.id]: {
          status: "checking",
          document,
          statusLabel: "Consultando SGP...",
        },
      }));
      if (showLoading) {
        setValidatingSgpId(conversion.id);
      }

      try {
        const response = await consultarClienteSgp(document);
        if (!hasRegisteredSgpCustomer(response.customer, document)) {
          setSgpStageChecks((current) => ({
            ...current,
            [conversion.id]: {
              status: "not_found",
              document,
              statusLabel: "Não cadastrado no SGP",
            },
          }));
          setStageStatusOverrides((current) => ({
            ...current,
            [getStageStatusKey(conversion.id, sgpStepIndex)]: false,
          }));
          if (showAlert) {
            alert(
              "CPF/CNPJ do pré-cadastro ainda não foi encontrado como cliente cadastrado no SGP.",
            );
          }
          return;
        }

        const validation = validatePreCadastroWithSgp(
          conversion,
          response.customer,
        );
        const isActive = response.customer.active === true;
        const hasKnownInactiveStatus = response.customer.active === false;
        setSgpStageChecks((current) => ({
          ...current,
          [conversion.id]: {
            status: isActive
              ? "active"
              : hasKnownInactiveStatus
                ? "inactive"
                : "divergent",
            document,
            statusLabel: isActive
              ? "Ativo no SGP"
              : hasKnownInactiveStatus
                ? response.customer.status || "Não ativo no SGP"
                : response.customer.status || "Status não informado",
            messages: validation.messages,
          },
        }));
        setStageStatusOverrides((current) => ({
          ...current,
          [getStageStatusKey(conversion.id, sgpStepIndex)]: isActive,
        }));
      } catch (error) {
        setSgpStageChecks((current) => ({
          ...current,
          [conversion.id]: {
            status: "error",
            document,
            statusLabel: "Erro ao consultar SGP",
          },
        }));
        if (showAlert) {
          alert(getApiErrorMessage(error, "Não foi possível validar no SGP."));
        }
      } finally {
        if (showLoading) {
          setValidatingSgpId(null);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const pendingConversions = conversionEvents.filter((conversion) => {
      const document = onlyDigits(conversion.visitorDocument);
      if (![11, 14].includes(document.length)) return false;

      const currentCheck = sgpStageChecks[conversion.id];
      return currentCheck?.document !== document;
    });

    pendingConversions.forEach((conversion) => {
      void validateSgpConversion(conversion, {
        showAlert: false,
        showLoading: false,
      });
    });
  }, [conversionEvents, sgpStageChecks, validateSgpConversion]);

  function openConversionData(conversion: ConversionWithAffiliate) {
    cancelEditingConversion();
    setSelectedConversionForData(conversion);
  }

  function handleSelectAffiliate(nextAffiliateId: string) {
    const nextCodes = new Set(
      conversionEvents
        .filter(
          (conversion) =>
            nextAffiliateId === "all" ||
            String(conversion.affiliateId) === nextAffiliateId,
        )
        .map((conversion) => conversion.shortCode)
        .filter(Boolean),
    );

    setSelectedAffiliateId(nextAffiliateId);

    if (codeFilter && !nextCodes.has(codeFilter)) {
      setCodeFilter("");
    }

    if (linkFilter?.shortCode && !nextCodes.has(linkFilter.shortCode)) {
      onClearLinkFilter();
    }
  }

  return (
    <section className={styles.conversionFlowPanel} role="tabpanel">
      <div
        className={cx(
          styles.conversionReportShell,
          hideAffiliatePanel && styles.conversionReportShellFull,
        )}
      >
        {!hideAffiliatePanel && (
          <aside className={styles.conversionAffiliatePanel}>
            {!hideAffiliateSelector && (
              <label className={styles.reportSelectField}>
                <span>Selecione o afiliado</span>
                <select
                  value={selectedAffiliateId}
                  onChange={(event) =>
                    handleSelectAffiliate(event.target.value)
                  }
                >
                  <option value="all">Todos</option>
                  {affiliateOptions.map((affiliate) => (
                    <option key={affiliate.id} value={affiliate.id}>
                      {affiliate.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <AffiliateReportProfile
              details={details}
              selectedAffiliate={selectedAffiliate}
              stats={reportStats}
            />
          </aside>
        )}

        <div className={styles.conversionReportMain}>
          <div className={styles.conversionReportTitleRow}>
            <h3>Conversões de clientes</h3>
            <div className={styles.conversionViewSwitcher}>
              <span>
                {statusFilteredConversionEvents.length} exibidas
              </span>
              <button
                type="button"
                className={cx(
                  conversionReportView === "objective" &&
                    styles.conversionViewButtonActive,
                )}
                onClick={() => setConversionReportView("objective")}
              >
                Resumo
              </button>
              <button
                type="button"
                className={cx(
                  conversionReportView === "flow" &&
                    styles.conversionViewButtonActive,
                )}
                onClick={() => setConversionReportView("flow")}
              >
                Fluxo
              </button>
            </div>
          </div>

          <div className={styles.conversionReportFilters}>
 
             {hideAffiliatePanel && (
              <AffiliateFilterPicker
                details={details}
                selectedAffiliateId={selectedAffiliateId}
                onSelectAffiliate={handleSelectAffiliate}
              />
            )}
            <label>
              <span>Código</span>
              <select
                value={effectiveCodeFilter}
                onChange={(event) => {
                  setCodeFilter(event.target.value);
                  if (linkFilter) onClearLinkFilter();
                }}
              >
                <option value="">Todos</option>
                {codeOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Data</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </label>

            {(selectedAffiliateId !== "all" ||
              codeFilter ||
              dateFilter ||
              statusFilter !== "all" ||
              linkFilter) && (
              <button
                type="button"
                onClick={() => {
                  handleSelectAffiliate("all");
                  setCodeFilter("");
                  setDateFilter("");
                  setStatusFilter("all");
                  onClearLinkFilter();
                }}
              >
                Limpar
              </button>
            )}
          </div>

          <div className={styles.conversionReportMetrics}>
            {flowMetrics.map((metric) => (
              <FlowMetric
                key={metric.label}
                {...metric}
                active={statusFilter === metric.filter}
                onClick={() => setStatusFilter(metric.filter)}
              />
            ))}
          </div>

          {linkFilter && (
            <div className={styles.conversionFilterNotice}>
              <div>
                <span>Conversões do link</span>
                <strong>
                  {linkFilter.name || "Link sem nome"} - código{" "}
                  {linkFilter.shortCode}
                </strong>
              </div>

              <button type="button" onClick={onClearLinkFilter}>
                Ver todas
              </button>
            </div>
          )}

          {conversionReportView === "objective" ? (
            <div className={styles.conversionObjectiveList}>
              {statusFilteredConversionEvents.map((conversion) => {
                const steps = getStepsWithOverrides(
                  conversion,
                  stageStatusOverrides,
                );
                const saleStatus = getSaleStatusInfo(
                  conversion,
                  steps,
                  sgpStageChecks[conversion.id],
                );

                return (
                  <ConversionObjectiveCard
                    key={conversion.id}
                    conversion={conversion}
                    steps={steps}
                    saleStatus={saleStatus}
                    isDeleting={deletingConversionId === conversion.id}
                    isValidatingSgp={validatingSgpId === conversion.id}
                    sgpCheck={sgpStageChecks[conversion.id]}
                    onDelete={() => deleteConversion(conversion)}
                    onOpenData={() => openConversionData(conversion)}
                    onValidateSgp={() => validateSgpConversion(conversion)}
                  />
                );
              })}
            </div>
          ) : (
            <div className={styles.conversionFlowList}>
              {statusFilteredConversionEvents.map((conversion) => {
                const steps = getStepsWithOverrides(
                  conversion,
                  stageStatusOverrides,
                );

                return (
                  <ConversionFlowCard
                    key={conversion.id}
                    conversion={conversion}
                    steps={steps}
                    isEditing={editingConversionId === conversion.id}
                    isSaving={savingConversionId === conversion.id}
                    isDeleting={deletingConversionId === conversion.id}
                    editForm={editForm}
                    onChangeEditForm={setEditForm}
                    onStartEditing={() => startEditingConversion(conversion)}
                    onCancelEditing={cancelEditingConversion}
                    onSave={() => saveConversion(conversion.id)}
                    onDelete={() => deleteConversion(conversion)}
                    onToggleStage={(stepIndex) =>
                      toggleStageStatus(conversion.id, stepIndex)
                    }
                    onOpenSgp={() => validateSgpConversion(conversion)}
                    isValidatingSgp={validatingSgpId === conversion.id}
                    sgpCheck={sgpStageChecks[conversion.id]}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {statusFilteredConversionEvents.length === 0 ? (
        <p className={styles.emptyText}>{emptyMessage}</p>
      ) : null}

      {selectedConversionForData && (
        <ConversionDataModal
          id={`conversion-data-${selectedConversionForData.id}`}
          conversion={selectedConversionForData}
          activeTab={activeClientTab}
          onChangeTab={setActiveClientTab}
          isEditing={editingConversionId === selectedConversionForData.id}
          isSaving={savingConversionId === selectedConversionForData.id}
          editForm={editForm}
          onChangeEditForm={setEditForm}
          onStartEditing={() =>
            startEditingConversion(selectedConversionForData)
          }
          onCancelEditing={cancelEditingConversion}
          onSave={() => saveConversion(selectedConversionForData.id)}
          onClose={() => {
            setSelectedConversionForData(null);
            cancelEditingConversion();
          }}
        />
      )}
    </section>
  );
}

function AffiliateFilterPicker({
  details,
  selectedAffiliateId,
  onSelectAffiliate,
}: {
  details: AffiliateDetail[];
  selectedAffiliateId: string;
  onSelectAffiliate: (affiliateId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedAffiliate =
    selectedAffiliateId === "all"
      ? null
      : (details.find(
          (affiliate) => String(affiliate.affiliateId) === selectedAffiliateId,
        ) ?? null);

  const selectedName = selectedAffiliate?.affiliate || "Todos";

  const selectedPhotoUrl = selectedAffiliate
    ? getAffiliatePhotoUrl(selectedAffiliate)
    : "";

  const selectedInitials = selectedAffiliate
    ? getAffiliateInitials(selectedAffiliate.affiliate)
    : "T";

  const selectedPalette = selectedAffiliate
    ? getAffiliateAvatarPalette(
        selectedAffiliate.affiliate,
        selectedAffiliate.affiliateId,
      )
    : { background: "#ff744f", color: "#111827" };

  const selectedAvatarStyle = {
    "--avatar-bg": selectedPalette.background,
    "--avatar-color": selectedPalette.color,
    backgroundImage: selectedPhotoUrl ? `url(${selectedPhotoUrl})` : undefined,
  } as CSSProperties;

  function selectAffiliate(affiliateId: string) {
    onSelectAffiliate(affiliateId);
    setIsOpen(false);
  }

  return (
    <div className={styles.affiliateFilterPicker}>
      <button
        type="button"
        className={styles.affiliateFilterTrigger}
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={cx(
            styles.affiliateFilterAvatar,
            selectedPhotoUrl && styles.affiliateFilterAvatarPhoto,
          )}
          style={selectedAvatarStyle}
        >
          {!selectedPhotoUrl && selectedInitials}
        </span>

        <span className={styles.affiliateFilterTriggerText}>
          <small>Afiliado</small>
          <strong>{selectedName}</strong>
        </span>
      </button>

      {isOpen && (
        <div className={styles.affiliateFilterDropdown} role="listbox">
          <button
            type="button"
            className={cx(
              styles.affiliateFilterButton,
              selectedAffiliateId === "all" &&
                styles.affiliateFilterButtonActive,
            )}
            onClick={() => selectAffiliate("all")}
            role="option"
            aria-selected={selectedAffiliateId === "all"}
          >
            <span className={styles.affiliateFilterAvatarAll}>T</span>

            <span className={styles.affiliateFilterButtonText}>
              <strong>Todos</strong>
              <small>Visualizar a base completa</small>
            </span>
          </button>

          {details.map((affiliate) => {
            const photoUrl = getAffiliatePhotoUrl(affiliate);
            const initials = getAffiliateInitials(affiliate.affiliate);
            const palette = getAffiliateAvatarPalette(
              affiliate.affiliate,
              affiliate.affiliateId,
            );

            const avatarStyle = {
              "--avatar-bg": palette.background,
              "--avatar-color": palette.color,
              backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
            } as CSSProperties;

            const isActive =
              selectedAffiliateId === String(affiliate.affiliateId);

            return (
              <button
                key={affiliate.affiliateId}
                type="button"
                className={cx(
                  styles.affiliateFilterButton,
                  isActive && styles.affiliateFilterButtonActive,
                )}
                onClick={() => selectAffiliate(String(affiliate.affiliateId))}
                title={affiliate.affiliate}
                role="option"
                aria-selected={isActive}
              >
                <span
                  className={cx(
                    styles.affiliateFilterAvatar,
                    photoUrl && styles.affiliateFilterAvatarPhoto,
                  )}
                  style={avatarStyle}
                >
                  {!photoUrl && initials}
                </span>

                <span className={styles.affiliateFilterButtonText}>
                  <strong>{affiliate.affiliate}</strong>
                  <small>ID #{affiliate.affiliateId}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AffiliateReportProfile({
  details,
  selectedAffiliate,
  stats,
}: {
  details: AffiliateDetail[];
  selectedAffiliate: AffiliateDetail | null;
  stats: {
    links: number;
    clicks: number;
    conversions: number;
    sold: number;
    inProgress: number;
    lost: number;
  };
}) {
  const profileName =
    selectedAffiliate?.affiliate ||
    (details.length === 1 ? details[0].affiliate : "Todos");
  const profileId =
    selectedAffiliate?.affiliateId ||
    (details.length === 1 ? details[0].affiliateId : null);
  const profileDetail =
    selectedAffiliate || (details.length === 1 ? details[0] : null);
  const photoUrl = profileDetail ? getAffiliatePhotoUrl(profileDetail) : "";
  const initials = getAffiliateInitials(profileName);
  const avatarPalette = getAffiliateAvatarPalette(profileName, profileId || 0);
  const avatarStyle = {
    "--avatar-bg": avatarPalette.background,
    "--avatar-color": avatarPalette.color,
    backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
  } as CSSProperties;

  return (
    <div className={styles.reportProfileCard}>
      <div className={styles.reportProfileAvatarRow}>
        <div
          className={cx(
            styles.reportProfileAvatar,
            photoUrl && styles.reportProfileAvatarPhoto,
          )}
          style={avatarStyle}
          title={profileName}
        >
          {!photoUrl && initials}
        </div>
      </div>

      <div className={styles.reportProfileInfo}>
        <strong>Nome: {profileName}</strong>
        <span>E-mail: Não informado</span>
        <span>
          Cidade: {selectedAffiliate ? "Não informada" : "Várias cidades"}
        </span>
      </div>

      <div className={styles.reportProfileStats}>
        <strong>Detalhe</strong>
        <div>
          <span>Links:</span>
          <b>{stats.links}</b>
        </div>
        <div>
          <span>Cliques:</span>
          <b>{stats.clicks}</b>
        </div>
        <div>
          <span>Conversões:</span>
          <b>{stats.conversions}</b>
        </div>
        <div>
          <span>Saldo do afiliado:</span>
          <b>A calcular</b>
        </div>
      </div>

      <div className={styles.reportMiniChart}>
        <div>
          <span>WhatsApp</span>
          <b
            style={{
              height: `${getChartBarHeight(stats.inProgress, stats.conversions)}%`,
            }}
          />
        </div>
        <div>
          <span>SGP</span>
          <b
            style={{
              height: `${getChartBarHeight(stats.sold, stats.conversions)}%`,
            }}
          />
        </div>
        <div>
          <span>Perdidas</span>
          <b
            style={{
              height: `${getChartBarHeight(stats.lost, stats.conversions)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ConversionObjectiveCard({
  conversion,
  steps,
  saleStatus,
  isDeleting,
  isValidatingSgp,
  sgpCheck,
  onDelete,
  onOpenData,
  onValidateSgp,
}: {
  conversion: ConversionWithAffiliate;
  steps: ConversionStep[];
  saleStatus: SaleStatusInfo;
  isDeleting: boolean;
  isValidatingSgp: boolean;
  sgpCheck?: SgpStageCheck;
  onDelete: () => void;
  onOpenData: () => void;
  onValidateSgp: () => void;
}) {
  const clientName = conversion.visitorName || "Cliente sem nome";

  return (
    <article className={styles.conversionObjectiveCard}>
      <div className={styles.objectiveConversionInfo}>
        <strong>Conversão #{conversion.id}</strong>
        <span>Nome do link: {conversion.linkName || "Link sem nome"}</span>
        <span>
          Destino:{" "}
          {formatDisplayLink(conversion.destination || conversion.originalUrl)}
        </span>
        <span>Cliente: {clientName}</span>
        <small>{formatDateTime(conversion.convertedAt)}</small>
      </div>

      <div
        className={cx(
          styles.objectiveInfographic,
          saleStatus.kind === "sold" && styles.objectiveInfographicSold,
          saleStatus.kind === "in_progress" &&
            styles.objectiveInfographicProgress,
          saleStatus.kind === "lost" && styles.objectiveInfographicLost,
        )}
      >
        <ObjectiveStageIcon
          title="Landing page"
          completed={steps[0]?.completed}
          icon={<FiLink aria-hidden="true" />}
        />
        <ObjectiveStageIcon
          title="WhatsApp"
          completed={steps[1]?.completed}
          icon={<StageImageIcon src={CONVERSION_STAGE_IMAGES[1]} />}
        />
        <ObjectiveStageIcon
          title="Chatmix"
          completed={steps[2]?.completed}
          icon={<StageImageIcon src={CONVERSION_STAGE_IMAGES[2]} />}
        />
        <button
          type="button"
          className={cx(
            styles.objectiveSgpButton,
            sgpCheck?.status === "active" && styles.objectiveSgpButtonActive,
          )}
          onClick={onValidateSgp}
          disabled={isValidatingSgp}
          title="Validar CPF/CNPJ no SGP"
        >
          <StageImageIcon src={CONVERSION_STAGE_IMAGES[3]} compact />
        </button>

        <div className={styles.objectiveStatusText}>
          <span>Etapa: {saleStatus.label}</span>
          <small>{saleStatus.description}</small>
        </div>
      </div>

      <div className={styles.objectiveActions}>
        <button
          type="button"
          onClick={onOpenData}
          aria-label={`Ver dados da conversão ${conversion.id}`}
          title="Ver dados"
        >
          <FiGrid aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          aria-label={`Apagar conversão ${conversion.id}`}
          title="Apagar conversão"
        >
          <FiTrash2 aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function StageImageIcon({
  src,
  compact = false,
}: {
  src: string;
  compact?: boolean;
}) {
  return (
    <Image
      src={src}
      alt=""
      width={compact ? 28 : 34}
      height={compact ? 28 : 34}
      className={compact ? styles.objectiveSgpImage : styles.objectiveStageImage}
      aria-hidden="true"
    />
  );
}

function ObjectiveStageIcon({
  title,
  completed,
  icon,
}: {
  title: string;
  completed?: boolean;
  icon: ReactNode;
}) {
  return (
    <span
      className={cx(
        styles.objectiveStageIcon,
        completed && styles.objectiveStageIconDone,
      )}
      title={title}
    >
      {icon}
    </span>
  );
}

function ConversionFlowCard({
  conversion,
  steps,
  isEditing,
  isSaving,
  isDeleting,
  editForm,
  onChangeEditForm,
  onStartEditing,
  onCancelEditing,
  onSave,
  onDelete,
  onToggleStage,
  onOpenSgp,
  isValidatingSgp,
  sgpCheck,
}: {
  conversion: ConversionWithAffiliate;
  steps: ConversionStep[];
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  editForm: ConversionEditForm;
  onChangeEditForm: Dispatch<SetStateAction<ConversionEditForm>>;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
  onDelete: () => void;
  onToggleStage: (stepIndex: number) => void;
  onOpenSgp: () => void;
  isValidatingSgp: boolean;
  sgpCheck?: SgpStageCheck;
}) {
  const finalStatus = getConversionFinalStatusFromSteps(steps);
  const [activeClientTab, setActiveClientTab] = useState<ClientDataTab>("main");
  const [isConversionDataModalOpen, setIsConversionDataModalOpen] =
    useState(false);

  return (
    <article className={styles.conversionFlowCard}>
      <ConversionCardHeader
        conversion={conversion}
        finalStatus={finalStatus}
        isDeleting={isDeleting}
        onDelete={onDelete}
        onOpenDataModal={() => setIsConversionDataModalOpen(true)}
      />

      <div className={styles.conversionBoard}>
        <div className={styles.conversionStageTrack}>
          {steps.map((step, index) => (
            <ConversionStageCard
              key={step.title}
              step={step}
              index={index}
              conversion={conversion}
              onToggleStatus={() => onToggleStage(index)}
              onOpenSgp={index === 3 ? onOpenSgp : undefined}
              isLoading={index === 3 && isValidatingSgp}
              sgpCheck={index === 3 ? sgpCheck : undefined}
            />
          ))}
        </div>
      </div>

      {isConversionDataModalOpen && (
        <ConversionDataModal
          id={`conversion-data-${conversion.id}`}
          conversion={conversion}
          activeTab={activeClientTab}
          onChangeTab={setActiveClientTab}
          isEditing={isEditing}
          isSaving={isSaving}
          editForm={editForm}
          onChangeEditForm={onChangeEditForm}
          onStartEditing={onStartEditing}
          onCancelEditing={onCancelEditing}
          onSave={onSave}
          onClose={() => setIsConversionDataModalOpen(false)}
        />
      )}
    </article>
  );
}

function ConversionDataModal({
  id,
  conversion,
  activeTab,
  onChangeTab,
  isEditing,
  isSaving,
  editForm,
  onChangeEditForm,
  onStartEditing,
  onCancelEditing,
  onSave,
  onClose,
}: {
  id: string;
  conversion: ConversionWithAffiliate;
  activeTab: ClientDataTab;
  onChangeTab: (tab: ClientDataTab) => void;
  isEditing: boolean;
  isSaving: boolean;
  editForm: ConversionEditForm;
  onChangeEditForm: Dispatch<SetStateAction<ConversionEditForm>>;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className={styles.conversionDataModalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section id={id} className={styles.conversionDataModalCard}>
        <div className={styles.conversionDataModalHero}>
          <div>
            <span>Dados da conversão</span>
            <h2 id={`${id}-title`}>
              {conversion.visitorName || "Cliente sem nome"}
            </h2>
            <p>
              Confira todos os dados coletados durante a jornada deste cliente.
            </p>
          </div>

          <button
            type="button"
            className={styles.conversionDataModalClose}
            onClick={onClose}
            aria-label="Fechar dados da conversão"
            title="Fechar"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        <div className={styles.conversionDataModalBody}>
          <ClientDataHeader
            conversion={conversion}
            minimized={false}
            isEditing={isEditing}
            isSaving={isSaving}
            onStartEditing={onStartEditing}
            onCancelEditing={onCancelEditing}
            onSave={onSave}
          />

          <ClientDataTabs activeTab={activeTab} onChangeTab={onChangeTab} />

          {isEditing ? (
            <ConversionEditFormFields
              form={editForm}
              onChangeForm={onChangeEditForm}
            />
          ) : (
            <ClientDataList conversion={conversion} activeTab={activeTab} />
          )}
        </div>
      </section>
    </div>
  );
}

function ConversionCardHeader({
  conversion,
  finalStatus,
  isDeleting,
  onDelete,
  onOpenDataModal,
}: {
  conversion: ConversionWithAffiliate;
  finalStatus: { label: string; className: string };
  isDeleting: boolean;
  onDelete: () => void;
  onOpenDataModal: () => void;
}) {
  return (
    <div className={styles.conversionFlowHeader}>
      <div className={styles.conversionIdentity}>
        <span>Conversão #{conversion.id}</span>
        <h3>{conversion.affiliate}</h3>
        <p>
          {conversion.linkName || "Link sem nome"} - código{" "}
          {conversion.shortCode}
        </p>
      </div>

      <div className={styles.conversionHeaderActions}>
        <button
          type="button"
          className={styles.openConversionDataButton}
          onClick={onOpenDataModal}
          aria-label={`Visualizar dados da conversão ${conversion.id}`}
          title="Visualizar dados da conversão"
        >
          <FiGrid aria-hidden="true" />
          <span>Dados da conversão</span>
        </button>

        <span className={cx(styles.finalStatusBadge, finalStatus.className)}>
          {finalStatus.label}
        </span>

        <button
          type="button"
          className={styles.iconDeleteConversionButton}
          onClick={onDelete}
          disabled={isDeleting}
          aria-label={`Apagar conversão ${conversion.id}`}
          title="Apagar conversão"
        >
          <FiTrash2 aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ClientDataHeader({
  conversion,
  minimized,
  isEditing,
  isSaving,
  onStartEditing,
  onCancelEditing,
  onSave,
}: {
  conversion: ConversionWithAffiliate;
  minimized: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
}) {
  return (
    <div className={styles.clientDataHeader}>
      <div>
        <span>Dados da conversão</span>
        <strong>{conversion.visitorName || "Cliente sem nome"}</strong>
      </div>

      {!minimized && (
        <ClientDataActions
          isEditing={isEditing}
          isSaving={isSaving}
          onStartEditing={onStartEditing}
          onCancelEditing={onCancelEditing}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function ClientDataActions({
  isEditing,
  isSaving,
  onStartEditing,
  onCancelEditing,
  onSave,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSave: () => void;
}) {
  if (!isEditing) {
    return (
      <button
        type="button"
        className={styles.editButton}
        onClick={onStartEditing}
      >
        <FiEdit2 aria-hidden="true" />
        Editar
      </button>
    );
  }

  return (
    <div className={styles.clientActions}>
      <button
        type="button"
        className={styles.saveButton}
        onClick={onSave}
        disabled={isSaving}
      >
        <FiSave aria-hidden="true" />
        {isSaving ? "Salvando..." : "Salvar"}
      </button>

      <button
        type="button"
        className={styles.cancelButton}
        onClick={onCancelEditing}
        disabled={isSaving}
      >
        <FiX aria-hidden="true" />
        Cancelar
      </button>
    </div>
  );
}

function ConversionEditFormFields({
  form,
  onChangeForm,
}: {
  form: ConversionEditForm;
  onChangeForm: Dispatch<SetStateAction<ConversionEditForm>>;
}) {
  const fields: Array<{
    name: keyof ConversionEditForm;
    label: string;
  }> = [
    { name: "visitorName", label: "Nome" },
    { name: "visitorPhone", label: "WhatsApp" },
    { name: "visitorDocument", label: "CPF/CNPJ" },
    { name: "visitorCity", label: "Cidade" },
    { name: "product", label: "Produto" },
  ];

  return (
    <div className={styles.conversionEditGrid}>
      {fields.map((field) => (
        <label key={field.name}>
          {field.label}
          <input
            value={form[field.name]}
            onChange={(event) =>
              onChangeForm((current) => ({
                ...current,
                [field.name]: event.target.value,
              }))
            }
          />
        </label>
      ))}
    </div>
  );
}

function ClientDataTabs({
  activeTab,
  onChangeTab,
}: {
  activeTab: ClientDataTab;
  onChangeTab: (tab: ClientDataTab) => void;
}) {
  const tabs: Array<{ value: ClientDataTab; label: string }> = [
    { value: "main", label: "Cliente" },
    { value: "access", label: "Acesso" },
    { value: "device", label: "Dispositivo" },
  ];

  return (
    <div
      className={styles.clientDataTabs}
      role="tablist"
      aria-label="Dados do cliente"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={cx(
            styles.clientDataTab,
            activeTab === tab.value && styles.clientDataTabActive,
          )}
          onClick={() => onChangeTab(tab.value)}
          aria-selected={activeTab === tab.value}
          role="tab"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ClientDataList({
  conversion,
  activeTab,
}: {
  conversion: ConversionWithAffiliate;
  activeTab: ClientDataTab;
}) {
  const mainItems = [
    { label: "Nome", value: conversion.visitorName || "Não informado" },
    { label: "WhatsApp", value: formatPhone(conversion.visitorPhone) },
    { label: "CPF/CNPJ", value: formatDocument(conversion.visitorDocument) },
    {
      label: "Cidade coletada",
      value: conversion.visitorCity || "Não informado",
    },
    { label: "Produto", value: conversion.product || "Não informado" },
    { label: "Data", value: formatDateTime(conversion.convertedAt) },
    {
      label: "Destino",
      value: conversion.destination
        ? formatDisplayLink(conversion.destination)
        : "Não informado",
      title: conversion.destination || undefined,
    },
  ];

  const accessItems = [
    { label: "Origem", value: conversion.source || "Não informado" },
    { label: "UTM source", value: conversion.utmSource || "Não informado" },
    { label: "UTM medium", value: conversion.utmMedium || "Não informado" },
    { label: "UTM campanha", value: conversion.utmCampaign || "Não informado" },
    {
      label: "Referência",
      value: conversion.referrer || "Não informado",
      title: conversion.referrer || undefined,
    },
    { label: "IP", value: conversion.ipAddress || "Não informado" },
    { label: "País", value: conversion.geoCountry || "Não informado" },
    { label: "Região", value: conversion.geoRegion || "Não informado" },
    { label: "Cidade IP", value: conversion.geoCity || "Não informado" },
  ];

  const deviceItems = [
    { label: "Dispositivo", value: conversion.deviceType || "Não informado" },
    { label: "Navegador", value: conversion.browser || "Não informado" },
    { label: "Sistema", value: conversion.operatingSystem || "Não informado" },
    { label: "Plataforma", value: conversion.platform || "Não informado" },
    { label: "Idioma", value: conversion.language || "Não informado" },
    { label: "Fuso", value: conversion.timezone || "Não informado" },
    {
      label: "Tela",
      value: formatScreenSize(conversion.screenWidth, conversion.screenHeight),
    },
    {
      label: "User agent",
      value: conversion.userAgent || "Não informado",
      title: conversion.userAgent || undefined,
    },
  ];

  const itemsByTab = {
    main: mainItems,
    access: accessItems,
    device: deviceItems,
  };

  return (
    <div className={styles.clientDataList}>
      {itemsByTab[activeTab].map((item) => (
        <MetaItem key={item.label} {...item} />
      ))}
    </div>
  );
}

function FlowMetric({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(styles.flowMetric, active && styles.flowMetricActive)}
      onClick={onClick}
      aria-pressed={active}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function ConversionStageCard({
  step,
  index,
  conversion,
  onToggleStatus,
  onOpenSgp,
  isLoading,
  sgpCheck,
}: {
  step: ConversionStep;
  index: number;
  conversion: ConversionWithAffiliate;
  onToggleStatus: () => void;
  onOpenSgp?: () => void;
  isLoading?: boolean;
  sgpCheck?: SgpStageCheck;
}) {
  const Icon = CONVERSION_STAGE_ICONS[index] || FiLink;
  const stageImage = CONVERSION_STAGE_IMAGES[index];
  const StatusIcon = step.completed ? FiCheckCircle : FiClock;
  const showChatmixData = index === 2;
  const showSgpData = index === 3;

  return (
    <section
      className={cx(
        styles.conversionStageCard,
        onOpenSgp && styles.conversionStageClickable,
        step.completed
          ? styles.conversionStageDone
          : styles.conversionStagePending,
      )}
      onClick={onOpenSgp}
      role={onOpenSgp ? "button" : undefined}
      tabIndex={onOpenSgp ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onOpenSgp) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenSgp();
        }
      }}
    >
      <button
        type="button"
        className={styles.stageMoreDots}
        onClick={(event) => {
          event.stopPropagation();
          onToggleStatus();
        }}
        aria-label={`Alterar status da etapa ${step.title}`}
        title={
          step.completed ? "Marcar como em andamento" : "Marcar como feito"
        }
      >
        ...
      </button>

      <div className={styles.stageIconBox}>
        {stageImage ? (
          <Image
            src={stageImage}
            alt=""
            width={38}
            height={38}
            className={styles.stageImageIcon}
            aria-hidden="true"
          />
        ) : (
          <Icon aria-hidden="true" />
        )}
      </div>

      <div className={styles.stageContentCard}>
        <span>{index + 1}º - Etapa</span>
        <strong>{step.title}</strong>
        <p>{step.description}</p>

        {showSgpData ? (
          <SgpStageData
            conversion={conversion}
            check={sgpCheck}
            isLoading={isLoading}
          />
        ) : showChatmixData ? (
          <ChatmixCollectedData conversion={conversion} />
        ) : step.dataItems?.length ? (
          <StageStructuredData items={step.dataItems} />
        ) : (
          <small>{isLoading ? "Validando no SGP..." : step.detail}</small>
        )}
      </div>

      <span className={styles.stageStatusIcon}>
        <StatusIcon aria-hidden="true" />
      </span>

      <div className={styles.stageFooterDate}>
        <FiClock aria-hidden="true" />
        <span>{step.dateLabel}</span>
      </div>
    </section>
  );
}

function SgpStageData({
  conversion,
  check,
  isLoading,
}: {
  conversion: ConversionWithAffiliate;
  check?: SgpStageCheck;
  isLoading?: boolean;
}) {
  const document = check?.document || onlyDigits(conversion.visitorDocument);
  const status = isLoading ? "checking" : check?.status;
  const statusLabel = isLoading
    ? "Consultando SGP..."
    : check?.statusLabel || "Não consultado";
  const boxClassName = cx(
    styles.sgpStageBox,
    status === "active" && styles.sgpStageBoxActive,
    (status === "inactive" ||
      status === "not_found" ||
      status === "divergent" ||
      status === "error") &&
      styles.sgpStageBoxError,
  );

  return (
    <div className={boxClassName}>
      <div>
        <span>CPF/CNPJ</span>
        <strong>{formatDocument(document)}</strong>
      </div>

      <div>
        <span>Status SGP</span>
        <strong>{statusLabel}</strong>
      </div>

      {check?.messages?.length ? (
        <small>{check.messages.join(", ")}</small>
      ) : null}
    </div>
  );
}

function StageStructuredData({ items }: { items: ConversionStepDataItem[] }) {
  return (
    <div className={styles.stageStructuredData}>
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function ChatmixCollectedData({
  conversion,
}: {
  conversion: ConversionWithAffiliate;
}) {
  const items = getChatmixCollectedItems(conversion);

  return (
    <div className={styles.chatmixCollectedData}>
      {items.map((item) => (
        <div key={item.label} title={item.title}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
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

function useConversionEvents(details: AffiliateDetail[]) {
  return useMemo(
    () =>
      details
        .flatMap((affiliate) =>
          (affiliate.conversionEvents ?? []).map((conversion) => ({
            ...conversion,
            affiliate: affiliate.affiliate,
            affiliateId: affiliate.affiliateId,
          })),
        )
        .sort(
          (a, b) =>
            new Date(b.convertedAt).getTime() -
            new Date(a.convertedAt).getTime(),
        ),
    [details],
  );
}

function useConversionRanking(details: AffiliateDetail[]) {
  return useMemo(
    () =>
      [...details]
        .filter((affiliate) => (affiliate.totalConversions ?? 0) > 0)
        .sort((a, b) => (b.totalConversions ?? 0) - (a.totalConversions ?? 0)),
    [details],
  );
}

function useTotalConversions(details: AffiliateDetail[]) {
  return useMemo(
    () =>
      details.reduce(
        (sum, affiliate) => sum + (affiliate.totalConversions ?? 0),
        0,
      ),
    [details],
  );
}

function normalizeConversionForm(form: ConversionEditForm) {
  return {
    visitorName: form.visitorName.trim(),
    visitorPhone: form.visitorPhone.trim(),
    visitorDocument: onlyDigits(form.visitorDocument),
    visitorCity: form.visitorCity.trim(),
    product: form.product.trim(),
  };
}

function getStepsWithOverrides(
  conversion: ConversionWithAffiliate,
  overrides: StageStatusOverrides,
) {
  return getConversionFlowSteps(conversion).map((step, index) => ({
    ...step,
    completed:
      overrides[getStageStatusKey(conversion.id, index)] ?? step.completed,
  }));
}

function getStageStatusKey(conversionId: number, stepIndex: number) {
  return `${conversionId}:${stepIndex}`;
}

function getOriginalStageStatus(
  conversionEvents: ConversionWithAffiliate[],
  conversionId: number,
  stepIndex: number,
) {
  const conversion = conversionEvents.find((item) => item.id === conversionId);

  if (!conversion) return false;

  return getConversionFlowSteps(conversion)[stepIndex]?.completed ?? false;
}

function getConversionFlowSteps(
  conversion: ConversionWithAffiliate,
): ConversionStep[] {
  const hasVisit =
    Boolean(conversion.latestClickAt) || conversion.totalClicks > 0;
  const hasWhatsapp = hasWhatsappStage(conversion);
  const hasChatmix = hasChatmixValidation(conversion);
  const hasSgp = hasSgpSale(conversion);
  const eventDate = formatDateTime(conversion.convertedAt);
  const visitDate = conversion.latestClickAt
    ? formatDateTime(conversion.latestClickAt)
    : hasVisit
      ? eventDate
      : "Sem data";
  const whatsappDate = hasWhatsapp ? eventDate : "Sem data";
  const chatmixDate = hasChatmix ? eventDate : "Sem data";
  const sgpDate = hasSgp ? eventDate : "Sem data";

  return [
    {
      title: "Visita na landing page",
      description: "Visitante acessou a landing page do link.",
      completed: hasVisit,
      detail: hasVisit
        ? conversion.latestClickAt
          ? `${conversion.totalClicks || 1} visita(s) registradas`
          : `${conversion.totalClicks} visita(s) registradas`
        : "Aguardando visita",
      dateLabel: visitDate,
    },
    {
      title: "Pré-cadastro",
      description: "Contato iniciado pelo WhatsApp com código do afiliado.",
      completed: hasWhatsapp,
      detail: hasWhatsapp
        ? getWhatsappStepDetail(conversion, eventDate)
        : "Aguardando clique no WhatsApp",
      dateLabel: whatsappDate,
      dataItems: getPreCadastroStepItems(conversion),
    },
    {
      title: "Válidação no Chatmix",
      description: "Webhook confirmou o atendimento no Chatmix.",
      completed: hasChatmix,
      detail: hasChatmix ? "Atendimento validado" : "Aguardando webhook",
      dateLabel: chatmixDate,
    },
    {
      title: "Registro no SGP",
      description: "CPF/CNPJ do pré-cadastro conferido no SGP.",
      completed: hasSgp,
      detail: hasSgp
        ? "CPF/CNPJ encontrado no SGP"
        : "Clique para conferir o CPF/CNPJ no SGP",
      dateLabel: sgpDate,
    },
  ];
}

function getPreCadastroStepItems(
  conversion: ConversionWithAffiliate,
): ConversionStepDataItem[] {
  const items = [
    {
      label: "Código",
      value: conversion.shortCode || "Não informado",
    },
    {
      label: "Origem",
      value: conversion.source || "WhatsApp",
    },
    {
      label: "Cliente",
      value: conversion.visitorName || "Não informado",
    },
  ];

  if (conversion.visitorPhone) {
    items.push({
      label: "WhatsApp",
      value: formatPhone(conversion.visitorPhone),
    });
  }

  return items;
}

function getWhatsappStepDetail(
  conversion: ConversionWithAffiliate,
  eventDate: string,
) {
  const collected = [
    conversion.visitorName ? `Nome: ${conversion.visitorName}` : "",
    conversion.visitorPhone
      ? `WhatsApp: ${formatPhone(conversion.visitorPhone)}`
      : "",
    conversion.visitorCity ? `Cidade: ${conversion.visitorCity}` : "",
    conversion.source ? `Origem: ${conversion.source}` : "",
  ].filter(Boolean);

  if (collected.length > 0) {
    return `${collected.join("\n")}\nRegistrado: ${eventDate}`;
  }

  return isWhatsappEvent(conversion)
    ? `Registrado: ${eventDate}`
    : "Confirmado por etapa posterior";
}

function getChatmixCollectedItems(conversion: ConversionWithAffiliate) {
  return [
    {
      label: "Nome",
      value: conversion.visitorName || "Não informado",
    },
    {
      label: "WhatsApp",
      value: formatPhone(conversion.visitorPhone),
    },
    {
      label: "CPF/CNPJ",
      value: formatDocument(conversion.visitorDocument),
    },
    {
      label: "Cidade",
      value: conversion.visitorCity || "Não informado",
    },
    {
      label: "Origem",
      value: conversion.source || "Não informado",
    },
    {
      label: "Evento",
      value: conversion.type || "Não informado",
      title: conversion.type || undefined,
    },
    {
      label: "Atendimento Chatmix",
      value: conversion.attendanceId || "Não informado",
      title: conversion.attendanceId || undefined,
    },
  ];
}

function getConversionFinalStatusFromSteps(steps: ConversionStep[]) {
  if (steps[3]?.completed) {
    return {
      label: "Venda concluida",
      className: styles.finalStatusDone,
    };
  }

  if (steps[2]?.completed) {
    return {
      label: "Validado no Chatmix",
      className: styles.finalStatusActive,
    };
  }

  if (steps[1]?.completed) {
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

function getSaleStatusInfo(
  conversion: ConversionWithAffiliate,
  steps: ConversionStep[],
  sgpCheck?: SgpStageCheck,
): SaleStatusInfo {
  if (steps[3]?.completed || sgpCheck?.status === "active") {
    return {
      kind: "sold",
      label: "Cliente contratou",
      description: "Venda confirmada no SGP.",
    };
  }

  if (sgpCheck?.status === "inactive") {
    return {
      kind: "lost",
      label: "Venda perdida",
      description: "Cliente encontrado no SGP, mas não está ativo.",
    };
  }

  if (isConversionOlderThanDays(conversion.convertedAt, 2)) {
    return {
      kind: "lost",
      label: "Desistiu",
      description: "Mais de 2 dias sem venda confirmada.",
    };
  }

  if (steps[1]?.completed || steps[2]?.completed) {
    return {
      kind: "in_progress",
      label: "Em atendimento",
      description: "Dentro do prazo de tratativa comercial.",
    };
  }

  return {
    kind: "pending",
    label: "Aguardando",
    description: "Conversão ainda sem dados suficientes.",
  };
}

function getConversionReportStats(
  details: AffiliateDetail[],
  conversions: ConversionWithAffiliate[],
  sgpChecks: SgpStageChecks,
  overrides: StageStatusOverrides,
) {
  return conversions.reduce(
    (stats, conversion) => {
      const steps = getStepsWithOverrides(conversion, overrides);
      const status = getSaleStatusInfo(
        conversion,
        steps,
        sgpChecks[conversion.id],
      );

      if (status.kind === "sold") stats.sold += 1;
      if (status.kind === "in_progress") stats.inProgress += 1;
      if (status.kind === "lost") stats.lost += 1;

      return stats;
    },
    {
      links: details.reduce((total, detail) => total + detail.totalLinks, 0),
      clicks: details.reduce((total, detail) => total + detail.totalClicks, 0),
      conversions: conversions.length,
      sold: 0,
      inProgress: 0,
      lost: 0,
    },
  );
}

function isConversionOlderThanDays(value: string, days: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return Date.now() - date.getTime() > days * 24 * 60 * 60 * 1000;
}

function getDateInputValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getChartBarHeight(value: number, total: number) {
  if (!total || value <= 0) return 10;

  return Math.max((value / total) * 100, 18);
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
    getConversionSearchText(conversion),
  );
}

function hasChatmixValidation(conversion: ConversionWithAffiliate) {
  if (conversion.attendanceId) return true;

  const searchText = getConversionSearchText(conversion);
  const hasCollectedClientData = Boolean(
    conversion.visitorName ||
    conversion.visitorPhone ||
    conversion.visitorDocument ||
    conversion.source,
  );

  return (
    (/chatmix|webhook|trafego pago|whatsapp/.test(searchText) &&
      hasCollectedClientData) ||
    hasSgpSale(conversion)
  );
}

function hasSgpSale(conversion: ConversionWithAffiliate) {
  return /sgp|spg|venda|sale|concluid|aprovad|contrato|finalizad/.test(
    getConversionSearchText(conversion),
  );
}

function getConversionSearchText(conversion: ConversionWithAffiliate) {
  return [
    conversion.type,
    conversion.product,
    conversion.destination,
    conversion.source,
    conversion.visitorName,
    conversion.visitorPhone,
    conversion.visitorDocument,
    conversion.userAgent,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function contactsFromConversions(
  conversions: AffiliateConversion[],
): AffiliateContact[] {
  const grouped = new Map<
    string,
    { contact: AffiliateContact; attendanceKeys: Set<string> }
  >();

  conversions.forEach((conversion) => {
    const document = String(conversion.visitorDocument || "").replace(/\D/g, "");
    const phone = String(conversion.visitorPhone || "").replace(/\D/g, "");
    const nameKey = normalizeText(conversion.visitorName);
    const identity = document
      ? `document:${document}`
      : phone
        ? `phone:${phone}`
        : nameKey
          ? `name:${nameKey}`
          : null;

    if (!identity) return;

    const current = grouped.get(identity) ?? {
      contact: {
        id: identity,
        name: conversion.visitorName,
        phone: conversion.visitorPhone,
        document: conversion.visitorDocument,
        city: conversion.visitorCity,
        totalAttendances: 0,
        totalConversions: 0,
        firstAttendanceAt: conversion.convertedAt,
        lastAttendanceAt: conversion.convertedAt,
        attendanceIds: [],
        shortCodes: [],
        linkIds: [],
        conversionIds: [],
      },
      attendanceKeys: new Set<string>(),
    };
    const contact = current.contact;

    contact.name ||= conversion.visitorName;
    contact.phone ||= conversion.visitorPhone;
    contact.document ||= conversion.visitorDocument;
    contact.city ||= conversion.visitorCity;
    current.attendanceKeys.add(
      conversion.attendanceId || `conversion:${conversion.id}`,
    );
    if (
      conversion.attendanceId &&
      !contact.attendanceIds.includes(conversion.attendanceId)
    ) {
      contact.attendanceIds.push(conversion.attendanceId);
    }
    if (!contact.shortCodes.includes(conversion.shortCode)) {
      contact.shortCodes.push(conversion.shortCode);
    }
    if (!contact.linkIds.includes(conversion.linkId)) {
      contact.linkIds.push(conversion.linkId);
    }
    if (!contact.conversionIds.includes(conversion.id)) {
      contact.conversionIds.push(conversion.id);
    }

    if (
      new Date(conversion.convertedAt).getTime() <
      new Date(contact.firstAttendanceAt).getTime()
    ) {
      contact.firstAttendanceAt = conversion.convertedAt;
    }
    if (
      new Date(conversion.convertedAt).getTime() >
      new Date(contact.lastAttendanceAt).getTime()
    ) {
      contact.lastAttendanceAt = conversion.convertedAt;
    }

    contact.totalAttendances = current.attendanceKeys.size;
    contact.totalConversions = contact.conversionIds.length;
    grouped.set(identity, current);
  });

  return [...grouped.values()]
    .map(({ contact }) => contact)
    .sort(
      (first, second) =>
        new Date(second.lastAttendanceAt).getTime() -
        new Date(first.lastAttendanceAt).getTime(),
    );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPhone(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "Não informado";

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return value || "Não informado";
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function formatDocument(value?: string | null) {
  const digits = onlyDigits(value);

  if (!digits) return "Não informado";

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  return value || "Não informado";
}

function formatScreenSize(width?: number | null, height?: number | null) {
  if (!width || !height) return "Não informado";

  return `${width} x ${height}`;
}

function normalizeText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function validatePreCadastroWithSgp(
  conversion: ConversionWithAffiliate,
  customer: {
    name: string | null;
    document: string;
    phone: string | null;
    city: string | null;
    active: boolean | null;
  },
) {
  const messages: string[] = [];
  const conversionDocument = onlyDigits(conversion.visitorDocument);
  const customerDocument = onlyDigits(customer.document);
  const conversionPhone = onlyDigits(conversion.visitorPhone);
  const customerPhone = onlyDigits(customer.phone);

  if (
    conversionDocument &&
    customerDocument &&
    conversionDocument !== customerDocument
  ) {
    messages.push("CPF/CNPJ diferente");
  }

  if (
    conversion.visitorName &&
    customer.name &&
    !isFullNameCompatible(conversion.visitorName, customer.name)
  ) {
    messages.push("nome completo diferente");
  }

  if (
    conversionPhone &&
    customerPhone &&
    !phoneNumbersMatch(conversionPhone, customerPhone)
  ) {
    messages.push("número de celular diferente");
  }

  if (conversionPhone && !customerPhone) {
    messages.push("número de celular não encontrado no SGP");
  }

  if (
    conversion.visitorCity &&
    customer.city &&
    normalizeText(conversion.visitorCity) !== normalizeText(customer.city)
  ) {
    messages.push("cidade diferente");
  }

  return {
    valid: messages.length === 0,
    messages,
  };
}

function hasRegisteredSgpCustomer(
  customer: {
    id: string | null;
    name: string | null;
    document: string;
    phone: string | null;
    city: string | null;
    status: string;
    active: boolean | null;
    contracts: unknown[];
  },
  searchedDocument: string,
) {
  const phone = onlyDigits(customer.phone);
  const customerDocument = onlyDigits(customer.document);
  const hasMatchingDocument =
    Boolean(searchedDocument) && customerDocument === searchedDocument;
  const hasKnownStatus =
    customer.active !== null &&
    normalizeText(customer.status) !== "status nao informado";

  return Boolean(
    customer.id ||
    customer.name ||
    phone ||
    customer.city ||
    customer.contracts.length > 0 ||
    hasKnownStatus ||
    (hasMatchingDocument && hasKnownStatus),
  );
}

function isFullNameCompatible(left: string, right: string) {
  const leftParts = normalizeText(left).split(/\s+/).filter(Boolean);
  const rightParts = normalizeText(right).split(/\s+/).filter(Boolean);

  if (leftParts.length === 0 || rightParts.length === 0) {
    return false;
  }

  const leftFull = leftParts.join(" ");
  const rightFull = rightParts.join(" ");

  if (leftFull === rightFull) {
    return true;
  }

  const [leftFirst] = leftParts;
  const leftLast = leftParts[leftParts.length - 1];
  const [rightFirst] = rightParts;
  const rightLast = rightParts[rightParts.length - 1];

  return leftFirst === rightFirst && leftLast === rightLast;
}

function phoneNumbersMatch(left: string, right: string) {
  if (left === right) {
    return true;
  }

  return left.slice(-8) === right.slice(-8);
}

const AFFILIATE_AVATAR_PALETTE = [
  { background: "linear-gradient(135deg, #2563eb, #1e40af)", color: "#ffffff" },
  { background: "linear-gradient(135deg, #f97316, #c2410c)", color: "#ffffff" },
  { background: "linear-gradient(135deg, #16a34a, #166534)", color: "#ffffff" },
  { background: "linear-gradient(135deg, #9333ea, #6b21a8)", color: "#ffffff" },
  { background: "linear-gradient(135deg, #db2777, #9d174d)", color: "#ffffff" },
  { background: "linear-gradient(135deg, #0891b2, #155e75)", color: "#ffffff" },
  { background: "linear-gradient(135deg, #ca8a04, #854d0e)", color: "#ffffff" },
  { background: "linear-gradient(135deg, #475569, #0f172a)", color: "#ffffff" },
];

function getAffiliateAvatarPalette(name: string, id?: number) {
  const baseValue = `${name || "afiliado"}-${id || ""}`;
  const hash = Array.from(baseValue).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return AFFILIATE_AVATAR_PALETTE[hash % AFFILIATE_AVATAR_PALETTE.length];
}

function getAffiliatePhotoUrl(block: AffiliateDetail) {
  const record = block as unknown as Record<string, unknown>;

  const possibleFields = [
    record.affiliatePhotoUrl,
    record.affiliateAvatarUrl,
    record.avatarUrl,
    record.photoUrl,
    record.imageUrl,
    record.profileImageUrl,
    record.pictureUrl,
    record.photo,
    record.avatar,
    record.image,
  ];

  const photoUrl = possibleFields.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return photoUrl?.trim() || "";
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

function getAffiliateFirstName(name: string) {
  return name.trim().split(/\s+/)[0]?.toUpperCase() || "AFILIADO";
}
