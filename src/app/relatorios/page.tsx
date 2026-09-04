"use client";

import { useMemo, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import AffiliateDetails from "@/features/relatorios/AffiliateDetails";
import { useRelatorios } from "@/features/relatorios/useRelatorios";
import styles from "@/features/relatorios/relatorios.module.css";

export default function Relatorios() {
  const [affiliateSearch, setAffiliateSearch] =
    useState("");

  const {
    details,
    loading,
    refreshing,
    error,
    refresh,
  } = useRelatorios();

  const normalizedSearch = normalizeText(affiliateSearch);

  const filteredDetails = useMemo(() => {
    if (!normalizedSearch) {
      return details;
    }

    return details.filter((detail) => {
      const searchableText = normalizeText(
        `${detail.affiliate} ${detail.affiliateId}`
      );

      return searchableText.includes(normalizedSearch);
    });
  }, [details, normalizedSearch]);

  const hasSearch = affiliateSearch.trim().length > 0;

  if (loading) {
    return (
      <div className={styles.page}>
        <h1>Relatórios</h1>
        <p>Carregando dados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <h1>Relatórios</h1>
        <p className={styles.error} role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>
        Relatórios
      </h1>

      <div className={styles.searchBar}>
        <label className={styles.searchField}>
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={affiliateSearch}
            onChange={(event) =>
              setAffiliateSearch(event.target.value)
            }
            placeholder="Buscar afiliado"
            list="affiliate-report-options"
            aria-label="Buscar afiliado"
          />
        </label>

        <datalist id="affiliate-report-options">
          {details.map((detail) => (
            <option
              key={detail.affiliateId}
              value={detail.affiliate}
            />
          ))}
        </datalist>

        {hasSearch && (
          <button
            type="button"
            className={styles.clearSearchButton}
            onClick={() => setAffiliateSearch("")}
            aria-label="Limpar busca"
            title="Limpar busca"
          >
            <FiX aria-hidden="true" />
          </button>
        )}

        <span className={styles.searchCount}>
          {filteredDetails.length} de {details.length}
        </span>
      </div>

      <AffiliateDetails
        details={filteredDetails}
        refresh={refresh}
        refreshing={refreshing}
        emptyMessage={
          hasSearch
            ? "Nenhum afiliado encontrado para esta busca."
            : undefined
        }
      />
    </div>
  );
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
