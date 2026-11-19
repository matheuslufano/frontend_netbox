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
} from "react-icons/lu";
import api, { getApiErrorMessage } from "@/lib/api";
import CampaignSettings from "./CampaignSettings";
import RegistrationDetails from "./RegistrationDetails";
import {
  statusLabels,
  configLabels,
  type Dashboard,
  type Registration,
  type CampaignConfig,
} from "./types";
import styles from "./campaign.module.css";
export default function LocomotivaCampaignPage() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null),
    [tab, setTab] = useState("overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState<Registration | null>(null);
  const [filters, setFilters] = useState({
    q: "",
    city: "",
    date: "",
    period: "",
    status: "",
  });
  const [inviteName, setInviteName] = useState(""),
    [inviteProfile, setInviteProfile] = useState(""),
    [inviteLink, setInviteLink] = useState("");
  const inFlight = useRef(false);
  const load = useCallback(async () => {
    const result = await api.get<Dashboard>("/admin/locomotiva");
    setDashboard(result.data);
  }, []);
  useEffect(() => {
    const requestedSection = new URLSearchParams(window.location.search).get("secao");
    let alive = true;
    void api
      .get<Dashboard>("/admin/locomotiva")
      .then((r) => {
        if (alive) {
          setDashboard(r.data);
          if (requestedSection && ["overview", "registrations", "calendar", "invites", "settings"].includes(requestedSection)) setTab(requestedSection);
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
  async function action(fn: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      setNotice("Operação salva no servidor.");
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível salvar."));
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
    ["registrations", "Inscrições", LuUsers],
    ["calendar", "Calendário", LuCalendarDays],
    ["invites", "Convites", LuSend],
    ["settings", "Configurações", LuSettings],
  ] as const;
  const rows =
    dashboard?.registrations.filter(
      (r) =>
        `${r.name} ${r.instagram}`
          .toLowerCase()
          .includes(filters.q.toLowerCase()) &&
        r.city.toLowerCase().includes(filters.city.toLowerCase()) &&
        (!filters.date || r.date === filters.date) &&
        (!filters.period || r.period === filters.period) &&
        (!filters.status || r.status === filters.status),
    ) || [];
  return (
    <main id="locomotiva-admin" className={styles.page}>
      <Link id="locomotiva-back-partnerships" href="/integracoes/parcerias">← Gestão de parcerias</Link>
      <div className={styles.heading}>
        <div>
          <p>CAMPANHAS / INAUGURAÇÃO</p>
          <h1>Campanha Locomotiva</h1>
          <p>21 a 30 de novembro de 2026 · um influenciador por data</p>
        </div>
        <button
          id="locomotiva-refresh"
          disabled={busy}
          onClick={() => void action(load)}
        >
          <LuRefreshCw />
          Atualizar
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.alert}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!dashboard && !error && <p>Carregando campanha…</p>}
      {dashboard && (
        <>
          <nav className={styles.tabs} aria-label="Seções da campanha">
            {tabs.map(([key, label, Icon]) => (
              <button
                id={`locomotiva-tab-${key}`}
                key={key}
                aria-current={tab === key ? "page" : undefined}
                onClick={() => {
                  setTab(key);
                  setDetail(null);
                }}
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
                <p>
                  E-mail:{" "}
                  {dashboard.mailConfigured
                    ? "configurado; validar envio real antes da divulgação"
                    : "configuração SMTP pendente"}
                  . Foto automática: sem integração autorizada; envio manual
                  disponível.
                </p>
                <h3>Pendências antes da abertura</h3>
                {dashboard.missing.length ? (
                  <ul>
                    {dashboard.missing.map((k) => (
                      <li key={k}>
                        {configLabels[k] || "Horários permitidos de chegada"}
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
            <>
              <div className={styles.filters}>
                <label>
                  Nome ou Instagram
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
                      {r.date} · {r.time} ·{" "}
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
              {!rows.length && <p>Nenhuma inscrição encontrada.</p>}
            </>
          )}
          {tab === "calendar" && (
            <section className={styles.cards}>
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
            </section>
          )}
          {tab === "invites" && (
            <section className={styles.panel}>
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
            </section>
          )}
          {tab === "settings" && (
            <CampaignSettings
              key={dashboard.config.revision}
              config={dashboard.config}
              missing={dashboard.missing}
              mailConfigured={dashboard.mailConfigured}
              busy={busy}
              onSave={async (config: CampaignConfig) =>
                action(async () => {
                  await api.put("/admin/locomotiva/config", config);
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
              canReadCpf={dashboard.canReadCpf}
              onClose={() => setDetail(null)}
              onSave={async (data) =>
                action(async () => {
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
                })
              }
              onRetry={async (id) =>
                action(async () => {
                  await api.post(`/admin/locomotiva/mail/${id}/retry`);
                  await open(detail.id);
                })
              }
              onCpf={async () => {
                try {
                  return (
                    await api.get(
                      `/admin/locomotiva/registrations/${detail.id}/cpf`,
                    )
                  ).data.cpf;
                } catch (e) {
                  setError(getApiErrorMessage(e, "Consulta não autorizada."));
                  return detail.cpf;
                }
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
