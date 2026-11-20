import { useState } from "react";
import {
  LuCalendarDays,
  LuCalendarX,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuMoon,
  LuPlus,
  LuSun,
  LuX,
} from "react-icons/lu";
import type { CampaignConfig, Registration } from "./types";
import styles from "./CampaignSettings.module.css";

const monthLabel = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const occupying = new Set(["PENDING", "CONFIRMED", "ATTENDED", "ABSENT"]);
type Period = "lunch" | "dinner";

function periodTimes(period: Period) {
  const start = period === "lunch" ? 11 * 60 : 18 * 60;
  const end = period === "lunch" ? 15 * 60 : 23 * 60;
  return Array.from({ length: (end - start) / 30 }, (_, index) => {
    const minutes = start + index * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
}

function ArrivalTimes({
  period,
  times,
  onChange,
}: {
  period: Period;
  times: string[];
  onChange: (times: string[]) => void;
}) {
  const lunch = period === "lunch";
  const options = [...new Set([...periodTimes(period), ...times])].sort();
  const id = `locomotiva-settings-${period}`;
  const [rangeStart, setRangeStart] = useState(options[0]);
  const [rangeEnd, setRangeEnd] = useState(options.at(-1)!);
  const [customTime, setCustomTime] = useState("");
  const [error, setError] = useState("");
  const minimumTime = lunch ? "11:00" : "18:00";
  const maximumTime = lunch ? "15:00" : "23:00";

  function addRange() {
    const first = options.indexOf(rangeStart);
    const last = options.indexOf(rangeEnd);
    if (first < 0 || last < first) {
      setError("Escolha um intervalo v\u00e1lido para este per\u00edodo.");
      return;
    }
    onChange([...new Set([...times, ...options.slice(first, last + 1)])].sort());
    setError("");
  }

  function toggleTime(value: string) {
    onChange(
      times.includes(value)
        ? times.filter((time) => time !== value)
        : [...times, value].sort(),
    );
    setError("");
  }

  function addCustomTime() {
    if (!customTime || customTime < minimumTime || customTime >= maximumTime) {
      setError(`Escolha um hor\u00e1rio entre ${minimumTime} e antes de ${maximumTime}.`);
      return;
    }
    if (times.includes(customTime)) {
      setError("Esse hor\u00e1rio j\u00e1 est\u00e1 selecionado.");
      return;
    }
    onChange([...times, customTime].sort());
    setCustomTime("");
    setError("");
  }

  return (
    <fieldset id={id} className={styles.timeFieldset} tabIndex={-1}>
      <legend>{lunch ? "Hor\u00e1rios de almo\u00e7o" : "Hor\u00e1rios de jantar"}</legend>
      <p className={styles.scheduleHint}>
        {times.length
          ? `${times.length} hor\u00e1rio${times.length === 1 ? "" : "s"} selecionado${times.length === 1 ? "" : "s"}. Toque nos hor\u00e1rios para incluir ou remover.`
          : "Nenhum hor\u00e1rio selecionado. Escolha uma faixa ou toque nos hor\u00e1rios abaixo."}
      </p>
      <div className={styles.timeRange}>
        <label>
          De
          <select
            id={`${id}-range-start`}
            value={rangeStart}
            onChange={(event) => setRangeStart(event.target.value)}
          >
            {options.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          At&eacute;
          <select
            id={`${id}-range-end`}
            value={rangeEnd}
            onChange={(event) => setRangeEnd(event.target.value)}
          >
            {options.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <button
          id={`${id}-add-range`}
          type="button"
          className={styles.rangeAction}
          onClick={addRange}
        >
          <LuPlus aria-hidden="true" /> Adicionar faixa
        </button>
      </div>
      <div className={styles.customTime}>
        <label>
          Adicionar um hor\u00e1rio espec\u00edfico
          <input
            id={`${id}-custom-time`}
            type="time"
            min={minimumTime}
            max={lunch ? "14:59" : "22:59"}
            value={customTime}
            onChange={(event) => {
              setCustomTime(event.target.value);
              setError("");
            }}
          />
        </label>
        <button
          id={`${id}-add-custom-time`}
          type="button"
          onClick={addCustomTime}
        >
          <LuPlus aria-hidden="true" /> Adicionar hor\u00e1rio
        </button>
      </div>
      {error && <p role="alert" className={styles.scheduleError}>{error}</p>}
      <div className={styles.timeActions}>
        <button type="button" onClick={() => onChange(options)}>
          Selecionar todos
        </button>
        <button type="button" onClick={() => onChange([])} disabled={!times.length}>
          Limpar per&iacute;odo
        </button>
      </div>
      <div
        className={styles.timeGrid}
        role="group"
        aria-label={lunch ? "Hor\u00e1rios de almo\u00e7o" : "Hor\u00e1rios de jantar"}
      >
        {options.map((value) => (
          <button
            key={value}
            id={`${id}-time-${value.replace(":", "-")}`}
            type="button"
            aria-label={`${times.includes(value) ? "Remover" : "Selecionar"} hor\u00e1rio ${value}`}
            aria-pressed={times.includes(value)}
            onClick={() => toggleTime(value)}
          >
            {value}
            {times.includes(value) && <LuX aria-hidden="true" />}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CampaignDateCalendar({
  selectedDates,
  registrations,
  dailyCapacity = 1,
  onChange,
  id,
  disabled,
}: {
  selectedDates: string[];
  registrations: Registration[];
  dailyCapacity?: number;
  onChange: (dates: string[]) => void;
  id: string;
  disabled?: boolean;
}) {
  const occupied = new Set(
    registrations
      .filter((item) => occupying.has(item.status))
      .map((item) => item.date),
  );
  const [month, setMonth] = useState(() =>
    (selectedDates[0] ?? new Date().toISOString()).slice(0, 7),
  );
  const [pendingDates, setPendingDates] = useState<string[] | null>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthDates = Array.from(
    { length: days },
    (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`,
  );
  function moveMonth(offset: number) {
    const target = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
    if (target.getUTCFullYear() >= 1000 && target.getUTCFullYear() <= 9999)
      setMonth(target.toISOString().slice(0, 7));
  }
  function select(next: string[]) {
    if (
      [...occupied].some(
        (date) => selectedDates.includes(date) !== next.includes(date),
      )
    )
      setPendingDates(next);
    else {
      setPendingDates(null);
      onChange(next);
    }
  }
  return (
    <fieldset id={id} tabIndex={-1} disabled={disabled}>
      <legend>Calendário de visitas · obrigatório</legend>
      <div className={styles.actions}>
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => moveMonth(-1)}
        >
          <LuChevronLeft aria-hidden="true" />
        </button>
        <strong aria-live="polite">{monthLabel.format(first)}</strong>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => moveMonth(1)}
        >
          <LuChevronRight aria-hidden="true" />
        </button>
        <label>
          Ir para mês{" "}
          <input
            id={`${id}-month`}
            type="month"
            min="1000-01"
            max="9999-12"
            value={month}
            onChange={(event) => {
              if (/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(event.target.value))
                setMonth(event.target.value);
            }}
          />
        </label>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={() =>
            select([...new Set([...selectedDates, ...monthDates])].sort())
          }
        >
          Selecionar este mês
        </button>
        <button type="button" onClick={() => select([])}>
          Limpar seleção
        </button>
      </div>
      <div className={styles.calendar}>
        {weekDays.map((day) => (
          <small key={day}>{day}</small>
        ))}
        {Array.from({ length: first.getUTCDay() }, (_, index) => (
          <span key={index} aria-hidden="true" />
        ))}
        {monthDates.map((date) => (
          <button
            key={date}
            type="button"
            id={`${id}-day-${date}`}
            aria-label={`${date.split("-").reverse().join("/")}${occupied.has(date) ? ", ocupada" : ""}`}
            aria-pressed={selectedDates.includes(date)}
            onClick={() =>
              select(
                selectedDates.includes(date)
                  ? selectedDates.filter((day) => day !== date)
                  : [...selectedDates, date].sort(),
              )
            }
          >
            <span>{Number(date.slice(-2))}</span>
            {occupied.has(date) && <small aria-hidden="true">●</small>}
          </button>
        ))}
      </div>
      <p aria-live="polite">
        {selectedDates.length} datas selecionadas • Capacidade de {dailyCapacity} influenciador{dailyCapacity === 1 ? "" : "es"} por dia.
      </p>
      {pendingDates && (
        <div role="alert">
          <p>
            Esta alteração inclui uma data ocupada. A solicitação ou reserva
            existente será mantida. A oferta da data muda apenas na publicação.
          </p>
          <button
            type="button"
            onClick={() => {
              onChange(pendingDates);
              setPendingDates(null);
            }}
          >
            Aplicar seleção
          </button>
          <button type="button" onClick={() => setPendingDates(null)}>
            Cancelar
          </button>
        </div>
      )}
    </fieldset>
  );
}

export default function CampaignSchedule({
  draft,
  registrations,
  update,
}: {
  draft: CampaignConfig;
  registrations: Registration[];
  update: (key: string, value: string[] | number) => void;
}) {
  const [period, setPeriod] = useState<Period>("lunch");
  const [range, setRange] = useState<{ start: string; end: string }>();
  const [error, setError] = useState("");
  const start = range?.start ?? draft.dates[0] ?? "2026-11-21";
  const end = range?.end ?? draft.dates.at(-1) ?? "2026-11-30";
  function applyRange() {
    const from = Date.parse(start + "T00:00:00Z");
    const to = Date.parse(end + "T00:00:00Z");
    const length = (to - from) / 86400000 + 1;
    if (!Number.isInteger(length) || length < 1 || length > 366) {
      setError("Selecione um período válido de até 366 dias.");
      return;
    }
    const affected = registrations.filter(
      (item) =>
        occupying.has(item.status) &&
        draft.dates.includes(item.date) &&
        (item.date < start || item.date > end),
    );
    if (
      affected.length &&
      !window.confirm(
        `O período deixa de oferecer datas de ${affected.length} solicitações ou reservas existentes. Os registros serão preservados. Aplicar seleção?`,
      )
    )
      return;
    update(
      "dates",
      Array.from({ length }, (_, index) =>
        new Date(from + index * 86400000).toISOString().slice(0, 10),
      ),
    );
    setRange(undefined);
    setError("");
  }
  return (
    <>
      <div className={styles.agendaCard}>
        <h3>
          <LuCalendarDays aria-hidden="true" /> Período e capacidade
        </h3>
        <div className={styles.shortFields}>
          <label>
            Início da campanha
            <input
              id="locomotiva-settings-start-date"
              type="date"
              value={start}
              onChange={(event) => setRange({ start: event.target.value, end })}
            />
          </label>
          <label>
            Fim da campanha
            <input
              id="locomotiva-settings-end-date"
              type="date"
              value={end}
              onChange={(event) => setRange({ start, end: event.target.value })}
            />
          </label>
          <label>
            Capacidade diária (influenciadores por dia)
            <input
              id="locomotiva-settings-dailyCapacity"
              type="number"
              min={1}
              max={100}
              step={1}
              value={draft.dailyCapacity || 1}
              onChange={(event) =>
                update("dailyCapacity", Number(event.target.value))
              }
            />
          </label>
        </div>
        <button
          id="locomotiva-settings-apply-range"
          type="button"
          onClick={applyRange}
        >
          Selecionar dias do período
        </button>
        {error && <p role="alert">{error}</p>}
        <p>Solicitações em análise, reservas e visitas realizadas ocupam a capacidade do dia.</p>
      </div>
      <div className={styles.agendaCard}>
        <h3>
          <LuClock aria-hidden="true" /> Horários disponíveis
        </h3>
        <div className={styles.periodTabs} role="group" aria-label="Per\u00edodo da visita">
          <button id="locomotiva-settings-period-lunch" type="button" aria-pressed={period === "lunch"} onClick={() => setPeriod("lunch")}>
            <LuSun aria-hidden="true" /><span>Almo&#231;o</span><small>{draft.lunch.length} hor\u00e1rios</small>
          </button>
          <button id="locomotiva-settings-period-dinner" type="button" aria-pressed={period === "dinner"} onClick={() => setPeriod("dinner")}>
            <LuMoon aria-hidden="true" /><span>Jantar</span><small>{draft.dinner.length} hor\u00e1rios</small>
          </button>
        </div>
        {(["lunch", "dinner"] as const).map((item) => (
          <div key={item} hidden={period !== item}>
            <ArrivalTimes
              period={item}
              times={draft[item]}
              onChange={(value) => update(item, value)}
            />
          </div>
        ))}
      </div>
      <div className={styles.agendaCard}>
        <h3>
          <LuCalendarX aria-hidden="true" /> Exceções por data
        </h3>
        <p>Desmarque um dia para bloquear novas solicitações naquela data.</p>
        <CampaignDateCalendar
          id="locomotiva-settings-dates"
          selectedDates={draft.dates}
          registrations={registrations}
          dailyCapacity={draft.dailyCapacity || 1}
          onChange={(selected) => {
            setRange(undefined);
            update("dates", selected);
          }}
        />
      </div>
    </>
  );
}
