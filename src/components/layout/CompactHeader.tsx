"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiChevronRight } from "react-icons/fi";
import { consultarSaudeSistema } from "@/lib/api";
import styles from "./header.module.css";
import ThemeToggle from "@/components/theme/ThemeToggle";

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
  "/links-campanhas": "Links e Campanhas",
  "/links-campanhas/whatsapp": "WhatsApp",
  "/links-campanhas/relatorios": "Relat\u00f3rios",
  "/links-campanhas/relatorios/whatsapp": "WhatsApp",
  "/links-campanhas/relatorios/link": "Link Individual",
  "/links-campanhas/relatorios/campanha": "Campanha",
  "/configuracoes": "Configura\u00e7\u00f5es",
  "/crm": "CRM",
  "/fluxograma-conversoes": "Fluxograma",
  "/integracoes": "Integrações",
};

function formatRouteSegment(segment: string) {
  if (/^\d+$/.test(segment)) return "Detalhes";
  return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

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

  const breadcrumbs = useMemo(() => {
    const segments = String(pathname || "").split("/").filter(Boolean);
    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      return { href, label: routeLabels[href] || formatRouteSegment(segment) };
    });
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

        <nav className={styles.compactBrand} aria-label="NavegaÃ§Ã£o estrutural">
          <Link href="/dashboard" className={styles.breadcrumbLink}>
            Painel Netbox
          </Link>
          {breadcrumbs.map((breadcrumb, index) => {
            const current = index === breadcrumbs.length - 1;
            return (
              <span className={styles.breadcrumbItem} key={breadcrumb.href}>
                <FiChevronRight aria-hidden="true" />
                {current ? (
                  <strong aria-current="page">{breadcrumb.label}</strong>
                ) : (
                  <Link href={breadcrumb.href} className={styles.breadcrumbLink}>
                    {breadcrumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className={styles.compactTools}>
        <ThemeToggle className={styles.themeToggle} />
        <div className={styles.compactHealth} title={`Backend: ${getConnectionLabel(backendState)}`}>
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
