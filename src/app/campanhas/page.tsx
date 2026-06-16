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
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";
import styles from "./campanhas.module.css";
import conteine from "@/styles/components.module.css";

const AUTO_REFRESH_MS = 10000;

export default function Campanhas() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedCampaignId, setExpandedCampaignId] =
    useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] =
    useState<number | null>(null);

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
              "Nao foi possivel carregar as campanhas."
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
    loadCampaigns();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadCampaigns({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [loadCampaigns]);

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopyHint("Link copiado.");
      window.setTimeout(() => setCopyHint(null), 2200);
    } catch {
      setCopyHint("Nao foi possivel copiar.");
    }
  }

  async function deleteCampaign(campaign: Campaign) {
    const confirmed = window.confirm(
      `Apagar a campanha "${campaign.name}"? Esta acao tambem remove os links e cliques relacionados.`
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
          "Nao foi possivel apagar a campanha."
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
        <div>
          <span className={styles.badge}>Relatorio comercial</span>
          <h1>Campanhas</h1>
          <p>
              .
          </p>
        </div>
      </div>

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
      ) : (
        <div className={styles.campaignList}>
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              expanded={expandedCampaignId === campaign.id}
              deleting={deletingCampaignId === campaign.id}
              onToggle={() =>
                setExpandedCampaignId((current) =>
                  current === campaign.id ? null : campaign.id
                )
              }
              onCopyLink={copyLink}
              onDelete={() => deleteCampaign(campaign)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type CampaignCardProps = {
  campaign: Campaign;
  expanded: boolean;
  deleting: boolean;
  onToggle: () => void;
  onCopyLink: (link: string) => void;
  onDelete: () => void;
};

function CampaignCard({
  campaign,
  expanded,
  deleting,
  onToggle,
  onCopyLink,
  onDelete,
}: CampaignCardProps) {
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

  return (
    <section className={styles.card}>
      <div className={styles.cardButton}>
        <div className={styles.cardTitleBlock}>
          <strong>{campaign.name}</strong>
          <span>{campaign.destinationUrl}</span>
        </div>

        <div className={styles.cardMetrics}>
          <Metric label="Afiliados" value={campaign.totalAffiliates} />
          <Metric label="Links" value={campaign.totalLinks} />
          <Metric label="Cliques" value={campaign.totalClicks} />
        </div>

        <div className={styles.cardActions}>
          <button
            type="button"
            className={styles.expandButton}
            onClick={onToggle}
          >
            {expanded ? "Fechar relatorio" : "Abrir relatorio"}
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

      {expanded && (
        <div className={styles.report}>
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
              <span>Media</span>
              <strong>{conversionLabel}</strong>
            </div>
          </div>

          <div className={styles.sectionTitle}>
            <h2>Ranking de divulgacao</h2>
          </div>

          {ranking.length === 0 ? (
            <p className={styles.muted}>
              Nenhum afiliado nesta campanha.
            </p>
          ) : (
            <div className={styles.rankingList}>
              {ranking.map((link, index) => (
                <div key={link.id} className={styles.rankingItem}>
                  <span className={styles.position}>#{index + 1}</span>
                  <div>
                    <strong>{link.affiliate?.name}</strong>
                    <p>{link.affiliate?.email ?? "Sem e-mail"}</p>
                  </div>
                  <span className={styles.clickPill}>
                    {link.clicks} cliques
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Afiliado</th>
                  <th>Link de divulgacao</th>
                  <th>Cliques</th>
                  <th>Acao</th>
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
        </div>
      )}
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
