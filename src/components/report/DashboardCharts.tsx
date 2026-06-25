import { Affiliate, DashboardData } from "@/lib/api";
import styles from "./report.module.css";

type DashboardChartsProps = {
  dashboard: DashboardData;
  affiliateRows: Affiliate[];
};

type AnyDashboard = DashboardData & Record<string, unknown>;

type FunnelStep = {
  key: string;
  label: string;
  value: number;
  helper: string;
};

function readNumber(source: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value)}%`;
}

function getConversionRate(totalConversions: number, totalVisits: number) {
  if (totalVisits <= 0) {
    return 0;
  }

  return (totalConversions / totalVisits) * 100;
}

function getSafeRatio(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / total) * 100));
}

export default function DashboardCharts({
  dashboard,
  affiliateRows,
}: DashboardChartsProps) {
  const dashboardData = dashboard as AnyDashboard;

  const totalLinks = readNumber(dashboardData, ["totalLinks", "links"]);
  const totalClicks = readNumber(dashboardData, ["totalClicks", "clicks"]);
  const totalVisits = readNumber(dashboardData, [
    "totalVisits",
    "visits",
    "totalLandingVisits",
    "landingVisits",
  ], totalClicks);
  const totalPreRegistrations = readNumber(dashboardData, [
    "totalPreRegistrations",
    "preRegistrations",
    "totalPreCadastros",
    "preCadastros",
    "totalLeads",
    "leads",
  ]);
  const totalWhatsapp = readNumber(dashboardData, [
    "totalWhatsapp",
    "whatsapp",
    "totalWhatsappClicks",
    "whatsappClicks",
  ]);
  const totalChatmix = readNumber(dashboardData, [
    "totalChatmix",
    "chatmix",
    "totalChatmixValidated",
    "chatmixValidated",
  ]);
  const totalSgp = readNumber(dashboardData, [
    "totalSgp",
    "sgp",
    "totalSgpActive",
    "sgpActive",
    "activeSgp",
  ]);
  const totalConversions = readNumber(dashboardData, [
    "totalConversions",
    "conversions",
    "totalSales",
    "sales",
  ], totalSgp);

  const topAffiliates = dashboard.topAffiliates || [];
  const maxClicks = Math.max(
    ...topAffiliates.map((affiliate) => affiliate.totalClicks),
    1
  );

  const activeAffiliates = affiliateRows.filter(
    (affiliate) => affiliate.active
  ).length;
  const inactiveAffiliates = affiliateRows.length - activeAffiliates;
  const activePercent =
    affiliateRows.length > 0
      ? Math.round((activeAffiliates / affiliateRows.length) * 100)
      : 0;
  const clicksPerLink =
    totalLinks > 0 ? (totalClicks / totalLinks).toFixed(1) : "0.0";
  const conversionRate = getConversionRate(totalConversions, totalVisits);
  const preRegistrationRate = getConversionRate(totalPreRegistrations, totalVisits);
  const sgpRate = getConversionRate(totalSgp, totalPreRegistrations || totalVisits);

  const donutStyle = {
    background: `conic-gradient(#16a34a 0 ${activePercent}%, #ef4444 ${activePercent}% 100%)`,
  };

  const funnelSteps: FunnelStep[] = [
    {
      key: "links",
      label: "Links",
      value: totalLinks,
      helper: "links criados",
    },
    {
      key: "visits",
      label: "Visitas",
      value: totalVisits,
      helper: "acessos na landing page",
    },
    {
      key: "preCadastros",
      label: "Pré-cadastros",
      value: totalPreRegistrations,
      helper: `${formatPercent(preRegistrationRate)} das visitas`,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      value: totalWhatsapp,
      helper: "inícios de conversa",
    },
    {
      key: "chatmix",
      label: "Chatmix",
      value: totalChatmix,
      helper: "atendimentos validados",
    },
    {
      key: "sgp",
      label: "SGP ativo",
      value: totalSgp,
      helper: `${formatPercent(sgpRate)} de aproveitamento`,
    },
  ];

  const maxFunnelValue = Math.max(...funnelSteps.map((step) => step.value), 1);

  const summaryCards = [
    {
      label: "Links criados",
      value: totalLinks,
      detail: "Total de links promocionais",
      tone: "blue",
    },
    {
      label: "Cliques",
      value: totalClicks,
      detail: `${clicksPerLink} cliques por link`,
      tone: "orange",
    },
    {
      label: "Visitas",
      value: totalVisits,
      detail: "Acessos na landing page",
      tone: "violet",
    },
    {
      label: "Pré-cadastros",
      value: totalPreRegistrations,
      detail: `${formatPercent(preRegistrationRate)} de conversão`,
      tone: "cyan",
    },
    {
      label: "WhatsApp",
      value: totalWhatsapp,
      detail: "Conversas iniciadas",
      tone: "green",
    },
    {
      label: "Ativos no SGP",
      value: totalSgp,
      detail: `${formatPercent(conversionRate)} das visitas`,
      tone: "dark",
    },
  ];

  return (
    <section className={styles.dashboardPanel}>
      <div className={styles.dashboardHero}>
        <div>
          <span className={styles.dashboardEyebrow}>Dashboard geral</span>
          <h2>Visão completa dos afiliados</h2>
          <p>
            Acompanhe links, cliques, visitas, pré-cadastros, WhatsApp,
            Chatmix e ativações no SGP em uma tela única.
          </p>
        </div>

        <div className={styles.dashboardHeroMetric}>
          <span>Taxa de conversão</span>
          <strong>{formatPercent(conversionRate)}</strong>
          <small>{formatNumber(totalConversions)} conversões registradas</small>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`${styles.kpiCard} ${styles[`kpiCard_${card.tone}`]}`}
          >
            <span>{card.label}</span>
            <strong>{formatNumber(card.value)}</strong>
            <small>{card.detail}</small>
          </div>
        ))}
      </div>

      <div className={styles.chartsGridEnhanced}>
        <div className={styles.chartCardLarge}>
          <div className={styles.chartHeader}>
            <div>
              <strong className={styles.cardTitle}>Funil da conversão</strong>
              <p className={styles.chartSubtitle}>
                Da criação do link até a ativação no SGP.
              </p>
            </div>

            <span className={styles.summaryBadge}>Jornada</span>
          </div>

          <div className={styles.funnelChart}>
            {funnelSteps.map((step, index) => {
              const progress = getSafeRatio(step.value, maxFunnelValue);

              return (
                <div key={step.key} className={styles.funnelStep}>
                  <div className={styles.funnelStepHeader}>
                    <span>{index + 1}. {step.label}</span>
                    <strong>{formatNumber(step.value)}</strong>
                  </div>

                  <div className={styles.funnelTrack}>
                    <div
                      className={styles.funnelFill}
                      style={{ width: `${Math.max(progress, step.value > 0 ? 8 : 0)}%` }}
                    />
                  </div>

                  <small>{step.helper}</small>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.chartCardCompact}>
          <div className={styles.chartHeader}>
            <div>
              <strong className={styles.cardTitle}>Saúde da base</strong>
              <p className={styles.chartSubtitle}>Afiliados ativos e inativos.</p>
            </div>
          </div>

          <div className={styles.healthChartEnhanced}>
            <div
              className={styles.donutChart}
              style={donutStyle}
              aria-label={`${activePercent}% dos afiliados ativos`}
            >
              <div className={styles.donutCenter}>
                <strong>{activePercent}%</strong>
                <span>ativos</span>
              </div>
            </div>

            <div className={styles.healthStatsGrid}>
              <div className={styles.healthItemBox}>
                <span className={styles.activeDot} />
                <strong>{formatNumber(activeAffiliates)}</strong>
                <small>Afiliados ativos</small>
              </div>

              <div className={styles.healthItemBox}>
                <span className={styles.inactiveDot} />
                <strong>{formatNumber(inactiveAffiliates)}</strong>
                <small>Afiliados inativos</small>
              </div>
            </div>

            <div className={styles.efficiencyBoxEnhanced}>
              <span>Média de desempenho</span>
              <strong>{clicksPerLink} cliques/link</strong>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.chartsGridEnhanced}>
        <div className={styles.chartCardLarge}>
          <div className={styles.chartHeader}>
            <div>
              <strong className={styles.cardTitle}>Cliques por afiliado</strong>
              <p className={styles.chartSubtitle}>
                Ranking dos afiliados com melhor distribuição de cliques.
              </p>
            </div>

            <span className={styles.summaryBadge}>Top {topAffiliates.length}</span>
          </div>

          {topAffiliates.length === 0 ? (
            <p className={styles.emptyText}>Nenhum clique registrado ainda.</p>
          ) : (
            <div className={styles.rankingBars}>
              {topAffiliates.map((affiliate, index) => {
                const width = Math.max(
                  (affiliate.totalClicks / maxClicks) * 100,
                  affiliate.totalClicks > 0 ? 8 : 0
                );

                return (
                  <div key={affiliate.id} className={styles.rankingBarItem}>
                    <div className={styles.rankingPosition}>{index + 1}</div>

                    <div className={styles.rankingBarContent}>
                      <div className={styles.barInfo}>
                        <span>{affiliate.name}</span>
                        <strong>{formatNumber(affiliate.totalClicks)}</strong>
                      </div>

                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.chartCardCompact}>
          <div className={styles.chartHeader}>
            <div>
              <strong className={styles.cardTitle}>Indicadores rápidos</strong>
              <p className={styles.chartSubtitle}>Números de apoio para decisão.</p>
            </div>
          </div>

          <div className={styles.quickInsights}>
            <div>
              <span>Cliques por link</span>
              <strong>{clicksPerLink}</strong>
              <small>Quanto maior, melhor a distribuição.</small>
            </div>

            <div>
              <span>Pré-cadastro por visita</span>
              <strong>{formatPercent(preRegistrationRate)}</strong>
              <small>Mostra a eficiência da landing page.</small>
            </div>

            <div>
              <span>SGP por pré-cadastro</span>
              <strong>{formatPercent(sgpRate)}</strong>
              <small>Mostra a qualidade do atendimento.</small>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
