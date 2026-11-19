import Image from "next/image";
import { useState } from "react";
import {
  LuCalendarCheck,
  LuCalendarDays,
  LuCheck,
  LuChevronDown,
  LuCircleCheck,
  LuClock,
  LuEye,
  LuGift,
  LuHourglass,
  LuSend,
  LuUtensils,
  LuUserRound,
} from "react-icons/lu";
import {
  requiredDocumentApprovals,
  statusLabels,
  type Dashboard,
  type Registration,
} from "./types";
import CampaignDialog from "./CampaignDialog";
import styles from "./CampaignWorkspace.module.css";
import overview from "./CampaignOverview.module.css";

const approved = new Set(["CONFIRMED", "ATTENDED", "ABSENT"]);
const displayDate = (date: string) => date.split("-").reverse().join("/");
const campaignToday = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Araguaina" }).format();
const dateLabel = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const compactDate = (date: string) => new Date(date + "T00:00:00Z");
const visitStatus = (status: string) =>
  status === "CONFIRMED"
    ? "Aprovada"
    : status === "PENDING"
      ? "Aguardando"
      : (statusLabels[status] ?? status);

function ParticipantAvatar({
  visit,
  size,
}: {
  visit: Registration;
  size: number;
}) {
  return (
    <span className={overview.avatar} style={{ width: size, height: size }}>
      {visit.photo ? (
        <Image
          unoptimized
          src={visit.photo}
          alt=""
          width={size}
          height={size}
        />
      ) : (
        <LuUserRound aria-hidden="true" />
      )}
    </span>
  );
}

