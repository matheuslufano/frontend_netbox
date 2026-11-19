import { useState } from "react";
import type { CampaignConfig } from "./types";
import styles from "./CampaignSettings.module.css";

const events = {
  RECEIVED: "Solicitação recebida",
  CONFIRMED: "Reserva aprovada",
  REJECTED: "Solicitação recusada",
  UPDATED: "Visita atualizada",
  CANCELLED: "Reserva cancelada",
};
const example = {
  nome: "Marina",
  data: "23/11/2026",
  horario: "12:00",
  endereco: "Endereço de exemplo",
  voucher: "R$ 200,00",
};

export default function CampaignMessageEditor({
  draft,
  onChange,
}: {
  draft: CampaignConfig;
  onChange: (key: string, value: string) => void;
}) {
  const [event, setEvent] = useState<keyof typeof events>("RECEIVED");
  const key = `message${event}`;
  const template = String(draft[key] ?? "");
  return (
    <div className={styles.document} id="locomotiva-settings-message-editor">
      <label>
        Evento
        <select
          id="locomotiva-settings-message-event"
          value={event}
          onChange={(change) =>
            setEvent(change.target.value as keyof typeof events)
          }
        >
          {Object.entries(events).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <p>Canal · E-mail</p>
      <label>
        Mensagem adicional
        <textarea
          id="locomotiva-settings-message-text"
          rows={5}
          maxLength={4000}
          value={template}
          onChange={(change) => onChange(key, change.target.value)}
        />
      </label>
      <small>
        Variáveis disponíveis:{" "}
        {Object.keys(example)
          .map((name) => `{{${name}}}`)
          .join(", ")}
        . O sistema mantém o protocolo e as informações da visita no e-mail.
      </small>
      <details>
        <summary>Prévia com dados fictícios</summary>
        <p className={styles.preview}>
          {template.replace(
            /\{\{(nome|data|horario|endereco|voucher)\}\}/g,
            (_, token: keyof typeof example) => example[token],
          ) || "O e-mail usará somente a mensagem padrão."}
        </p>
      </details>
    </div>
  );
}
