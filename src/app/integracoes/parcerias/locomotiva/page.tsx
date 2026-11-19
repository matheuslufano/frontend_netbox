"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuCalendarDays, LuSettings, LuTrainFront, LuUsers, LuRefreshCw } from "react-icons/lu";
import api, { getApiErrorMessage } from "@/lib/api";
import type { Dashboard } from "../../../campanha-locomotiva/types";
import styles from "../partnerships.module.css";

/** Central de acesso à gestão real das campanhas de parceiros. */
export default function LocomotivaPartnershipPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    api.get<Dashboard>("/admin/locomotiva").then(({ data }) => {
      if (active) { setDashboard(data); setError(""); }
    }).catch((cause) => {
      if (active) setError(getApiErrorMessage(cause, "Não foi possível consultar a campanha. Verifique sua permissão de administrador ou gerente."));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);
  return <main id="partnerships-management" className={styles.page}>
    <Link id="partnerships-back" href="/integracoes/parcerias" className={styles.action}><LuArrowLeft aria-hidden="true" /> Todos os parceiros</Link>
    <header className={styles.heading}><p>INTEGRAÇÕES / PARCERIAS</p><h1>Gestão de parcerias</h1><p>Organize campanhas, configure a participação e acompanhe os resultados de cada parceiro.</p></header>
    <article id="partnership-locomotiva" className={styles.partner} data-component="partnership-campaign">
      <header className={styles.partnerHeading}><LuTrainFront aria-hidden="true" /><div><h2>Locomotiva Reserva</h2><p>Campanha de inauguração · Restaurante Locomotiva</p></div><span id="partnership-locomotiva-status" className={styles.status}>{loading ? "Consultando…" : dashboard ? dashboard.config.published ? "Inscrições abertas" : "Inscrições fechadas" : "Status indisponível"}</span></header>
      {error && <p role="alert">{error}</p>}
      {dashboard && <dl className={styles.metrics}>
        <div><dt>Solicitações recebidas</dt><dd>{dashboard.registrations.length}</dd></div>
        <div><dt>Em análise</dt><dd>{dashboard.registrations.filter(r => r.status === "PENDING").length}</dd></div>
        <div><dt>Visitas confirmadas</dt><dd>{dashboard.registrations.filter(r => r.status === "CONFIRMED").length}</dd></div>
        <div><dt>Datas oferecidas</dt><dd>{dashboard.config.dates.length}</dd></div>
      </dl>}
      <p>Gerencie condições e aceites, informações do restaurante, voucher, publicações, datas, horários de chegada e antecedência mínima. Acompanhe inscrições, calendário, convites e aprovações por e-mail.</p>
      {dashboard && <p role="status">{dashboard.missing.length ? `${dashboard.missing.length} configurações obrigatórias pendentes.` : "Parâmetros obrigatórios preenchidos."} E-mail: {dashboard.mailConfigured ? "configurado no servidor" : "configuração pendente no servidor"}.</p>}
      <nav className={styles.actions} aria-label="Gestão da parceria Locomotiva">
        <Link id="partnership-locomotiva-manage" className={styles.action} href="/campanha-locomotiva"><LuUsers aria-hidden="true" /> Gerenciar e acompanhar</Link>
        <Link id="partnership-locomotiva-configure" className={styles.action} href="/campanha-locomotiva?secao=settings"><LuSettings aria-hidden="true" /> Configurar e ativar campanha</Link>
        <Link id="partnership-locomotiva-calendar" className={styles.action} href="/campanha-locomotiva?secao=calendar"><LuCalendarDays aria-hidden="true" /> Calendário</Link>
        <button id="partnerships-refresh" className={styles.action} disabled={loading} onClick={() => { setLoading(true); setRefresh(n => n + 1); }}><LuRefreshCw aria-hidden="true" /> Atualizar</button>
      </nav>
    </article>
  </main>;
}
