"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiMapPin, FiServer } from "react-icons/fi";
import { consultarSaudeSistema } from "@/lib/api";
import {
  systemVersion,
  systemVersionUpdatedAt,
} from "@/lib/version";
import styles from "./header.module.css";

type ConnectionState = "checking" | "online" | "offline";

const HEALTH_REFRESH_MS = 30000;

export default function Header() {
  const router = useRouter();
  const [backendState, setBackendState] =
    useState<ConnectionState>("checking");
  const [databaseState, setDatabaseState] =
    useState<ConnectionState>("checking");
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const health = await consultarSaudeSistema();

        if (cancelled) {
          return;
        }

        setBackendState(health.status === "online" ? "online" : "offline");
        setDatabaseState(health.database === "ok" ? "online" : "offline");
        setLastCheckedAt(new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }));
      } catch {
        if (!cancelled) {
          setBackendState("offline");
          setDatabaseState("offline");
          setLastCheckedAt(new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }));
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

  const healthTitle = useMemo(() => {
    if (!lastCheckedAt) {
      return "Verificando conexão";
    }

    return `Última verificacao: ${lastCheckedAt}`;
  }, [lastCheckedAt]);

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.headerBackButton}
        onClick={() => router.back()}
        aria-label="Voltar para a página anterior"
        title="Voltar"
      >
        <FiArrowLeft aria-hidden="true" />
      </button>

      <div className={styles.brandBlock}>
        <span className={styles.eyebrow}>Painel Netbox</span>
        <strong>Internet de Verdade</strong>
        <span className={styles.location}>
          <FiMapPin aria-hidden="true" />
          Paraiso do Tocantins - TO
        </span>
      </div>

      <div className={styles.headerTools} title={healthTitle}>
        <div className={styles.versionPill}>
          <span>Versao</span>
          <strong>v{systemVersion}</strong>
          <small>{systemVersionUpdatedAt}</small>
        </div>

        <div className={styles.healthPanel}>
          <FiServer aria-hidden="true" className={styles.healthIcon} />
          <div className={styles.healthItems}>
            <HealthLed label="Backend" state={backendState} />
            <HealthLed label="Banco" state={databaseState} />
          </div>
        </div>
      </div>
    </header>
  );
}

function HealthLed({
  label,
  state,
}: {
  label: string;
  state: ConnectionState;
}) {
  const text =
    state === "checking"
      ? "Verificando"
      : state === "online"
        ? "Conectado"
        : "Offline";

  return (
    <span className={styles.healthLed}>
      <span
        className={`${styles.ledDot} ${
          state === "online"
            ? styles.ledOnline
            : state === "offline"
              ? styles.ledOffline
              : styles.ledChecking
        }`}
        aria-hidden="true"
      />
      <span>
        {label}
        <strong>{text}</strong>
      </span>
    </span>
  );
}
