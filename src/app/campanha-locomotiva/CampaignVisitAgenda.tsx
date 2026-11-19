import Image from "next/image";
import { useState } from "react";
import {
  LuCalendarDays,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuBan,
  LuCheck,
  LuTrash2,
  LuUserRound,
  LuX,
  LuPlus,
} from "react-icons/lu";
import CampaignDialog from "./CampaignDialog";
import type { CampaignActivationAction } from "./CampaignActivation";
import {
  statusLabels,
  type Dashboard,
  type Registration,
  type ReservationQuickAction,
} from "./types";
import styles from "./CampaignWorkspace.module.css";
import calendar from "./CampaignVisitAgenda.module.css";

const weekdays = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];
const monthLabel = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const fullDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const shortMonth = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});
const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Araguaina" }).format();
const dateAt = (day: string) => new Date(day + "T12:00:00Z");
const iso = (day: Date) => day.toISOString().slice(0, 10);
const step = (day: Date, days: number) =>
  new Date(day.getTime() + days * 86400000);
const activeStates = ["PENDING", "CONFIRMED", "ATTENDED", "ABSENT"];
const visitStatus = (status: string) => statusLabels[status] ?? status;
const reservationActions = [
  { id: "approve", label: "Aprovar participação", icon: LuCheck },
  { id: "reject", label: "Recusar", icon: LuX },
  { id: "reschedule", label: "Alterar data", icon: LuCalendarDays },
  { id: "delete", label: "Excluir reserva", icon: LuTrash2 },
] as const;

function VisitAvatar({ visit, size }: { visit: Registration; size: number }) {
  return (
    <span className={calendar.avatar} style={{ width: size, height: size }}>
      {visit.photo ? (
        <Image
          unoptimized
          src={visit.photo}
          width={size}
          height={size}
          alt=""
        />
      ) : (
        <LuUserRound aria-hidden="true" />
      )}
    </span>
  );
}

