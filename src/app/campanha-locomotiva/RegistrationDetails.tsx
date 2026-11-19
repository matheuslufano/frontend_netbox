"use client";
import Image from "next/image";
import { useState } from "react";
import { LuSave, LuX, LuMail } from "react-icons/lu";
import type { Registration, CampaignConfig } from "./types";
import { statusLabels } from "./types";
import styles from "./campaign.module.css";
export default function RegistrationDetails({
  record,
  config,
  busy,
  onClose,
  onSave,
  onRetry,
}: {
  record: Registration;
  config: CampaignConfig;
  busy: boolean;
  onClose: () => void;
  onSave: (data: Registration & { reason: string }) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
}) {
  const { cpfFull, ...editableRecord } = record;
  const [draft, setDraft] = useState(editableRecord),
    [reason, setReason] = useState("");
  const cpf = cpfFull?.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") ?? record.cpf;
  const transitions: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"],
    CONFIRMED: ["CANCELLED", "ATTENDED", "ABSENT"],
    REJECTED: [],
    CANCELLED: [],
    ATTENDED: [],
    ABSENT: [],
  };
  return (
    <section
      id="locomotiva-registration-details"
      className={styles.panel}
      aria-label={`Cadastro de ${record.name}`}
    >
      <div className={styles.heading}>
        <h2>{record.name}</h2>
        <button onClick={onClose} aria-label="Fechar detalhes">
          <LuX />
        </button>
      </div>
      {record.photo && (
        <Image
          unoptimized
          src={record.photo}
          alt={`Foto enviada por ${record.name}`}
          width={80}
          height={80}
        />
      )}
      <dl id="locomotiva-registration-participant-data" className={styles.fields}>
        <div><dt>Nome completo</dt><dd>{record.name}</dd></div>
        <div><dt>CPF</dt><dd id="locomotiva-registration-cpf">{cpf}</dd></div>
        <div><dt>E-mail</dt><dd>{record.email}</dd></div>
        <div><dt>WhatsApp</dt><dd>{record.phone}</dd></div>
        <div><dt>Cidade</dt><dd>{record.city}</dd></div>
        <div><dt>UF</dt><dd>{record.uf}</dd></div>
        <div><dt>Instagram</dt><dd><a href={record.profileUrl} target="_blank" rel="noreferrer">@{record.instagram}</a></dd></div>
        <div><dt>Link informado</dt><dd><a href={record.profileUrl} target="_blank" rel="noreferrer">{record.profileUrl}</a></dd></div>
        <div><dt>Protocolo</dt><dd>{record.id}</dd></div>
        {record.createdAt && <div><dt>Solicitação enviada em</dt><dd>{new Date(record.createdAt).toLocaleString("pt-BR")}</dd></div>}
      </dl>
      <p>
        Foto:{" "}
        {record.photoState === "MANUAL"
          ? "Enviada pelo participante"
          : "Indisponível — imagem padrão"}
        . Perfil declarado pelo participante; titularidade não verificada.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({ ...draft, reason });
        }}
      >
        <div className={styles.fields}>
          <label>
            Situação da reserva
            <select
              id="locomotiva-reservation-status"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              {[record.status, ...transitions[record.status]].map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data
            <select
              id="locomotiva-reservation-date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            >
              {Array.from(new Set([record.date, ...config.dates])).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Período
            <select
              id="locomotiva-reservation-period"
              value={draft.period}
              onChange={(e) =>
                setDraft({ ...draft, period: e.target.value, time: "" })
              }
            >
              <option value="lunch">Almoço</option>
              <option value="dinner">Jantar</option>
            </select>
          </label>
          <label>
            Horário
            <select
              id="locomotiva-reservation-time"
              required
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            >
              <option value="">Selecione</option>
              {Array.from(
                new Set([
                  record.time,
                  ...(draft.period === "lunch" ? config.lunch : config.dinner),
                ]),
              ).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Observações internas
            <textarea
              id="locomotiva-internal-notes"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
          <label>
            Motivo da alteração
            <textarea
              id="locomotiva-change-reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </div>
        <h3>
          Entrega de conteúdo ·{" "}
          {record.modality === "STORIES"
            ? "4 Stories"
            : "1 Reels de 60 segundos"}
        </h3>
        <label>
          Links das publicações (um por linha)
          <textarea
            id="locomotiva-content-links"
            rows={4}
            value={draft.content.links.join("\n")}
            onChange={(e) =>
              setDraft({
                ...draft,
                content: {
                  ...draft.content,
                  links: e.target.value.split("\n"),
                },
              })
            }
          />
        </label>
        <label>
          Observações da entrega
          <textarea
            id="locomotiva-content-notes"
            value={draft.content.notes}
            onChange={(e) =>
              setDraft({
                ...draft,
                content: { ...draft.content, notes: e.target.value },
              })
            }
          />
        </label>
        <label className={styles.check}>
          <input
            id="locomotiva-content-checked"
            type="checkbox"
            checked={draft.content.checked}
            onChange={(e) =>
              setDraft({
                ...draft,
                content: { ...draft.content, checked: e.target.checked },
              })
            }
          />
          Conteúdo entregue e conferido pela equipe
        </label>
        <button id="locomotiva-registration-save" disabled={busy}>
          <LuSave />
          Salvar alterações
        </button>
      </form>
      <h3>E-mails</h3>
      <p>
        “Enviado” significa aceito pelo serviço, sem comprovação de entrega ao
        destinatário. Aprovação com falha de e-mail exige reenvio.
      </p>
      {record.emails?.map((email) => (
        <article key={email.id} className={styles.history}>
          <strong>
            {email.kind} ·{" "}
            {{
              PENDING: "Na fila",
              SENDING: "Processando / resultado incerto",
              SENT: "Enviado ao serviço",
              FAILED: "Falhou",
              SUPERSEDED: "Substitu?do por comunica??o mais recente",
            }[email.state] || email.state}
          </strong>
          <p>
            {email.attempts} tentativa(s) · {email.lastError}
          </p>
          <button disabled={busy} onClick={() => void onRetry(email.id)}>
            <LuMail />
            Reenviar comunicação
          </button>
        </article>
      ))}
      <details>
        <summary>
          Histórico de aceites · versão {record.acceptance.revision}
        </summary>
        <p>
          {new Date(record.acceptance.at).toLocaleString("pt-BR")} · três
          controles aceitos individualmente.
        </p>
        {Object.entries(record.acceptance.terms).map(([key, value]) => (
          <p key={key}>
            <strong>{key}</strong>:{" "}
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </p>
        ))}
      </details>
      <details>
        <summary>Histórico de alterações</summary>
        {record.history?.map((h) => (
          <p key={h.id}>
            {new Date(h.at).toLocaleString("pt-BR")} · Autor {h.actor} ·{" "}
            {h.action}
            <br />
            {h.reason}
          </p>
        ))}
      </details>
    </section>
  );
}
