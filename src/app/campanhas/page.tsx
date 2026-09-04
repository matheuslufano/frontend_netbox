"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Campaign,
  Affiliate,
  apagarCampanha,
  editarCampanha,
  getApiErrorMessage,
  listarAfiliados,
  listarCampanhas,
} from "@/lib/api";
import { FiArrowLeft, FiBarChart2, FiEdit2, FiGrid, FiMoreVertical, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import {
  RealtimeEventName,
  useRealtimeEvents,
} from "@/lib/useRealtimeEvents";
import {
  CampaignDetailDashboard,
  CampaignSummaryDashboard,
} from "./CampaignDetailDashboard";
import styles from "./campanhas.module.css";

const AUTO_REFRESH_MS = 5000;
const REALTIME_REFRESH_DELAY_MS = 250;
const CAMPAIGN_REALTIME_EVENTS: RealtimeEventName[] = [
  "link-clicked",
  "link-converted",
  "chatmix-webhook",
];

export default function Campanhas() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedCampaignId, setExpandedCampaignId] =
    useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"campaigns" | "summary">("summary");
  const [deletingCampaignId, setDeletingCampaignId] =
    useState<number | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const filteredCampaigns = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return campaigns;
    }

    return campaigns.filter((campaign) => {
      const searchText = [
        campaign.name,
        campaign.destinationUrl,
        campaign.topAffiliate?.name,
        campaign.topLink?.name,
        ...campaign.links.map((link) => link.affiliate?.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(term);
    });
  }, [campaigns, searchTerm]);

  const selectedCampaign = useMemo(
    () =>
      filteredCampaigns.find((campaign) => campaign.id === expandedCampaignId) ??
      null,
    [filteredCampaigns, expandedCampaignId]
  );

  const loadCampaigns = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      if (!silent) {
        setLoading(true);
      }

      try {
        const data = await listarCampanhas();
        setCampaigns(data);
        setError(null);
      } catch (err) {
        if (!silent) {
          setError(
            getApiErrorMessage(
              err,
              "Não foi possível carregar as campanhas."
            )
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  const refreshCampaignsFromEvent = useCallback(() => {
    if (document.visibilityState !== "visible") {
      return;
    }

    if (realtimeRefreshTimerRef.current !== null) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      loadCampaigns({ silent: true });
    }, REALTIME_REFRESH_DELAY_MS);
  }, [loadCampaigns]);

  useRealtimeEvents(refreshCampaignsFromEvent, CAMPAIGN_REALTIME_EVENTS);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCampaigns();
    }, 0);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadCampaigns({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        loadCampaigns({ silent: true });
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
    };
  }, [loadCampaigns]);

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopyHint("Link copiado.");
      window.setTimeout(() => setCopyHint(null), 2200);
    } catch {
      setCopyHint("Não foi possível copiar.");
    }
  }

  async function deleteCampaign(campaign: Campaign) {
    const confirmed = window.confirm(
      `Apagar a campanha "${campaign.name}"? Esta ação também remove os links e cliques relacionados.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCampaignId(campaign.id);
      await apagarCampanha(campaign.id);
      setCampaigns((current) =>
        current.filter((item) => item.id !== campaign.id)
      );
      setExpandedCampaignId((current) =>
        current === campaign.id ? null : current
      );
      setCopyHint("Campanha apagada.");
      window.setTimeout(() => setCopyHint(null), 2200);
    } catch (err) {
      setCopyHint(
        getApiErrorMessage(
          err,
          "Não foi possível apagar a campanha."
        )
      );
    } finally {
      setDeletingCampaignId(null);
    }
  }

  async function updateCampaign(
    name: string,
    destinationUrl: string,
    links: { id?: number; affiliateId: number; shortCode: string }[],
  ) {
    if (!editingCampaign) return;
    const updated = await editarCampanha(editingCampaign.id, { name, destinationUrl, links });
    setCampaigns((current) =>
      current.map((item) => item.id === updated.id ? updated : item)
    );
    setEditingCampaign(null);
    setCopyHint("Campanha atualizada.");
    window.setTimeout(() => setCopyHint(null), 2200);
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <h1>Campanhas</h1>
        <p>Carregando campanhas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <h1>Campanhas</h1>
        <p className={styles.error} role="alert">{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <label className={styles.searchBox}>
          <FiSearch aria-hidden="true" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar"
          />
        </label>

        {selectedCampaign && <div className={styles.viewTabs} role="tablist" aria-label="Visualização das campanhas">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "campaigns"}
            className={viewMode === "campaigns" ? styles.activeViewTab : undefined}
            onClick={() => setViewMode("campaigns")}
          >
            <FiGrid aria-hidden="true" />
            Completa
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "summary"}
            className={viewMode === "summary" ? styles.activeViewTab : undefined}
            onClick={() => setViewMode("summary")}
          >
            <FiBarChart2 aria-hidden="true" />
            Resumo
          </button>
        </div>}
      </div>

      {selectedCampaign && (
        <div className={styles.simpleCampaignPicker}>
          <button
            type="button"
            className={styles.summaryBackButton}
            onClick={() => setExpandedCampaignId(null)}
          >
            <FiArrowLeft aria-hidden="true" />
            Todas as campanhas
          </button>
          <select
            id="active-campaign"
            aria-label="Campanha selecionada"
            value={selectedCampaign.id}
            onChange={(event) => setExpandedCampaignId(Number(event.target.value))}
          >
            {filteredCampaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
        </div>
      )}

      {copyHint && (
        <p className={styles.copyHint}>
          {copyHint}
        </p>
      )}

      {campaigns.length === 0 ? (
        <div className={styles.emptyCard}>
          <strong>Nenhuma campanha criada.</strong>
          <p>Crie uma campanha para gerar links por grupo de afiliados.</p>
        </div>
      ) : selectedCampaign ? (
        viewMode === "summary" ? (
          <CampaignSimpleView campaign={selectedCampaign} onCopyLink={copyLink} />
        ) : (
          <CampaignDetailDashboard
            campaign={selectedCampaign}
            deleting={deletingCampaignId === selectedCampaign.id}
            onBack={() => setExpandedCampaignId(null)}
            onCopyLink={copyLink}
            onDelete={() => deleteCampaign(selectedCampaign)}
          />
        )
      ) : filteredCampaigns.length === 0 ? (
        <div className={styles.emptyCard}>
          <strong>Nenhuma campanha encontrada.</strong>
          <p>Tente pesquisar por outro nome, destino ou afiliado.</p>
        </div>
      ) : (
        <div className={styles.campaignList}>
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onOpen={() => {
                setExpandedCampaignId(campaign.id);
                setViewMode("summary");
              }}
              onEdit={() => setEditingCampaign(campaign)}
              onDelete={() => deleteCampaign(campaign)}
            />
          ))}
        </div>
      )}

      {editingCampaign && (
        <CampaignEditModal
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSave={updateCampaign}
        />
      )}
    </div>
  );
}

function CampaignSimpleView({
  campaign,
  onCopyLink,
}: {
  campaign: Campaign;
  onCopyLink: (link: string) => void;
}) {
  return (
    <section className={styles.simpleView} aria-label="Resumo da campanha">
      <CampaignSummaryDashboard campaign={campaign} onCopyLink={onCopyLink} />
    </section>
  );
}

type CampaignCardProps = {
  campaign: Campaign;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

function CampaignCard({
  campaign,
  onOpen,
  onEdit,
  onDelete,
}: CampaignCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const createdAt = formatDate(campaign.createdAt);
  const firstAffiliate = campaign.links.find((link) => link.affiliate)?.affiliate;

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <iframe
          className={styles.cardSitePreview}
          src={campaign.destinationUrl}
          title={`Prévia do site ${campaign.name}`}
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
          referrerPolicy="no-referrer"
          sandbox=""
        />
        <span className={styles.cardPreviewOverlay} aria-hidden="true" />
        <button type="button" className={styles.cardOpenArea} onClick={onOpen}>
          <strong>{campaign.name}</strong>
        </button>
        <div className={styles.cardMenuWrap}>
          <button type="button" className={styles.cardMenuButton} aria-label={`Opções da campanha ${campaign.name}`} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            <FiMoreVertical aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className={styles.cardMenu} role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onEdit(); }}><FiEdit2 /> Editar campanha</button>
              <button type="button" role="menuitem" className={styles.cardMenuDanger} onClick={() => { setMenuOpen(false); onDelete(); }}><FiTrash2 /> Apagar campanha</button>
            </div>
          )}
        </div>
      </div>

      <button type="button" className={styles.cardBottom} onClick={onOpen}>
        <div className={styles.cardInfo}>
          <span>Criado: {createdAt}</span>
          <span>
            Afiliado: {firstAffiliate?.name ?? `${campaign.totalAffiliates} afiliados`}
          </span>
        </div>

        <time dateTime={campaign.createdAt}>{createdAt}</time>
      </button>
    </article>
  );
}

function CampaignEditModal({ campaign, onClose, onSave }: { campaign: Campaign; onClose: () => void; onSave: (name: string, destinationUrl: string, links: { id?: number; affiliateId: number; shortCode: string }[]) => Promise<void> }) {
  const [name, setName] = useState(campaign.name);
  const [destinationUrl, setDestinationUrl] = useState(campaign.destinationUrl);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [links, setLinks] = useState<{ id?: number; affiliateId: number; shortCode: string }[]>(() => campaign.links.map((link) => ({
    id: link.id,
    affiliateId: link.affiliate?.id ?? 0,
    shortCode: link.shortCode,
  })));
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    listarAfiliados()
      .then((items) => setAffiliates(items.filter((affiliate) => affiliate.active)))
      .catch((error) => setModalError(getApiErrorMessage(error, "Não foi possível carregar os afiliados.")));
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !destinationUrl.trim() || links.length === 0) {
      setModalError("Informe nome, destino e pelo menos um afiliado.");
      return;
    }
    if (links.some((link) => !/^[a-f0-9]{8}$/i.test(link.shortCode.trim()))) {
      setModalError("Cada código deve possuir exatamente 8 caracteres hexadecimais.");
      return;
    }
    try {
      setSaving(true);
      setModalError(null);
      await onSave(name.trim(), destinationUrl.trim(), links.map((link) => ({
        ...(link.id ? { id: link.id } : {}),
        affiliateId: link.affiliateId,
        shortCode: link.shortCode.trim().toLowerCase(),
      })));
    } catch (error) {
      setModalError(getApiErrorMessage(error, "Não foi possível editar a campanha."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.editBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className={styles.editModal} role="dialog" aria-modal="true" aria-labelledby="edit-campaign-title" onSubmit={submit}>
        <div className={styles.editModalHeader}><h2 id="edit-campaign-title">Editar campanha</h2><button type="button" onClick={onClose} aria-label="Fechar"><FiX /></button></div>
        <label>Nome da campanha<input value={name} onChange={(event) => setName(event.target.value)} autoFocus /></label>
        <label>Link de destino<input type="url" value={destinationUrl} onChange={(event) => setDestinationUrl(event.target.value)} /></label>
        <fieldset className={styles.editAffiliates}>
          <legend>Afiliados e códigos de divulgação</legend>
          {links.map((link, index) => (
            <div key={link.id ?? `new-${index}`} className={styles.editAffiliateRow}>
              <select
                aria-label={`Afiliado ${index + 1}`}
                value={link.affiliateId}
                onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, affiliateId: Number(event.target.value) } : item))}
              >
                <option value={0} disabled>Selecione o afiliado</option>
                {affiliates.map((affiliate) => (
                  <option key={affiliate.id} value={affiliate.id} disabled={links.some((item, itemIndex) => itemIndex !== index && item.affiliateId === affiliate.id)}>{affiliate.name}</option>
                ))}
              </select>
              <input aria-label={`Código do afiliado ${index + 1}`} value={link.shortCode} maxLength={8} onChange={(event) => setLinks((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, shortCode: event.target.value.replace(/[^a-f0-9]/gi, "").toLowerCase() } : item))} />
              <button type="button" className={styles.removeAffiliateButton} onClick={() => setLinks((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remover afiliado"><FiTrash2 /></button>
            </div>
          ))}
          <button
            type="button"
            className={styles.addAffiliateButton}
            disabled={affiliates.every((affiliate) => links.some((link) => link.affiliateId === affiliate.id))}
            onClick={() => {
              const affiliate = affiliates.find((item) => !links.some((link) => link.affiliateId === item.id));
              if (affiliate) setLinks((current) => [...current, { affiliateId: affiliate.id, shortCode: generateShortCode() }]);
            }}
          >
            + Adicionar afiliado
          </button>
        </fieldset>
        {modalError && <p className={styles.editError} role="alert">{modalError}</p>}
        <div className={styles.editActions}><button type="button" onClick={onClose}>Cancelar</button><button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button></div>
      </form>
    </div>
  );
}

function generateShortCode() {
  const bytes = new Uint8Array(4);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function LegacyCampaignDetail({
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
  const [showAffiliateLinks, setShowAffiliateLinks] = useState(false);
  const [expandedAffiliateLinkIds, setExpandedAffiliateLinkIds] = useState<
    Set<number>
  >(new Set());
  const ranking = useMemo(
    () =>
      campaign.links
        .filter((link) => link.affiliate)
        .slice()
        .sort((a, b) => b.clicks - a.clicks),
    [campaign.links]
  );

  const conversionLabel =
    campaign.totalLinks > 0
      ? `${(campaign.totalClicks / campaign.totalLinks).toFixed(1)} cliques/link`
      : "0 cliques/link";
  const createdAt = formatDate(campaign.createdAt);
  const firstAffiliate = campaign.links.find((link) => link.affiliate)?.affiliate;

  return (
    <section className={styles.detailPage}>
      <div className={styles.detailHero}>
        <button
          type="button"
          className={styles.backButton}
          onClick={onBack}
        >
          <FiArrowLeft aria-hidden="true" />
          Voltar
        </button>

        <div className={styles.detailTitle}>
          <span>Campanha</span>
          <h1>{campaign.name}</h1>
        </div>

        <div className={styles.detailSummary}>
          <div className={styles.cardInfo}>
            <span>Criado: {createdAt}</span>
            <span>
              Afiliado: {firstAffiliate?.name ?? `${campaign.totalAffiliates} afiliados`}
            </span>
          </div>

          <time dateTime={campaign.createdAt}>{createdAt}</time>
        </div>
      </div>

      <div className={styles.report}>
          <div className={styles.expandedHeader}>
            <div>
              <span>Destino</span>
              <strong>{campaign.destinationUrl}</strong>
            </div>

            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.expandButton}
                onClick={onBack}
              >
                Fechar
              </button>

              <button
                type="button"
                className={styles.deleteButton}
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? "Apagando..." : "Apagar"}
              </button>
            </div>
          </div>

          <div className={styles.cardMetrics}>
            <Metric label="Afiliados" value={campaign.totalAffiliates} />
            <Metric label="Links" value={campaign.totalLinks} />
            <Metric label="Cliques" value={campaign.totalClicks} />
          </div>

          <div className={styles.reportGrid}>
            <div className={styles.infoBox}>
              <span>Melhor afiliado</span>
              <strong>
                {campaign.topAffiliate?.name ?? "Sem cliques ainda"}
              </strong>
            </div>

            <div className={styles.infoBox}>
              <span>Melhor link</span>
              <strong>
                {campaign.topLink?.name ?? "Sem destaque ainda"}
              </strong>
            </div>

            <div className={styles.infoBox}>
              <span>Média</span>
              <strong>{conversionLabel}</strong>
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <h2>Ranking de divulgação</h2>
          </div>

          {ranking.length === 0 ? (
            <p className={styles.muted}>
              Nenhum afiliado nesta campanha.
            </p>
          ) : (
            <div className={styles.rankingList}>
              {ranking.map((link, index) => {
                const isExpanded = expandedAffiliateLinkIds.has(link.id);

                return (
                  <div key={link.id} className={styles.rankingEntry}>
                    <button
                      type="button"
                      className={styles.rankingItem}
                      aria-expanded={isExpanded}
                      aria-controls={`affiliate-conversions-${link.id}`}
                      onClick={() =>
                        setExpandedAffiliateLinkIds((current) => {
                          const next = new Set(current);

                          if (next.has(link.id)) {
                            next.delete(link.id);
                          } else {
                            next.add(link.id);
                          }

                          return next;
                        })
                      }
                    >
                      <span className={styles.position}>#{index + 1}</span>
                      <span className={styles.rankingAffiliate}>
                        <strong>{link.affiliate?.name}</strong>
                        <span>{link.affiliate?.email ?? "Sem e-mail"}</span>
                      </span>
                      <span className={styles.rankingTotals}>
                        <span className={styles.conversionPill}>
                          {link.conversions} conversões
                        </span>
                        <span className={styles.clickPill}>
                          {link.clicks} cliques
                        </span>
                      </span>
                    </button>

                    {isExpanded && (
                      <div
                        id={`affiliate-conversions-${link.id}`}
                        className={styles.conversionList}
                      >
                        {link.conversionEvents.length === 0 ? (
                          <p className={styles.noConversions}>
                            Nenhuma conversão registrada para este afiliado.
                          </p>
                        ) : (
                          link.conversionEvents.map((conversion) => (
                            <div
                              key={conversion.id}
                              className={styles.conversionItem}
                            >
                              <div>
                                <span className={styles.conversionLabel}>Cliente</span>
                                <strong>{conversion.customerName}</strong>
                                <span>
                                  {conversion.customerPhone ?? "Número não informado"}
                                </span>
                              </div>
                              <span
                                className={
                                  conversion.convertedInSgp
                                    ? styles.sgpConverted
                                    : styles.sgpPending
                                }
                              >
                                {conversion.convertedInSgp
                                  ? "Convertido no SGP"
                                  : "Não convertido no SGP"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className={styles.linksToggleRow}>
            <button
              type="button"
              className={styles.linksToggleButton}
              aria-expanded={showAffiliateLinks}
              aria-controls="affiliate-links-table"
              onClick={() => setShowAffiliateLinks((current) => !current)}
            >
              {showAffiliateLinks
                ? "Ocultar links dos afiliados"
                : "Mostrar links dos afiliados"}
            </button>
          </div>

          {showAffiliateLinks && (
          <div
            id="affiliate-links-table"
            className={styles.tableWrapper}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Afiliado</th>
                  <th>Link de divulgação</th>
                  <th>Cliques</th>
                  <th>Ação</th>
                </tr>
              </thead>

              <tbody>
                {campaign.links.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <strong>
                        {link.affiliate?.name ?? "Sem afiliado"}
                      </strong>
                    </td>
                    <td>
                      <a
                        href={link.promoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.promoLink}
                      </a>
                    </td>
                    <td>
                      <span className={styles.clickPill}>
                        {link.clicks}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.copyButton}
                        onClick={() => onCopyLink(link.promoLink)}
                      >
                        Copiar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className={styles.metric}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "dd/mm/aaaa";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "dd/mm/aaaa";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
