"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import AffiliatesTable from "@/components/report/AffiliatesTable";
import DashboardCharts from "@/components/report/DashboardCharts";
import SummaryCard from "@/components/report/SummaryCard";
import TopAffiliates from "@/components/report/TopAffiliates";
import {
  Affiliate,
  buscarDashboard,
  DashboardData,
  getApiErrorMessage,
  listarAfiliados,
} from "@/lib/api";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";
import styles from "./relatorios.module.css";

const AUTO_REFRESH_MS = 10000;

export default function Dashboard() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [affiliateRows, setAffiliateRows] =
    useState<Affiliate[]>([]);

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

        setData(dashboard);
        setAffiliateRows(affiliates);
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
    load();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [load]);

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

      <AffiliatesTable affiliateRows={affiliateRows} />
    </div>
  );
}
