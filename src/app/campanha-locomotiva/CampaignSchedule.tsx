import { useState } from "react";
import { LuChevronLeft, LuChevronRight, LuPlus, LuX } from "react-icons/lu";
import type { CampaignConfig, Registration } from "./types";
import styles from "./CampaignSettings.module.css";

const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const occupying = new Set(["PENDING", "CONFIRMED", "ATTENDED", "ABSENT"]);
type Period = "lunch" | "dinner";

function ArrivalTimes({ period, times, onChange }: { period: Period; times: string[]; onChange: (times: string[]) => void }) {
  const [enabled, setEnabled] = useState(times.length > 0);
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const lunch = period === "lunch";
  const min = lunch ? "11:00" : "18:00";
  const max = lunch ? "15:00" : "23:00";
  const id = `locomotiva-settings-${period}`;
  function addTime() {
    if (!time || time < min || time >= max) {
      setError(`Escolha um horário a partir de ${min} e antes de ${max}.`);
      return;
    }
    if (times.includes(time)) {
      setError("Esse horário já foi adicionado.");
      return;
    }
    onChange([...times, time].sort());
    setTime("");
    setError("");
  }
  return <fieldset id={id} tabIndex={-1}>
    <legend>{lunch ? "Almoço" : "Jantar"}</legend>
    <label><input id={`${id}-enabled`} type="checkbox" checked={enabled} onChange={(event) => {
      setEnabled(event.target.checked);
      setError("");
      if (!event.target.checked) onChange([]);
    }} /> Ativar período</label>
    {enabled && <>
      <label>Horário de chegada <input id={`${id}-time`} type="time" min={min} value={time} onChange={(event) => { setTime(event.target.value); setError(""); }} /></label>
      <button type="button" onClick={addTime}><LuPlus /> Adicionar horário</button>
      {error && <p role="alert">{error}</p>}
      <div className={styles.actions}>{times.map((value) => <button key={value} type="button" aria-label={`Remover ${value}`} onClick={() => onChange(times.filter((item) => item !== value))}>{value} <LuX /></button>)}</div>
    </>}
  </fieldset>;
}

export function CampaignDateCalendar({ selectedDates, registrations, onChange, id, disabled }: {
  selectedDates: string[];
  registrations: Registration[];
  onChange: (dates: string[]) => void;
  id: string;
  disabled?: boolean;
}) {
  const occupied = new Set(registrations.filter((item) => occupying.has(item.status)).map((item) => item.date));
  const [month, setMonth] = useState(() => (selectedDates[0] ?? new Date().toISOString()).slice(0, 7));
  const [pendingDates, setPendingDates] = useState<string[] | null>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthDates = Array.from({ length: days }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
  function moveMonth(offset: number) {
    const target = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
    if (target.getUTCFullYear() >= 1000 && target.getUTCFullYear() <= 9999) setMonth(target.toISOString().slice(0, 7));
  }
  function select(next: string[]) {
    if ([...occupied].some((date) => selectedDates.includes(date) !== next.includes(date))) setPendingDates(next);
    else {
      setPendingDates(null);
      onChange(next);
    }
  }
  return (
    <fieldset id={id} tabIndex={-1} disabled={disabled}>
      <legend>Calendário de visitas · obrigatório</legend>
      <div className={styles.actions}>
        <button type="button" aria-label="Mês anterior" onClick={() => moveMonth(-1)}><LuChevronLeft aria-hidden="true" /></button>
        <strong aria-live="polite">{monthLabel.format(first)}</strong>
        <button type="button" aria-label="Próximo mês" onClick={() => moveMonth(1)}><LuChevronRight aria-hidden="true" /></button>
        <label>Ir para mês <input id={`${id}-month`} type="month" min="1000-01" max="9999-12" value={month} onChange={(event) => {
          if (/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(event.target.value)) setMonth(event.target.value);
        }} /></label>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={() => select([...new Set([...selectedDates, ...monthDates])].sort())}>Selecionar este mês</button>
        <button type="button" onClick={() => select([])}>Limpar seleção</button>
      </div>
      <div className={styles.calendar}>
      {weekDays.map((day) => <small key={day}>{day}</small>)}
      {Array.from({ length: first.getUTCDay() }, (_, index) => <span key={index} aria-hidden="true" />)}
      {monthDates.map((date) => <button key={date} type="button" id={`${id}-day-${date}`} aria-label={`${date.split("-").reverse().join("/")}${occupied.has(date) ? ", ocupada" : ""}`} aria-pressed={selectedDates.includes(date)} onClick={() => select(selectedDates.includes(date) ? selectedDates.filter((day) => day !== date) : [...selectedDates, date].sort())}>
        <span>{Number(date.slice(-2))}</span>{occupied.has(date) && <small aria-hidden="true">●</small>}
      </button>)}</div>
      <p aria-live="polite">{selectedDates.length} datas selecionadas • Até 1 influenciador por dia.</p>
      {pendingDates && <div role="alert">
        <p>Esta alteração inclui uma data ocupada. A solicitação ou reserva existente será mantida. A oferta da data muda apenas na publicação.</p>
        <button type="button" onClick={() => { onChange(pendingDates); setPendingDates(null); }}>Aplicar seleção</button>
        <button type="button" onClick={() => setPendingDates(null)}>Cancelar</button>
      </div>}
    </fieldset>
  );
}

export default function CampaignSchedule({ draft, registrations, update }: {
  draft: CampaignConfig;
  registrations: Registration[];
  update: (key: string, value: string[] | number) => void;
}) {
  return <>
    <CampaignDateCalendar id="locomotiva-settings-dates" selectedDates={draft.dates} registrations={registrations} onChange={(selected) => update("dates", selected)} />
    <p>Estes são os horários em que o influenciador poderá chegar. Eles aparecerão como opções no formulário.</p>
    <div className={styles.shortFields}>
      {(["lunch", "dinner"] as const).map((period) => <ArrivalTimes key={period} period={period} times={draft[period]} onChange={(value) => update(period, value)} />)}
    </div>
    <label>Com quanto tempo de antecedência a visita pode ser solicitada? (horas)
      <input id="locomotiva-settings-minimumHours" type="number" min={0} max={720} value={draft.minimumHours} onChange={(event) => update("minimumHours", Number(event.target.value))} />
      <small>Com 24 horas de antecedência, uma visita amanhã às 12h poderá ser solicitada até hoje às 12h.</small>
    </label>
  </>;
}
