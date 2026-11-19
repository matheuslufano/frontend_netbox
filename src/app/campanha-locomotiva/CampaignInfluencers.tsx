import Image from "next/image";
import { useState } from "react";
import {
  LuCalendarDays,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuCirclePlus,
  LuClapperboard,
  LuClock,
  LuEllipsis,
  LuInfo,
  LuPlus,
  LuSearch,
  LuSend,
  LuUserRound,
} from "react-icons/lu";
import {
  statusLabels,
  type Dashboard,
  type Invite,
  type Registration,
} from "./types";
import styles from "./CampaignInfluencers.module.css";
import workspace from "./CampaignWorkspace.module.css";

const pageSize = 5;
const visitDate = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const searchable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

type InfluencerRow = { invite?: Invite; registration?: Registration };

export default function CampaignInfluencers({
  dashboard,
  onOpen,
  onNewInvite,
  onOpenInvite,
  initialFilter,
}: {
  dashboard: Dashboard;
  onOpen: (id: string) => void;
  onNewInvite: () => void;
  onOpenInvite: (id: string) => void;
  initialFilter: string;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(
    initialFilter === "DELIVERY" ? "" : initialFilter,
  );
  const [delivery, setDelivery] = useState(
    initialFilter === "DELIVERY" ? "pending" : "",
  );
  const [order, setOrder] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const invites = new Map(
    dashboard.invites.map((invite) => [invite.id, invite]),
  );
  const linkedInvites = new Set(
    dashboard.registrations.map((registration) => registration.inviteId),
  );
  const rows: InfluencerRow[] = [
    ...dashboard.registrations.map((registration) => ({
      registration,
      invite: invites.get(registration.inviteId ?? ""),
    })),
    ...dashboard.invites
      .filter((invite) => !linkedInvites.has(invite.id))
      .map((invite) => ({ invite })),
  ];
  const dates = [
    ...new Set([
      ...dashboard.config.dates,
      ...dashboard.registrations.map((registration) => registration.date),
    ]),
  ].sort();
  const filtered = rows.filter(({ registration, invite }) => {
    const person = registration ?? invite;
    return (
      searchable(
        `${person?.name ?? ""} ${person?.instagram ?? ""} ${registration?.city ?? ""} ${registration?.id ?? ""}`,
      ).includes(searchable(query).replace(/^@/, "")) &&
      (!status ||
        (status === "APPROVED"
          ? !!registration &&
            ["CONFIRMED", "ATTENDED", "ABSENT"].includes(registration.status)
          : (registration?.status ?? "NO_REGISTRATION") === status)) &&
      (!delivery ||
        (!!registration &&
          ["CONFIRMED", "ATTENDED"].includes(registration.status) &&
          registration.content.checked === (delivery === "checked"))) &&
      (!date || registration?.date === date)
    );
  });
  if (order === "name")
    filtered.sort((a, b) =>
      (a.registration?.name ?? a.invite?.name ?? "").localeCompare(
        b.registration?.name ?? b.invite?.name ?? "",
        "pt-BR",
      ),
    );
  if (order === "visit")
    filtered.sort((a, b) =>
      (a.registration?.date ?? "~").localeCompare(b.registration?.date ?? "~"),
    );
  function exportRows() {
    const escapeCell = (value: string) =>
      '"' +
      (/^[\s\uFEFF]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? "'" : "") +
      value.replaceAll('"', '""') +
      '"';
    const lines = [
      ["Nome", "Instagram", "Visita", "Situação", "Entrega"],
      ...filtered.map(({ registration, invite }) => [
        registration?.name ?? invite?.name ?? "",
        registration?.instagram ?? invite?.instagram ?? "",
        registration?.date ?? "",
        registration ? statusLabels[registration.status] : "Sem reserva",
        registration
          ? registration.content.checked
            ? "Conferida"
            : registration.content.links.length
              ? "Enviada"
              : "Pendente"
          : "",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        [
          "\uFEFF" +
            lines.map((line) => line.map(escapeCell).join(";")).join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "locomotiva-influenciadores.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visiblePages = Array.from(
    { length: Math.min(pageCount, 3) },
    (_, index) =>
      Math.min(Math.max(currentPage - 1, 1), Math.max(pageCount - 2, 1)) +
      index,
  );

  return (
    <section
      id="locomotiva-influencers"
      aria-labelledby="locomotiva-influencers-title"
      className={styles.influencers}
    >
      <header className={workspace.heading}>
        <h2 id="locomotiva-influencers-title">Influenciadores</h2>
        <button type="button" onClick={exportRows} disabled={!filtered.length}>
          Exportar CSV
        </button>
      </header>
      <div className={workspace.metrics}>
        {[
          ["", "Todos"],
          ["PENDING", "Pendentes"],
          ["APPROVED", "Aprovados"],
          ["REJECTED", "Recusados"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={status === key}
            onClick={() => {
              setStatus(key);
              setPage(1);
            }}
          >
            {label}{" "}
            <strong>
              {
                dashboard.registrations.filter(
                  (record) =>
                    !key ||
                    (key === "APPROVED"
                      ? ["CONFIRMED", "ATTENDED", "ABSENT"].includes(
                          record.status,
                        )
                      : record.status === key),
                ).length
              }
            </strong>
          </button>
        ))}
      </div>
      <div id="locomotiva-influencers-filters" className={styles.filters}>
        <label className={styles.search}>
          <LuSearch aria-hidden="true" />
          <input
            id="locomotiva-influencers-search"
            type="search"
            aria-label="Buscar nome ou Instagram"
            placeholder="Buscar nome ou Instagram"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          id="locomotiva-influencers-status"
          aria-label="Status da reserva"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Status: Todos</option>
          <option value="APPROVED">Aprovados</option>
          {[
            "PENDING",
            "CONFIRMED",
            "REJECTED",
            "CANCELLED",
            "ATTENDED",
            "ABSENT",
          ].map((state) => (
            <option key={state} value={state}>
              {statusLabels[state]}
            </option>
          ))}
          <option value="NO_REGISTRATION">Sem reserva</option>
        </select>
        <select
          id="locomotiva-influencers-date"
          aria-label="Data da visita"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Data: Todas as datas</option>
          {dates.map((day) => (
            <option key={day} value={day}>
              {visitDate.format(new Date(day + "T00:00:00Z"))}
            </option>
          ))}
        </select>
        <button
          id="locomotiva-influencers-new-invite"
          type="button"
          className={styles.primaryButton}
          onClick={onNewInvite}
        >
          <LuPlus aria-hidden="true" /> Novo convite
        </button>
      </div>
      <div className={workspace.row}>
        <label>
          Entregas
          <select
            id="locomotiva-influencers-delivery"
            value={delivery}
            onChange={(event) => {
              setDelivery(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            <option value="pending">Pendentes</option>
            <option value="checked">Conferidas</option>
          </select>
        </label>
        <label>
          Ordenar por
          <select
            id="locomotiva-influencers-sort"
            value={order}
            onChange={(event) => {
              setOrder(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Mais recentes</option>
            <option value="name">Nome</option>
            <option value="visit">Visita</option>
          </select>
        </label>
      </div>
      <div
        id="locomotiva-influencers-table-container"
        className={styles.tableContainer}
        tabIndex={0}
        role="region"
        aria-label="Tabela de convites e reservas"
      >
        <table className={styles.table}>
          <thead>
            <tr>
              {[
                "Influenciador",
                "Instagram",
                "Convite",
                "Visita",
                "Conteúdo",
                "Reserva",
                "Entregas",
                "Ações",
              ].map((label) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map(({ invite, registration }) => {
                const name = registration?.name ?? invite?.name;
                const instagram = registration?.instagram ?? invite?.instagram;
                const open = () =>
                  registration
                    ? onOpen(registration.id)
                    : invite && onOpenInvite(invite.id);
                const stories = registration?.modality === "STORIES";
                const ContentIcon = stories ? LuCirclePlus : LuClapperboard;
                return (
                  <tr
                    key={
                      registration
                        ? `reservation-${registration.id}`
                        : `invite-${invite?.id}`
                    }
                  >
                    <td>
                      <button
                        type="button"
                        className={styles.person}
                        onClick={open}
                      >
                        {registration?.photo ? (
                          <Image
                            unoptimized
                            src={registration.photo}
                            alt=""
                            width={54}
                            height={54}
                          />
                        ) : (
                          <span className={styles.avatarPlaceholder}>
                            <LuUserRound aria-hidden="true" />
                          </span>
                        )}
                        {name}
                      </button>
                    </td>
                    <td>
                      {instagram ? `@${instagram.replace(/^@/, "")}` : "—"}
                    </td>
                    <td>
                      {invite ? (
                        <span
                          className={styles.badge}
                          data-tone={
                            invite.state === "SENT" ? "green" : "neutral"
                          }
                        >
                          <LuSend aria-hidden="true" />{" "}
                          {invite.state === "SENT" ? "Enviado" : "Criado"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {registration ? (
                        <span className={styles.cellWithIcon}>
                          <LuCalendarDays aria-hidden="true" />{" "}
                          {visitDate
                            .format(new Date(registration.date + "T00:00:00Z"))
                            .replace(".", "")}
                          , {registration.time.replace(/:00$/, "h")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {registration ? (
                        <span className={styles.cellWithIcon}>
                          <ContentIcon aria-hidden="true" />
                          <span>
                            {stories ? "Stories" : "Reels"}
                            <small>
                              {stories ? "(4 conteúdos)" : "(60 segundos)"}
                            </small>
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {registration ? (
                        <span
                          className={styles.badge}
                          data-tone={
                            registration.status === "CONFIRMED"
                              ? "green"
                              : registration.status === "PENDING"
                                ? "amber"
                                : "neutral"
                          }
                        >
                          {registration.status === "CONFIRMED" && (
                            <LuCheck aria-hidden="true" />
                          )}
                          {registration.status === "PENDING" && (
                            <LuClock aria-hidden="true" />
                          )}
                          {statusLabels[registration.status] ??
                            registration.status}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {registration
                        ? registration.content.checked
                          ? "Conferida"
                          : registration.content.links.length
                            ? "Enviada"
                            : "Pendente"
                        : "—"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.rowAction}
                        aria-label={`Abrir ${registration ? "reserva" : "convite"} de ${name}`}
                        onClick={open}
                      >
                        <LuEllipsis aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!filtered.length && (
              <tr>
                <td colSpan={8}>Nenhum convite ou reserva encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className={styles.listFooter}>
        <p>
          <LuInfo aria-hidden="true" /> Convite e reserva possuem situações
          independentes.
        </p>
        {pageCount > 1 && (
          <nav
            id="locomotiva-influencers-pagination"
            className={styles.pagination}
            aria-label="Páginas de influenciadores"
          >
            <button
              type="button"
              aria-label="Página anterior"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              <LuChevronLeft aria-hidden="true" />
            </button>
            {visiblePages.map((number) => (
              <button
                type="button"
                key={number}
                aria-current={number === currentPage ? "page" : undefined}
                onClick={() => setPage(number)}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              aria-label="Próxima página"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              <LuChevronRight aria-hidden="true" />
            </button>
          </nav>
        )}
      </footer>
    </section>
  );
}
