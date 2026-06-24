import { useMemo, useState } from "react";
import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react";
import { useRouter } from "next/navigation";
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
  FiX,
} from "react-icons/fi";

import {
  apagarConversao,
  apagarLink,
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

type SelectOption<T extends string> = {
  value: T;
  label: string;
  icon: ComponentType<{ "aria-hidden"?: true; className?: string }>;
};

type AffiliateViewMode = "compact" | "medium" | "detailed";
type DetailTab = "links" | "conversions";
type ClientDataTab = "main" | "access" | "device";

const DEFAULT_EMPTY_MESSAGE = "Nenhum afiliado encontrado no relatorio.";

const AFFILIATE_VIEW_OPTIONS: SelectOption<AffiliateViewMode>[] = [
  { value: "compact", label: "Visualizacao compacta", icon: FiList },
  { value: "medium", label: "Visualizacao media", icon: FiCreditCard },
  { value: "detailed", label: "Visualizacao detalhada", icon: FiGrid },
];

const DETAIL_TAB_OPTIONS: SelectOption<DetailTab>[] = [
  { value: "links", label: "Links", icon: FiLink },
  { value: "conversions", label: "Conversoes", icon: FiGitBranch },
];

const CONVERSION_STAGE_ICONS = [
  FiLink,
  FiMessageCircle,
  FiGitBranch,
  FiCreditCard,
] as const;

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
}: AffiliateDetailsProps) {
  const [deletingLinkId, setDeletingLinkId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<AffiliateViewMode>("detailed");
  const [detailTab, setDetailTab] = useState<DetailTab>("links");

  const conversionEvents = useConversionEvents(details);
  const conversionRanking = useConversionRanking(details);
  const totalConversions = useTotalConversions(details);

  const affiliateListClassName = cx(
    styles.affiliateList,
    viewMode === "compact" && styles.affiliateListCompact,
    viewMode === "medium" && styles.affiliateListMedium,
    viewMode === "detailed" && styles.affiliateListDetailed
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
      `Deseja apagar o link "${label}"? Essa acao tambem remove os cliques desse link.`
    );

    if (!confirmed) return;

    setDeletingLinkId(id);

    try {
      await apagarLink(id);
      refresh();
    } catch (error) {
      alert(getApiErrorMessage(error, "Nao foi possivel apagar o link."));
    } finally {
      setDeletingLinkId(null);
    }
  }

  return (
    <>
      <DetailsHeader
        activeTab={detailTab}
        activeViewMode={viewMode}
        onChangeTab={setDetailTab}
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
          viewMode={viewMode}
        />
      ) : (
        <ConversionFlowPanel
          conversionEvents={conversionEvents}
          emptyMessage={emptyMessage}
          totalConversions={totalConversions}
          onRefresh={refresh}
        />
      )}
    </>
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
      <h2 className={styles.sectionTitle}>Detalhe por afiliado</h2>

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
            ariaLabel="Visualizacao dos afiliados"
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
        <span>Conversoes pelo WhatsApp</span>
        <strong>{totalConversions}</strong>
        <p>Cliques no botao da landing que vieram de links de divulgacao.</p>
      </div>

      <div className={styles.conversionRanking}>
        <div className={styles.rankingHeader}>
          <strong>Afiliados que converteram</strong>
          <span>{ranking.length} com conversao</span>
        </div>

        {ranking.length === 0 ? (
          <p className={styles.emptyText}>Nenhum afiliado gerou conversao ainda.</p>
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
};

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
    <article className={cx(styles.affiliateCard, styles.affiliateCardCompact)}>
      <div className={styles.compactHeader}>
        <span className={styles.initialBadge}>{getAffiliateInitials(block.affiliate)}</span>

        <AffiliateIdentity name={block.affiliate} id={block.affiliateId} compact />

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
        <h4>Links de divulgacao</h4>
        <span>{block.links.length} links</span>
      </div>

      {previewLinks.length === 0 ? (
        <p className={styles.emptyInlineText}>Nenhum link cadastrado.</p>
      ) : (
        <div className={styles.linkPreviewList}>
          {previewLinks.map((link) => (
            <div key={link.id} className={styles.linkPreviewRow}>
              <LinkPreview link={link} />

              <LinkMetrics link={link} />

              <LinkIconActions
                link={link}
                deletingLinkId={deletingLinkId}
                onCopyLink={onCopyLink}
                onDeleteLink={onDeleteLink}
              />
            </div>
          ))}

          {hiddenLinks > 0 && (
            <p className={styles.moreLinksText}>+{hiddenLinks} links cadastrados</p>
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

      <div className={styles.linksSection}>
        <h4>Links de divulgacao</h4>
      </div>

      <AffiliateLinksTable
        links={block.links}
        deletingLinkId={deletingLinkId}
        onCopyLink={onCopyLink}
        onDeleteLink={onDeleteLink}
      />
    </article>
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
    { label: "Conversoes", value: conversions },
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
            <th className={styles.smallCell}>Conversoes</th>
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
  return (
    <tr className={styles.tableRow}>
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

function LinkInfo({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
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

function LinkMetrics({ link }: { link: AffiliateLink }) {
  return (
    <div className={styles.previewMetrics}>
      <span className={styles.clickBadge}>{link.clicks}</span>
      <ConversionCountBadge value={link.conversions ?? 0} />
    </div>
  );
}

function ConversionCountBadge({ value }: { value: number }) {
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
  const label = refreshing ? "Atualizando..." : "Atualizar relatorio";

  return (
    <button
      type="button"
      className={cx(
        styles.refreshButton,
        styles.affiliateRefreshButton,
        compact && styles.compactRefreshButton
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
  conversionEvents,
  emptyMessage,
  totalConversions,
  onRefresh,
}: {
  conversionEvents: ConversionWithAffiliate[];
  emptyMessage: string;
  totalConversions: number;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [editingConversionId, setEditingConversionId] = useState<number | null>(null);
  const [savingConversionId, setSavingConversionId] = useState<number | null>(null);
  const [deletingConversionId, setDeletingConversionId] = useState<number | null>(null);
  const [validatingSgpId, setValidatingSgpId] = useState<number | null>(null);
  const [stageStatusOverrides, setStageStatusOverrides] =
    useState<StageStatusOverrides>({});
  const [editForm, setEditForm] = useState<ConversionEditForm>(
    INITIAL_CONVERSION_FORM
  );

  const flowMetrics = [
    { label: "Conversoes", value: totalConversions },
    { label: "WhatsApp", value: conversionEvents.filter(hasWhatsappStage).length },
    { label: "Chatmix", value: conversionEvents.filter(hasChatmixValidation).length },
    { label: "SGP", value: conversionEvents.filter(hasSgpSale).length },
  ];

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
      onRefresh();
    } catch (error) {
      alert(
        getApiErrorMessage(error, "Nao foi possivel atualizar a conversao.")
      );
    } finally {
      setSavingConversionId(null);
    }
  }

  async function deleteConversion(conversion: ConversionWithAffiliate) {
    const confirmed = window.confirm(
      `Apagar a conversao #${conversion.id}? Essa acao remove o pre-cadastro salvo.`
    );

    if (!confirmed) return;

    setDeletingConversionId(conversion.id);

    try {
      await apagarConversao(conversion.id);
      onRefresh();
    } catch (error) {
      alert(getApiErrorMessage(error, "Nao foi possivel apagar a conversao."));
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
        stepIndex
      );

      return {
        ...current,
        [key]: !(current[key] ?? originalValue),
      };
    });
  }

  async function validateSgpAndOpen(conversion: ConversionWithAffiliate) {
    const document = onlyDigits(conversion.visitorDocument || "");
    const sgpStepIndex = 3;

    if (!document) {
      openSgpWithPreCadastro(conversion);
      alert(
        "Informe o CPF ou CNPJ no pre-cadastro para validar automaticamente no SGP."
      );
      return;
    }

    setValidatingSgpId(conversion.id);

    try {
      const response = await consultarClienteSgp(document);
      const validation = validatePreCadastroWithSgp(conversion, response.customer);

      if (!validation.valid) {
        alert(
          `Cliente encontrado no SGP, mas ha divergencias: ${validation.messages.join(", ")}.`
        );
        openSgpWithPreCadastro(conversion);
        return;
      }

      setStageStatusOverrides((current) => ({
        ...current,
        [getStageStatusKey(conversion.id, sgpStepIndex)]: true,
      }));

      openSgpWithPreCadastro(conversion);
    } catch (error) {
      alert(getApiErrorMessage(error, "Nao foi possivel validar no SGP."));
      openSgpWithPreCadastro(conversion);
    } finally {
      setValidatingSgpId(null);
    }
  }

  function openSgpWithPreCadastro(conversion: ConversionWithAffiliate) {
    router.push(buildSgpUrl(conversion));
  }

  return (
    <section className={styles.conversionFlowPanel} role="tabpanel">
      <div className={styles.conversionFlowOverview}>
        {flowMetrics.map((metric) => (
          <FlowMetric key={metric.label} {...metric} />
        ))}
      </div>

      {conversionEvents.length === 0 ? (
        <p className={styles.emptyText}>{emptyMessage}</p>
      ) : (
        <div className={styles.conversionFlowList}>
          {conversionEvents.map((conversion) => {
            const steps = getStepsWithOverrides(
              conversion,
              stageStatusOverrides
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
                onOpenSgp={() => validateSgpAndOpen(conversion)}
                isValidatingSgp={validatingSgpId === conversion.id}
              />
            );
          })}
        </div>
      )}
    </section>
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
}) {
  const finalStatus = getConversionFinalStatusFromSteps(steps);
  const [activeClientTab, setActiveClientTab] =
    useState<ClientDataTab>("main");
  const [showConversionData, setShowConversionData] = useState(false);

  return (
    <article className={styles.conversionFlowCard}>
      <ConversionCardHeader
        conversion={conversion}
        finalStatus={finalStatus}
        isDeleting={isDeleting}
        onDelete={onDelete}
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
            />
          ))}
        </div>

        <button
          type="button"
          className={cx(
            styles.conversionDataGuide,
            showConversionData && styles.conversionDataGuideActive
          )}
          onClick={() => setShowConversionData((current) => !current)}
          aria-expanded={showConversionData}
          aria-controls={`conversion-data-${conversion.id}`}
        >
          <span>Dados da conversao</span>
          <strong>{conversion.visitorName || "Cliente sem nome"}</strong>
          <small>{showConversionData ? "Ocultar" : "Mostrar"}</small>
        </button>

        {showConversionData && (
          <ConversionDataTabsPanel
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
          />
        )}
      </div>
    </article>
  );
}

function ConversionDataTabsPanel({
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
}) {
  return (
    <section id={id} className={styles.conversionDataTabsPanel}>
      <ClientDataHeader
        conversion={conversion}
        minimized={false}
        isEditing={isEditing}
        isSaving={isSaving}
        onStartEditing={onStartEditing}
        onCancelEditing={onCancelEditing}
        onSave={onSave}
      />

      <ClientDataTabs
        activeTab={activeTab}
        onChangeTab={onChangeTab}
      />

      {isEditing ? (
        <ConversionEditFormFields
          form={editForm}
          onChangeForm={onChangeEditForm}
        />
      ) : (
        <ClientDataList
          conversion={conversion}
          activeTab={activeTab}
        />
      )}
    </section>
  );
}

function ConversionCardHeader({
  conversion,
  finalStatus,
  isDeleting,
  onDelete,
}: {
  conversion: ConversionWithAffiliate;
  finalStatus: { label: string; className: string };
  isDeleting: boolean;
  onDelete: () => void;
}) {
  return (
    <div className={styles.conversionFlowHeader}>
      <div className={styles.conversionIdentity}>
        <span>Conversao #{conversion.id}</span>
        <h3>{conversion.affiliate}</h3>
        <p>
          {conversion.linkName || "Link sem nome"} - codigo {conversion.shortCode}
        </p>
      </div>

      <div className={styles.conversionHeaderActions}>
        <span className={cx(styles.finalStatusBadge, finalStatus.className)}>
          {finalStatus.label}
        </span>

        <button
          type="button"
          className={styles.iconDeleteConversionButton}
          onClick={onDelete}
          disabled={isDeleting}
          aria-label={`Apagar conversao ${conversion.id}`}
          title="Apagar conversao"
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
        <span>Dados da conversao</span>
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
      <button type="button" className={styles.editButton} onClick={onStartEditing}>
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
    <div className={styles.clientDataTabs} role="tablist" aria-label="Dados do cliente">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={cx(
            styles.clientDataTab,
            activeTab === tab.value && styles.clientDataTabActive
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
    { label: "Nome", value: conversion.visitorName || "Nao informado" },
    { label: "WhatsApp", value: formatPhone(conversion.visitorPhone) },
    { label: "CPF/CNPJ", value: formatDocument(conversion.visitorDocument) },
    { label: "Cidade coletada", value: conversion.visitorCity || "Nao informado" },
    { label: "Produto", value: conversion.product || "Nao informado" },
    { label: "Data", value: formatDateTime(conversion.convertedAt) },
    {
      label: "Destino",
      value: conversion.destination
        ? formatDisplayLink(conversion.destination)
        : "Nao informado",
      title: conversion.destination || undefined,
    },
  ];

  const accessItems = [
    { label: "Origem", value: conversion.source || "Nao informado" },
    { label: "UTM source", value: conversion.utmSource || "Nao informado" },
    { label: "UTM medium", value: conversion.utmMedium || "Nao informado" },
    { label: "UTM campanha", value: conversion.utmCampaign || "Nao informado" },
    { label: "Referencia", value: conversion.referrer || "Nao informado", title: conversion.referrer || undefined },
    { label: "IP", value: conversion.ipAddress || "Nao informado" },
    { label: "Pais", value: conversion.geoCountry || "Nao informado" },
    { label: "Regiao", value: conversion.geoRegion || "Nao informado" },
    { label: "Cidade IP", value: conversion.geoCity || "Nao informado" },
  ];

  const deviceItems = [
    { label: "Dispositivo", value: conversion.deviceType || "Nao informado" },
    { label: "Navegador", value: conversion.browser || "Nao informado" },
    { label: "Sistema", value: conversion.operatingSystem || "Nao informado" },
    { label: "Plataforma", value: conversion.platform || "Nao informado" },
    { label: "Idioma", value: conversion.language || "Nao informado" },
    { label: "Fuso", value: conversion.timezone || "Nao informado" },
    { label: "Tela", value: formatScreenSize(conversion.screenWidth, conversion.screenHeight) },
    { label: "User agent", value: conversion.userAgent || "Nao informado", title: conversion.userAgent || undefined },
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

function FlowMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.flowMetric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ConversionStageCard({
  step,
  index,
  conversion,
  onToggleStatus,
  onOpenSgp,
  isLoading,
}: {
  step: ConversionStep;
  index: number;
  conversion: ConversionWithAffiliate;
  onToggleStatus: () => void;
  onOpenSgp?: () => void;
  isLoading?: boolean;
}) {
  const Icon = CONVERSION_STAGE_ICONS[index] || FiLink;
  const StatusIcon = step.completed ? FiCheckCircle : FiClock;
  const showChatmixData = index === 2;

  return (
    <section
      className={cx(
        styles.conversionStageCard,
        onOpenSgp && styles.conversionStageClickable,
        step.completed
          ? styles.conversionStageDone
          : styles.conversionStagePending
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
        title={step.completed ? "Marcar como em andamento" : "Marcar como feito"}
      >
        ...
      </button>

      <div className={styles.stageIconBox}>
        <Icon aria-hidden="true" />
      </div>

      <div className={styles.stageContentCard}>
        <span>{index + 1} etapa</span>
        <strong>{step.title}</strong>
        <p>{step.description}</p>

        {showChatmixData ? (
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
          }))
        )
        .sort(
          (a, b) =>
            new Date(b.convertedAt).getTime() -
            new Date(a.convertedAt).getTime()
        ),
    [details]
  );
}

function useConversionRanking(details: AffiliateDetail[]) {
  return useMemo(
    () =>
      [...details]
        .filter((affiliate) => (affiliate.totalConversions ?? 0) > 0)
        .sort(
          (a, b) =>
            (b.totalConversions ?? 0) - (a.totalConversions ?? 0)
        ),
    [details]
  );
}

function useTotalConversions(details: AffiliateDetail[]) {
  return useMemo(
    () =>
      details.reduce(
        (sum, affiliate) => sum + (affiliate.totalConversions ?? 0),
        0
      ),
    [details]
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
  overrides: StageStatusOverrides
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
  stepIndex: number
) {
  const conversion = conversionEvents.find((item) => item.id === conversionId);

  if (!conversion) return false;

  return getConversionFlowSteps(conversion)[stepIndex]?.completed ?? false;
}

function getConversionFlowSteps(
  conversion: ConversionWithAffiliate
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
      title: "Pre-cadastro",
      description: "Contato iniciado pelo WhatsApp com codigo do afiliado.",
      completed: hasWhatsapp,
      detail: hasWhatsapp
        ? getWhatsappStepDetail(conversion, eventDate)
        : "Aguardando clique no WhatsApp",
      dateLabel: whatsappDate,
      dataItems: getPreCadastroStepItems(conversion),
    },
    {
      title: "Validacao no Chatmix",
      description: "Webhook confirmou o atendimento no Chatmix.",
      completed: hasChatmix,
      detail: hasChatmix ? "Atendimento validado" : "Aguardando webhook",
      dateLabel: chatmixDate,
    },
    {
      title: "Registro no SGP",
      description: "Venda concluida e registrada no SGP.",
      completed: hasSgp,
      detail: hasSgp ? "Venda concluida" : "Aguardando venda",
      dateLabel: sgpDate,
    },
  ];
}

function getPreCadastroStepItems(
  conversion: ConversionWithAffiliate
): ConversionStepDataItem[] {
  const items = [
    {
      label: "Codigo",
      value: conversion.shortCode || "Nao informado",
    },
    {
      label: "Origem",
      value: conversion.source || "WhatsApp",
    },
    {
      label: "Cliente",
      value: conversion.visitorName || "Nao informado",
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
  eventDate: string
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
      value: conversion.visitorName || "Nao informado",
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
      value: conversion.visitorCity || "Nao informado",
    },
    {
      label: "Origem",
      value: conversion.source || "Nao informado",
    },
    {
      label: "Evento",
      value: conversion.type || "Nao informado",
      title: conversion.type || undefined,
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

function formatDateTime(value?: string | null) {
  if (!value) return "Sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Data invalida";

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

  if (!digits) return "Nao informado";

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return value || "Nao informado";
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function formatDocument(value?: string | null) {
  const digits = onlyDigits(value);

  if (!digits) return "Nao informado";

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  return value || "Nao informado";
}

function formatScreenSize(width?: number | null, height?: number | null) {
  if (!width || !height) return "Nao informado";

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
  }
) {
  const messages: string[] = [];
  const conversionDocument = onlyDigits(conversion.visitorDocument);
  const customerDocument = onlyDigits(customer.document);
  const conversionPhone = onlyDigits(conversion.visitorPhone);
  const customerPhone = onlyDigits(customer.phone);

  if (conversionDocument && customerDocument && conversionDocument !== customerDocument) {
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
    messages.push("numero de celular diferente");
  }

  if (conversionPhone && !customerPhone) {
    messages.push("numero de celular nao encontrado no SGP");
  }

  if (
    conversion.visitorCity &&
    customer.city &&
    normalizeText(conversion.visitorCity) !== normalizeText(customer.city)
  ) {
    messages.push("cidade diferente");
  }

  if (customer.active === false) {
    messages.push("cliente inativo");
  }

  return {
    valid: messages.length === 0,
    messages,
  };
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

function buildSgpUrl(conversion: ConversionWithAffiliate) {
  const params = new URLSearchParams();
  const document = onlyDigits(conversion.visitorDocument);

  if (document) params.set("document", document);
  if (conversion.visitorName) params.set("name", conversion.visitorName);
  if (conversion.visitorPhone) params.set("phone", conversion.visitorPhone);
  if (conversion.visitorCity) params.set("city", conversion.visitorCity);
  params.set("conversionId", String(conversion.id));

  return `/sgp?${params.toString()}`;
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
