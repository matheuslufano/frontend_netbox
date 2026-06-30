"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import AffiliatesTable from "@/components/report/AffiliatesTable";
import DashboardCharts from "@/components/report/DashboardCharts";
import SummaryCard from "@/components/report/SummaryCard";
import TopAffiliates from "@/components/report/TopAffiliates";
import {
  Affiliate,
  AffiliateStats,
  buscarDashboard,
  buscarEstatisticasAfiliado,
  DashboardData,
  getApiErrorMessage,
  listarAfiliados,
} from "@/lib/api";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";
import styles from "./relatorios.module.css";

const AUTO_REFRESH_MS = 10000;
const TOCANTINS_GEO_BOUNDS = {
  north: -5.05,
  south: -13.45,
  west: -50.75,
  east: -45.65,
};

const COVERAGE_CITIES = [
  { name: "Barrolandia", label: "Barrolândia", lat: -9.834, lng: -48.725 },
  { name: "Brasilandia do Tocantins", label: "Brasilândia do Tocantins", lat: -8.389, lng: -48.482 },
  { name: "Colinas", label: "Colinas", lat: -8.057, lng: -48.475 },
  { name: "Colmeia", label: "Colméia", lat: -8.724, lng: -48.766 },
  { name: "Goianorte", label: "Goianorte", lat: -8.774, lng: -48.932 },
  { name: "Guarai", label: "Guaraí", lat: -8.836, lng: -48.512 },
  { name: "Itacaja", label: "Itacajá", lat: -8.393, lng: -47.768 },
  { name: "Lajeado", label: "Lajeado", lat: -9.751, lng: -48.356 },
  { name: "Miracema", label: "Miracema", lat: -9.565, lng: -48.396 },
  { name: "Miranorte", label: "Miranorte", lat: -9.529, lng: -48.592 },
  { name: "Paraiso do Tocantins", label: "Paraíso do Tocantins", lat: -10.175, lng: -48.883 },
  { name: "Pedro Afonso", label: "Pedro Afonso", lat: -8.969, lng: -48.177 },
  { name: "Presidente Kenedy", label: "Presidente Kenedy", lat: -8.540, lng: -48.506 },
  { name: "Rio dos Bois", label: "Rio dos Bois", lat: -9.344, lng: -48.533 },
  { name: "Santa Maria", label: "Santa Maria", lat: -8.804, lng: -47.789 },
  { name: "Tabocao", label: "Tabocão", lat: -8.951, lng: -48.516 },
  { name: "Tocantinia", label: "Tocantínia", lat: -9.563, lng: -48.374 },
];

type CoverageCityMetric = {
  name: string;
  label: string;
  lat: number;
  lng: number;
  links: number;
  clicks: number;
  conversions: number;
  saleShare: number;
  conversionRate: number;
  affiliates: number;
};

