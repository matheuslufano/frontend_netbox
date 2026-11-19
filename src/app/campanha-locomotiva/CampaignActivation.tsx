import { useEffect, useState } from "react";
import {
  LuCalendarDays,
  LuCheck,
  LuChevronRight,
  LuCircle,
  LuFileText,
  LuGift,
  LuInfo,
  LuLink,
  LuLock,
  LuPause,
  LuPlay,
  LuSave,
  LuSquare,
  LuTriangleAlert,
  LuUsers,
} from "react-icons/lu";
import CampaignDialog from "./CampaignDialog";
import workspace from "./CampaignWorkspace.module.css";
import { CampaignDateCalendar } from "./CampaignSchedule";
import { campaignSettingsFieldLabels } from "./CampaignSettings";
import {
  requiredDocumentApprovals,
  type CampaignConfig,
  type Dashboard,
} from "./types";
import settingsStyles from "./CampaignSettings.module.css";
import styles from "./CampaignActivation.module.css";

export type CampaignActivationAction =
  | { operation: "save"; version: number; config: CampaignConfig }
  | { operation: "publish-local"; version: number; dates: string[] }
  | {
      operation: "block-days";
      version: number;
      dates: string[];
      reason: string;
    }
  | { operation: "publish" | "close"; version: number };

const settingsFieldLink = (field: string) =>
  `?secao=settings&campo=${encodeURIComponent(field)}`;

const campaignStates = [
  { id: "draft", label: "Rascunho", icon: LuFileText },
  { id: "open", label: "Aberta", icon: LuPlay },
  { id: "paused", label: "Pausada", icon: LuPause },
  { id: "ended", label: "Encerrada", icon: LuSquare },
] as const;

function campaignState(config: CampaignConfig) {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Araguaina",
  }).format();
  if (
    config.revision &&
    config.dates.length &&
    config.dates.every((date) => date < today)
  )
    return campaignStates[3];
  if (config.published) return campaignStates[1];
  return campaignStates[config.revision ? 2 : 0];
}

export function CampaignActivationHeading({
  dashboard,
}: {
  dashboard?: Dashboard | null;
}) {
  const state = dashboard && campaignState(dashboard.config);
  return (
    <div className={styles.activationHeading}>
      <div className={workspace.row}>
        <h1 id="locomotiva-activation-title">Ativação da campanha</h1>
        {state && (
          <span className={styles.statePill} data-state={state.id}>
            {state.label}
          </span>
        )}
      </div>
      <p>Confira os requisitos antes de abrir as inscrições.</p>
    </div>
  );
}

const periodFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const formatDate = (date: string) => new Date(date + "T00:00:00Z");

