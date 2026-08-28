"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Campaign,
  apagarCampanha,
  getApiErrorMessage,
  listarCampanhas,
} from "@/lib/api";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";
import styles from "./campanhas.module.css";

const AUTO_REFRESH_MS = 10000;

export default function Campanhas() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedCampaignId, setExpandedCampaignId] =
    useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingCampaignId, setDeletingCampaignId] =
    useState<number | null>(null);

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
      campaigns.find((campaign) => campaign.id === expandedCampaignId) ??
      null,
    [campaigns, expandedCampaignId]
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
    if (document.visibilityState === "visible") {
      loadCampaigns({ silent: true });
    }
  }, [loadCampaigns]);

  useRealtimeEvents(refreshCampaignsFromEvent);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadCampaigns();
    }, 0);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadCampaigns({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
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
        <p className={styles.error}>{error}</p>
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
      </div>

      {copyHint && (
        <p className={styles.copyHint}>
          {copyHint}
        </p>
      )}

      {selectedCampaign ? (
        <CampaignDetail
          campaign={selectedCampaign}
          deleting={deletingCampaignId === selectedCampaign.id}
          onBack={() => setExpandedCampaignId(null)}
          onCopyLink={copyLink}
          onDelete={() => deleteCampaign(selectedCampaign)}
        />
      ) : campaigns.length === 0 ? (
        <div className={styles.emptyCard}>
          <strong>Nenhuma campanha criada.</strong>
          <p>Crie uma campanha para gerar links por grupo de afiliados.</p>
        </div>
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
              onOpen={() => setExpandedCampaignId(campaign.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type CampaignCardProps = {
  campaign: Campaign;
  onOpen: () => void;
};

function CampaignCard({
  campaign,
  onOpen,
}: CampaignCardProps) {
  const createdAt = formatDate(campaign.createdAt);
  const firstAffiliate = campaign.links.find((link) => link.affiliate)?.affiliate;

  return (
    <button
      type="button"
      className={styles.card}
      onClick={onOpen}
    >
      <div className={styles.cardTop}>
        <strong>{campaign.name}</strong>
      </div>

      <div className={styles.cardBottom}>
        <div className={styles.cardInfo}>
          <span>Criado: {createdAt}</span>
          <span>
            Afiliado: {firstAffiliate?.name ?? `${campaign.totalAffiliates} afiliados`}
          </span>
        </div>

        <time dateTime={campaign.createdAt}>{createdAt}</time>
      </div>
    </button>
  );
}

function CampaignDetail({
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