type CoverageListTab = "all" | "selected";

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function normalizeCityName(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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

function buildCoverageMetrics(
  affiliates: Affiliate[],
  stats: AffiliateStats[]
) {
  const affiliateByName = new Map(
    affiliates.map((affiliate) => [affiliate.name, affiliate])
  );
  const metrics = new Map<string, CoverageCityMetric>();

  COVERAGE_CITIES.forEach((city) => {
    metrics.set(normalizeCityName(city.name), {
      ...city,
      links: 0,
      clicks: 0,
      conversions: 0,
      saleShare: 0,
      conversionRate: 0,
      affiliates: 0,
    });
  });

  stats.forEach((item) => {
    const affiliate = affiliateByName.get(item.affiliate);
    const affiliateCityKey = normalizeCityName(affiliate?.city);
    const affiliateCityMetric = metrics.get(affiliateCityKey);

    if (affiliateCityMetric) {
      affiliateCityMetric.affiliates += 1;
      affiliateCityMetric.links += item.totalLinks;
      affiliateCityMetric.clicks += item.totalClicks;
    }

    item.conversionEvents.forEach((conversion) => {
      const cityKey =
        normalizeCityName(conversion.visitorCity) || affiliateCityKey;
      const cityMetric = metrics.get(cityKey);

      if (!cityMetric) {
        return;
      }

      cityMetric.conversions += 1;
      if (!affiliateCityMetric || affiliateCityMetric.name !== cityMetric.name) {
        cityMetric.clicks += conversion.totalClicks || 0;
      }
    });
  });

  const totalConversions = Array.from(metrics.values()).reduce(
    (total, city) => total + city.conversions,
    0
  );

  return Array.from(metrics.values()).map((city) => ({
    ...city,
    saleShare:
      totalConversions > 0 ? (city.conversions / totalConversions) * 100 : 0,
    conversionRate:
      city.clicks > 0 ? (city.conversions / city.clicks) * 100 : 0,
  }));
}

function projectTocantinsPosition(city: Pick<CoverageCityMetric, "lat" | "lng">) {
  const horizontalPadding = 3;
  const verticalPadding = 2;
  const usableWidth = 100 - horizontalPadding * 2;
  const usableHeight = 100 - verticalPadding * 2;
  const xRatio =
    (city.lng - TOCANTINS_GEO_BOUNDS.west) /
    (TOCANTINS_GEO_BOUNDS.east - TOCANTINS_GEO_BOUNDS.west);
  const yRatio =
    (TOCANTINS_GEO_BOUNDS.north - city.lat) /
    (TOCANTINS_GEO_BOUNDS.north - TOCANTINS_GEO_BOUNDS.south);

  return {
    x: horizontalPadding + Math.max(0, Math.min(1, xRatio)) * usableWidth,
    y: verticalPadding + Math.max(0, Math.min(1, yRatio)) * usableHeight,
  };
}

export default function Dashboard() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [affiliateRows, setAffiliateRows] =
    useState<Affiliate[]>([]);

  const [affiliateStats, setAffiliateStats] =
    useState<AffiliateStats[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;

      try {
        const [dashboard, affiliates] =
          await Promise.all([
            buscarDashboard(),
            listarAfiliados(),
          ]);
        const statsResults = await Promise.allSettled(
          affiliates.map((affiliate) =>
            buscarEstatisticasAfiliado(affiliate.id)
          )
        );
        const stats = statsResults.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : []
        );

        setData(dashboard);
        setAffiliateRows(affiliates);
        setAffiliateStats(stats);
        setError(null);
      } catch (err) {
        if (!silent) {
          setError(
            getApiErrorMessage(
              err,
              "Nao foi possivel carregar o dashboard."
            )
          );
        }
      }
    },
    []
  );

  const refreshDashboardFromEvent = useCallback(() => {
    if (document.visibilityState === "visible") {
      load({ silent: true });
    }
  }, [load]);

  useRealtimeEvents(refreshDashboardFromEvent);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      load();
    }, 0);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [load]);

  const coverageMetrics = useMemo(
    () => buildCoverageMetrics(affiliateRows, affiliateStats),
    [affiliateRows, affiliateStats]
  );

  if (error) {
    return (
      <div className={styles.page}>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page}>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        Dashboard
      </h1>

      <div className={styles.summaryGrid}>
        <SummaryCard dashboard={data} />
        <TopAffiliates affiliates={data.topAffiliates} />
      </div>

      <DashboardCharts
        dashboard={data}
        affiliateRows={affiliateRows}
      />

      <TocantinsCoverageMap cities={coverageMetrics} />

      <AffiliatesTable affiliateRows={affiliateRows} />
    </div>
  );
}