export default function CampaignActivation({
  dashboard,
  busy,
  onAction,
  error,
}: {
  dashboard: Dashboard;
  busy: boolean;
  onAction: (action: CampaignActivationAction) => Promise<boolean | undefined>;
  error?: string;
}) {
  const {
    config,
    settings,
    registrations,
    missing,
    mailConfigured,
    localTestEnabled,
  } = dashboard;
  const draft = settings?.draft ?? config;
  const version = settings?.version ?? 0;
  const [editedDates, setEditedDates] = useState<{
    version: number;
    dates: string[];
  }>();
  const [confirmation, setConfirmation] = useState<"publish" | "close" | null>(
    null,
  );
  const savedDates =
    localTestEnabled && config.localTest ? config.dates : draft.dates;
  const dates =
    editedDates?.version === version ? editedDates.dates : savedDates;
  const changed =
    dates.length !== savedDates.length ||
    dates.some((date) => !savedDates.includes(date));
  const hasApprovedDocuments = requiredDocumentApprovals.every(
    (key) => settings?.reviews[key]?.status === "approved",
  );
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const hours = [...draft.lunch, ...draft.dinner];
  const availableHours = localTestEnabled && !hours.length ? ["11:30"] : hours;
  const futureSlot = dates.some((date) =>
    availableHours.some(
      (time) =>
        Date.parse(`${date}T${time}:00-03:00`) >=
        now + (localTestEnabled ? 0 : draft.minimumHours) * 3600000,
    ),
  );
  const canPublish =
    futureSlot &&
    (localTestEnabled ||
      (!changed && !missing.length && hasApprovedDocuments && mailConfigured));

  const [reviewed, setReviewed] = useState(false);
  const [copyResult, setCopyResult] = useState("");
  const publicLink = "https://locomotiva-six.vercel.app/campanha-locomotiva/";
  const checklist = [
    [
      "Dados do restaurante",
      "address",
      !missing.some((key) =>
        ["address", "contact", "approvedBy"].includes(key),
      ),
    ],
    ["Agenda e capacidade", "dates", futureSlot && !changed],
    [
      "Voucher e regras",
      "voucher",
      !missing.some((key) =>
        ["voucher", "companions", "excess", "balance", "cancellation"].includes(
          key,
        ),
      ),
    ],
    [
      "Conteúdo e entregas",
      "publication",
      !missing.some((key) => ["publication", "tags"].includes(key)),
    ],
    [
      "Documentos obrigatórios",
      "imageTerm",
      hasApprovedDocuments &&
        !missing.some((key) =>
          [
            "conditions",
            "imageTerm",
            "privacy",
            "imageChannels",
            "imagePurpose",
            "imageDuration",
            "imageEditing",
            "imagePromotion",
          ].includes(key),
        ),
    ],
    ["Canal de comunicação", "mail", mailConfigured],
  ] as const;
  const ready = checklist.filter(([, , completed]) => completed).length;
  function requestConfirmation(action: "publish" | "close") {
    setReviewed(false);
    setConfirmation(action);
  }
  async function confirm() {
    if (!confirmation || (confirmation === "publish" && !reviewed)) return;
    const result = await onAction(
      confirmation === "publish" && localTestEnabled
        ? { operation: "publish-local", version, dates }
        : { operation: confirmation, version },
    );
    if (result) {
      if (confirmation === "close" && changed)
        setEditedDates({ version: version + 1, dates });
      setConfirmation(null);
    }
  }

  const state = campaignState(config);
  const periodLabel = dates.length
    ? periodFormat.formatRange(formatDate(dates[0]), formatDate(dates.at(-1)!))
    : "Período não definido";
  const publishLabel = localTestEnabled
    ? "Ativar teste local"
    : config.published
      ? "Publicar alterações"
      : "Ativar campanha";
  const voucher = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(draft.voucherAmount ?? 200));

  return (
    <section
      id="locomotiva-activation"
      className={styles.activation}
      aria-labelledby="locomotiva-activation-title"
    >
      <section id="locomotiva-activation-readiness" className={styles.card}>
        <div className={styles.cardHeading}>
          <h2>Prontidão da campanha</h2>
          <span>
            {ready} de {checklist.length} requisitos concluídos
          </span>
        </div>
        <progress
          className={styles.progress}
          value={ready}
          max={checklist.length}
          aria-label="Prontidão da campanha"
        />
        <ul className={styles.checklist}>
          {checklist.map(([label, field, completed]) => (
            <li key={field}>
              <a
                href={settingsFieldLink(field)}
                className={styles.checklistLink}
                data-ready={completed}
              >
                {completed ? (
                  <LuCheck
                    className={styles.checkIcon}
                    aria-label="Concluído"
                  />
                ) : (
                  <LuTriangleAlert
                    className={styles.pendingIcon}
                    aria-label="Pendente"
                  />
                )}
                <strong>{label}</strong>
                {!completed && (
                  <span className={styles.reviewLabel}>
                    {field === "mail" ? "Configurar" : "Revisar"}
                  </span>
                )}
                <LuChevronRight
                  className={styles.checkChevron}
                  aria-hidden="true"
                />
              </a>
            </li>
          ))}
        </ul>
        {!localTestEnabled && missing.length > 0 && (
          <details
            id="locomotiva-activation-pending"
            className={styles.disclosure}
          >
            <summary>
              {missing.length === 1
                ? "Há 1 configuração pendente"
                : `Há ${missing.length} configurações pendentes`}
            </summary>
            <ul>
              {missing.map((field) => (
                <li key={field}>
                  <a
                    id={`locomotiva-activation-pending-${field}`}
                    href={settingsFieldLink(field)}
                  >
                    {campaignSettingsFieldLabels[field] ?? field}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section id="locomotiva-activation-publication" className={styles.card}>
        <h2>Publicação</h2>
        <div className={styles.publicationGrid}>
          <div className={styles.publicationOptions}>
            <div>
              <LuCircle className={styles.manualIcon} aria-hidden="true" />
              <span>
                <strong>Ativar manualmente</strong>
                <small>Abre as inscrições assim que você confirmar.</small>
              </span>
            </div>
            <div>
              <LuCircle aria-hidden="true" />
              <span>
                <strong>Agendar ativação</strong>
                <small>Agendamento indisponível nesta campanha.</small>
              </span>
            </div>
          </div>
          <div className={styles.publicLink}>
            <p>
              <LuLink aria-hidden="true" />{" "}
              <strong>Link público da campanha</strong>
            </p>
            {state.id === "open" ? (
              <div className={workspace.row}>
                <a href={publicLink} target="_blank" rel="noreferrer">
                  Abrir página pública
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(publicLink);
                      setCopyResult("Link copiado.");
                    } catch {
                      setCopyResult("Copie o endereço no link público.");
                    }
                  }}
                >
                  Copiar link
                </button>
                <span role="status">{copyResult}</span>
              </div>
            ) : (
              <p className={styles.lockedLink}>
                <LuLock aria-hidden="true" />{" "}
                {state.id === "paused"
                  ? "Inscrições pausadas"
                  : state.id === "ended"
                    ? "Período de inscrições encerrado"
                    : "Link disponível após publicação"}
              </p>
            )}
          </div>
        </div>
        {localTestEnabled && (
          <p className={styles.warning}>
            <LuInfo aria-hidden="true" /> Modo de teste local. Use dados
            fictícios. Nenhum e-mail será enviado.
          </p>
        )}
        <div className={styles.publicationActions}>
          <button
            id="locomotiva-activation-toggle"
            className={styles.primaryButton}
            type="button"
            disabled={busy || (!config.published && !canPublish)}
            onClick={() =>
              requestConfirmation(config.published ? "close" : "publish")
            }
          >
            {config.published ? "Pausar inscrições" : publishLabel}
          </button>
          {config.published && (
            <button
              id="locomotiva-activation-publish"
              type="button"
              disabled={busy || !canPublish}
              onClick={() => requestConfirmation("publish")}
            >
              {publishLabel}
            </button>
          )}
          {!canPublish && (
            <span>
              {!futureSlot
                ? "Selecione uma data com horário futuro."
                : changed
                  ? "Salve as datas para publicar."
                  : "Resolva as pendências acima."}
            </span>
          )}
        </div>
        <details id="locomotiva-activation-dates" className={styles.disclosure}>
          <summary>Datas disponíveis para visitas</summary>
          <CampaignDateCalendar
            id="locomotiva-activation-calendar"
            selectedDates={dates}
            registrations={registrations}
            disabled={busy}
            onChange={(selection) => {
              setEditedDates({ version, dates: selection });
              setConfirmation(null);
            }}
          />
          <div className={settingsStyles.actions}>
            <button
              id="locomotiva-activation-save-dates"
              type="button"
              disabled={!changed || busy}
              onClick={() =>
                void onAction({
                  operation: "save",
                  version,
                  config: { ...draft, dates },
                })
              }
            >
              <LuSave aria-hidden="true" /> Salvar datas
            </button>
            <span>
              {changed
                ? "Seleção ainda não salva"
                : "Seleção salva no rascunho"}
            </span>
          </div>
        </details>
      </section>

      <section id="locomotiva-activation-states" className={styles.card}>
        <h2>Estados da campanha</h2>
        <ul className={styles.stateList}>
          {campaignStates.map(({ id, label, icon: Icon }) => (
            <li
              key={id}
              className={styles.statePill}
              data-state={id}
              aria-current={state.id === id ? "true" : undefined}
            >
              <Icon aria-hidden="true" /> {label}
            </li>
          ))}
        </ul>
      </section>

      {confirmation && (
        <CampaignDialog
          id="locomotiva-activation-confirmation"
          title={
            confirmation === "publish"
              ? "Abrir inscrições?"
              : "Pausar inscrições?"
          }
          busy={busy}
          onClose={() => setConfirmation(null)}
        >
          <div className={styles.confirmation}>
            {confirmation === "publish" ? (
              <>
                {ready === checklist.length ? (
                  <p className={styles.readyMessage}>
                    <LuCheck className={styles.checkIcon} aria-hidden="true" />{" "}
                    Todos os requisitos concluídos
                  </p>
                ) : (
                  <p className={styles.warning}>
                    <LuInfo aria-hidden="true" />{" "}
                    {localTestEnabled
                      ? "Ativação restrita ao ambiente de teste."
                      : "Revise os requisitos de publicação."}
                  </p>
                )}
                <ul className={styles.confirmationFacts}>
                  <li>
                    <LuCalendarDays aria-hidden="true" /> {periodLabel}
                  </li>
                  <li>
                    <LuUsers aria-hidden="true" /> 1 influenciador por dia
                  </li>
                  <li>
                    <LuGift aria-hidden="true" /> Voucher {voucher}
                  </li>
                </ul>
                <p className={styles.modalInfo}>
                  <LuInfo aria-hidden="true" />{" "}
                  {localTestEnabled
                    ? "O formulário ficará disponível para testes locais."
                    : "O formulário público ficará disponível."}
                </p>
                <label className={styles.reviewCheck}>
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(event) => setReviewed(event.target.checked)}
                  />{" "}
                  Revisei as regras e os documentos
                </label>
              </>
            ) : (
              <p className={styles.modalInfo}>
                <LuInfo aria-hidden="true" /> Novas solicitações serão
                bloqueadas. Reservas existentes serão preservadas.
              </p>
            )}
            {error && (
              <p role="alert" className={styles.warning}>
                {error}
              </p>
            )}
            <div className={styles.confirmationActions}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                Voltar
              </button>
              <button
                id="locomotiva-activation-confirm"
                className={styles.primaryButton}
                type="button"
                disabled={
                  busy ||
                  (confirmation === "publish" && (!canPublish || !reviewed))
                }
                onClick={() => void confirm()}
              >
                {confirmation === "close" ? "Pausar" : publishLabel}
              </button>
            </div>
          </div>
        </CampaignDialog>
      )}
    </section>
  );
}
