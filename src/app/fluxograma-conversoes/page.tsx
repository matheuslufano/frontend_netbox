"use client";

import AffiliateDetails from "@/features/relatorios/AffiliateDetails";
import { useRelatorios } from "@/features/relatorios/useRelatorios";
import styles from "@/features/relatorios/relatorios.module.css";

export default function FluxogramaConversoesPage() {
  const { details, loading, refreshing, error, refresh } = useRelatorios();

  if (loading) {
    return (
      <div className={styles.page}>
        <h1>Fluxograma de conversoes</h1>
        <p>Carregando dados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <h1>Fluxograma de conversoes</h1>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.transparentPage}`}>
      <h1 className={styles.title}>Fluxograma de conversoes</h1>

      <AffiliateDetails
        details={details}
        refresh={refresh}
        refreshing={refreshing}
        initialDetailTab="conversions"
        initialConversionReportView="flow"
        hideAffiliateSelector
        hideAffiliatePanel
        emptyMessage="Nenhuma conversao encontrada para exibir no fluxograma."
      />
    </div>
  );
}
