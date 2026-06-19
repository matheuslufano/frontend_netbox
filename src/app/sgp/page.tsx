"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
    return digits.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    );
  }

  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
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

type SgpTab = "search" | "all" | "active" | "cities";

const SGP_TABS: Array<{ value: SgpTab; label: string }> = [
  { value: "search", label: "Consulta" },
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
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
      ""
  );
  const [customer, setCustomer] = useState<SgpCustomer | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [connectionLabel, setConnectionLabel] = useState("Verificando SGP...");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<SgpCustomer[]>([]);
  const [summary, setSummary] = useState<SgpCustomersSummary | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const cleanSearch = useMemo(() => search.trim(), [search]);
  const preCadastro = useMemo(
    () => ({
      conversionId: searchParams.get("conversionId") || "",
      name: searchParams.get("name") || "",
      phone: searchParams.get("phone") || "",
      city: searchParams.get("city") || "",
      document: searchParams.get("document") || "",
    }),
    [searchParams]
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
              : status.error || "SGP nao configurado"
          );
        }
      } catch (err) {
        if (!cancelled) {
          setConfigured(false);
          setConnectionLabel(
            getApiErrorMessage(err, "Nao foi possivel verificar o SGP.")
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
              "Nao foi possivel consultar o cliente no SGP."
            )
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

  useEffect(() => {
    if (activeTab === "search" || customers.length > 0 || loadingCustomers) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoadingCustomers(true);
      setListError(null);

      try {
        const response = await listarClientesSgp();

        if (!cancelled) {
          setCustomers(response.customers);
          setSummary(response.summary);
        }
      } catch (err) {
        if (!cancelled) {
          setListError(
            getApiErrorMessage(
              err,
              "Nao foi possivel listar os clientes no SGP."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCustomers(false);
        }
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeTab, customers.length, loadingCustomers]);

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
        getApiErrorMessage(err, "Nao foi possivel consultar o cliente no SGP.")
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
                ? "Verificando conexao"
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
                <span className={styles.cardKicker}>Pre-cadastro do relatorio</span>
                <strong>{preCadastro.name || "Cliente sem nome"}</strong>
              </div>

              <div className={styles.preCadastroGrid}>
                <InfoItem
                  label="Conversao"
                  value={preCadastro.conversionId || "-"}
                />
                <InfoItem
                  label="Documento"
                  value={preCadastro.document ? formatDocument(preCadastro.document) : "-"}
                />
                <InfoItem
                  label="WhatsApp"
                  value={preCadastro.phone || "-"}
                />
                <InfoItem
                  label="Cidade"
                  value={preCadastro.city || "-"}
                />
              </div>
            </div>
          )}

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <label className={styles.field} htmlFor="sgp-search">
              <span>CPF/CNPJ, nome, telefone ou cidade</span>
              <input
                id="sgp-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Digite CPF, nome, telefone ou cidade"
                autoComplete="off"
              />
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
          <section className={styles.resultGrid}>
            <article className={styles.customerCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.cardKicker}>Cliente</span>
                  <h2>{customer.name || "Cliente sem nome"}</h2>
                </div>
                <StatusPill active={customer.active} label={customer.status} />
              </div>

              <div className={styles.infoGrid}>
                <InfoItem
                  label="Documento"
                  value={formatDocument(customer.document)}
                />
                <InfoItem label="Codigo SGP" value={customer.id || "-"} />
                <InfoItem label="Telefone" value={customer.phone || "-"} />
                <InfoItem label="Cidade" value={customer.city || "-"} />
                <InfoItem
                  label="Contratos"
                  value={String(customer.contracts.length)}
                />
              </div>
            </article>

            <article className={styles.contractsCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.cardKicker}>Contratos</span>
                  <h2>Situacao no SGP</h2>
                </div>
                <FiActivity aria-hidden="true" />
              </div>

              {customer.contracts.length === 0 ? (
                <div className={styles.emptyState}>
                  Nenhum contrato encontrado na resposta do SGP.
                </div>
              ) : (
                <div className={styles.contractList}>
                  {customer.contracts.map((contract, index) => (
                    <div
                      className={styles.contractItem}
                      key={`${contract.id || "contrato"}-${index}`}
                    >
                      <div>
                        <strong>
                          {contract.plan || `Contrato ${contract.id || index + 1}`}
                        </strong>
                        <small>Status SGP: {contract.status}</small>
                        <span>{contract.address || "Sem endereco informado"}</span>
                      </div>
                      <StatusPill
                        active={contract.active}
                        label={contract.status}
                      />
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className={styles.rawCard}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setRawOpen((current) => !current)}
              >
                {rawOpen ? "Ocultar resposta tecnica" : "Ver resposta tecnica"}
              </button>

              {rawOpen && (
                <pre className={styles.rawJson}>
                  {formatJson(customer.raw)}
                </pre>
              )}
            </article>
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
}: {
  activeTab: Exclude<SgpTab, "search">;
  customers: SgpCustomer[];
  summary: SgpCustomersSummary | null;
  loading: boolean;
  error: string | null;
}) {
  const visibleCustomers =
    activeTab === "active"
      ? customers.filter((customer) => customer.active === true)
      : customers;

  if (loading) {
    return <p className={styles.emptyState}>Carregando clientes do SGP...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (activeTab === "cities") {
    return <CitiesPanel summary={summary} />;
  }

  return (
    <section className={styles.listCard}>
      <div className={styles.listHeader}>
        <div>
          <span className={styles.cardKicker}>
            {activeTab === "active" ? "Clientes ativos" : "Todos os clientes"}
          </span>
          <h2>{visibleCustomers.length} cliente(s)</h2>
        </div>

        {summary && <ActiveChart summary={summary} />}
      </div>

      {visibleCustomers.length === 0 ? (
        <div className={styles.emptyState}>Nenhum cliente encontrado.</div>
      ) : (
        <div className={styles.customerList}>
          {visibleCustomers.map((item, index) => (
            <CustomerRow key={`${item.id || item.document || "cliente"}-${index}`} customer={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function CitiesPanel({ summary }: { summary: SgpCustomersSummary | null }) {
  if (!summary) {
    return (
      <section className={styles.listCard}>
        <div className={styles.emptyState}>Nenhum resumo encontrado.</div>
      </section>
    );
  }

  const maxTotal = Math.max(...summary.byCity.map((item) => item.total), 1);

  return (
    <section className={styles.listCard}>
      <div className={styles.listHeader}>
        <div>
          <span className={styles.cardKicker}>Clientes por cidade</span>
          <h2>{summary.byCity.length} cidade(s)</h2>
        </div>

        <ActiveChart summary={summary} />
      </div>

      <div className={styles.cityList}>
        {summary.byCity.map((item) => (
          <div key={item.city} className={styles.cityItem}>
            <div>
              <strong>{item.city}</strong>
              <span>{item.active} ativo(s) de {item.total}</span>
            </div>
            <div className={styles.cityBarTrack}>
              <span
                className={styles.cityBar}
                style={{ width: `${Math.max((item.total / maxTotal) * 100, 4)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActiveChart({ summary }: { summary: SgpCustomersSummary }) {
  const total = Math.max(summary.total, 1);
  const activePercent = Math.round((summary.active / total) * 100);

  return (
    <div className={styles.activeChart} aria-label="Grafico de clientes ativos">
      <div className={styles.activeChartRing}>
        <span>{activePercent}%</span>
      </div>
      <div>
        <strong>{summary.active}</strong>
        <span>ativos de {summary.total}</span>
      </div>
    </div>
  );
}

function CustomerRow({ customer }: { customer: SgpCustomer }) {
  return (
    <article className={styles.customerRow}>
      <div>
        <strong>{customer.name || "Cliente sem nome"}</strong>
        <span>{formatDocument(customer.document || "-")}</span>
      </div>
      <div>
        <span>{customer.phone || "Sem telefone"}</span>
        <span>{customer.city || "Cidade nao informada"}</span>
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
      : label || "Status nao identificado";

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

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.infoItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
