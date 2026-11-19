"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LuCalendarDays,
  LuChartColumn,
  LuUsers,
  LuSettings,
  LuMail,
  LuPlus,
  LuSend,
  LuArrowLeft,
  LuExternalLink,
  LuCalendarCheck,
} from "react-icons/lu";
import api, { getApiErrorMessage } from "@/lib/api";
import CampaignSettings from "./CampaignSettings";
import CampaignOverview from "./CampaignOverview";
import reservationStyles from "./CampaignInfluencers.module.css";
import overviewStyles from "./CampaignOverview.module.css";
import CampaignInfluencers from "./CampaignInfluencers";
import CampaignVisitAgenda from "./CampaignVisitAgenda";
import CampaignEmailWorkspace from "./CampaignEmailWorkspace";
import workspace from "./CampaignWorkspace.module.css";
import CampaignActivation, {
  CampaignActivationHeading,
} from "./CampaignActivation";
import activationStyles from "./CampaignActivation.module.css";
import calendarStyles from "./CampaignVisitAgenda.module.css";
import RegistrationDetails from "./RegistrationDetails";
import {
  type Dashboard,
  type Registration,
  type ReservationQuickAction,
} from "./types";
import styles from "./campaign.module.css";

export default function LocomotivaCampaignDashboard() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null),
    [tab, setTab] = useState("overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [detail, setDetail] = useState<Registration | null>(null);
  const [detailAction, setDetailAction] = useState<ReservationQuickAction>();
  const [inviteName, setInviteName] = useState(""),
    [inviteProfile, setInviteProfile] = useState(""),
    [inviteLink, setInviteLink] = useState("");
  const inFlight = useRef(false);
  const lastRequest = useRef(0);
  const [requestedSettingsField, setRequestedSettingsField] = useState("");
  const [registrationFilter, setRegistrationFilter] = useState("");
  const [settingsDirty, setSettingsDirty] = useState(false);
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
          if (requestedSection === "settings")
            setRequestedSettingsField(params.get("campo") ?? "");
          setSyncedAt(new Date());
          if (
            requestedSection &&
            [
              "overview",
              "registrations",
              "calendar",
              "invites",
              "email",
              "settings",
              "activation",
            ].includes(requestedSection)
          )
            setTab(requestedSection);
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
    if (!hasDashboard || detail || tab === "settings" || tab === "activation")
      return;
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
      setNotice(
        fn ? "Operação salva no servidor." : "Dados da campanha atualizados.",
      );
      return true;
    } catch (e) {
      setError(
        getApiErrorMessage(
          e,
          fn
            ? "Não foi possível salvar."
            : "Não foi possível atualizar os dados da campanha.",
        ),
      );
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function open(id: string, initialAction?: ReservationQuickAction) {
    try {
      setError("");
      const { data } = await api.get<Registration>(
        `/admin/locomotiva/registrations/${id}`,
      );
      setDetailAction(initialAction);
      setDetail(data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível abrir o cadastro."));
    }
  }
  const tabs = [
    ["overview", "Visão geral", LuChartColumn],
    ["registrations", "Influenciadores", LuUsers],
    ["calendar", "Calendário", LuCalendarDays],
    ["email", "Edição do e-mail", LuMail],
    ["invites", "Convites", LuSend],
    ["settings", "Configurações", LuSettings],
    ["activation", "Ativação", LuCalendarCheck],
  ] as const;
  function selectSection(section: (typeof tabs)[number][0], filter = "") {
    if (
      (tab === "settings" || tab === "email") &&
      section !== tab &&
      settingsDirty &&
      !window.confirm(
        "Descartar alterações não salvas e sair das configurações?",
      )
    )
      return;
    setTab(section);
    setSettingsDirty(false);
    setRegistrationFilter(filter);
    setRequestedSettingsField("");
    setDetail(null);
    const url = new URL(window.location.href);
    url.searchParams.set("secao", section);
    url.searchParams.delete("campo");
    window.history.replaceState(null, "", url);
  }
  return (
    <main
      id="locomotiva-admin"
      data-reservation-open={Boolean(detail)}
      className={`${styles.page} ${workspace.workspace}`}
    >
      {tab === "activation" ? (
        <CampaignActivationHeading dashboard={dashboard} />
      ) : (
        tab !== "calendar" && (
          <header
            id="locomotiva-workspace-header"
            className={
              tab === "overview"
                ? `${workspace.heading} ${overviewStyles.brandHeader}`
                : workspace.heading
            }
          >
            <div className={workspace.row}>
              <Image
                src="/parcerias/locomotiva-logo.png"
                width={74}
                height={50}
                alt=""
              />
              <div>
                <h1>Restaurante Locomotiva</h1>
                <p>Campanha de influenciadores</p>
              </div>
            </div>
            <div className={workspace.row}>
              {tab === "overview" && (
                <span className={overviewStyles.campaignLabel}>
                  Campanha Locomotiva
                </span>
              )}
              <Link
                className={styles.navigationLink}
                href="/integracoes/parcerias"
              >
                <LuArrowLeft /> Parcerias
              </Link>
              <a
                className={styles.navigationLink}
                href="https://locomotiva-six.vercel.app/campanha-locomotiva/"
                target="_blank"
                rel="noreferrer"
              >
                <LuExternalLink /> Página pública
              </a>
              <button
                id="locomotiva-refresh"
                type="button"
                disabled={busy}
                onClick={() => void action()}
              >
                Atualizar
              </button>
            </div>
          </header>
        )
      )}
      {error && (
        <p role="alert" className={styles.alert}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {syncWarning && (
        <p role="status" className={styles.alert}>
          A atualização automática falhou. Use Atualizar para consultar os
          registros mais recentes.
        </p>
      )}
      {!dashboard && !error && <p>Carregando campanha…</p>}
      {dashboard && (
        <>
          <nav
            id="locomotiva-dashboard-navigation"
            className={
              tab === "activation"
                ? `${workspace.navigation} ${activationStyles.navigation}`
                : tab === "calendar"
                  ? `${workspace.navigation} ${calendarStyles.navigation}`
                  : workspace.navigation
            }
            aria-label="Seções da campanha"
          >
            {tabs
              .filter(([key]) => key !== "invites")
              .map(([key, label, Icon]) => (
                <button
                  id={`locomotiva-tab-${key}`}
                  key={key}
                  aria-current={
                    (detail ? "registrations" : tab) === key
                      ? "page"
                      : undefined
                  }
                  onClick={() => selectSection(key)}
                >
                  {tab !== "overview" &&
                    tab !== "activation" &&
                    tab !== "calendar" && <Icon aria-hidden="true" />}
                  {label}
                </button>
              ))}
          </nav>
          <div
            id="locomotiva-admin-reservation-surface"
            className={reservationStyles.reservationSurface}
          >
            <div
              className={reservationStyles.reservationUnderlying}
              inert={Boolean(detail)}
            >
              {tab === "overview" && (
                <CampaignOverview
                  dashboard={dashboard}
                  openRegistration={(id) => void open(id)}
                  viewRegistrations={(filter) =>
                    selectSection("registrations", filter)
                  }
                />
              )}
              {tab === "registrations" && (
                <CampaignInfluencers
                  initialFilter={registrationFilter}
                  dashboard={dashboard}
                  onOpen={(id) => void open(id)}
                  onNewInvite={() => {
                    selectSection("invites");
                    requestAnimationFrame(() =>
                      document
                        .getElementById("locomotiva-invite-name")
                        ?.focus(),
                    );
                  }}
                  onOpenInvite={(id) => {
                    selectSection("invites");
                    requestAnimationFrame(() =>
                      document
                        .getElementById(`locomotiva-invite-${id}`)
                        ?.focus(),
                    );
                  }}
                />
              )}
              {tab === "calendar" && (
                <CampaignVisitAgenda
                  dashboard={dashboard}
                  busy={busy}
                  onAction={(payload) =>
                    action(async () => {
                      await api.put("/admin/locomotiva/config", payload);
                    })
                  }
                  onOpen={(id, initialAction) => void open(id, initialAction)}
                />
              )}
              {tab === "email" && (
                <CampaignEmailWorkspace
                  dashboard={dashboard}
                  busy={busy}
                  onDirtyChange={setSettingsDirty}
                  onSave={(payload) =>
                    action(async () => {
                      await api.put("/admin/locomotiva/config", payload);
                    })
                  }
                />
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
                        const result = await api.post(
                          "/admin/locomotiva/invites",
                          {
                            name: inviteName,
                            instagram: inviteProfile,
                          },
                        );
                        const base = new URL(
                          String(
                            api.defaults.baseURL || "/api-backend",
                          ).replace(/\/$/, "") + "/",
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
                      Link gerado (copie agora; o token não é armazenado em
                      texto puro)
                      <input
                        id="locomotiva-generated-invite"
                        readOnly
                        value={inviteLink}
                        onFocus={(e) => e.target.select()}
                      />
                    </label>
                  )}
                  {dashboard.invites.map((i) => (
                    <article
                      key={i.id}
                      id={`locomotiva-invite-${i.id}`}
                      tabIndex={-1}
                      className={styles.history}
                    >
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
                  {!dashboard.invites.length && (
                    <p>Nenhum convite registrado.</p>
                  )}
                </section>
              )}
              {tab === "activation" && (
                <CampaignActivation
                  dashboard={dashboard}
                  busy={busy}
                  error={error}
                  onAction={(payload) =>
                    action(async () => {
                      await api.put("/admin/locomotiva/config", payload);
                    })
                  }
                />
              )}
              {tab === "settings" && (
                <CampaignSettings
                  onDirtyChange={setSettingsDirty}
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
            </div>
            {detail && (
              <RegistrationDetails
                key={`${detail.id}-${detail.revision}-${detailAction ?? ""}-${detail.emails?.map((m) => m.attempts).join("-")}`}
                record={detail}
                initialAction={detailAction}
                config={dashboard.config}
                busy={busy}
                onClose={() => {
                  setDetail(null);
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLElement>(
                        '#locomotiva-dashboard-navigation [aria-current="page"]',
                      )
                      ?.focus(),
                  );
                }}
                error={error}
                onDelete={
                  dashboard.canReadCpf
                    ? async () => {
                        await action(async () => {
                          await api.delete(
                            `/admin/locomotiva/registrations/${detail.id}`,
                          );
                          setDetail(null);
                        });
                      }
                    : undefined
                }
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
          </div>
        </>
      )}
    </main>
  );
}
