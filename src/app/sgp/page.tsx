"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  buscarStatusSgp,
  consultarClienteSgp,
  getApiErrorMessage,
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

export default function SgpPage() {
  const [document, setDocument] = useState("");
  const [customer, setCustomer] = useState<SgpCustomer | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [connectionLabel, setConnectionLabel] = useState("Verificando SGP...");
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanDocument = useMemo(() => onlyDigits(document), [document]);

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

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCustomer(null);
    setRawOpen(false);

    if (cleanDocument.length < 5) {
      setError("Informe um CPF ou CNPJ para consultar.");
      return;
    }

    setSearching(true);
    try {
      const response = await consultarClienteSgp(cleanDocument);
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

        <section className={styles.searchCard}>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <label className={styles.field} htmlFor="sgp-document">
              <span>CPF ou CNPJ do cliente</span>
              <input
                id="sgp-document"
                value={document}
                onChange={(event) => setDocument(event.target.value)}
                placeholder="Digite CPF ou CNPJ"
                autoComplete="off"
                inputMode="numeric"
              />
            </label>

            <button
              type="submit"
              className={styles.primaryButton}
              disabled={searching || configured === false}
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
      </div>
    </div>
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
