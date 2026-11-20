"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  LuCalendarDays,
  LuEye,
  LuFileText,
  LuLayers,
  LuMail,
  LuSave,
  LuSend,
  LuSettings,
  LuShieldCheck,
  LuTicket,
  LuX,
} from "react-icons/lu";
import CampaignBookingPreview from "./CampaignBookingPreview";
import CampaignDialog from "./CampaignDialog";
import workspace from "./CampaignWorkspace.module.css";
import CampaignMessageEditor from "./CampaignMessageEditor";
import api, { getApiErrorMessage } from "@/lib/api";
import CampaignSchedule from "./CampaignSchedule";
import { starterConfiguration } from "./campaignStarterConfig";
import CampaignRuleFields from "./CampaignRuleFields";
import {
  activationOptionalDocumentFields,
  configLabels,
  requiredDocumentApprovals,
  type CampaignConfig,
  type Dashboard,
  type SettingsOperation,
} from "./types";
import styles from "./CampaignSettings.module.css";

const sections = [
  {
    id: "restaurant",
    title: "Geral",
    icon: LuSettings,
    fields: ["address", "contact"],
  },
  {
    id: "schedule",
    title: "Agenda e vagas",
    icon: LuCalendarDays,
    fields: ["dates", "arrivalTimes"],
  },
  {
    id: "voucher",
    title: "Voucher",
    icon: LuTicket,
    fields: ["voucher", "companions", "excess", "balance", "cancellation"],
  },
  {
    id: "content",
    title: "Conteúdo",
    icon: LuLayers,
    fields: ["publication", "tags"],
  },
  {
    id: "documents",
    title: "Termos e privacidade",
    icon: LuShieldCheck,
    fields: [
      "conditions",
      "imageTerm",
      "privacy",
      "imageChannels",
      "imagePurpose",
      "imageDuration",
      "imageEditing",
      "imagePromotion",
    ],
  },
  { id: "publication", title: "Mensagens", icon: LuMail, fields: ["mail"] },
];
const documents = ["conditions", "imageTerm", "privacy"];
const notes = /rascunho|\bminuta\b|\bpendente de\b|\ba confirmar\b|modelo para revis[aã]o/i;
const activationOptionalFields = new Set<string>(
  activationOptionalDocumentFields,
);
export const campaignSettingsFieldLabels: Record<string, string> = {
  ...configLabels,
  address: "Endereço da visita",
  contact: "Contato da campanha",
  dates: "Datas da campanha",
  arrivalTimes: "Horários de chegada",
  voucher: "Como utilizar o voucher",
  cancellation: "Cancelamento, reagendamento e ausência",
  conditions: "Regulamento da campanha",
  imageTerm: "Termo de autorização de uso de imagem",
  privacy: "Aviso de privacidade",
  approvedBy: "Responsável pela revisão",
  publication: "Orientações ao influenciador",
  mail: "Envio de e-mails",
  campaignName: "Nome da campanha",
  campaignDescription: "Descrição da campanha",
  restaurantName: "Nome do restaurante",
};
const labels = campaignSettingsFieldLabels;
const guidance: Record<string, string> = {
  address:
    "Informe rua, número, bairro e cidade. Será mostrado na confirmação da visita.",
  contact:
    "Canal que o influenciador poderá usar para dúvidas e cancelamentos.",
  approvedBy: "Pessoa responsável por revisar as condições e os documentos.",
  voucher:
    "Informe onde validar o voucher, o que ele cobre e em qual visita poderá ser usado.",
  companions: "Explique se são permitidos e como o consumo deles será tratado.",
  excess: "Informe quem paga quando a conta ultrapassar o valor do voucher.",
  balance: "Explique o que acontece quando o consumo é menor que o crédito.",
  cancellation: "Informe a antecedência, o canal e as consequências previstas.",
};
const fieldId = (key: string) =>
  `locomotiva-settings-${key === "arrivalTimes" ? "lunch" : key}`;
const subscribeHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;
const sectionForField = (key: string) =>
  sections.find((item) => item.fields.includes(key));
