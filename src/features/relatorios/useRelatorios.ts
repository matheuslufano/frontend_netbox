"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Affiliate,
  AffiliateStats,
  buscarDashboard,
  buscarEstatisticasAfiliado,
  DashboardData,
  getApiErrorMessage,
  listarAfiliados,
} from "@/lib/api";
import {
  RealtimeEventName,
  useRealtimeEvents,
} from "@/lib/useRealtimeEvents";

const AUTO_REFRESH_MS = 5000;
const REALTIME_REFRESH_DELAY_MS = 250;
const REPORT_REALTIME_EVENTS: RealtimeEventName[] = [
  "link-clicked",
  "link-converted",
  "chatmix-webhook",
];

export type AffiliateDetail = AffiliateStats & {
  affiliateId: number;
};

export function useRelatorios() {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [affiliateRows, setAffiliateRows] =
    useState<Affiliate[]>([]);

  const [details, setDetails] =
    useState<AffiliateDetail[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      setError(null);

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [dashRes, list] =
          await Promise.all([
            buscarDashboard(),
            listarAfiliados(),
          ]);

        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setDashboard(dashRes);
        setAffiliateRows(list);

        const statsResults = await Promise.all(
          list.map((affiliate) =>
            buscarEstatisticasAfiliado(affiliate.id)
              .then((data) => ({
                affiliateId: affiliate.id,
                ...data,
              }))
              .catch(() => null)
          )
        );

        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setDetails(
          statsResults.filter(
            (item): item is AffiliateDetail => item !== null
          )
        );
      } catch (err) {
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setError(
          getApiErrorMessage(
            err,
            "Não foi possível carregar os relatórios."
          )
        );
      } finally {
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    []
  );

  const refreshFromEvent = useCallback(() => {
    if (document.visibilityState !== "visible") {
      return;
    }

    if (realtimeRefreshTimerRef.current !== null) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      load({ silent: true });
    }, REALTIME_REFRESH_DELAY_MS);
  }, [load]);

  useRealtimeEvents(refreshFromEvent, REPORT_REALTIME_EVENTS);

  useEffect(() => {
    mountedRef.current = true;
    const timer = window.setTimeout(() => {
      load();
    }, 0);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    }, AUTO_REFRESH_MS);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        load({ silent: true });
      }
    };

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      if (realtimeRefreshTimerRef.current !== null) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
      mountedRef.current = false;
    };
  }, [load]);

  const refresh = useCallback(
    () => load({ silent: true }),
    [load]
  );

  return {
    dashboard,
    affiliateRows,
    details,
    loading,
    refreshing,
    error,
    refresh,
  };
}