export default function CampaignOverview({
  dashboard,
  openRegistration,
  viewRegistrations,
}: {
  dashboard: Dashboard;
  openRegistration: (id: string) => void;
  viewRegistrations: (filter?: string) => void;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const { registrations, config, settings, mailConfigured } = dashboard;
  const selectedVisit = registrations.find(({ id }) => id === selectedVisitId);
  const firstDate = start || config.dates[0];
  const lastDate = end || config.dates.at(-1);
  const periodLabel =
    firstDate && lastDate && firstDate <= lastDate
      ? dateLabel.formatRange(compactDate(firstDate), compactDate(lastDate))
      : "Selecionar período";
  const rows = registrations.filter(
    ({ date }) => (!start || date >= start) && (!end || date <= end),
  );
  const dates = [
    ...new Set([
      ...config.dates.filter(
        (date) => (!start || date >= start) && (!end || date <= end),
      ),
      ...rows.map(({ date }) => date),
    ]),
  ].sort();
  const totals = new Map<string, { received: number; approved: number }>();
  for (const record of rows) {
    const day = totals.get(record.date) ?? { received: 0, approved: 0 };
    day.received++;
    if (approved.has(record.status)) day.approved++;
    totals.set(record.date, day);
  }
  const maximum =
    Math.ceil(
      Math.max(4, ...Array.from(totals.values(), (day) => day.received)) / 4,
    ) * 4;
  const metrics = [
    ["Solicitações", rows.length, "", LuSend],
    [
      "Aprovadas",
      rows.filter(({ status }) => approved.has(status)).length,
      "APPROVED",
      LuCalendarCheck,
    ],
    [
      "Visitas realizadas",
      rows.filter(({ status }) => status === "ATTENDED").length,
      "ATTENDED",
      LuUtensils,
    ],
    [
      "Entregas pendentes",
      rows.filter(
        ({ status, content }) =>
          ["CONFIRMED", "ATTENDED"].includes(status) && !content.checked,
      ).length,
      "DELIVERY",
      LuHourglass,
    ],
  ] as const;
  const draft = settings?.draft ?? config;
  const readiness = [
    [
      "Agenda configurada",
      !!(draft.dates.length && (draft.lunch.length || draft.dinner.length)),
      "dates",
    ],
    [
      "Documentos revisados",
      requiredDocumentApprovals.every(
        (key) => settings?.reviews[key]?.status === "approved",
      ),
      "imageTerm",
    ],
    [
      mailConfigured ? "E-mail configurado" : "E-mail pendente",
      mailConfigured,
      "mail",
    ],
  ] as const;
  const visits = rows
    .filter(
      ({ status, date }) =>
        date >= campaignToday() && ["CONFIRMED", "PENDING"].includes(status),
    )
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    )
    .slice(0, 6);
  return (
    <section
      id="locomotiva-overview"
      className={`${styles.stack} ${overview.dashboard}`}
      aria-labelledby="locomotiva-overview-title"
    >
      <header className={`${styles.heading} ${overview.heading}`}>
        <div>
          <h2 id="locomotiva-overview-title" className={styles.title}>
            Visão geral
          </h2>
          <p>Acompanhe a campanha de influenciadores.</p>
        </div>
        <details className={overview.period}>
          <summary>
            <LuCalendarDays aria-hidden="true" />
            <span>
              <small>Período</small>
              <strong>{periodLabel}</strong>
            </span>
            <LuChevronDown aria-hidden="true" />
          </summary>
          <div className={overview.periodFields}>
            <label>
              Visitas a partir de
              <input
                id="locomotiva-overview-start"
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <label>
              Até
              <input
                id="locomotiva-overview-end"
                type="date"
                min={start || undefined}
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
            {(start || end) && (
              <button
                type="button"
                onClick={() => {
                  setStart("");
                  setEnd("");
                }}
              >
                Limpar período
              </button>
            )}
          </div>
        </details>
      </header>
      <div className={styles.metrics}>
        {metrics.map(([label, total, filter, Icon], index) => (
          <button
            type="button"
            className={`${styles.metric} ${overview.metric}`}
            data-tone={index}
            key={label}
            onClick={() => viewRegistrations(filter)}
          >
            <Icon aria-hidden="true" />
            <span>
              {label}
              <strong>{total}</strong>
            </span>
          </button>
        ))}
      </div>
      <div className={styles.summaryGrid}>
        <section className={styles.card}>
          <h3>Reservas diárias da campanha</h3>
          {dates.length ? (
            <div className={overview.chartFrame}>
              <div className={overview.chartScale} aria-hidden="true">
                {[4, 3, 2, 1, 0].map((tick) => (
                  <span key={tick}>{(maximum * tick) / 4}</span>
                ))}
              </div>
              <div
                className={styles.chart}
                role="region"
                tabIndex={0}
                aria-label="Solicitações e aprovações por data de visita"
              >
                {dates.map((date) => {
                  const day = totals.get(date) ?? { received: 0, approved: 0 };
                  return (
                    <div
                      key={date}
                      className={styles.chartDay}
                      aria-label={`${displayDate(date)}: ${day.received} solicitações, ${day.approved} aprovadas`}
                      title={`${day.received} solicitações, ${day.approved} aprovadas`}
                    >
                      <div className={styles.chartBars} aria-hidden="true">
                        <span
                          style={{
                            height: `${(day.received / maximum) * 100}%`,
                          }}
                        />
                        <span
                          style={{
                            height: `${(day.approved / maximum) * 100}%`,
                          }}
                        />
                      </div>
                      <time dateTime={date}>
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "numeric",
                          month: "short",
                          timeZone: "UTC",
                        })
                          .format(compactDate(date))
                          .replace(/ de /g, "/")
                          .replace(".", "")}
                      </time>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p>Nenhuma data no período.</p>
          )}
          <p className={overview.chartLegend}>
            <span>Solicitações</span>
            <span>Aprovadas</span>
          </p>
        </section>
        <section className={styles.card}>
          <h3>Checklist da campanha</h3>
          <div className={overview.checklist}>
            {readiness.map(([label, ready, field]) => (
              <a
                key={field}
                href={`?secao=settings&campo=${field}`}
                className={overview.checkItem}
                data-ready={ready}
              >
                <span aria-hidden="true">{ready && <LuCheck />}</span> {label}
                <span className={overview.visuallyHidden}>
                  {ready ? "Concluído" : "Pendente"}
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
      <section className={styles.card}>
        <h3>Próximas visitas</h3>
        {visits.length ? (
          <div className={styles.tableWrap}>
            <table className={`${styles.table} ${overview.visitTable}`}>
              <thead>
                <tr>
                  {["Influenciador", "Data", "Horário", "Status", "Ação"].map(
                    (label) => (
                      <th scope="col" key={label}>
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id}>
                    <td>
                      <div className={overview.person}>
                        <ParticipantAvatar visit={visit} size={44} />
                        <span>
                          <strong>{visit.name}</strong>
                          <small>@{visit.instagram}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={overview.person}>
                        <LuCalendarDays aria-hidden="true" />{" "}
                        {displayDate(visit.date)}
                      </span>
                    </td>
                    <td>
                      <span className={overview.person}>
                        <LuClock aria-hidden="true" /> {visit.time}
                      </span>
                    </td>
                    <td>
                      <span
                        className={overview.status}
                        data-positive={approved.has(visit.status)}
                      >
                        {visitStatus(visit.status)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={overview.outlineButton}
                        aria-label={`Ver reserva de ${visit.name}`}
                        onClick={() => setSelectedVisitId(visit.id)}
                      >
                        <LuEye aria-hidden="true" /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Nenhuma próxima visita neste período.</p>
        )}
      </section>
      {selectedVisit && (
        <CampaignDialog
          id="locomotiva-overview-reservation"
          title="Detalhes da reserva"
          onClose={() => setSelectedVisitId("")}
        >
          <div className={overview.reservation}>
            <div className={overview.reservationPerson}>
              <div className={overview.person}>
                <ParticipantAvatar visit={selectedVisit} size={72} />
                <div>
                  <strong>{selectedVisit.name}</strong>
                  <small>@{selectedVisit.instagram}</small>
                </div>
              </div>
              <span
                className={overview.status}
                data-positive={approved.has(selectedVisit.status)}
              >
                {visitStatus(selectedVisit.status)}
              </span>
            </div>
            <dl className={overview.reservationFacts}>
              <div>
                <dt>
                  <LuCalendarDays /> Data da visita
                </dt>
                <dd>{displayDate(selectedVisit.date)}</dd>
              </div>
              <div>
                <dt>
                  <LuClock /> Horário
                </dt>
                <dd>{selectedVisit.time}</dd>
              </div>
              <div>
                <dt>
                  <LuGift /> Voucher
                </dt>
                <dd>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(
                    Number(
                      selectedVisit.acceptance?.terms?.voucherAmount ?? 200,
                    ),
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  <LuCircleCheck /> Check-in
                </dt>
                <dd>
                  <span
                    className={overview.status}
                    data-positive={selectedVisit.status === "ATTENDED"}
                  >
                    {selectedVisit.status === "ATTENDED"
                      ? "Realizado"
                      : selectedVisit.status === "ABSENT"
                        ? "Não compareceu"
                        : "Pendente"}
                  </span>
                </dd>
              </div>
            </dl>
            <section className={overview.delivery}>
              <h4>Entrega de conteúdo</h4>
              <p>
                <span>
                  {selectedVisit.modality === "STORIES" ? "Stories" : "Reels"}
                </span>
                <span
                  className={overview.status}
                  data-positive={selectedVisit.content.checked}
                >
                  {selectedVisit.content.checked
                    ? "Conferida"
                    : selectedVisit.content.links.length
                      ? "Enviada"
                      : "Pendente"}
                </span>
              </p>
            </section>
            <footer className={overview.reservationActions}>
              <button
                className={styles.primary}
                type="button"
                onClick={() => {
                  setSelectedVisitId("");
                  openRegistration(selectedVisit.id);
                }}
              >
                <LuUserRound aria-hidden="true" /> Ver participante
              </button>
              <button
                className={overview.outlineButton}
                type="button"
                onClick={() => setSelectedVisitId("")}
              >
                Fechar
              </button>
            </footer>
          </div>
        </CampaignDialog>
      )}
    </section>
  );
}
