import { useState } from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuEye,
  LuUtensils,
} from "react-icons/lu";
import type { CampaignConfig, Registration } from "./types";
import styles from "./CampaignSettings.module.css";

const monthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export default function CampaignBookingPreview({
  draft,
  registrations,
}: {
  draft: CampaignConfig;
  registrations: Registration[];
}) {
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [continued, setContinued] = useState(false);
  const [previewTime] = useState(Date.now);
  const visibleMonth =
    month || (draft.dates[0] ?? new Date().toISOString()).slice(0, 7);
  const firstDay = new Date(visibleMonth + "-01T00:00:00Z");
  const days = new Date(
    Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const occupied = new Set(
    registrations
      .filter(({ status }) =>
        ["PENDING", "CONFIRMED", "ATTENDED", "ABSENT"].includes(status),
      )
      .map((item) => item.date),
  );
  const cutoff = previewTime + draft.minimumHours * 3600000;
  const times = [...draft.lunch, ...draft.dinner];
  const availableTimes = (day: string) =>
    times.filter((slot) => Date.parse(`${day}T${slot}:00-03:00`) >= cutoff);
  const selectedDate =
    draft.dates.includes(date) &&
    !occupied.has(date) &&
    availableTimes(date).length
      ? date
      : "";
  const slots = selectedDate ? availableTimes(selectedDate) : [];
  function moveMonth(offset: number) {
    setMonth(
      new Date(
        Date.UTC(firstDay.getUTCFullYear(), firstDay.getUTCMonth() + offset, 1),
      )
        .toISOString()
        .slice(0, 7),
    );
  }
  return (
    <div className={styles.previewPanel}>
      <h3>
        <LuEye aria-hidden="true" /> Prévia do influenciador{" "}
        <small>Simulação</small>
      </h3>
      <div className={styles.document}>
        <p>
          <LuUtensils aria-hidden="true" />{" "}
          <strong>{String(draft.restaurantName || "Locomotiva")}</strong>
        </p>
        <h4>Reserve sua experiência</h4>
        <div className={styles.previewMonth}>
          <button
            type="button"
            aria-label="Mês anterior na prévia"
            onClick={() => moveMonth(-1)}
          >
            <LuChevronLeft />
          </button>
          <strong aria-live="polite">{monthFormat.format(firstDay)}</strong>
          <button
            type="button"
            aria-label="Próximo mês na prévia"
            onClick={() => moveMonth(1)}
          >
            <LuChevronRight />
          </button>
        </div>
        <div className={styles.calendar}>
          {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((day) => (
            <small key={day}>{day}</small>
          ))}
          {Array.from({ length: firstDay.getUTCDay() }, (_, index) => (
            <span key={index} />
          ))}
          {Array.from({ length: days }, (_, index) => {
            const day = `${visibleMonth}-${String(index + 1).padStart(2, "0")}`;
            const status = occupied.has(day)
              ? "Ocupado"
              : draft.dates.includes(day) && availableTimes(day).length
                ? "Disponível"
                : "Bloqueado";
            return (
              <button
                key={day}
                type="button"
                data-booking-preview-state={status}
                disabled={status !== "Disponível"}
                aria-label={`${day}, ${status}`}
                aria-pressed={day === selectedDate}
                onClick={() => {
                  setDate(day);
                  setTime("");
                  setContinued(false);
                }}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
        <p className={styles.previewLegend}>Disponível · Ocupado · Bloqueado</p>
        {selectedDate && (
          <>
            <strong>
              {dayFormat.format(new Date(selectedDate + "T00:00:00Z"))}
            </strong>
            <div className={styles.actions} aria-label="Horários da simulação">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={time === slot}
                  onClick={() => {
                    setTime(slot);
                    setContinued(false);
                  }}
                >
                  {slot}
                </button>
              ))}
            </div>
          </>
        )}
        <button
          className={styles.activationButton}
          type="button"
          disabled={!selectedDate || !slots.includes(time)}
          onClick={() => setContinued(true)}
        >
          Continuar reserva
        </button>
        {continued && selectedDate && slots.includes(time) && (
          <p role="status">
            Simulação concluída para{" "}
            {dayFormat.format(new Date(selectedDate + "T00:00:00Z"))} às {time}.
          </p>
        )}
      </div>
      <div className={styles.document}>
        <h3>Como funciona</h3>
        <ol>
          <li>O influenciador escolhe data e horário.</li>
          <li>A solicitação aguarda aprovação.</li>
          <li>A equipe aprova ou recusa a participação.</li>
        </ol>
      </div>
    </div>
  );
}
