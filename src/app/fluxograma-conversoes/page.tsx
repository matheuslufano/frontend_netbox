"use client";

import AffiliateDetails from "@/features/relatorios/AffiliateDetails";
import { useRelatorios } from "@/features/relatorios/useRelatorios";
import styles from "@/features/relatorios/relatorios.module.css";

export default function FluxogramaConversoesPage() {
  const { details, loading, refreshing, error, refresh } = useRelatorios();

  if (loading) {
    return (
      <div className={styles.page}>
        <h1>Fluxograma de conversões</h1>
        <p>Carregando dados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <h1>Fluxograma de conversões</h1>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.page} ${styles.transparentPage} ${styles.minimalFlowPage}`}>
      <div className={styles.minimalFlowHeading}>
        <h1 className={`${styles.title} ${styles.minimalFlowTitle}`}>Fluxograma de conversões</h1>
        <p>Acompanhe cada cliente da visita inicial até a validação no SGP.</p>
      </div>

      <AffiliateDetails
        details={details}
        refresh={refresh}
        refreshing={refreshing}
        initialDetailTab="conversions"
        initialConversionReportView="flow"
        hideAffiliateSelector
        hideAffiliatePanel
        minimalFlow
        emptyMessage="Nenhuma conversão encontrada para exibir no fluxograma."
      />
    </div>
  );
}