const focusField = (key: string) =>
  document
    .getElementById(
      key === "tags"
        ? "locomotiva-settings-tag-list"
        : document.getElementById(fieldId(key) + "-open")
          ? fieldId(key) + "-open"
          : fieldId(key),
    )
    ?.focus();
type SettingsPayload = {
  operation: SettingsOperation;
  version: number;
  config?: CampaignConfig;
  document?: string;
};

export default function CampaignSettings({
  dashboard,
  busy,
  onAction,
  onDirtyChange,
  initialField = "",
}: {
  dashboard: Dashboard;
  busy: boolean;
  initialField?: string;
  onAction: (payload: SettingsPayload) => Promise<boolean | undefined>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { config, settings, mailConfigured, registrations, canReadCpf } =
    dashboard;
  const saved = settings?.draft ?? config;
  const version = settings?.version ?? 0;
  const needsStarterValues =
    [
      "address",
      "contact",
      "voucher",
      "companions",
      "excess",
      "balance",
      "cancellation",
      "publication",
      "tags",
      "conditions",
      "imageTerm",
      "privacy",
      "imageChannels",
      "imagePurpose",
      "imageDuration",
      "imageEditing",
      "imagePromotion",
    ].some(
      (key) => !String(saved[key] ?? "").trim(),
    ) || (!saved.lunch.length && !saved.dinner.length) || !saved.dates.length;
  const [edits, setEdits] = useState<
    { base: number; draft: CampaignConfig } | undefined
  >();
  const [templateDismissed, setTemplateDismissed] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const initialStarter = useMemo(
    () =>
      hydrated && needsStarterValues && !templateDismissed
        ? starterConfiguration(saved, registrations)
        : undefined,
    [hydrated, needsStarterValues, registrations, saved, templateDismissed],
  );
  const draft =
    edits?.base === version ? edits.draft : (initialStarter ?? saved);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
  const [selected, setSelected] = useState(
    () => sectionForField(initialField)?.id ?? "restaurant",
  );
  useEffect(() => {
    if (sectionForField(initialField)) focusField(initialField);
  }, [initialField]);
  const [confirmation, setConfirmation] = useState<"publish" | "close" | null>(
    null,
  );
  const contact = String(draft.contact ?? "");
  const contactParts = /^(WhatsApp|Telefone|E-mail):\s*([\s\S]*)$/.exec(
    contact,
  );
  const contactChannel = contactParts?.[1] ?? "";
  const preview = useRef<HTMLDialogElement>(null);
  const documentDialog = useRef<HTMLDialogElement>(null);
  const [documentKey, setDocumentKey] = useState("");
  const [draftConfirmation, setDraftConfirmation] = useState<
    "save" | "discard" | null
  >(null);
  const changedFields = [
    ...new Set([...Object.keys(draft), ...Object.keys(saved)]),
  ].filter((key) => JSON.stringify(draft[key]) !== JSON.stringify(saved[key]));
  const [mailCheck, setMailCheck] = useState<{ busy: boolean; result: string }>(
    { busy: false, result: "" },
  );
  const [templateApplied, setTemplateApplied] = useState(false);
  async function verifyMail() {
    setMailCheck({ busy: true, result: "" });
    try {
      await api.post("/admin/locomotiva/mail/check");
      setMailCheck({
        busy: false,
        result: "Conexão autenticada pelo provedor. Nenhum e-mail foi enviado.",
      });
    } catch (error) {
      setMailCheck({
        busy: false,
        result: getApiErrorMessage(
          error,
          "O provedor não confirmou a conexão.",
        ),
      });
    }
  }
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [tag, setTag] = useState("");
  const [tagError, setTagError] = useState("");
  const section = sections.find((item) => item.id === selected) ?? sections[0];
  const update = (key: string, value: string | string[] | number) => {
    const next = { ...draft, [key]: value };
    if (key === "dailyCapacity") {
      const capacity = Math.max(1, Number(value) || 1);
      next.conditions = String(draft.conditions ?? "").replace(
        /Cada data comporta (?:um participante|at[e\u00e9] \d+ influenciador(?:es)?)\./,
        `Cada data comporta at\u00e9 ${capacity} influenciador${capacity === 1 ? "" : "es"}.`,
      );
    }
    setEdits({ base: version, draft: next });
  };
  function completeWithStarter() {
    setTemplateDismissed(false);
    setEdits({ base: version, draft: starterConfiguration(draft, registrations) });
    setTemplateApplied(true);
  }
  const conflictingVisits = registrations.filter((item) => {
    if (item.status !== "CONFIRMED") return false;
    const period = item.period === "lunch" ? "lunch" : "dinner";
    return (
      saved.dates.includes(item.date) &&
      saved[period].includes(item.time) &&
      (!draft.dates.includes(item.date) || !draft[period].includes(item.time))
    );
  });
  const execute = (operation: SettingsOperation, document?: string) => {
    if (
      operation === "save" &&
      conflictingVisits.length &&
      !window.confirm(
        `A edição afeta ${conflictingVisits.length} visitas confirmadas. Elas serão preservadas com as datas e horários originais. Salvar rascunho?`,
      )
    )
      return Promise.resolve(false);
    return onAction({
      operation,
      version,
      document,
      ...(operation === "save" ? { config: draft } : {}),
    });
  };
  const missing = (key: string) => {
    if (key === "arrivalTimes")
      return !draft.lunch.length && !draft.dinner.length;
    if (key === "dates") return !draft.dates.length;
    if (key === "mail") return !mailConfigured;
    if (key === "contact") return !(contactParts?.[2] ?? contact).trim();
    if (
      key === "imagePromotion" &&
      String(draft[key]).trim() ===
        "Anúncios pagos: Permitido conforme condições específicas"
    )
      return true;
    return !String(draft[key] ?? "").trim();
  };
  const rulesChanged = Object.keys(draft).some(
    (key) =>
      key !== "approvedBy" &&
      JSON.stringify(draft[key]) !== JSON.stringify(saved[key]),
  );
  const needsReview = (key: string) =>
    requiredDocumentApprovals.includes(key) &&
    (rulesChanged ||
      settings?.reviews[key]?.status !== "approved" ||
      notes.test(String(draft[key] ?? "")));
  const pending = sections.flatMap((item) =>
    item.fields.filter((key) => missing(key) || needsReview(key)),
  );
  const activationPending = pending.filter(
    (key) => !activationOptionalFields.has(key),
  );
  function jump(key: string) {
    const target = sectionForField(key);
    if (!target) return;
    setSelected(target.id);
    requestAnimationFrame(() => focusField(key));
  }
  function field(key: string, short = false) {
    const control = {
      id: fieldId(key),
      value: String(draft[key] ?? ""),
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => update(key, event.target.value),
    };
    return (
      <label key={key}>
        {labels[key]} ·{" "}
        {["campaignName", "campaignDescription", "restaurantName"].includes(key)
          ? "opcional"
          : "obrigatório"}
        {short ? (
          <input {...control} />
        ) : (
          <textarea {...control} rows={documents.includes(key) ? 12 : 4} />
        )}
        {guidance[key] && <small>{guidance[key]}</small>}
      </label>
    );
  }
  return (
    <section id="locomotiva-settings" className={styles.workspace}>
      <header className={styles.settingsHeader}>
        <p className={styles.breadcrumb}>
          Campanhas / Locomotiva / <strong>Configurações</strong>
        </p>
        <div className={styles.headerRow}>
          <div>
            <h2>Configurações da reserva</h2>
            <p>Defina a disponibilidade e as regras para influenciadores.</p>
          </div>
          <div className={styles.actions}>
            <button
              id="locomotiva-settings-apply-starter"
              type="button"
              className={styles.templateButton}
              disabled={busy}
              onClick={completeWithStarter}
            >
              <LuFileText aria-hidden="true" /> Completar com modelo base
            </button>
            {dirty && (
              <span className={styles.pendingSettings}>
                Alterações não salvas
              </span>
            )}
            <button
              id="locomotiva-settings-show-preview"
              type="button"
              onClick={() => preview.current?.showModal()}
            >
              <LuEye /> Prévia do formulário
            </button>
            <button
              type="button"
              className={styles.activationButton}
              disabled={busy || !dirty}
              onClick={() => setDraftConfirmation("save")}
            >
              <LuSave /> Salvar alterações
            </button>
          </div>
        </div>
        {(initialStarter || templateApplied) && (
          <p role="status" className={styles.templateNote}>
            Modelo preenchido como rascunho. Confira os textos, a agenda e os dados do restaurante antes de salvar. As aprovações não foram marcadas automaticamente; informe uma pessoa real para revisar os documentos.
          </p>
        )}
        <p role="status">
          {config.published
            ? "Inscrições abertas"
            : config.revision
              ? "Inscrições pausadas"
              : "Rascunho"}{" "}
          · {dirty ? "Alterações não salvas" : "Alterações salvas"}
        </p>
        <p>
          Versão pública {config.revision || "—"} · Última atualização{" "}
          {settings?.updatedAt
            ? new Date(settings.updatedAt).toLocaleString("pt-BR")
            : "não registrada"}
        </p>
        <div className={styles.actions}>
          <button
            id="locomotiva-settings-review-publication"
            type="button"
            onClick={() => {
              setSelected("publication");
              setConfirmation("publish");
            }}
          >
            <LuSend />{" "}
            {config.published
              ? "Revisar e publicar atualização"
              : "Revisar e abrir inscrições"}
          </button>
        </div>
        <details className={styles.settingsSummary} data-ready={activationPending.length === 0}>
          <summary>
            {activationPending.length
              ? `Faltam ${activationPending.length} configurações para abrir as inscrições.`
              : "Configurações prontas para publicação."}
          </summary>
          <p>
            Os textos de termos e privacidade ficam salvos no rascunho para revisão. A campanha só abre quando a agenda, as regras operacionais e o envio de e-mail estiverem prontos.
          </p>
          <ul>
            {activationPending.map((key) => (
              <li key={key}>
                <button type="button" onClick={() => jump(key)}>
                  {labels[key]}
                  {!missing(key) ? " · precisa de revisão" : ""}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </header>
      <nav aria-label="Seções de configuração" className={styles.navigation}>
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={item.id === selected ? "true" : undefined}
            onClick={() => {
              setSelected(item.id);
              setConfirmation(null);
            }}
          >
            <item.icon aria-hidden="true" /> {item.title}
            <small>
              {item.fields.some(missing)
                ? "Pendente"
                : item.fields.some(needsReview)
                  ? "Precisa de revisão"
                  : "Preenchida"}
            </small>
          </button>
        ))}
      </nav>
      <label className={styles.sectionPicker}>
        Seção de configuração
        <select
          id="locomotiva-settings-section"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            setConfirmation(null);
          }}
        >
          {sections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} ·{" "}
              {item.fields.some(missing)
                ? "Pendente"
                : item.fields.some(needsReview)
                  ? "Precisa de revisão"
                  : "Preenchida"}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.layout} data-agenda={section.id === "schedule"}>
        <section
          key={section.id}
          id={`locomotiva-settings-section-${section.id}`}
          className={styles.section}
        >
          <h3>{section.title}</h3>
          {section.id === "restaurant" && (
            <>
              {field("campaignName", true)}
              {field("campaignDescription")}
              {field("restaurantName", true)}
              {field("address", true)}
              <label>
                {labels.approvedBy} · necessário para aprovar documentos
                <input
                  id={fieldId("approvedBy")}
                  value={String(draft.approvedBy ?? "")}
                  onChange={(event) => update("approvedBy", event.target.value)}
                />
                <small>
                  Informe uma pessoa real que fará a revisão. Este campo não é preenchido pelo modelo e não impede salvar o rascunho.
                </small>
              </label>
              <p>Fuso horário da operação · America/Araguaina</p>
              <label>
                Canal de atendimento{" "}
                <select
                  id="locomotiva-settings-contact-channel"
                  value={contactChannel}
                  onChange={(event) => {
                    const value = contactParts?.[2] ?? contact;
                    update(
                      "contact",
                      event.target.value
                        ? `${event.target.value}: ${value}`
                        : value,
                    );
                  }}
                >
                  <option value="">Selecionar canal</option>
                  {["WhatsApp", "Telefone", "E-mail"].map((channel) => (
                    <option key={channel}>{channel}</option>
                  ))}
                </select>
              </label>
              <label>
                {labels.contact} · obrigatório
                <input
                  id={fieldId("contact")}
                  inputMode={
                    contactChannel === "E-mail"
                      ? "email"
                      : contactChannel
                        ? "tel"
                        : "text"
                  }
                  value={contactParts?.[2] ?? contact}
                  onChange={(event) =>
                    update(
                      "contact",
                      contactChannel
                        ? `${contactChannel}: ${event.target.value}`
                        : event.target.value,
                    )
                  }
                />
                <small>
                  {guidance.contact} Identifique o canal no texto se houver mais
                  de um.
                </small>
              </label>
            </>
          )}
          {section.id === "schedule" && (
            <>
              {conflictingVisits.length > 0 && (
                <div className={styles.pendingSettings} role="status">
                  <strong>Visitas confirmadas afetadas pela edição</strong>
                  <ul>
                    {conflictingVisits.map((visit) => (
                      <li key={visit.id}>
                        {visit.name} ·{" "}
                        {visit.date.split("-").reverse().join("/")} às{" "}
                        {visit.time}
                      </li>
                    ))}
                  </ul>
                  <p>As reservas mantêm as datas e os horários registrados.</p>
                </div>
              )}
              <CampaignSchedule
                draft={draft}
                registrations={registrations}
                update={update}
              />
            </>
          )}
          {section.id === "voucher" && (
            <>
              <label>
                Valor do voucher (R$)
                <input
                  id="locomotiva-settings-voucher-amount"
                  type="number"
                  min="0.01"
                  max="100000"
                  step="0.01"
                  value={String(draft.voucherAmount ?? 200)}
                  onChange={(event) =>
                    update("voucherAmount", event.target.value)
                  }
                />
                <small>Crédito total concedido para a visita aprovada.</small>
              </label>
              {section.fields.map((key) => field(key))}
            </>
          )}
          {section.id === "content" && (
            <>
              <p>
                Modalidades disponíveis: 4 Stories ou 1 Reels de 60 segundos.
              </p>
              <div className={styles.shortFields}>
                <CampaignRuleFields
                  field="publication"
                  text={String(draft.publication ?? "")}
                  onChange={(value) => update("publication", value)}
                  rules={[
                    {
                      label: "Prazo para publicar após a visita (horas)",
                      type: "number",
                    },
                    {
                      label: "Permanência dos Stories (horas)",
                      type: "number",
                    },
                    { label: "Permanência do Reels (dias)", type: "number" },
                    {
                      label: "Prazo para enviar comprovantes (horas)",
                      type: "number",
                    },
                  ]}
                />
              </div>
              <small>
                Confira os prazos no texto existente antes de definir novos
                valores. O texto completo será mostrado ao influenciador.
              </small>
              {field("publication")}
              <fieldset id="locomotiva-settings-tag-list" tabIndex={-1}>
                <legend>Perfis que devem ser marcados · obrigatório</legend>
                <p>Orientação atual: {String(draft.tags || "nenhuma")}</p>
                <label>
                  Adicionar perfil
                  <input
                    id="locomotiva-settings-profile"
                    value={tag}
                    onChange={(event) => setTag(event.target.value)}
                    placeholder="@perfil"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const profile = tag.replace(/^@/, "").trim().toLowerCase();
                    if (
                      !/^[a-z0-9._]{1,30}$/.test(profile) ||
                      String(draft.tags)
                        .toLowerCase()
                        .match(/@[a-z0-9._]+/g)
                        ?.includes(`@${profile}`)
                    ) {
                      setTagError(
                        "Informe um perfil válido que ainda não esteja na lista.",
                      );
                      return;
                    }
                    update(
                      "tags",
                      [draft.tags, `@${profile}`].filter(Boolean).join("\n"),
                    );
                    setTag("");
                    setTagError("");
                  }}
                >
                  Adicionar perfil
                </button>
                {tagError && <p role="alert">{tagError}</p>}
                {String(draft.tags ?? "")
                  .split("\n")
                  .filter((line) => /^@[a-z0-9._]+$/i.test(line))
                  .map((line, index) => (
                    <button
                      key={`${line}-${index}`}
                      type="button"
                      aria-label={`Remover ${line}`}
                      onClick={() =>
                        update(
                          "tags",
                          String(draft.tags)
                            .split("\n")
                            .filter((item) => item !== line)
                            .join("\n"),
                        )
                      }
                    >
                      {line} ×
                    </button>
                  ))}
                <details>
                  <summary>Revisar orientação original de marcação</summary>
                  {field("tags", false)}
                </details>
              </fieldset>
              <details>
                <summary>Assim o influenciador verá esta orientação</summary>
                <div className={styles.preview}>
                  {String(draft.publication ?? "")}
                  {"\n"}
                  {String(draft.tags ?? "")}
                </div>
              </details>
            </>
          )}
          {section.id === "documents" && (
            <>
              <p className={styles.templateNote}>
                Os textos-base podem ser editados e revisados nesta seção. Aplicar o modelo não registra aprovação nem substitui a conferência do responsável.
              </p>
              <CampaignRuleFields
                field="imageChannels"
                text={String(draft.imageChannels ?? "")}
                onChange={(value) => update("imageChannels", value)}
                rules={[
                  {
                    label: "Canal autorizado",
                    options: [
                      "Instagram orgânico",
                      "Facebook orgânico",
                      "Site oficial",
                    ],
                  },
                  { label: "Perfil autorizado" },
                ]}
              />
              <CampaignRuleFields
                field="imageDuration"
                text={String(draft.imageDuration ?? "")}
                onChange={(value) => update("imageDuration", value)}
                rules={[
                  { label: "Data de término da autorização", type: "date" },
                ]}
              />
              <CampaignRuleFields
                field="imagePromotion"
                text={String(draft.imagePromotion ?? "")}
                onChange={(value) => update("imagePromotion", value)}
                rules={[
                  {
                    label: "Anúncios pagos",
                    options: [
                      "Não permitido",
                      "Permitido conforme condições específicas",
                    ],
                  },
                ]}
              />
              <small>
                Confira os limites no termo vigente. Se houver permissão
                específica para anúncios, descreva as condições no campo abaixo.
              </small>
              <details>
                <summary>Regras de uso de imagem</summary>
                {[
                  "imageChannels",
                  "imagePurpose",
                  "imageDuration",
                  "imageEditing",
                  "imagePromotion",
                ].map((key) => field(key))}
              </details>
            </>
          )}
          {section.id === "documents" && (
            <>
              {[...documents, "voucher"].map((key) => {
                const review = settings?.reviews[key];
                const status = rulesChanged
                  ? "draft"
                  : (review?.status ?? "draft");
                const hasNotes = notes.test(String(draft[key] ?? ""));
                return (
                  <article key={key} className={styles.document}>
                    <p>
                      {
                        {
                          draft: "Rascunho",
                          review: "Em revisão",
                          approved: "Aprovado",
                        }[status]
                      }{" "}
                      · Versão {review?.version ?? "—"}
                    </p>
                    {status === "approved" && review?.at && (
                      <p>
                        Aprovação por {review.by} em{" "}
                        {new Date(review.at).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {key === "conditions" && (
                      <p>
                        A aprovação do regulamento é opcional para publicar. O
                        texto salvo será exibido aos participantes.
                      </p>
                    )}
                    {hasNotes && (
                      <p role="status">
                        Há possíveis notas internas. Revise o texto antes de
                        aprovar.
                      </p>
                    )}
                    <strong>{labels[key]}</strong>
                    <div className={styles.documentActions}>
                    <button
                      id={fieldId(key) + "-open"}
                      type="button"
                      onClick={() => {
                        setDocumentKey(key);
                        documentDialog.current?.showModal();
                      }}
                    >
                      Editar e visualizar
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy || dirty || missing(key) || status !== "draft"
                      }
                      onClick={() => void execute("review", key)}
                    >
                      Enviar para revisão
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy ||
                        dirty ||
                        missing("approvedBy") ||
                        status !== "review" ||
                        hasNotes
                      }
                      onClick={() => void execute("approve", key)}
                    >
                      Aprovar documento
                    </button>
                    </div>
                  </article>
                );
              })}
              <p>Aprovação manual da reserva · Em uso</p>
              <details>
                <summary>Histórico de versões publicadas</summary>
                {settings?.history?.length ? (
                  <ul>
                    {settings.history.map(({ revision, at, reviews }) => (
                      <li key={revision}>
                        Versão {revision}
                        {at && ` · ${new Date(at).toLocaleString("pt-BR")}`}
                        {reviews && (
                          <ul>
                            {Object.entries(reviews).map(([key, review]) => (
                              <li key={key}>
                                {labels[key]} · v. {review.version}
                                {review.by && ` · ${review.by}`}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Nenhuma versão registrada no histórico.</p>
                )}
              </details>
            </>
          )}
          {section.id === "publication" && (
            <>
              <CampaignMessageEditor draft={draft} onChange={update} />
              {canReadCpf && (
                <div className={styles.actions}>
                  <button
                    id="locomotiva-settings-check-mail"
                    type="button"
                    disabled={
                      !mailConfigured ||
                      mailCheck.busy ||
                      dashboard.localTestEnabled
                    }
                    onClick={() => void verifyMail()}
                  >
                    {mailCheck.busy
                      ? "Verificando…"
                      : "Testar conexão de e-mail"}
                  </button>
                  {mailCheck.result && <p role="status">{mailCheck.result}</p>}
                </div>
              )}
              <div id={fieldId("mail")} tabIndex={-1}>
                <p>
                  {mailConfigured
                    ? "E-mail · configuração presente"
                    : "Envio não configurado"}
                </p>
                {!mailConfigured && (
                  <p>
                    As confirmações por e-mail ainda não podem ser enviadas.
                    Solicite a configuração ao administrador técnico.
                  </p>
                )}
                {canReadCpf && (
                  <details>
                    <summary>Detalhes técnicos</summary>
                    <p>
                      Este indicador verifica a presença da configuração SMTP e
                      do remetente. A entrega depende do provedor.
                    </p>
                  </details>
                )}
              </div>
              {config.published && (
                <button type="button" onClick={() => setConfirmation("close")}>
                  Pausar inscrições
                </button>
              )}
              {confirmation && (
                <div
                  role="group"
                  aria-label="Confirmar publicação"
                  className={styles.document}
                >
                  <p>
                    {confirmation === "close"
                      ? "Novos cadastros serão bloqueados. As solicitações existentes serão preservadas."
                      : `A configuração salva será publicada com ${draft.dates.length} datas e ${draft.lunch.length + draft.dinner.length} horários. Os textos de termos e privacidade serão apresentados aos participantes para leitura e aceite.`}
                  </p>
                  {confirmation === "publish" && activationPending.length > 0 && (
                    <p role="status">
                      Resolva as pendências do resumo para continuar.
                    </p>
                  )}
                  {confirmation === "publish" && dirty && (
                    <p role="status">Salve as alterações antes de publicar.</p>
                  )}
                  <button
                    type="button"
                    disabled={
                      busy ||
                      (confirmation === "publish" &&
                        (dirty || activationPending.length > 0))
                    }
                    onClick={async () => {
                      if (await execute(confirmation)) {
                        if (confirmation === "close" && dirty)
                          setEdits({ base: version + 1, draft });
                        setConfirmation(null);
                      }
                    }}
                  >
                    {confirmation === "close"
                      ? "Confirmar pausa"
                      : config.published
                        ? "Confirmar publicação"
                        : "Confirmar abertura"}
                  </button>
                  <button type="button" onClick={() => setConfirmation(null)}>
                    Voltar
                  </button>
                </div>
              )}
            </>
          )}
        </section>
        {section.id === "schedule" && (
          <aside className={styles.inlinePreview}>
            <CampaignBookingPreview
              draft={draft}
              registrations={registrations}
            />
          </aside>
        )}
      </div>
      <dialog
        id="locomotiva-settings-preview-dialog"
        ref={preview}
        className={styles.settingsDialog}
        aria-label="Prévia do formulário"
      >
        <button
          type="button"
          onClick={() => preview.current?.close()}
          aria-label="Fechar prévia"
        >
          <LuX />
        </button>
        <CampaignBookingPreview draft={draft} registrations={registrations} />
      </dialog>
      <dialog
        id="locomotiva-settings-document-dialog"
        ref={documentDialog}
        className={styles.settingsDialog}
        aria-label="Editor de documento"
      >
        <button type="button" onClick={() => documentDialog.current?.close()}>
          <LuX /> Voltar às configurações
        </button>
        {documentKey && (
          <>
            <p>Versão em edição: {version + 1}</p>
            {field(documentKey)}
            <h3>Pré-visualização</h3>
            <div className={styles.preview}>
              {String(draft[documentKey] ?? "")}
            </div>
            <button
              type="button"
              className={styles.activationButton}
              disabled={busy || !dirty}
              onClick={() => {
                documentDialog.current?.close();
                setDraftConfirmation("save");
              }}
            >
              Revisar e salvar versão
            </button>
          </>
        )}
      </dialog>
      <footer className={styles.actionBar}>
        <span>{dirty ? "Alterações não salvas" : "Alterações salvas"}</span>
        <div className={styles.actions}>
          <button
            id="locomotiva-settings-discard"
            type="button"
            disabled={busy || !dirty}
            onClick={() => setDraftConfirmation("discard")}
          >
            Descartar
          </button>
          <button
            id="locomotiva-settings-save"
            className={styles.activationButton}
            type="button"
            disabled={busy || !dirty}
            onClick={() => setDraftConfirmation("save")}
          >
            <LuSave /> Salvar alterações
          </button>
        </div>
      </footer>
      {draftConfirmation && (
        <CampaignDialog
          id="locomotiva-settings-draft-confirmation"
          title={
            draftConfirmation === "save"
              ? "Salvar nova configuração?"
              : "Descartar alterações?"
          }
          busy={busy}
          onClose={() => setDraftConfirmation(null)}
        >
          {draftConfirmation === "save" ? (
            <>
              <p>
                O rascunho poderá ser publicado em Ativação. Reservas anteriores
                mantêm as condições aceitas.
              </p>
              <div className={workspace.tableWrap}>
                <table className={workspace.table}>
                  <thead>
                    <tr>
                      <th>Campo</th>
                      <th>Valor salvo</th>
                      <th>Novo valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changedFields.map((key) => (
                      <tr key={key}>
                        <th scope="row">{labels[key] ?? key}</th>
                        <td>{String(saved[key] ?? "—")}</td>
                        <td>{String(draft[key] ?? "—")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>O painel será restaurado para a última configuração salva.</p>
          )}
          <div className={workspace.row}>
            <button
              type="button"
              disabled={busy}
              onClick={() => setDraftConfirmation(null)}
            >
              Continuar editando
            </button>
            <button
              type="button"
              className={workspace.primary}
              disabled={busy}
              onClick={async () => {
                if (draftConfirmation === "discard") {
                  setEdits(undefined);
                  setTemplateDismissed(true);
                  setTemplateApplied(false);
                  setDraftConfirmation(null);
                } else if (await execute("save")) setDraftConfirmation(null);
              }}
            >
              {draftConfirmation === "save"
                ? "Confirmar e salvar"
                : "Descartar alterações"}
            </button>
          </div>
        </CampaignDialog>
      )}
    </section>
  );
}