export default function CampaignVisitAgenda({
  dashboard,
  onOpen,
  busy,
  onAction,
}: {
  dashboard: Dashboard;
  onOpen: (id: string, action?: ReservationQuickAction) => void;
  busy: boolean;
  onAction: (action: CampaignActivationAction) => Promise<boolean | undefined>;
}) {
  const [current, setCurrent] = useState(
    () => dashboard.config.dates[0] ?? today(),
  );
  const [mode, setMode] = useState("month");
  const [status, setStatus] = useState("");
  const [block, setBlock] = useState(false);
  const [hoursDate, setHoursDate] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const selectedVisit = dashboard.registrations.find(
    ({ id }) => id === selectedVisitId,
  );
  const allowedActions = reservationActions.filter(({ id }) =>
    id === "delete"
      ? dashboard.canReadCpf
      : selectedVisit?.status === "PENDING" ||
        (id === "reschedule" && selectedVisit?.status === "CONFIRMED"),
  );
  function openSelectedVisit(action?: ReservationQuickAction) {
    if (!selectedVisit) return;
    setSelectedVisitId(null);
    onOpen(selectedVisit.id, action);
  }
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const draft = dashboard.settings?.draft ?? dashboard.config;
  const focus = dateAt(current);
  const first = new Date(
    Date.UTC(focus.getUTCFullYear(), focus.getUTCMonth(), 1, 12),
  );
  const last = new Date(
    Date.UTC(focus.getUTCFullYear(), focus.getUTCMonth() + 1, 0, 12),
  );
  const offset = (first.getUTCDay() + 6) % 7;
  const gridStart =
    mode === "week"
      ? step(focus, -((focus.getUTCDay() + 6) % 7))
      : step(first, -offset);
  const gridSize =
    mode === "week" ? 7 : Math.ceil((offset + last.getUTCDate()) / 7) * 7;
  const visibleDays = Array.from({ length: gridSize }, (_, index) =>
    iso(step(gridStart, index)),
  );
  const currentMonth = current.slice(0, 7);
  const currentDay = today();
  const availableDays = new Map(
    dashboard.availability
      .filter(({ state }) => state === "AVAILABLE")
      .map((entry) => [entry.date, entry.times]),
  );
  const selectedHours = hoursDate ? availableDays.get(hoursDate) : undefined;
  const records = dashboard.registrations.filter(
    (visit) =>
      (!status || visit.status === status) &&
      (mode === "list"
        ? visit.date.startsWith(currentMonth)
        : visibleDays.includes(visit.date)),
  );
  const blocks = draft.dates.filter(
    (day) => start && end && day >= start && day <= end,
  );
  const conflicts = dashboard.registrations.filter(
    (visit) =>
      blocks.includes(visit.date) && activeStates.includes(visit.status),
  );
  function move(direction: number) {
    if (mode === "week") setCurrent(iso(step(focus, direction * 7)));
    else
      setCurrent(
        iso(
          new Date(
            Date.UTC(
              focus.getUTCFullYear(),
              focus.getUTCMonth() + direction,
              1,
              12,
            ),
          ),
        ),
      );
  }
  async function saveBlock() {
    if (!blocks.length || conflicts.length || !reason.trim()) return;
    const saved = await onAction({
      operation: "block-days",
      version: dashboard.settings?.version ?? 0,
      dates: blocks,
      reason,
    });
    if (saved) setBlock(false);
  }
  function visitButton(visit: (typeof records)[number]) {
    return (
      <button
        type="button"
        key={visit.id}
        className={calendar.reservationChip}
        data-status={visit.status}
        aria-haspopup="dialog"
        aria-label={`Ver reserva de ${visit.name}, ${fullDate.format(dateAt(visit.date))}, ${visit.time}, ${visitStatus(visit.status)}`}
        onClick={() => setSelectedVisitId(visit.id)}
      >
        <VisitAvatar visit={visit} size={24} />
        <span className={calendar.reservationLabel}>
          <strong>{visit.name}</strong>
          <time dateTime={`${visit.date}T${visit.time}`}>
            {shortDate.format(dateAt(visit.date))} · {visit.time}
          </time>
          <span>{visitStatus(visit.status)}</span>
        </span>
      </button>
    );
  }
  return (
    <section
      id="locomotiva-calendar"
      className={`${styles.stack} ${calendar.agenda}`}
      aria-labelledby="locomotiva-calendar-title"
    >
      <h2 id="locomotiva-calendar-title" className={styles.title}>
        Calendário
      </h2>
      <div className={calendar.toolbar}>
        <div className={styles.row}>
          <button type="button" onClick={() => setCurrent(today())}>
            Hoje
          </button>
          <button
            type="button"
            aria-label="Período anterior"
            onClick={() => move(-1)}
          >
            <LuChevronLeft />
          </button>
          <button
            type="button"
            aria-label="Próximo período"
            onClick={() => move(1)}
          >
            <LuChevronRight />
          </button>
          {mode === "week" ? (
            <strong className={styles.calendarPeriod}>
              {monthLabel.format(focus)} · {shortDate.format(gridStart)} a{" "}
              {shortDate.format(step(gridStart, 6))}
            </strong>
          ) : (
            <input
              id="locomotiva-calendar-month"
              type="month"
              aria-label="Mês do calendário"
              value={currentMonth}
              onChange={(event) => {
                if (/^[1-9]\d{3}-\d{2}$/.test(event.target.value))
                  setCurrent(event.target.value + "-01");
              }}
            />
          )}
        </div>
        <div
          className={calendar.viewSwitch}
          role="group"
          aria-label="Visualização do calendário"
        >
          {[
            ["month", "Mês"],
            ["week", "Semana"],
            ["list", "Lista"],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          Situação
          <select
            id="locomotiva-calendar-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todas</option>
            {activeStates.map((item) => (
              <option key={item} value={item}>
                {statusLabels[item]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`${styles.primary} ${calendar.primary}`}
          onClick={() => {
            setStart(current);
            setEnd(current);
            setReason("");
            setBlock(true);
          }}
        >
          <LuPlus /> Bloquear período
        </button>
      </div>
      {mode === "list" ? (
        <div className={styles.calendarList}>
          {records.length ? (
            [...records]
              .sort(
                (a, b) =>
                  a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
              )
              .map((visit) => (
                <article className={styles.card} key={visit.id}>
                  <div className={styles.calendarListDate}>
                    <LuCalendarDays aria-hidden="true" />
                    <time dateTime={visit.date}>
                      {fullDate.format(dateAt(visit.date))}
                    </time>
                  </div>
                  {visitButton(visit)}
                </article>
              ))
          ) : (
            <p>Nenhuma reserva no período.</p>
          )}
        </div>
      ) : (
        <div className={`${styles.calendar} ${calendar.monthGrid}`}>
          {weekdays.map((day) => (
            <strong key={day}>
              <span>{day}</span>
              <abbr title={day}>{day.slice(0, 3)}</abbr>
            </strong>
          ))}
          {visibleDays.map((day) => {
            const offered = dashboard.config.dates.includes(day);
            const removed = offered && !draft.dates.includes(day);
            const outsideMonth = !day.startsWith(currentMonth);
            const dayVisits = records.filter(({ date }) => date === day);
            const dayLabel = (
              <time
                className={styles.calendarDate}
                dateTime={day}
                aria-current={day === currentDay ? "date" : undefined}
              >
                <span>{Number(day.slice(-2))}</span>
                {outsideMonth && (
                  <small>
                    {shortMonth.format(dateAt(day)).replace(".", "")}
                  </small>
                )}
              </time>
            );
            return (
              <article
                key={day}
                className={styles.calendarDay}
                data-offered={offered}
                data-blocked={removed}
                data-adjacent-month={outsideMonth}
                aria-label={fullDate.format(dateAt(day))}
              >
                {dayVisits.length === 1 ? (
                  <button
                    className={calendar.reservedDate}
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`Abrir reserva de ${fullDate.format(dateAt(day))}`}
                    onClick={() => setSelectedVisitId(dayVisits[0].id)}
                  >
                    {dayLabel}
                  </button>
                ) : (
                  dayLabel
                )}
                {removed && (
                  <p
                    className={styles.calendarBlocked}
                    title="Bloqueio no rascunho"
                  >
                    <LuBan aria-hidden="true" /> Bloqueado
                  </p>
                )}
                {!removed && availableDays.has(day) && (
                  <button
                    type="button"
                    className={styles.calendarHoursButton}
                    aria-haspopup="dialog"
                    aria-label={`Ver horários de ${fullDate.format(dateAt(day))}`}
                    onClick={() => setHoursDate(day)}
                  >
                    <LuClock aria-hidden="true" />
                    <span>Ver horários</span>
                  </button>
                )}
                {dayVisits.map(visitButton)}
              </article>
            );
          })}
        </div>
      )}
      <div className={calendar.legend} aria-label="Legenda do calendário">
        <strong>Legenda:</strong>
        <span data-tone="confirmed">Reserva aprovada</span>
        <span data-tone="pending">Reserva em análise</span>
        <span data-tone="blocked">Período bloqueado</span>
        <span data-tone="offered">Período da campanha</span>
      </div>
      {selectedVisit && (
        <CampaignDialog
          id="locomotiva-calendar-reservation-drawer"
          title="Detalhes da reserva"
          className={calendar.reservationDrawer}
          onClose={() => setSelectedVisitId(null)}
        >
          <div className={calendar.drawerProfile}>
            <VisitAvatar visit={selectedVisit} size={68} />
            <div>
              <strong>{selectedVisit.name}</strong>
              <p>@{selectedVisit.instagram.replace(/^@/, "")}</p>
            </div>
          </div>
          <dl className={calendar.drawerFacts}>
            <div>
              <dt>
                <LuCalendarDays aria-hidden="true" /> Data
              </dt>
              <dd>
                <time dateTime={selectedVisit.date}>
                  {fullDate.format(dateAt(selectedVisit.date))}
                </time>
              </dd>
            </div>
            <div>
              <dt>
                <LuClock aria-hidden="true" /> Horário
              </dt>
              <dd>{selectedVisit.time}</dd>
            </div>
            <div>
              <dt>Situação da reserva</dt>
              <dd>
                <span
                  className={calendar.statusBadge}
                  data-status={selectedVisit.status}
                >
                  {visitStatus(selectedVisit.status)}
                </span>
              </dd>
            </div>
          </dl>
          <div className={calendar.drawerActions}>
            <button
              id="locomotiva-calendar-open-registration"
              className={`${styles.primary} ${calendar.primary}`}
              type="button"
              onClick={() => openSelectedVisit()}
            >
              Abrir ficha da reserva
            </button>
            {allowedActions.length > 0 && (
              <div
                className={calendar.quickActions}
                role="group"
                aria-label="Ações da reserva"
              >
                {allowedActions.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    id={`locomotiva-calendar-reservation-${id}`}
                    className={calendar.quickAction}
                    data-action={id}
                    data-tooltip={label}
                    type="button"
                    aria-label={label}
                    disabled={busy}
                    onClick={() => openSelectedVisit(id)}
                  >
                    <Icon aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </CampaignDialog>
      )}
      {hoursDate && (
        <CampaignDialog
          id="locomotiva-calendar-hours"
          title="Horários disponíveis"
          onClose={() => setHoursDate(null)}
        >
          <div className={styles.stack}>
            <p className={styles.calendarListDate}>
              <LuCalendarDays aria-hidden="true" />
              <time dateTime={hoursDate}>
                {fullDate.format(dateAt(hoursDate))}
              </time>
            </p>
            {selectedHours ? (
              (["lunch", "dinner"] as const)
                .filter((period) => selectedHours[period].length > 0)
                .map((period) => (
                  <section className={styles.card} key={period}>
                    <h3>{period === "lunch" ? "Almoço" : "Jantar"}</h3>
                    <ul className={styles.calendarSlots}>
                      {selectedHours[period].map((hour) => (
                        <li key={hour}>
                          <time dateTime={`${hoursDate}T${hour}`}>{hour}</time>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
            ) : (
              <p>Não há horários disponíveis para esta data.</p>
            )}
          </div>
        </CampaignDialog>
      )}
      {block && (
        <CampaignDialog
          id="locomotiva-calendar-block"
          title="Bloquear disponibilidade"
          busy={busy}
          onClose={() => setBlock(false)}
        >
          <form
            className={styles.stack}
            onSubmit={(submission) => {
              submission.preventDefault();
              void saveBlock();
            }}
          >
            <div className={calendar.blockDates}>
              <label>
                Data de início
                <input
                  type="date"
                  required
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              </label>
              <label>
                Data de término
                <input
                  type="date"
                  min={start}
                  required
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </label>
            </div>
            <p className={calendar.blockNotice}>
              Bloqueio de dia inteiro. Entra em vigor quando o rascunho for
              publicado.
            </p>
            <label>
              Motivo do bloqueio
              <input
                id="locomotiva-calendar-block-reason"
                maxLength={500}
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {!!conflicts.length && (
              <div role="alert">
                <strong>Resolva as reservas afetadas antes de bloquear.</strong>
                <ul>
                  {conflicts.map((visit) => (
                    <li key={visit.id}>
                      {visit.name} · {visit.date} {visit.time}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p>{blocks.length} datas selecionadas no rascunho.</p>
            <div className={calendar.blockActions}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setBlock(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`${styles.primary} ${calendar.primary}`}
                disabled={
                  busy || !blocks.length || !!conflicts.length || !reason.trim()
                }
              >
                Salvar bloqueio no rascunho
              </button>
            </div>
          </form>
        </CampaignDialog>
      )}
    </section>
  );
}
