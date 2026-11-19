"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  LuSave,
  LuX,
  LuMail,
  LuCheck,
  LuTrash2,
  LuUserRound,
  LuCalendarDays,
  LuExternalLink,
  LuInstagram,
  LuHistory,
  LuFileText,
  LuVideo,
  LuMessageSquare,
  LuTicket,
  LuClock,
  LuHouse,
  LuChevronRight,
  LuMapPin,
  LuPhone,
  LuIdCard,
  LuEllipsis,
} from "react-icons/lu";
import type {
  Registration,
  CampaignConfig,
  ReservationQuickAction,
} from "./types";
import { statusLabels } from "./types";
import styles from "./campaign.module.css";
import layout from "./CampaignInfluencers.module.css";
export default function RegistrationDetails({
  record,
  initialAction,
  config,
  busy,
  onClose,
  onSave,
  onRetry,
  onDelete,
  error,
}: {
  record: Registration;
  initialAction?: ReservationQuickAction;
  config: CampaignConfig;
  busy: boolean;
  onClose: () => void;
  onSave: (data: Registration & { reason: string }) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  error?: string;
}) {
  const { cpfFull, ...editableRecord } = record;
  const [draft, setDraft] = useState(editableRecord),
    [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(
    initialAction === "reject" && record.status === "PENDING",
  );
  const [confirmApproval, setConfirmApproval] = useState(
    initialAction === "approve" && record.status === "PENDING",
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(
    initialAction === "delete" && !!onDelete,
  );
  const startReschedule =
    initialAction === "reschedule" &&
    ["PENDING", "CONFIRMED"].includes(record.status);
  const dialog = useRef<HTMLDialogElement>(null);
  const visitEditor = useRef<HTMLDetailsElement>(null);
  function editVisit() {
    if (!visitEditor.current) return;
    visitEditor.current.open = true;
    visitEditor.current
      .querySelector<HTMLElement>("#locomotiva-reservation-date")
      ?.focus();
  }
  useEffect(() => {
    const element = dialog.current;
    element?.show();
    if (startReschedule) editVisit();
    else if (initialAction) {
      element
        ?.querySelector<HTMLElement>(
          "#locomotiva-registration-approve-confirm, #locomotiva-rejection-reason, #locomotiva-registration-delete-confirm",
        )
        ?.focus();
    }
    return () => element?.close();
  }, [initialAction, startReschedule]);
  function approveReservation() {
    void onSave({
      ...editableRecord,
      status: "CONFIRMED",
      reason: "Participação aprovada no painel.",
    });
  }
  const cpf =
    cpfFull?.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") ??
    record.cpf;
  const transitions: Record<string, string[]> = {
    PENDING: ["CONFIRMED", "REJECTED", "CANCELLED"],
    CONFIRMED: ["CANCELLED", "ATTENDED", "ABSENT"],
    REJECTED: [],
    CANCELLED: [],
    ATTENDED: [],
    ABSENT: [],
  };
  return (
    <div
      id="locomotiva-registration-overlay"
      className={layout.registrationOverlay}
    >
      <dialog
        ref={dialog}
        id="locomotiva-registration-details"
        className={layout.registrationDialog}
        data-registration-view={
          rejecting
            ? "reject"
            : record.status === "PENDING"
              ? "review"
              : "details"
        }
        aria-labelledby="locomotiva-registration-details-title"
        onKeyDown={(event) => {
          if (event.key !== "Escape" || event.defaultPrevented) return;
          event.preventDefault();
          if (!busy) {
            if (rejecting) setRejecting(false);
            else onClose();
          }
        }}
      >
        <div className={layout.detailHeader}>
          <h2 id="locomotiva-registration-details-title">
            {rejecting ? (
              "Confirmar recusa"
            ) : (
              <>
                <LuHouse aria-hidden="true" />
                <LuChevronRight aria-hidden="true" />
                <span>Influenciadores</span>
                <span aria-hidden="true">/</span>
                <strong>{record.name}</strong>
              </>
            )}
          </h2>
          <button
            id="locomotiva-registration-close"
            type="button"
            disabled={busy}
            onClick={() => (rejecting ? setRejecting(false) : onClose())}
            aria-label="Fechar detalhes"
          >
            <LuX />
          </button>
        </div>
        {error && (
          <p role="alert" className={styles.alert}>
            {error}
          </p>
        )}
        {rejecting ? (
          <form
            id="locomotiva-rejection-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (rejectionReason.trim() && !busy)
                void onSave({
                  ...editableRecord,
                  status: "REJECTED",
                  reason: rejectionReason.trim(),
                });
            }}
          >
            <p>
              {record.name} · @{record.instagram}
            </p>
            <label>
              Motivo interno da recusa
              <textarea
                id="locomotiva-rejection-reason"
                rows={5}
                required
                maxLength={2000}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
              />
            </label>
            <p>
              O motivo fica na auditoria interna. O participante recebe o modelo
              de recusa publicado.
            </p>
            <div className={styles.registrationActions}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejecting(false)}
              >
                Voltar
              </button>
              <button
                type="submit"
                className={layout.primaryButton}
                disabled={busy || !rejectionReason.trim()}
              >
                Confirmar recusa
              </button>
            </div>
          </form>
        ) : (
          <div
            id="locomotiva-reservation-layout"
            className={layout.detailLayout}
          >
            <aside
              id="locomotiva-reservation-profile"
              className={layout.profileCard}
            >
              <div className={layout.registrationIdentity}>
                {record.photo ? (
                  <Image
                    unoptimized
                    src={record.photo}
                    alt={`Foto enviada por ${record.name}`}
                    width={176}
                    height={176}
                  />
                ) : (
                  <span className={layout.avatarPlaceholder}>
                    <LuUserRound aria-hidden="true" />
                  </span>
                )}
                <div className={layout.registrationIdentityName}>
                  <h3>{record.name}</h3>
                  <p>@{record.instagram}</p>
                </div>
                <a
                  className={layout.profileLink}
                  href={record.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <LuInstagram aria-hidden="true" /> Ver perfil no Instagram{" "}
                  <LuExternalLink aria-hidden="true" />
                </a>
              </div>

              <dl
                id="locomotiva-registration-participant-data"
                className={styles.fields}
              >
                <div>
                  <dt>
                    <LuMail aria-hidden="true" />{" "}
                    <span className={layout.registrationContactLabel}>
                      E-mail
                    </span>
                  </dt>
                  <dd>{record.email}</dd>
                </div>
                <div>
                  <dt>
                    <LuPhone aria-hidden="true" />{" "}
                    <span className={layout.registrationContactLabel}>
                      WhatsApp
                    </span>
                  </dt>
                  <dd>{record.phone}</dd>
                </div>
                <div>
                  <dt>
                    <LuMapPin aria-hidden="true" />{" "}
                    <span className={layout.registrationContactLabel}>
                      Localidade
                    </span>
                  </dt>
                  <dd>
                    {record.city} – {record.uf}
                  </dd>
                </div>
                <div>
                  <dt>
                    <LuIdCard aria-hidden="true" /> CPF
                  </dt>
                  <dd id="locomotiva-registration-cpf">{cpf}</dd>
                </div>
              </dl>
              <p
                className={layout.badge}
                data-tone={
                  record.status === "PENDING"
                    ? "amber"
                    : record.status === "CONFIRMED"
                      ? "green"
                      : "neutral"
                }
              >
                {statusLabels[record.status]}
              </p>
            </aside>
            <div className={layout.detailMain}>
              <section
                id="locomotiva-reservation-visit"
                className={layout.detailCard}
              >
                <h3>
                  <LuCalendarDays aria-hidden="true" /> Visita solicitada
                </h3>
                <div className={layout.visitSummary}>
                  <span>
                    <LuCalendarDays aria-hidden="true" />
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "long",
                      timeZone: "UTC",
                    }).format(new Date(record.date + "T00:00:00Z"))}
                  </span>
                  <span>
                    <LuClock aria-hidden="true" />
                    {record.period === "lunch" ? "Almoço" : "Jantar"} às{" "}
                    {record.time}
                  </span>
                  <span>
                    <LuVideo aria-hidden="true" />
                    {record.modality === "STORIES"
                      ? "4 Stories"
                      : "1 Reels de 60 segundos"}
                  </span>
                  <span>
                    <LuTicket aria-hidden="true" /> Voucher{" "}
                    <strong>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(
                        Number(record.acceptance.terms.voucherAmount ?? 200),
                      )}
                    </strong>
                  </span>
                </div>
                <div className={styles.registrationActions}>
                  {record.status === "PENDING" && !confirmApproval && (
                    <button
                      id="locomotiva-registration-approve"
                      className={layout.primaryButton}
                      type="button"
                      disabled={busy || confirmDelete}
                      onClick={approveReservation}
                    >
                      <LuCheck aria-hidden="true" /> Aprovar participação
                    </button>
                  )}
                  {record.status === "PENDING" && (
                    <button
                      id="locomotiva-registration-reject"
                      type="button"
                      disabled={busy || confirmDelete}
                      onClick={() => setRejecting(true)}
                    >
                      <LuX aria-hidden="true" /> Recusar
                    </button>
                  )}
                  {["PENDING", "CONFIRMED"].includes(record.status) && (
                    <button
                      id="locomotiva-registration-reschedule"
                      type="button"
                      disabled={busy || confirmDelete}
                      onClick={() => editVisit()}
                    >
                      <LuCalendarDays aria-hidden="true" /> Alterar data
                    </button>
                  )}
                  {onDelete && !confirmDelete && (
                    <button
                      id="locomotiva-registration-delete"
                      className={styles.registrationDeleteButton}
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirmDelete(true)}
                    >
                      <LuTrash2 aria-hidden="true" /> Excluir reserva
                    </button>
                  )}
                </div>
                {confirmApproval && (
                  <div className={styles.alert}>
                    <p>
                      Confirmar a participação de <strong>{record.name}</strong>{" "}
                      nesta visita?
                    </p>
                    <div className={styles.registrationActions}>
                      <button
                        id="locomotiva-registration-approve-confirm"
                        type="button"
                        className={layout.primaryButton}
                        disabled={busy}
                        onClick={approveReservation}
                      >
                        Confirmar aprovação
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmApproval(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {confirmDelete && (
                  <div
                    id="locomotiva-registration-delete-confirmation"
                    className={styles.alert}
                  >
                    <p>
                      Excluir definitivamente esta reserva do banco e liberar a
                      data? Essa ação não pode ser desfeita.
                    </p>
                    <div className={styles.registrationActions}>
                      <button
                        id="locomotiva-registration-delete-confirm"
                        className={styles.registrationDeleteButton}
                        type="button"
                        disabled={busy}
                        onClick={() => void onDelete?.()}
                      >
                        Confirmar exclusão
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmDelete(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                <details
                  ref={visitEditor}
                  id="locomotiva-reservation-edit"
                  className={layout.registrationVisitEditor}
                >
                  <summary>Editar visita e situação</summary>
                  <form
                    id="locomotiva-reservation-update"
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
                          onChange={(e) =>
                            setDraft({ ...draft, status: e.target.value })
                          }
                        >
                          {[
                            record.status,
                            ...(transitions[record.status] ?? []),
                          ].map((s) => (
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
                          onChange={(e) =>
                            setDraft({ ...draft, date: e.target.value })
                          }
                        >
                          {Array.from(
                            new Set([record.date, ...config.dates]),
                          ).map((d) => (
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
                            setDraft({
                              ...draft,
                              period: e.target.value,
                              time: "",
                            })
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
                          onChange={(e) =>
                            setDraft({ ...draft, time: e.target.value })
                          }
                        >
                          <option value="">Selecione</option>
                          {Array.from(
                            new Set([
                              record.time,
                              ...(draft.period === "lunch"
                                ? config.lunch
                                : config.dinner),
                            ]),
                          ).map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
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
                    <button type="submit" disabled={busy}>
                      <LuSave aria-hidden="true" /> Salvar alterações da visita
                    </button>
                  </form>
                </details>
              </section>
              <section
                id="locomotiva-reservation-terms"
                className={layout.detailCard}
              >
                <h3>
                  <LuFileText aria-hidden="true" /> Termos e autorizações
                </h3>
                <ul className={layout.documentList}>
                  {[
                    ["Condições de participação", record.acceptance.conditions],
                    [
                      "Autorização de uso de imagem e conteúdo",
                      record.acceptance.imageTerm,
                    ],
                    ["Aviso de privacidade", record.acceptance.privacy],
                  ]
                    .filter(([, document]) => document)
                    .map(([label, document]) => (
                      <li key={label}>
                        <details>
                          <summary>
                            <LuCheck aria-hidden="true" /> {label}{" "}
                            <small>
                              v. {record.acceptance.revision} · Aceito em{" "}
                              {new Date(
                                record.acceptance.at,
                              ).toLocaleDateString("pt-BR")}
                            </small>
                          </summary>
                          <p>{document}</p>
                        </details>
                      </li>
                    ))}
                </ul>
              </section>
              <section
                id="locomotiva-reservation-content"
                className={layout.detailCard}
              >
                <details className={layout.registrationDelivery}>
                  <summary>
                    <h3>
                      <LuVideo aria-hidden="true" /> Entrega de conteúdo{" "}
                      <small
                        className={layout.badge}
                        data-tone={record.content.checked ? "green" : "amber"}
                      >
                        {record.content.checked
                          ? "Conferido"
                          : record.status === "PENDING"
                            ? "Aguardando aprovação da visita"
                            : "Aguardando conferência"}
                      </small>
                    </h3>
                  </summary>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void onSave({
                        ...editableRecord,
                        content: draft.content,
                        reason: "Entrega de conteúdo atualizada no painel.",
                      });
                    }}
                  >
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
                            content: {
                              ...draft.content,
                              notes: e.target.value,
                            },
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
                            content: {
                              ...draft.content,
                              checked: e.target.checked,
                            },
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
                </details>
              </section>
            </div>
            <aside
              id="locomotiva-reservation-history"
              className={layout.detailCard}
            >
              <h3 className={layout.registrationHistorySummary}>
                <LuHistory aria-hidden="true" /> Histórico
              </h3>
              <ol className={layout.timeline}>
                {record.createdAt && (
                  <li>
                    <strong>Cadastro recebido</strong>
                    <time>
                      {new Date(record.createdAt).toLocaleString("pt-BR")}
                    </time>
                    <p>Inscrição enviada para a campanha.</p>
                  </li>
                )}
                <li>
                  <strong>Aceites registrados</strong>
                  <time>
                    {new Date(record.acceptance.at).toLocaleString("pt-BR")}
                  </time>
                  <p>Termos e autorizações aceitos.</p>
                </li>
                {record.emails
                  ?.filter((email) => email.state === "SENT" && email.sentAt)
                  .map((email) => (
                    <li key={email.id}>
                      <strong>
                        {email.kind === "RECEIVED"
                          ? "E-mail de recebimento enviado"
                          : "E-mail de atualização enviado"}
                      </strong>
                      <time>
                        {new Date(email.sentAt!).toLocaleString("pt-BR")}
                      </time>
                      <p>
                        Envio aceito pelo serviço de e-mail para {record.email}.
                      </p>
                    </li>
                  ))}
              </ol>
            </aside>
            <section
              id="locomotiva-reservation-notes"
              className={`${layout.detailCard} ${layout.notesCard}`}
            >
              <h3>
                <LuMessageSquare aria-hidden="true" /> Observações internas
              </h3>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void onSave({
                    ...editableRecord,
                    notes: draft.notes,
                    reason: "Observações internas atualizadas no painel.",
                  });
                }}
              >
                <textarea
                  id="locomotiva-internal-notes"
                  aria-label="Observações internas"
                  placeholder="Registre aqui observações da equipe."
                  value={draft.notes}
                  onChange={(event) =>
                    setDraft({ ...draft, notes: event.target.value })
                  }
                />
                <button
                  id="locomotiva-reservation-notes-save"
                  type="submit"
                  disabled={busy || draft.notes === record.notes}
                  className={layout.primaryButton}
                >
                  <LuSave aria-hidden="true" /> Salvar
                </button>
              </form>
            </section>
            <details
              id="locomotiva-registration-administrative-records"
              className={layout.registrationRecords}
            >
              <summary title="Dados e registros administrativos">
                <LuEllipsis aria-hidden="true" />
                <span className={layout.registrationContactLabel}>
                  Dados e registros administrativos
                </span>
              </summary>
              <details id="locomotiva-registration-profile-details">
                <summary>Mais dados do participante</summary>
                <dl>
                  <div>
                    <dt>Link informado</dt>
                    <dd>
                      <a
                        href={record.profileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {record.profileUrl}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt>Protocolo</dt>
                    <dd>{record.id}</dd>
                  </div>
                  {record.createdAt && (
                    <div>
                      <dt>Solicitação enviada em</dt>
                      <dd>
                        {new Date(record.createdAt).toLocaleString("pt-BR")}
                      </dd>
                    </div>
                  )}
                </dl>
                <p>
                  Foto:{" "}
                  {record.photoState === "MANUAL"
                    ? "Enviada pelo participante"
                    : "Indisponível — imagem padrão"}
                  . Perfil declarado pelo participante; titularidade não
                  verificada.
                </p>
              </details>
              <details id="locomotiva-registration-history-details">
                <summary>Mais registros do histórico</summary>
                <details>
                  <summary>Comunicações por e-mail</summary>
                  <p>
                    “Enviado” significa aceito pelo serviço, sem comprovação de
                    entrega ao destinatário. Aprovação com falha de e-mail exige
                    reenvio.
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
                          SUPERSEDED:
                            "Substituído por comunicação mais recente",
                        }[email.state] || email.state}
                      </strong>
                      <p>
                        {email.attempts} tentativa(s) · {email.lastError}
                      </p>
                      <button
                        disabled={busy}
                        onClick={() => void onRetry(email.id)}
                      >
                        <LuMail />
                        Reenviar comunicação
                      </button>
                    </article>
                  ))}
                </details>
                <details>
                  <summary>
                    Histórico de aceites · versão {record.acceptance.revision}
                  </summary>
                  <p>
                    {new Date(record.acceptance.at).toLocaleString("pt-BR")}
                  </p>
                  {Object.entries(record.acceptance.terms).map(
                    ([key, value]) => (
                      <p key={key}>
                        <strong>{key}</strong>:{" "}
                        {Array.isArray(value)
                          ? value.join(", ")
                          : String(value)}
                      </p>
                    ),
                  )}
                </details>
                <details>
                  <summary>Histórico de alterações</summary>
                  {record.history?.map((h) => (
                    <p key={h.id}>
                      {new Date(h.at).toLocaleString("pt-BR")} · Autor {h.actor}{" "}
                      · {h.action}
                      <br />
                      {h.reason}
                    </p>
                  ))}
                </details>
              </details>
            </details>
          </div>
        )}
      </dialog>
    </div>
  );
}
