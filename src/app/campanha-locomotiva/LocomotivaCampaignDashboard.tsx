"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LuCalendarDays,
  LuChartColumn,
  LuUsers,
  LuSettings,
  LuRefreshCw,
  LuPlus,
  LuSend,
  LuUserRound,
  LuArrowLeft,
  LuExternalLink,
  LuCalendarCheck,
} from "react-icons/lu";
import api, { getApiErrorMessage } from "@/lib/api";
import CampaignSettings from "./CampaignSettings";
import CampaignActivation from "./CampaignActivation";
import RegistrationDetails from "./RegistrationDetails";
import {
  statusLabels,
  configLabels,
  type Dashboard,
  type Registration,
} from "./types";
import styles from "./campaign.module.css";
const emptyFilters = { q: "", city: "", date: "", period: "", status: "" };

export default function LocomotivaCampaignDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null),
    [tab, setTab] = useState("overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState<Registration | null>(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [inviteName, setInviteName] = useState(""),
    [inviteProfile, setInviteProfile] = useState(""),
    [inviteLink, setInviteLink] = useState("");
  const inFlight = useRef(false);
  const lastRequest = useRef(0);
  const [requestedSettingsField, setRequestedSettingsField] = useState("");
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [syncWarning, setSyncWarning] = useState(false);
  const hasDashboard = syncedAt !== null;
  const load = useCallback(async () => {
    const sequence = ++lastRequest.current;
    const result = await api.get<Dashboard>("/admin/locomotiva");
    if (sequence !== lastRequest.current) return;
    setDashboard(result.data);
    setSyncedAt(new Date());
    setSyncWarning(false);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSection = params.get("secao");
    let alive = true;
    void api
      .get<Dashboard>("/admin/locomotiva")
      .then((r) => {
        if (alive) {
          setDashboard(r.data);
          if (requestedSection === "settings") setRequestedSettingsField(params.get("campo") ?? "");
          setSyncedAt(new Date());
          if (requestedSection && ["overview", "registrations", "calendar", "invites", "settings", "activation"].includes(requestedSection)) setTab(requestedSection);
        }
      })
      .catch((e) => {
        if (alive)
          setError(getApiErrorMessage(e, "Não foi possível abrir a campanha."));
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!hasDashboard || detail || tab === "settings" || tab === "activation") return;
    function synchronize() {
      if (document.hidden || inFlight.current) return;
      void load().catch(() => {
        setSyncWarning(true);
      });
    }
    const interval = window.setInterval(synchronize, 30000);
    window.addEventListener("focus", synchronize);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", synchronize);
    };
  }, [hasDashboard, detail, tab, load]);
  async function action(fn?: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn?.();
      await load();
      setNotice(fn ? "Operação salva no servidor." : "Dados da campanha atualizados.");
      return true;
    } catch (e) {
      setError(getApiErrorMessage(e, fn ? "Não foi possível salvar." : "Não foi possível atualizar os dados da campanha."));
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function open(id: string) {
    try {
      setDetail(
        (await api.get<Registration>(`/admin/locomotiva/registrations/${id}`))
          .data,
      );
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível abrir o cadastro."));
    }
  }
  const tabs = [
    ["overview", "Visão geral", LuChartColumn],
    ["registrations", "Reservas", LuUsers],
    ["calendar", "Calendário", LuCalendarDays],
    ["invites", "Convites", LuSend],
    ["settings", "Configurações", LuSettings],
    ["activation", "Ativação", LuCalendarCheck],
  ] as const;
  function selectSection(section: (typeof tabs)[number][0]) {
    setTab(section);
    setRequestedSettingsField("");
    setDetail(null);
    const url = new URL(window.location.href);
    url.searchParams.set("secao", section);
    url.searchParams.delete("campo");
    window.history.replaceState(null, "", url);
  }
  const rows =
    dashboard?.registrations.filter(
      (r) =>
        `${r.name} @${r.instagram} ${r.id}`
          .toLowerCase()
          .includes(filters.q.trim().toLowerCase()) &&
        r.city.toLowerCase().includes(filters.city.trim().toLowerCase()) &&
        (!filters.date || r.date === filters.date) &&
        (!filters.period || r.period === filters.period) &&
        (!filters.status || r.status === filters.status),
    ) || [];
  return (
    <main id="locomotiva-admin" className={styles.page}>
      <Link id="locomotiva-back-partnerships" className={styles.navigationLink} href="/integracoes/parcerias"><LuArrowLeft aria-hidden="true" /> Todos os parceiros</Link>
      <header className={styles.heading}>
        <div className={styles.campaignIdentity}>
          <Image src="/parcerias/locomotiva-logo.png" width={80} height={80} alt="" />
          <div>
          <p>Parcerias / Restaurante Locomotiva</p>
          <h1>Campanha Locomotiva</h1>
          <p>Um influenciador por data disponível</p>
          {dashboard && <span className={styles.statusBadge} data-open={dashboard.config.published}>{dashboard.config.published ? "Inscrições abertas" : "Inscrições fechadas"}</span>}
          </div>
        </div>
        <div className={styles.headingActions}>
          <a id="locomotiva-public-page" className={styles.navigationLink} href="https://locomotiva-six.vercel.app/campanha-locomotiva/" target="_blank" rel="noreferrer"><LuExternalLink aria-hidden="true" /> Página pública</a>
        <button
          id="locomotiva-refresh"
          disabled={busy}
          onClick={() => void action()}
        >
          <LuRefreshCw />
          Atualizar
        </button>
        </div>
      </header>
      {error && (
        <p role="alert" className={styles.alert}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {syncWarning && <p role="status" className={styles.alert}>A atualização automática falhou. Use Atualizar para consultar os registros mais recentes.</p>}
      {!dashboard && !error && <p>Carregando campanha…</p>}
      {dashboard && (
        <>
          <nav id="locomotiva-dashboard-navigation" className={styles.tabs} aria-label="Seções da campanha">
            {tabs.map(([key, label, Icon]) => (
              <button
                id={`locomotiva-tab-${key}`}
                key={key}
                aria-current={tab === key ? "page" : undefined}
                onClick={() => selectSection(key)}
              >
                <Icon />
                {label}
              </button>
            ))}
          </nav>
          {tab === "overview" && (
            <>
              <div className={styles.metrics}>
                {[
                  ["Total de reservas e solicitações", dashboard.registrations.length],
                  ["Convites registrados", dashboard.invites.length],
                  [
                    "Envios marcados manualmente",
                    dashboard.invites.filter((i) => i.state === "SENT").length,
                  ],
                  [
                    "Em análise",
                    dashboard.registrations.filter(
                      (r) => r.status === "PENDING",
                    ).length,
                  ],
                  [
                    "Confirmadas",
                    dashboard.registrations.filter(
                      (r) => r.status === "CONFIRMED",
                    ).length,
                  ],
                  [
                    "Datas disponíveis",
                    dashboard.availability.filter(
                      (d) => d.state === "AVAILABLE",
                    ).length,
                  ],
                  [
                    "Cancelamentos e recusas",
                    dashboard.registrations.filter((r) =>
                      ["CANCELLED", "REJECTED"].includes(r.status),
                    ).length,
                  ],
                  [
                    "Comparecimentos",
                    dashboard.registrations.filter(
                      (r) => r.status === "ATTENDED",
                    ).length,
                  ],
                  [
                    "Ausências",
                    dashboard.registrations.filter((r) => r.status === "ABSENT")
                      .length,
                  ],
                  [
                    "Conteúdos conferidos",
                    dashboard.registrations.filter((r) => r.content.checked)
                      .length,
                  ],
                ].map(([label, count]) => (
                  <article key={label} className={styles.metric}>
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </article>
                ))}
              </div>
              <section className={styles.panel}>
                <h2>
                  {dashboard.config.published
                    ? "Inscrições abertas"
                    : "Campanha fechada para inscrições"}
                </h2>
                <button id="locomotiva-view-all-reservations" type="button" onClick={() => selectSection("registrations")}><LuUsers aria-hidden="true" /> Ver todas as reservas</button>
                <p>{dashboard.mailConfigured ? "Configuração de e-mail presente." : "Envio de e-mails com configuração pendente. Solicite o ajuste ao administrador técnico."}</p>
                <h3>Pendências antes da abertura</h3>
                {dashboard.missing.length ? (
                  <ul>
                    {dashboard.missing.map((k) => (
                      <li key={k}>
                        {configLabels[k] || ({ dates: "Datas da campanha", arrivalTimes: "Horários de chegada" } as Record<string, string>)[k] || k}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Campos obrigatórios preenchidos. Confira a aprovação dos
                    responsáveis e a configuração de envio.
                  </p>
                )}
              </section>
            </>
          )}
          {tab === "registrations" && (
            <section id="locomotiva-reservations" className={styles.panel}>
              <h2>Reservas e solicitações</h2>
              <p>Registros enviados pelo formulário público da Campanha Locomotiva.</p>
              <p>{rows.length} de {dashboard.registrations.length} registros da campanha. {syncedAt && `Última consulta às ${syncedAt.toLocaleTimeString("pt-BR")}.`}</p>
              <div className={styles.filters}>
                <label>
                  Nome, Instagram ou protocolo
                  <input
                    id="locomotiva-filter-search"
                    value={filters.q}
                    onChange={(e) =>
                      setFilters({ ...filters, q: e.target.value })
                    }
                  />
                </label>
                <label>
                  Cidade
                  <input
                    id="locomotiva-filter-city"
                    value={filters.city}
                    onChange={(e) =>
                      setFilters({ ...filters, city: e.target.value })
                    }
                  />
                </label>
                <label>
                  Data
                  <input
                    id="locomotiva-filter-date"
                    type="date"
                    value={filters.date}
                    onChange={(e) =>
                      setFilters({ ...filters, date: e.target.value })
                    }
                  />
                </label>
                <label>
                  Período
                  <select
                    id="locomotiva-filter-period"
                    value={filters.period}
                    onChange={(e) =>
                      setFilters({ ...filters, period: e.target.value })
                    }
                  >
                    <option value="">Todos</option>
                    <option value="lunch">Almoço</option>
                    <option value="dinner">Jantar</option>
                  </select>
                </label>
                <label>
                  Situação
                  <select
                    id="locomotiva-filter-status"
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                  >
                    <option value="">Todas</option>
                    {Object.entries(statusLabels)
                      .filter(([k]) => !["AVAILABLE", "CLOSED"].includes(k))
                      .map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {Object.values(filters).some(Boolean) && <button id="locomotiva-clear-filters" type="button" onClick={() => setFilters(emptyFilters)}>Limpar filtros</button>}
              <div className={styles.cards}>
                {rows.map((r) => (
                  <button
                    id={`locomotiva-registration-${r.id}`}
                    key={r.id}
                    className={styles.participant}
                    onClick={() => void open(r.id)}
                  >
                    {r.photo ? (
                      <Image
                        unoptimized
                        src={r.photo}
                        alt="Foto enviada pelo participante"
                        width={56}
                        height={56}
                      />
                    ) : (
                      <LuUserRound size={40} />
                    )}
                    <strong>{r.name}</strong>
                    <span>
                      @{r.instagram} · {r.city}/{r.uf}
                    </span>
                    <span>
                      {r.date.split("-").reverse().join("/")} · {r.time} ·{" "}
                      {r.period === "lunch" ? "Almoço" : "Jantar"}
                    </span>
                    <span>
                      {r.modality === "STORIES" ? "4 Stories" : "Reels 60s"} ·{" "}
                      {statusLabels[r.status]}
                    </span>
                    <small>
                      CPF {r.cpf} · Conteúdo{" "}
                      {r.content.checked ? "conferido" : "pendente"}
                    </small>
                  </button>
                ))}
              </div>
              {!rows.length && <p>{dashboard.registrations.length ? "Nenhum registro corresponde aos filtros." : "Nenhuma solicitação foi registrada na campanha."}</p>}
            </section>
          )}
          {tab === "calendar" && (
            <section id="locomotiva-calendar" className={styles.panel}>
              <h2>Agenda de visitas</h2>
              <p>Consulte a ocupação de cada data e abra o registro correspondente.</p>
              <div className={styles.cards}>
              {dashboard.availability.map((d) => {
                const registration = dashboard.registrations.find(
                  (r) =>
                    r.date === d.date &&
                    ["PENDING", "CONFIRMED", "ATTENDED", "ABSENT"].includes(
                      r.status,
                    ),
                );
                return (
                  <article
                    key={d.date}
                    className={styles.panel}
                    data-state={d.state}
                  >
                    <LuCalendarDays />
                    <h2>{d.date.split("-").reverse().join("/")}</h2>
                    <p>{statusLabels[d.state]}</p>
                    {registration && (
                      <button onClick={() => void open(registration.id)}>
                        {registration.name} · {registration.time}
                      </button>
                    )}
                  </article>
                );
              })}
              </div>
            </section>
          )}
          {tab === "invites" && (
            <section id="locomotiva-invites" className={styles.panel}>
              <h2>Convidados e links individuais</h2>
              <p>
                Gerar um link não significa envio nem recebimento. Envie-o
                manualmente pelo Instagram e registre o envio.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    const result = await api.post("/admin/locomotiva/invites", {
                      name: inviteName,
                      instagram: inviteProfile,
                    });
                    const base = new URL(
                      String(api.defaults.baseURL || "/api-backend").replace(
                        /\/$/,
                        "",
                      ) + "/",
                      location.origin,
                    );
                    setInviteLink(
                      new URL(
                        `campanha-locomotiva/index.html#convite=${result.data.token}`,
                        base,
                      ).href,
                    );
                    setInviteName("");
                    setInviteProfile("");
                  });
                }}
              >
                <div className={styles.fields}>
                  <label>
                    Nome
                    <input
                      id="locomotiva-invite-name"
                      required
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </label>
                  <label>
                    Instagram
                    <input
                      id="locomotiva-invite-profile"
                      required
                      value={inviteProfile}
                      onChange={(e) => setInviteProfile(e.target.value)}
                    />
                  </label>
                </div>
                <button id="locomotiva-create-invite" disabled={busy}>
                  <LuPlus />
                  Registrar e gerar link
                </button>
              </form>
              {inviteLink && (
                <label>
                  Link gerado (copie agora; o token não é armazenado em texto
                  puro)
                  <input
                    id="locomotiva-generated-invite"
                    readOnly
                    value={inviteLink}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
              )}
              {dashboard.invites.map((i) => (
                <article key={i.id} className={styles.history}>
                  <strong>
                    {i.name} · {i.instagram}
                  </strong>
                  <p>
                    {i.state === "SENT"
                      ? "Envio marcado manualmente"
                      : "Registrado — envio não informado"}
                  </p>
                  <button
                    disabled={busy || i.state === "SENT"}
                    onClick={() =>
                      void action(async () => {
                        await api.post(
                          `/admin/locomotiva/invites/${i.id}/sent`,
                        );
                      })
                    }
                  >
                    <LuSend />
                    Marcar envio pelo Instagram
                  </button>
                </article>
              ))}
              {!dashboard.invites.length && <p>Nenhum convite registrado.</p>}
            </section>
          )}
          {tab === "activation" && (
            <CampaignActivation dashboard={dashboard} busy={busy} openSettings={() => selectSection("settings")} onAction={(payload) =>
              action(async () => {
                await api.put("/admin/locomotiva/config", payload);
              })
            } />
          )}
          {tab === "settings" && (
            <CampaignSettings
              initialField={requestedSettingsField}
              dashboard={dashboard}
              busy={busy}
              onAction={(payload) =>
                action(async () => {
                  await api.put("/admin/locomotiva/config", payload);
                })
              }
            />
          )}
          {detail && (
            <RegistrationDetails
              key={`${detail.id}-${detail.revision}-${detail.emails?.map((m) => m.attempts).join("-")}`}
              record={detail}
              config={dashboard.config}
              busy={busy}
              onClose={() => setDetail(null)}
              onSave={async (data) => {
                await action(async () => {
                  await api.put(
                    `/admin/locomotiva/registrations/${detail.id}`,
                    {
                      ...data,
                      content: {
                        ...data.content,
                        links: data.content.links
                          .map((l) => l.trim())
                          .filter(Boolean),
                      },
                    },
                  );
                  await open(detail.id);
                });
              }}
              onRetry={async (id) => {
                await action(async () => {
                  await api.post(`/admin/locomotiva/mail/${id}/retry`);
                  await open(detail.id);
                });
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
