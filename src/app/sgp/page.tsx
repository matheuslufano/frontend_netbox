"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FiActivity,
  FiCheckCircle,
  FiDatabase,
  FiSearch,
  FiUser,
  FiXCircle,
} from "react-icons/fi";
import {
  SgpCustomer,
  SgpCustomersSummary,
  buscarStatusSgp,
  consultarClienteSgp,
  getApiErrorMessage,
  listarClientesSgp,
} from "@/lib/api";
import conteine from "@/styles/components.module.css";
import styles from "./sgp.module.css";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDocument(value: string) {
  const digits = onlyDigits(value);

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }

  return value;
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeCityName(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function projectTocantinsPosition(city: { lat: number; lng: number }) {
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

function buildSgpCityMetrics(summary: SgpCustomersSummary) {
  const citiesByKey = new Map<string, SgpCityMetric>();

  summary.byCity.forEach((item) => {
    const key = normalizeCityName(item.city);
    const current = citiesByKey.get(key);

    if (current) {
      current.total += safeNumber(item.total);
      current.active += safeNumber(item.active);
      current.contracts += safeNumber(item.contracts, item.total);
      current.activeContracts += safeNumber(item.activeContracts, item.active);
      return;
    }

    citiesByKey.set(key, {
      ...item,
      total: safeNumber(item.total),
      active: safeNumber(item.active),
      contracts: safeNumber(item.contracts, item.total),
      activeContracts: safeNumber(item.activeContracts, item.active),
      key,
    });
  });

  return Array.from(citiesByKey.values()).sort(
    (first, second) => second.total - first.total,
  );
}

function buildSearchSuggestions({
  query,
  customers,
  summary,
}: {
  query: string;
  customers: SgpCustomer[];
  summary: SgpCustomersSummary | null;
}) {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  const suggestions = new Map<string, SearchSuggestion>();

  customers.forEach((customer) => {
    const phone = getCustomerPhone(customer);
    const city = getCustomerCity(customer);
    const fields = [
      customer.name || "",
      customer.document || "",
      onlyDigits(customer.document || ""),
      phone,
      onlyDigits(phone),
      city,
    ];
    const matches = fields.some((field) =>
      normalizeSearchText(field).includes(normalizedQuery),
    );

    if (!matches) {
      return;
    }

    const value = customer.document || customer.name || phone || city;
    const detailParts = [
      customer.document ? formatDocument(customer.document) : "",
      phone !== "Sem telefone" ? phone : "",
      city !== "Cidade não informada" ? city : "",
    ].filter(Boolean);

    suggestions.set(`customer-${customer.id || value}`, {
      id: `customer-${customer.id || value}`,
      label: customer.name || "Cliente sem nome",
      detail: detailParts.join(" | ") || "Cliente do SGP",
      value,
      customer,
    });
  });

  const cityNames = [
    ...(summary?.byCity.map((item) => item.city) ?? []),
    ...TOCANTINS_MAP_CITIES.map((city) => city.label),
  ];

  cityNames.forEach((city) => {
    const normalizedCity = normalizeSearchText(city);

    if (!normalizedCity || !normalizedCity.includes(normalizedQuery)) {
      return;
    }

    const id = `city-${normalizedCity}`;

    if (!suggestions.has(id)) {
      suggestions.set(id, {
        id,
        label: city,
        detail: "Cidade",
        value: city,
      });
    }
  });

  return Array.from(suggestions.values()).slice(0, 8);
}

type SgpTab = "search" | "all" | "active" | "inactive" | "cities";

const TOCANTINS_GEO_BOUNDS = {
  north: -5.05,
  south: -13.45,
  west: -50.75,
  east: -45.65,
};

const TOCANTINS_MAP_CITIES = [
  { name: "Barrolandia", label: "Barrolandia", lat: -9.834, lng: -48.725, aliases: ["barrolandia"] },
  { name: "Brasilandia do Tocantins", label: "Brasilandia do Tocantins", lat: -8.389, lng: -48.482, aliases: ["brasilandia", "brasilandia do tocantins"] },
  { name: "Colinas", label: "Colinas", lat: -8.057, lng: -48.475, aliases: ["colinas", "colinas do tocantins"] },
  { name: "Colmeia", label: "Colmeia", lat: -8.724, lng: -48.766, aliases: ["colmeia"] },
  { name: "Goianorte", label: "Goianorte", lat: -8.774, lng: -48.932, aliases: ["goianorte"] },
  { name: "Guarai", label: "Guarai", lat: -8.836, lng: -48.512, aliases: ["guarai"] },
  { name: "Itacaja", label: "Itacaja", lat: -8.393, lng: -47.768, aliases: ["itacaja"] },
  { name: "Lajeado", label: "Lajeado", lat: -9.751, lng: -48.356, aliases: ["lajeado"] },
  { name: "Miracema", label: "Miracema", lat: -9.565, lng: -48.396, aliases: ["miracema", "miracema do tocantins"] },
  { name: "Miranorte", label: "Miranorte", lat: -9.529, lng: -48.592, aliases: ["miranorte"] },
  { name: "Paraiso do Tocantins", label: "Paraiso do Tocantins", lat: -10.175, lng: -48.883, aliases: ["paraiso", "paraiso do tocantins"] },
  { name: "Pedro Afonso", label: "Pedro Afonso", lat: -8.969, lng: -48.177, aliases: ["pedro afonso"] },
  { name: "Presidente Kenedy", label: "Presidente Kenedy", lat: -8.540, lng: -48.506, aliases: ["presidente kenedy"] },
  { name: "Rio dos Bois", label: "Rio dos Bois", lat: -9.344, lng: -48.533, aliases: ["rio dos bois"] },
  { name: "Santa Maria", label: "Santa Maria", lat: -8.804, lng: -47.789, aliases: ["santa maria", "santa maria do tocantins"] },
  { name: "Tabocao", label: "Tabocao", lat: -8.951, lng: -48.516, aliases: ["tabocao"] },
  { name: "Tocantinia", label: "Tocantinia", lat: -9.563, lng: -48.374, aliases: ["tocantinia"] },
];

type SgpCityMetric = SgpCustomersSummary["byCity"][number] & {
  key: string;
};

type SearchSuggestion = {
  id: string;
  label: string;
  detail: string;
  value: string;
  customer?: SgpCustomer;
};

const SGP_TABS: Array<{ value: SgpTab; label: string }> = [
  { value: "search", label: "Consulta" },
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "inactive", label: "Desativados" },
  { value: "cities", label: "Cidades" },
];

export default function SgpPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SgpTab>("search");
  const [search, setSearch] = useState(
    () =>
      searchParams.get("document") ||
      searchParams.get("name") ||
      searchParams.get("phone") ||
      searchParams.get("city") ||
      "",
  );
  const [customer, setCustomer] = useState<SgpCustomer | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [connectionLabel, setConnectionLabel] = useState("Verificando SGP...");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<SgpCustomer[]>([]);
  const [summary, setSummary] = useState<SgpCustomersSummary | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const cleanSearch = useMemo(() => search.trim(), [search]);
  const searchSuggestions = useMemo(
    () =>
      buildSearchSuggestions({
        query: cleanSearch,
        customers,
        summary,
      }),
    [cleanSearch, customers, summary],
  );
  const preCadastro = useMemo(
    () => ({
      conversionId: searchParams.get("conversionId") || "",
      name: searchParams.get("name") || "",
      phone: searchParams.get("phone") || "",
      city: searchParams.get("city") || "",
      document: searchParams.get("document") || "",
    }),
    [searchParams],
  );

  const hasPreCadastro =
    preCadastro.name ||
    preCadastro.phone ||
    preCadastro.city ||
    preCadastro.document ||
    preCadastro.conversionId;

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const status = await buscarStatusSgp();

        if (!cancelled) {
          setConfigured(status.configured);
          setConnectionLabel(
            status.configured
              ? `Conectado em ${status.baseUrl} (${status.app})`
              : status.error || "SGP não configurado",
          );
        }
      } catch (err) {
        if (!cancelled) {
          setConfigured(false);
          setConnectionLabel(
            getApiErrorMessage(err, "Não foi possível verificar o SGP."),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingStatus(false);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const queryDocument = onlyDigits(searchParams.get("document") || "");

    if (!queryDocument || configured === false) {
      return;
    }

    let cancelled = false;

    async function searchFromReport() {
      setSearching(true);
      setError(null);
      setRawOpen(false);

      try {
        const response = await consultarClienteSgp(queryDocument);

        if (!cancelled) {
          setCustomer(response.customer);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(
              err,
              "Não foi possível consultar o cliente no SGP.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }

    searchFromReport();

    return () => {
      cancelled = true;
    };
  }, [configured, searchParams]);

  const loadCustomersList = useCallback(async () => {
    setLoadingCustomers(true);
    setListError(null);

    try {
      const response = await listarClientesSgp();

      setCustomers(response.customers);
      setSummary(response.summary);
      setCustomersLoaded(true);
    } catch (err) {
      setListError(
        getApiErrorMessage(err, "Não foi possível listar os clientes no SGP."),
      );
      setCustomersLoaded(true);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "search" || customersLoaded || loadingCustomers) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!cancelled) {
        loadCustomersList();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, customersLoaded, loadCustomersList, loadingCustomers]);

  useEffect(() => {
    if (
      activeTab !== "search" ||
      cleanSearch.length < 2 ||
      customersLoaded ||
      loadingCustomers
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      loadCustomersList();
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeTab,
    cleanSearch.length,
    customersLoaded,
    loadCustomersList,
    loadingCustomers,
  ]);

  function handleSuggestionSelect(suggestion: SearchSuggestion) {
    setSearch(suggestion.value);
    setSearchFocused(false);
    setError(null);
    setRawOpen(false);

    if (suggestion.customer) {
      setCustomer(suggestion.customer);
      setDetailsOpen(true);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCustomer(null);
    setRawOpen(false);

    if (cleanSearch.length < 3) {
      setError("Informe CPF/CNPJ, nome, telefone ou cidade para consultar.");
      return;
    }

    setSearching(true);
    try {
      const response = await consultarClienteSgp(cleanSearch);
      setCustomer(response.customer);
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível consultar o cliente no SGP."),
      );
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className={conteine.contreine}>
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.badge}>SGP</span>
          <h1>Consulta de clientes</h1>
          <p>Consulte clientes no SGP e confira se possuem contrato ativo.</p>
        </header>

        <section className={styles.statusCard}>
          <div
            className={`${styles.statusIcon} ${
              configured ? styles.connected : styles.disconnected
            }`}
          >
            <FiDatabase aria-hidden="true" />
          </div>
          <div>
            <strong>
              {loadingStatus
                ? "Verificando conexão"
                : configured
                  ? "SGP conectado"
                  : "SGP indisponivel"}
            </strong>
            <span>{connectionLabel}</span>
          </div>
        </section>

        <nav className={styles.sgpTabs} aria-label="Visoes do SGP">
          {SGP_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`${styles.sgpTab} ${
                activeTab === tab.value ? styles.sgpTabActive : ""
              }`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "search" && (
          <>
            <section className={styles.searchCard}>
              {hasPreCadastro && (
                <div className={styles.preCadastroCard}>
                  <div>
                    <span className={styles.cardKicker}>
                      Pré-cadastro do relatório
                    </span>
                    <strong>{preCadastro.name || "Cliente sem nome"}</strong>
                  </div>

                  <div className={styles.preCadastroGrid}>
                    <InfoItem
                      label="Conversão"
                      value={preCadastro.conversionId || "-"}
                    />
                    <InfoItem
                      label="Documento"
                      value={
                        preCadastro.document
                          ? formatDocument(preCadastro.document)
                          : "-"
                      }
                    />
                    <InfoItem
                      label="WhatsApp"
                      value={preCadastro.phone || "-"}
                    />
                    <InfoItem label="Cidade" value={preCadastro.city || "-"} />
                  </div>
                </div>
              )}

              <form className={styles.searchForm} onSubmit={handleSearch}>
                <label className={styles.field} htmlFor="sgp-search">
                  <span>CPF/CNPJ, nome, telefone ou cidade</span>
                  <div className={styles.searchInputWrap}>
                    <input
                      id="sgp-search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => {
                        window.setTimeout(() => setSearchFocused(false), 120);
                      }}
                      placeholder="Digite CPF, nome, telefone ou cidade"
                      autoComplete="off"
                    />

                    {searchFocused &&
                      cleanSearch.length >= 2 &&
                      searchSuggestions.length > 0 && (
                        <div
                          className={styles.searchSuggestions}
                          role="listbox"
                          aria-label="Sugestoes de clientes SGP"
                        >
                          {searchSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              role="option"
                              aria-selected="false"
                              className={styles.searchSuggestion}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handleSuggestionSelect(suggestion);
                              }}
                            >
                              <strong>{suggestion.label}</strong>
                              <span>{suggestion.detail}</span>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </label>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={searching}
                >
                  <FiSearch aria-hidden="true" />
                  {searching ? "Consultando..." : "Consultar"}
                </button>
              </form>

              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </section>

            {customer && (
              <section className={styles.customerSgpScreen}>
                <div className={styles.customerSgpTop}>
                  <div>
                    <span className={styles.customerSgpKicker}>
                      Cliente SGP
                    </span>
                    <h2>{customer.name || "Cliente sem nome"}</h2>
                    <p>
                      Código SGP: <strong>{customer.id || "-"}</strong>
                    </p>
                  </div>

                  <div className={styles.customerAvatar}>
                    <FiUser aria-hidden="true" />
                    <span>{customer.contracts.length}</span>
                  </div>
                </div>

                <CustomerMainInfoSection customer={customer} />

                <CustomerContractsSection customer={customer} />

                <CustomerFullInfoSection
                  data={customer.raw}
                  detailsOpen={detailsOpen}
                  onToggleDetails={() => setDetailsOpen((current) => !current)}
                />

                <div className={styles.customerSgpTechnical}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setRawOpen((current) => !current)}
                  >
                    {rawOpen
                      ? "Ocultar resposta técnica"
                      : "Ver resposta técnica"}
                  </button>

                  {rawOpen && (
                    <pre className={styles.rawJson}>
                      {formatJson(customer.raw)}
                    </pre>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab !== "search" && (
          <SgpCustomersPanel
            activeTab={activeTab}
            customers={customers}
            summary={summary}
            loading={loadingCustomers}
            error={listError}
            onRetry={() => {
              setCustomersLoaded(false);
              loadCustomersList();
            }}
            onSelectCustomer={(selectedCustomer) => {
              setCustomer(selectedCustomer);
              setRawOpen(false);
              setDetailsOpen(true);
              setActiveTab("search");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
      </div>
    </div>
  );
}

function SgpCustomersPanel({
  activeTab,
  customers,
  summary,
  loading,
  error,
  onRetry,
  onSelectCustomer,
}: {
  activeTab: Exclude<SgpTab, "search">;
  customers: SgpCustomer[];
  summary: SgpCustomersSummary | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectCustomer: (customer: SgpCustomer) => void;
}) {
  const visibleCustomers =
    activeTab === "active"
      ? customers.filter((customer) => customer.active === true)
      : activeTab === "inactive"
        ? customers.filter((customer) => customer.active === false)
        : customers;

  if (loading) {
    return (
      <section className={styles.loadingCard}>
        <div className={styles.loadingSpinner} aria-hidden="true" />

        <div>
          <strong>Carregando clientes do SGP</strong>
          <span>Buscando dados atualizados, contratos e situação dos clientes...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.listCard}>
        <p className={styles.error}>{error}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onRetry}
        >
          Tentar carregar novamente
        </button>
      </section>
    );
  }

  if (activeTab === "cities") {
    return <CitiesPanel summary={summary} />;
  }

  return (
    <section className={styles.listCard}>
      <div className={styles.listHeader}>
        <div>
          <span className={styles.cardKicker}>
            {activeTab === "active"
              ? "Clientes ativos"
              : activeTab === "inactive"
                ? "Clientes desativados"
                : "Todos os clientes"}
          </span>
          <h2>{visibleCustomers.length} cliente(s)</h2>
          {summary && (
            <p className={styles.listMeta}>
              {safeNumber(summary.totalContracts, summary.total)} contrato(s)
              encontrados nesta consulta
            </p>
          )}
        </div>

        {summary && <ActiveChart summary={summary} />}
      </div>

      {visibleCustomers.length === 0 ? (
        <div className={styles.emptyState}>Nenhum cliente encontrado.</div>
      ) : (
        <div className={styles.customerList}>
          {visibleCustomers.map((item, index) => (
            <CustomerRow
              key={`${item.id || item.document || "cliente"}-${index}`}
              customer={item}
              onSelect={() => onSelectCustomer(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CitiesPanel({ summary }: { summary: SgpCustomersSummary | null }) {
  const [selectedCityKey, setSelectedCityKey] = useState<string | null>(null);

  if (!summary) {
    return (
      <section className={styles.listCard}>
        <div className={styles.emptyState}>Nenhum resumo encontrado.</div>
      </section>
    );
  }

  const cityMetrics = buildSgpCityMetrics(summary);
  const maxTotal = Math.max(
    ...cityMetrics.map((item) => safeNumber(item.contracts, item.total)),
    1,
  );
  const activeCityKey = selectedCityKey ?? cityMetrics[0]?.key ?? null;
  const totalContracts = safeNumber(summary.totalContracts, summary.total);

  return (
    <section className={styles.listCard}>
      <div className={styles.listHeader}>
        <div>
          <span className={styles.cardKicker}>Contratos por cidade</span>
          <h2>{summary.byCity.length} cidade(s)</h2>
          <p className={styles.listMeta}>
            {totalContracts} contrato(s) encontrados
          </p>
        </div>

        <ActiveChart summary={summary} />
      </div>

      <TocantinsCitiesMap
        cities={cityMetrics}
        selectedCityKey={activeCityKey}
        onSelectCity={setSelectedCityKey}
      />

      <div className={styles.cityList}>
        {cityMetrics.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.cityItem} ${
              item.key === activeCityKey ? styles.cityItemActive : ""
            }`}
            onClick={() => setSelectedCityKey(item.key)}
          >
            <div>
              <strong>{item.city}</strong>
              <span>
                {item.activeContracts} contrato ativo de {item.contracts}
              </span>
            </div>
            <div className={styles.cityBarTrack}>
              <span
                className={styles.cityBar}
                style={{
                  width: `${Math.max((safeNumber(item.contracts, item.total) / maxTotal) * 100, 4)}%`,
                }}
              />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function TocantinsCitiesMap({
  cities,
  selectedCityKey,
  onSelectCity,
}: {
  cities: SgpCityMetric[];
  selectedCityKey: string | null;
  onSelectCity: (cityKey: string) => void;
}) {
  const cityMetricsByName = new Map(cities.map((item) => [item.key, item]));
  const maxTotal = Math.max(
    ...cities.map((item) => safeNumber(item.contracts, item.total)),
    1,
  );
  const mapCities = TOCANTINS_MAP_CITIES.flatMap((city) => {
    const metric = city.aliases
      .map((alias) => cityMetricsByName.get(normalizeCityName(alias)))
      .find(Boolean);

    if (!metric) {
      return [];
    }

    return [
      {
        ...city,
        ...metric,
        ...projectTocantinsPosition(city),
        size: 12 + (safeNumber(metric.contracts, metric.total) / maxTotal) * 18,
      },
    ];
  });
  const selected =
    mapCities.find((city) => city.key === selectedCityKey) ??
    cities.find((city) => city.key === selectedCityKey) ??
    mapCities[0] ??
    null;

  return (
    <section className={styles.tocantinsCityMapCard}>
      <div className={styles.tocantinsCityMapInfo}>
        <span className={styles.cardKicker}>Mapa do Tocantins</span>
        <h3>Contratos por cidade</h3>
        <p>
          Pontos proporcionais ao total de contratos encontrados no SGP por
          município.
        </p>

        {selected && (
          <div className={styles.tocantinsCityMapStats}>
            <strong>{selected.city}</strong>
            <span>
              {selected.activeContracts} contrato ativo de{" "}
              {selected.contracts}
            </span>
          </div>
        )}
      </div>

      <div className={styles.tocantinsCityMapFrame}>
        <Image
          src="/tocantins-mapa-branco-borda-laranja-transparente.png"
          alt="Mapa do Tocantins"
          width={360}
          height={540}
          className={styles.tocantinsCityMapImage}
          priority={false}
        />

        {mapCities.map((city) => (
          <button
            key={city.key}
            type="button"
            className={`${styles.tocantinsCityMapPoint} ${
              city.key === selectedCityKey ? styles.tocantinsCityMapPointActive : ""
            }`}
            style={{
              left: `${city.x}%`,
              top: `${city.y}%`,
              width: `${city.size}px`,
              height: `${city.size}px`,
            }}
            aria-label={`${city.city}: ${city.contracts} contratos`}
            onClick={() => onSelectCity(city.key)}
          >
            <span />
          </button>
        ))}
      </div>
    </section>
  );
}

function ActiveChart({ summary }: { summary: SgpCustomersSummary }) {
  const total = Math.max(safeNumber(summary.totalContracts, summary.total), 1);
  const activeTotal = safeNumber(summary.activeContracts, summary.active);
  const activePercent = Math.round((activeTotal / total) * 100);

  return (
    <div className={styles.activeChart} aria-label="Gráfico de contratos ativos">
      <div className={styles.activeChartRing}>
        <span>{activePercent}%</span>
      </div>
      <div>
        <strong>{activeTotal}</strong>
        <span>contratos ativos de {total}</span>
      </div>
    </div>
  );
}

function CustomerRow({
  customer,
  onSelect,
}: {
  customer: SgpCustomer;
  onSelect: () => void;
}) {
  const displayPhone = getCustomerPhone(customer);
  const displayCity = getCustomerCity(customer);

  return (
    <article className={styles.customerRow}>
      <div className={styles.customerRowMain}>
        <button
          type="button"
          className={styles.customerNameButton}
          onClick={onSelect}
          title="Abrir dados do cliente"
        >
          {customer.name || "Cliente sem nome"}
        </button>
        <span>{formatDocument(customer.document || "-")}</span>
      </div>

      <div className={styles.customerRowMeta}>
        <span>{displayPhone}</span>
        <span>{displayCity}</span>
      </div>

      <StatusPill active={customer.active} label={customer.status} />
    </article>
  );
}

function StatusPill({
  active,
  label,
}: {
  active: boolean | null;
  label: string;
}) {
  const isKnown = active !== null;

  const text = active
    ? "Ativo"
    : isKnown
      ? "Inativo"
      : label || "Status não identificado";

  return (
    <span
      className={`${styles.statusPill} ${
        active ? styles.active : isKnown ? styles.inactive : ""
      }`}
      title={label}
    >
      {active ? (
        <FiCheckCircle aria-hidden="true" />
      ) : (
        <FiXCircle aria-hidden="true" />
      )}

      {text}
    </span>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}


function CustomerMainInfoSection({ customer }: { customer: SgpCustomer }) {
  const phone = getCustomerPhone(customer);
  const city = getCustomerCity(customer);

  const rows = [
    { label: "Nome", value: customer.name || "Cliente sem nome" },
    { label: "CPF/CNPJ", value: formatDocument(customer.document || "-") },
    { label: "Telefone", value: phone },
    { label: "Cidade", value: city },
  ];

  return (
    <div className={styles.customerSgpSection}>
      <div className={styles.customerSgpSectionTitle}>
        <strong>Dados do cliente</strong>
        <StatusPill active={customer.active} label={customer.status} />
      </div>

      <DetailsTable rows={rows} variant="customer" />
    </div>
  );
}

function getCustomerPhone(customer: SgpCustomer) {
  const directPhone = normalizeDisplayValue(customer.phone);

  if (directPhone) {
    return directPhone;
  }

  return (
    findFirstRawValue(customer.raw, (label) => {
      const normalized = normalizeSearchText(label);

      return (
        normalized.includes("telefone") &&
        !normalized.includes("cargo") &&
        !normalized.includes("cargos")
      );
    }) || "-"
  );
}

function getCustomerCity(customer: SgpCustomer) {
  const directCity = normalizeDisplayValue(customer.city);

  if (directCity) {
    return directCity;
  }

  return (
    findFirstRawValue(customer.raw, (label) => {
      const normalized = normalizeSearchText(label);

      return (
        normalized.includes("endereco cidade") ||
        normalized.endsWith(" cidade") ||
        normalized === "cidade"
      );
    }) || "-"
  );
}

function findFirstRawValue(
  data: unknown,
  matcher: (label: string) => boolean,
) {
  const entries = flattenJsonEntries(data);

  for (const entry of entries) {
    const formattedLabel = formatJsonLabel(entry.label);
    const value = normalizeDisplayValue(formatJsonValue(entry.value));

    if (!value || value === "Nenhum item" || value === "{}") {
      continue;
    }

    if (matcher(formattedLabel) || matcher(entry.label)) {
      return value;
    }
  }

  return "";
}

function normalizeDisplayValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value).trim();

  if (!text || text === "-" || text.toLowerCase() === "none") {
    return "";
  }

  return text;
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function CustomerContractsSection({ customer }: { customer: SgpCustomer }) {
  const [selectedContractIndex, setSelectedContractIndex] = useState(0);
  const activeContractIndex = Math.min(
    selectedContractIndex,
    Math.max(customer.contracts.length - 1, 0),
  );
  const selectedContract = customer.contracts[activeContractIndex];
  const hasManyContracts = customer.contracts.length > 1;

  return (
    <div className={styles.customerSgpSection}>
      <div className={styles.customerSgpSectionTitle}>
        <strong>Contrato e situação</strong>
        <span className={styles.contractCounter}>
          {customer.contracts.length} contrato(s)
        </span>
      </div>

      {customer.contracts.length === 0 ? (
        <div className={styles.emptySgpContract}>
          Nenhum contrato encontrado na resposta do SGP.
        </div>
      ) : (
        <div className={styles.customerContractList}>
          {hasManyContracts && (
            <div
              className={styles.contractSwitcher}
              aria-label="Selecionar contrato"
            >
              {customer.contracts.map((contract, index) => (
                <button
                  key={`${contract.id || "contrato"}-${index}`}
                  type="button"
                  className={`${styles.contractSwitchButton} ${
                    activeContractIndex === index
                      ? styles.contractSwitchButtonActive
                      : ""
                  }`}
                  onClick={() => setSelectedContractIndex(index)}
                >
                  Contrato {index + 1}
                  <span>{contract.id || "sem código"}</span>
                </button>
              ))}
            </div>
          )}

          {selectedContract && (
            <article className={styles.customerContractBox}>
              <div className={styles.customerContractHeader}>
                <div>
                  <span>Plano contratado</span>
                  <strong>
                    {selectedContract.plan ||
                      `Contrato ${selectedContract.id || activeContractIndex + 1}`}
                  </strong>
                </div>

                <StatusPill
                  active={selectedContract.active}
                  label={selectedContract.status}
                />
              </div>

              <ContractInfoTable contract={selectedContract} />
            </article>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerFullInfoSection({
  data,
  detailsOpen,
  onToggleDetails,
}: {
  data: unknown;
  detailsOpen: boolean;
  onToggleDetails: () => void;
}) {
  return (
    <div className={styles.customerSgpSection}>
      <div className={styles.customerSgpSectionTitle}>
        <strong>Informações completas do SGP</strong>

        <button
          type="button"
          className={styles.minimizeButton}
          onClick={onToggleDetails}
          aria-expanded={detailsOpen}
        >
          {detailsOpen ? "Minimizar" : "Mostrar informações"}
        </button>
      </div>

      {detailsOpen && <JsonDetailsTable data={data} />}
    </div>
  );
}

function ContractInfoTable({
  contract,
}: {
  contract: SgpCustomer["contracts"][number];
}) {
  const rows = [
    { label: "Status", value: contract.status || "-" },
    { label: "Código", value: contract.id || "-" },
    { label: "Plano", value: contract.plan || "-" },
    { label: "Situação", value: contract.active ? "Ativo" : "Inativo" },
    { label: "Endereço", value: contract.address || "Sem endereço informado" },
  ];

  return <DetailsTable rows={rows} variant="contract" />;
}

function JsonDetailsTable({ data }: { data: unknown }) {
  const [selectedContractIndex, setSelectedContractIndex] = useState(0);

  const grouped = useMemo(() => organizeJsonRows(data), [data]);
  const activeContractIndex = Math.min(
    selectedContractIndex,
    Math.max(grouped.contracts.length - 1, 0),
  );
  const selectedContractRows =
    grouped.contracts[activeContractIndex]?.rows || [];
  const hasManyContracts = grouped.contracts.length > 1;
  const hasAnyRow = grouped.general.length > 0 || grouped.contracts.length > 0;

  if (!hasAnyRow) {
    return (
      <div className={styles.emptySgpContract}>
        Nenhuma informação adicional encontrada.
      </div>
    );
  }

  return (
    <div className={styles.jsonDetailsContent}>
      {grouped.general.length > 0 && (
        <div className={styles.jsonDetailsBlock}>
          <div className={styles.jsonDetailsSubheader}>
            <strong>Dados gerais</strong>
            <span>{grouped.general.length} campo(s)</span>
          </div>
          <DetailsTable rows={grouped.general} variant="json" />
        </div>
      )}

      {grouped.contracts.length > 0 && (
        <div className={styles.jsonDetailsBlock}>
          <div className={styles.jsonDetailsSubheader}>
            <strong>Dados do contrato</strong>
            <span>{grouped.contracts.length} contrato(s)</span>
          </div>

          {hasManyContracts && (
            <div
              className={styles.contractSwitcher}
              aria-label="Selecionar contrato no JSON"
            >
              {grouped.contracts.map((contract, index) => (
                <button
                  key={`json-contract-${contract.index}`}
                  type="button"
                  className={`${styles.contractSwitchButton} ${
                    activeContractIndex === index
                      ? styles.contractSwitchButtonActive
                      : ""
                  }`}
                  onClick={() => setSelectedContractIndex(index)}
                >
                  Contrato {contract.index}
                  <span>{contract.rows.length} campo(s)</span>
                </button>
              ))}
            </div>
          )}

          <DetailsTable rows={selectedContractRows} variant="json" />
        </div>
      )}
    </div>
  );
}

function DetailsTable({
  rows,
  variant,
}: {
  rows: Array<{ label: string; value: string }>;
  variant?: "customer" | "contract" | "json";
}) {
  return (
    <div
      className={`${styles.detailsTableWrap} ${
        variant === "json" ? styles.detailsTableWrapScrollable : ""
      }`}
    >
      <table
        className={`${styles.detailsTable} ${
          variant === "customer" ? styles.customerDetailsTable : ""
        } ${variant === "contract" ? styles.contractDetailsTable : ""} ${
          variant === "json" ? styles.jsonDetailsTable : ""
        }`}
      >
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.label}-${index}`}>
              <th scope="row" title={row.label}>
                {row.label}
              </th>
              <td title={row.value}>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function organizeJsonRows(data: unknown) {
  const rawRows = flattenJsonEntries(data)
    .map((entry) => ({
      rawLabel: entry.label,
      label: formatJsonLabel(entry.label),
      value: formatJsonValue(entry.value),
    }))
    .filter((row) => row.value !== "-" && row.value !== "");

  const general: Array<{ label: string; value: string }> = [];
  const contractsMap = new Map<
    number,
    Array<{ label: string; value: string }>
  >();

  rawRows.forEach((row) => {
    const parsed = parseContractLabel(row.rawLabel);

    if (parsed) {
      const currentRows = contractsMap.get(parsed.index) || [];
      currentRows.push({
        label: summarizeJsonLabel(parsed.label),
        value: row.value,
      });
      contractsMap.set(parsed.index, currentRows);
      return;
    }

    general.push({
      label: summarizeJsonLabel(row.label),
      value: row.value,
    });
  });

  return {
    general,
    contracts: Array.from(contractsMap.entries())
      .sort(([firstIndex], [secondIndex]) => firstIndex - secondIndex)
      .map(([index, rows]) => ({ index, rows })),
  };
}

function parseContractLabel(value: string) {
  const match = value.match(/^contratos?[.\s_-]*(\d+)[.\s_/:-]*(.*)$/i);

  if (!match) {
    return null;
  }

  return {
    index: Number(match[1]),
    label: formatJsonLabel(match[2] || "Contrato"),
  };
}

function summarizeJsonLabel(value: string) {
  return value
    .replace(/^Contrato\s*\d+\s*\/\s*/i, "")
    .replace(/^Contratos\s*\d+\s*\/\s*/i, "")
    .replace(/\bServico\b/g, "Serviço")
    .replace(/\bEndereco\b/g, "Endereço")
    .replace(/\bDescricao\b/g, "Descrição")
    .replace(/\bCob\b/g, "Cobrança")
    .replace(/\bCpf Cnpj\b/g, "CPF/CNPJ")
    .replace(/\bUf\b/g, "UF")
    .replace(/\bCep\b/g, "CEP")
    .replace(/\bId\b/g, "ID")
    .replace(/\bLl\b/g, "Latitude/Longitude")
    .replace(/\bMac\b/g, "MAC")
    .replace(/\bSsid\b/g, "SSID")
    .replace(/\bWifi\b/g, "Wi-Fi")
    .replace(/\bPppoe\b/g, "PPPoE")
    .replace(/\s*\/\s*/g, " / ")
    .trim();
}

function flattenJsonEntries(
  data: unknown,
  parentKey = "",
): Array<{ key: string; label: string; value: unknown }> {
  if (data === null || data === undefined) {
    return [];
  }

  if (typeof data !== "object") {
    return [
      {
        key: parentKey || "valor",
        label: parentKey || "valor",
        value: data,
      },
    ];
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return [
        {
          key: parentKey || "lista",
          label: parentKey || "lista",
          value: "Nenhum item",
        },
      ];
    }

    return data.flatMap((item, index) =>
      flattenJsonEntries(item, `${parentKey || "item"} ${index + 1}`),
    );
  }

  const entries = Object.entries(data as Record<string, unknown>);

  if (entries.length === 0) {
    return [
      {
        key: parentKey || "objeto",
        label: parentKey || "objeto",
        value: "{}",
      },
    ];
  }

  return entries.flatMap(([key, value]) => {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (value !== null && typeof value === "object") {
      return flattenJsonEntries(value, fullKey);
    }

    return [
      {
        key: fullKey,
        label: fullKey,
        value,
      },
    ];
  });
}

function formatJsonLabel(value: string) {
  return value
    .replace(/\./g, " / ")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatJsonValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