function TocantinsCoverageMap({
  cities,
}: {
  cities: CoverageCityMetric[];
}) {
  const [selectedCityName, setSelectedCityName] = useState<string | null>(null);
  const [hoveredCityName, setHoveredCityName] = useState<string | null>(null);
  const [activeListTab, setActiveListTab] = useState<CoverageListTab>("all");

  const maxConversions = Math.max(
    ...cities.map((city) => city.conversions),
    1
  );
  const totalConversions = cities.reduce(
    (total, city) => total + city.conversions,
    0
  );
  const totalClicks = cities.reduce((total, city) => total + city.clicks, 0);
  const totalLinks = cities.reduce((total, city) => total + city.links, 0);
  const totalAffiliates = cities.reduce(
    (total, city) => total + city.affiliates,
    0
  );

  const mapCities = cities.map((city) => ({
    ...city,
    ...projectTocantinsPosition(city),
    size: city.conversions > 0
      ? 14 + (city.conversions / maxConversions) * 18
      : 12,
  }));

  const selectedCity =
    mapCities.find((city) => city.name === selectedCityName) ?? null;
  const hoveredCity =
    mapCities.find((city) => city.name === hoveredCityName) ?? null;
  const activeTooltipCity = hoveredCity ?? selectedCity;

  const listCities = activeListTab === "selected" && selectedCity
    ? [selectedCity]
    : [...mapCities].sort((first, second) => {
        if (second.conversions !== first.conversions) {
          return second.conversions - first.conversions;
        }

        if (second.clicks !== first.clicks) {
          return second.clicks - first.clicks;
        }

        return first.label.localeCompare(second.label, "pt-BR");
      });

  function handleSelectCity(cityName: string) {
    setSelectedCityName(cityName);
    setActiveListTab("selected");
  }

  function handleShowAllCities() {
    setSelectedCityName(null);
    setActiveListTab("all");
  }

  return (
    <section className={styles.coveragePanel}>
      <div className={styles.coverageHeader}>
        <div>
          <span>Nossa Cobertura</span>
          <h2>Mapa de vendas e conversoes por cidade</h2>
          <p>
            Passe o mouse sobre uma cidade para ver o resumo. Clique no ponto do
            mapa para filtrar a lista lateral somente daquela cidade.
          </p>
        </div>

        <div className={styles.coverageTotals}>
          <div>
            <span>Vendas</span>
            <strong>{formatNumber(totalConversions)}</strong>
          </div>
          <div>
            <span>Cliques</span>
            <strong>{formatNumber(totalClicks)}</strong>
          </div>
          <div>
            <span>Links</span>
            <strong>{formatNumber(totalLinks)}</strong>
          </div>
          <div>
            <span>Afiliados</span>
            <strong>{formatNumber(totalAffiliates)}</strong>
          </div>
        </div>
      </div>

      <div className={styles.coverageGrid}>
        <div className={styles.tocantinsMapCard}>
          <div className={styles.mapLegend}>
            <span className={styles.mapLegendActive}>Com vendas/conversoes</span>
            <span className={styles.mapLegendEmpty}>Sem venda registrada</span>
          </div>

          <div
            className={styles.tocantinsMapFrame}
            role="group"
            aria-label="Mapa do Tocantins com pontos de cidades atendidas"
            onClick={handleShowAllCities}
            onMouseLeave={() => setHoveredCityName(null)}
          >
            <Image
              src="/tocantins-outline.png"
              alt="Mapa do Tocantins"
              fill
              priority={false}
              sizes="(max-width: 768px) 82vw, 360px"
              className={styles.tocantinsMapImage}
            />

            {mapCities.map((city) => {
              const isSelected = selectedCityName === city.name;
              const isHovered = hoveredCityName === city.name;
              const hasSales = city.conversions > 0;

              return (
                <button
                  key={city.name}
                  type="button"
                  aria-label={`Mostrar dados de ${city.label}`}
                  className={cx(
                    hasSales ? styles.mapCityPoint : styles.mapCityPointEmpty,
                    isSelected && styles.mapCityPointSelected,
                    isHovered && styles.mapCityPointHovered
                  )}
                  style={{
                    left: `${city.x}%`,
                    top: `${city.y}%`,
                    width: `${city.size}px`,
                    height: `${city.size}px`,
                  }}
                  onMouseEnter={() => setHoveredCityName(city.name)}
                  onFocus={() => setHoveredCityName(city.name)}
                  onBlur={() => setHoveredCityName(null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSelectCity(city.name);
                  }}
                >
                  <span />
                </button>
              );
            })}

            {activeTooltipCity && (
              <div
                className={styles.mapCityTooltip}
                style={{
                  left: `${activeTooltipCity.x}%`,
                  top: `${activeTooltipCity.y}%`,
                }}
              >
                <strong>{activeTooltipCity.label}</strong>
                <dl>
                  <div>
                    <dt>Vendas</dt>
                    <dd>{formatNumber(activeTooltipCity.conversions)}</dd>
                  </div>
                  <div>
                    <dt>Taxa</dt>
                    <dd>{formatPercent(activeTooltipCity.conversionRate)}</dd>
                  </div>
                  <div>
                    <dt>Cliques</dt>
                    <dd>{formatNumber(activeTooltipCity.clicks)}</dd>
                  </div>
                  <div>
                    <dt>Links</dt>
                    <dd>{formatNumber(activeTooltipCity.links)}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>

        <div className={styles.coverageRanking}>
          <div className={styles.coverageRankingHeader}>
            <div>
              <strong>Dados por cidade</strong>
              <small>
                {selectedCity
                  ? `Cidade selecionada: ${selectedCity.label}`
                  : `${cities.length} cidades atendidas`}
              </small>
            </div>

            <span>{cities.length} cidades</span>
          </div>

          <div className={styles.coverageTabs} role="tablist" aria-label="Filtro de cidades">
            <button
              type="button"
              className={cx(
                styles.coverageTab,
                activeListTab === "all" && styles.coverageTabActive
              )}
              onClick={handleShowAllCities}
              aria-selected={activeListTab === "all"}
              role="tab"
            >
              Todas as cidades
            </button>
            <button
              type="button"
              className={cx(
                styles.coverageTab,
                activeListTab === "selected" && styles.coverageTabActive
              )}
              onClick={() => setActiveListTab("selected")}
              aria-selected={activeListTab === "selected"}
              disabled={!selectedCity}
              role="tab"
            >
              Cidade clicada
            </button>
          </div>

          {activeListTab === "selected" && !selectedCity ? (
            <div className={styles.coverageEmptyState}>
              <strong>Nenhuma cidade selecionada</strong>
              <span>Clique em um ponto no mapa para ver somente os dados daquela cidade.</span>
            </div>
          ) : (
            <div className={styles.coverageCityList}>
              {listCities.map((city) => (
                <CoverageCityCard
                  key={city.name}
                  city={city}
                  selected={selectedCityName === city.name}
                  onClick={() => handleSelectCity(city.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CoverageCityCard({
  city,
  selected,
  onClick,
}: {
  city: CoverageCityMetric;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cx(
        styles.coverageCityCard,
        selected && styles.coverageCityCardSelected
      )}
      onClick={onClick}
      aria-label={`Filtrar dados de ${city.label}`}
    >
      <div>
        <span>{city.label}</span>
        <strong>{formatPercent(city.saleShare)} das vendas</strong>
      </div>

      <dl>
        <div>
          <dt>Vendas</dt>
          <dd>{formatNumber(city.conversions)}</dd>
        </div>
        <div>
          <dt>Taxa</dt>
          <dd>{formatPercent(city.conversionRate)}</dd>
        </div>
        <div>
          <dt>Cliques</dt>
          <dd>{formatNumber(city.clicks)}</dd>
        </div>
        <div>
          <dt>Links</dt>
          <dd>{formatNumber(city.links)}</dd>
        </div>
        <div>
          <dt>Afiliados</dt>
          <dd>{formatNumber(city.affiliates)}</dd>
        </div>
      </dl>
    </button>
  );
}
