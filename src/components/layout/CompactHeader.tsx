"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FiArrowLeft, FiChevronRight } from "react-icons/fi";
import { consultarSaudeSistema } from "@/lib/api";
import styles from "./header.module.css";

type ConnectionState = "checking" | "online" | "offline";

const HEALTH_REFRESH_MS = 30000;

const routeLabels: Record<string, string> = {
  "/": "Início",
  "/links": "Links e QR",
  "/afiliado": "Afiliado",
  "/criar-campanha": "Criar Campanha",
  "/campanhas": "Campanhas",
  "/dashboard": "Dashboard",
  "/relatorios": "Relatórios",
  "/sgp": "SGP",
  "/integracoes": "Integrações",
};

export default function CompactHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [backendState, setBackendState] =
    useState<ConnectionState>("checking");

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const health = await consultarSaudeSistema();

        if (!cancelled) {
          setBackendState(health.status === "online" ? "online" : "offline");
        }
      } catch {
        if (!cancelled) {
          setBackendState("offline");
        }
      }
    }

    loadHealth();

    const interval = window.setInterval(loadHealth, HEALTH_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const title = useMemo(() => {
    const exactLabel = routeLabels[pathname || ""];

    if (exactLabel) {
      return exactLabel;
    }

    const section = `/${String(pathname || "")
      .split("/")
      .filter(Boolean)[0] || ""}`;

    return routeLabels[section] || "Painel";
  }, [pathname]);

  return (
    <header className={styles.compactHeader}>
      <div className={styles.compactLeft}>
        <button
          type="button"
          className={styles.headerBackButton}
          onClick={() => router.back()}
          aria-label="Voltar para a página anterior"
          title="Voltar"
        >
          <FiArrowLeft aria-hidden="true" />
        </button>

        <div className={styles.compactBrand}>
          <span>Painel Netbox</span>
          <FiChevronRight aria-hidden="true" />
          <strong>{title}</strong>
        </div>
      </div>

      <div
        className={styles.compactHealth}
        title={`Backend: ${getConnectionLabel(backendState)}`}
      >
        <span
          className={`${styles.compactLed} ${
            backendState === "online"
              ? styles.compactLedOnline
              : backendState === "offline"
                ? styles.compactLedOffline
                : styles.compactLedChecking
          }`}
          aria-hidden="true"
        />
        <span>Backend</span>
      </div>
    </header>
  );
}

function getConnectionLabel(state: ConnectionState) {
  if (state === "online") {
    return "conectado";
  }

  if (state === "offline") {
    return "offline";
  }

  return "verificando";
}
