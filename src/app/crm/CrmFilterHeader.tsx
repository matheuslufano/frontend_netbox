"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiChevronDown,
  FiCopy,
  FiCalendar,
  FiFilter,
  FiList,
  FiPlus,
  FiSave,
  FiSliders,
  FiStar,
  FiTrash2,
  FiUser,
  FiX,
} from "react-icons/fi";
import {
  apagarFiltroCrmSalvo,
  apagarAgendamentoContato,
  atualizarFiltroCrmSalvo,
  criarCrmFunnel,
  criarFiltroCrmSalvo,
  definirFiltroCrmPadrao,
  duplicarFiltroCrmSalvo,
  getApiErrorMessage,
  listarFiltrosCrmSalvos,
  listarAgendaContatos,
  criarAgendamentoContato,
  atualizarAgendamentoContato,
  type CrmFilterCondition,
  type CrmPermissions,
  type AgendaContact,
  type SavedCrmFilter,
  type User,
} from "@/lib/api";
import NotificationHeaderButton from "@/components/notifications/NotificationHeaderButton";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { CalendarView } from "@/app/contatos/page";
import styles from "./CrmFilterHeader.module.css";

type Option = { id: string; name: string };
type ReminderForm = { title: string; scheduledAt: string; durationMinutes: string; reminderMinutes: string; description: string; color: string };
type CalendarReminder = { id: string; title: string; scheduledAt: string; status: string; color?: string | null };
const REMINDER_COLORS = ["#176b88", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#dc2626", "#475569"];
type Props = {
  funnels: Option[];
  funnelId: string;
  onFunnelChange: (value: string) => void;
  onFunnelCreated: (funnel: { id: string; name: string }) => void;
  scope: string;
  onScopeChange: (value: string) => void;
  responsibleUserId: number | null;
  onResponsibleUserChange: (value: number | null) => void;
  statuses: Option[];
  status: string;
  onStatusChange: (value: string) => void;
  stages: Option[];
  sort: string;
  onSortChange: (value: string) => void;
  users: User[];
  permissions: CrmPermissions;
  conditions: CrmFilterCondition[];
  onConditionsChange: (value: CrmFilterCondition[]) => void;
  onResultMessage: (message: string) => void;
};

const fields = [
  { id: "responsibleUserId", name: "Responsável", type: "user" },
  { id: "createdByUserId", name: "Criador da negociação", type: "user" },
  { id: "affiliateId", name: "Afiliado (ID)", type: "number" },
  { id: "trackingCode", name: "Código do afiliado", type: "text" },
  { id: "city", name: "Cidade", type: "text" },
  { id: "source", name: "Origem do lead", type: "text" },
  { id: "campaign", name: "Campanha", type: "text" },
  { id: "status", name: "Status", type: "status" },
  { id: "stageId", name: "Etapa do funil", type: "stage" },
  { id: "createdAt", name: "Data de criação", type: "date" },
  { id: "updatedAt", name: "Última atualização", type: "date" },
  { id: "lastInteractionAt", name: "Última interação", type: "date" },
  { id: "closedAt", name: "Data da venda", type: "date" },
  { id: "value", name: "Valor da negociação", type: "number" },
  { id: "phone", name: "Telefone", type: "presence" },
] as const;

const operators = {
  text: [
    ["equals", "é igual a"],
    ["not_equals", "é diferente de"],
    ["contains", "contém"],
    ["not_contains", "não contém"],
    ["starts_with", "começa com"],
    ["ends_with", "termina com"],
    ["empty", "está vazio"],
    ["not_empty", "não está vazio"],
  ],
  number: [
    ["equals", "é igual a"],
    ["not_equals", "é diferente de"],
    ["greater_than", "maior que"],
    ["less_than", "menor que"],
    ["between", "entre"],
    ["empty", "está vazio"],
    ["not_empty", "não está vazio"],
  ],
  date: [
    ["equals", "é igual a"],
    ["before", "antes de"],
    ["after", "depois de"],
    ["between", "entre"],
    ["empty", "está vazio"],
    ["not_empty", "não está vazio"],
  ],
  presence: [
    ["empty", "não possui"],
    ["not_empty", "possui"],
  ],
} as const;

const sortOptions = [
  ["created-desc", "Criadas por último"],
  ["created-asc", "Criadas primeiro"],
  ["updated-desc", "Atualizadas recentemente"],
  ["updated-asc", "Atualizadas há mais tempo"],
  ["value-desc", "Maior valor"],
  ["value-asc", "Menor valor"],
  ["oldest-no-contact", "Sem interação há mais tempo"],
];

function newCondition(): CrmFilterCondition {
  return {
    id: crypto.randomUUID(),
    field: "city",
    operator: "contains",
    value: "",
  };
}

function fieldMeta(field: string) {
  return fields.find((item) => item.id === field) || fields[0];
}

function operatorList(field: string) {
  const type = fieldMeta(field).type;
  if (type === "user" || type === "status" || type === "stage") {
    return operators.text.slice(0, 2);
  }
  return operators[type];
}

function valueLabel(
  condition: CrmFilterCondition,
  users: User[],
  statuses: Option[],
  stages: Option[],
) {
  const value = Array.isArray(condition.value)
    ? condition.value.join(" — ")
    : String(condition.value ?? "");
  if (condition.field.endsWith("UserId")) {
    return users.find((user) => user.id === Number(condition.value))?.name || value;
  }
  if (condition.field === "status") {
    return statuses.find((item) => item.id === value)?.name || value;
  }
  if (condition.field === "stageId") {
    return stages.find((item) => item.id === value)?.name || value;
  }
  return value;
}

export default function CrmFilterHeader(props: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<CrmFilterCondition[]>(props.conditions);
  const [savedFilters, setSavedFilters] = useState<SavedCrmFilter[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarContacts, setCalendarContacts] = useState<AgendaContact[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [reminderModal, setReminderModal] = useState<"view" | "edit" | "new" | null>(null);
  const [reminderContact, setReminderContact] = useState<AgendaContact | null>(null);
  const [reminder, setReminder] = useState<CalendarReminder | null>(null);
  const [reminderForm, setReminderForm] = useState<ReminderForm>({ title: "Retorno com cliente", scheduledAt: "", durationMinutes: "30", reminderMinutes: "15", description: "", color: "#176b88" });
  const panelRef = useRef<HTMLDivElement>(null);
  const loadedDefaultRef = useRef(false);
  const initialCallbacksRef = useRef({
    onConditionsChange: props.onConditionsChange,
    onFunnelChange: props.onFunnelChange,
    onSortChange: props.onSortChange,
  });

  const scopeOptions = useMemo(
    () => [
      { id: "all", name: "Todos os cartões" },
      { id: "mine", name: "Minhas negociações" },
      { id: "unassigned", name: "Negociações sem responsável" },
      ...(props.permissions.canViewTeam
        ? [{ id: "team", name: "Negociações da minha equipe" }]
        : []),
    ],
    [props.permissions],
  );

  useEffect(() => {
    void listarFiltrosCrmSalvos()
      .then((filters) => {
        setSavedFilters(filters);
        if (!loadedDefaultRef.current) {
          loadedDefaultRef.current = true;
          const defaultFilter = filters.find((filter) => filter.isDefault);
          if (defaultFilter) {
            initialCallbacksRef.current.onConditionsChange(defaultFilter.conditions);
            if (defaultFilter.funnelId) {
              initialCallbacksRef.current.onFunnelChange(defaultFilter.funnelId);
            }
            if (defaultFilter.sort?.mode) {
              initialCallbacksRef.current.onSortChange(defaultFilter.sort.mode);
            }
          }
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const close = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setPanelOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [panelOpen]);

  useEffect(() => {
    if (!calendarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [calendarOpen]);

  function openPanel() {
    setDraft(props.conditions.map((condition) => ({ ...condition })));
    setPanelOpen((current) => !current);
  }

  function openCalendar() {
    setCalendarOpen(true);
    setCalendarLoading(true);
    void listarAgendaContatos()
      .then((result) => setCalendarContacts(result.contacts || []))
      .catch(() => setCalendarContacts([]))
      .finally(() => setCalendarLoading(false));
  }

  function toDateTimeLocal(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }

  function openNewReminder(date: Date) {
    setReminderContact(null);
    setReminder(null);
    setReminderForm({ title: "Retorno com cliente", scheduledAt: toDateTimeLocal(date.toISOString()), durationMinutes: "30", reminderMinutes: "15", description: "", color: "#176b88" });
    setReminderModal("new");
  }

  function openReminder(contact: AgendaContact, appointment?: CalendarReminder) {
    const selectedReminder = appointment || contact.nextAppointment;
    if (!selectedReminder) return;
    setReminderContact(contact);
    setReminder(selectedReminder);
    setReminderModal("view");
  }

  function editReminder() {
    if (!reminder) return;
    setReminderForm({ title: reminder.title, scheduledAt: toDateTimeLocal(reminder.scheduledAt), durationMinutes: "30", reminderMinutes: "15", description: "", color: reminder.color || "#176b88" });
    setReminderModal("edit");
  }

  async function saveReminder() {
    if (!reminderContact || !reminderForm.title.trim() || !reminderForm.scheduledAt) return;
    setBusy(true);
    try {
      const payload = { ...reminderForm, durationMinutes: Number(reminderForm.durationMinutes), reminderMinutes: Number(reminderForm.reminderMinutes) };
      if (reminderModal === "edit" && reminder) await atualizarAgendamentoContato(reminderContact.id, Number(reminder.id), payload);
      else await criarAgendamentoContato(reminderContact.id, payload);
      setReminderModal(null);
      setReminder(null);
      setReminderContact(null);
      await listarAgendaContatos().then((result) => setCalendarContacts(result.contacts || []));
      props.onResultMessage(reminderModal === "edit" ? "Lembrete atualizado." : "Lembrete criado.");
    } catch (error) {
      props.onResultMessage(getApiErrorMessage(error, "Não foi possível salvar o lembrete."));
    } finally {
      setBusy(false);
    }
  }

  async function deleteReminder() {
    if (!reminderContact || !reminder || !window.confirm(`Apagar o lembrete “${reminder.title}”?`)) return;
    setBusy(true);
    try {
      await apagarAgendamentoContato(reminderContact.id, Number(reminder.id));
      setReminderModal(null);
      setReminder(null);
      setReminderContact(null);
      await listarAgendaContatos().then((result) => setCalendarContacts(result.contacts || []));
      props.onResultMessage("Lembrete apagado.");
    } catch (error) {
      props.onResultMessage(getApiErrorMessage(error, "Não foi possível apagar o lembrete."));
    } finally {
      setBusy(false);
    }
  }

  function updateCondition(id: string | undefined, patch: Partial<CrmFilterCondition>) {
    setDraft((current) =>
      current.map((condition) => {
        if (condition.id !== id) return condition;
        const next = { ...condition, ...patch };
        if (patch.field) {
          next.operator = operatorList(patch.field)[0][0];
          next.value = "";
        }
        return next;
      }),
    );
  }

  async function refreshSavedFilters() {
    setSavedFilters(await listarFiltrosCrmSalvos());
  }

  async function saveFilter() {
    const name = window.prompt("Nome do filtro personalizado:");
    if (!name?.trim()) return;
    const visibility =
      props.permissions.canShareFilters &&
      window.confirm("Deseja compartilhar este filtro com os usuários autorizados?")
        ? "SHARED"
        : "PRIVATE";
    setBusy(true);
    try {
      if (editingId) {
        const updateExisting = window.confirm(
          "OK para atualizar o filtro existente. Cancelar para salvar como novo.",
        );
        if (updateExisting) {
          await atualizarFiltroCrmSalvo(editingId, {
            name,
            funnelId: props.funnelId,
            conditions: draft,
            sort: { mode: props.sort },
            visibility,
          });
        } else {
          await criarFiltroCrmSalvo({
            name,
            funnelId: props.funnelId,
            conditions: draft,
            sort: { mode: props.sort },
            visibility,
            isDefault: false,
          });
        }
      } else {
        await criarFiltroCrmSalvo({
          name,
          funnelId: props.funnelId,
          conditions: draft,
          sort: { mode: props.sort },
          visibility,
          isDefault: false,
        });
      }
      await refreshSavedFilters();
      props.onResultMessage("Filtro personalizado salvo.");
    } catch (error) {
      props.onResultMessage(getApiErrorMessage(error, "Não foi possível salvar o filtro."));
    } finally {
      setBusy(false);
    }
  }

  async function createFunnel() {
    const name = window.prompt("Nome do novo funil:")?.trim();
    if (!name) return;

    const description =
      window.prompt("Descrição do funil (opcional):")?.trim() || "";

    setBusy(true);
    try {
      const funnel = await criarCrmFunnel({
        name,
        description,
        sourceFunnelId: props.funnelId || undefined,
      });
      props.onFunnelCreated({
        id: funnel.id,
        name: funnel.name,
      });
      props.onResultMessage(`Funil “${funnel.name}” criado com sucesso.`);
      setPanelOpen(false);
    } catch (error) {
      props.onResultMessage(
        getApiErrorMessage(error, "Não foi possível criar o funil."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.bar} aria-label="Cabeçalho de filtros do CRM">
      <label className={styles.control} title={props.funnels.find((item) => item.id === props.funnelId)?.name}>
        <FiFilter aria-hidden="true" />
        <span className={styles.srOnly}>Funil</span>
        <select value={props.funnelId} onChange={(event) => props.onFunnelChange(event.target.value)}>
          {props.funnels.map((funnel) => (
            <option key={funnel.id} value={funnel.id}>{funnel.name.toUpperCase()}</option>
          ))}
        </select>
        <FiChevronDown aria-hidden="true" />
      </label>

      <label className={styles.control}>
        <FiUser aria-hidden="true" />
        <span className={styles.srOnly}>Responsável</span>
        <select
          value={props.responsibleUserId ? `user:${props.responsibleUserId}` : props.scope}
          onChange={(event) => {
            if (event.target.value.startsWith("user:")) {
              props.onResponsibleUserChange(Number(event.target.value.slice(5)));
            } else {
              props.onResponsibleUserChange(null);
              props.onScopeChange(event.target.value);
            }
          }}
        >
          {scopeOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          {props.users.length > 0 && (
            <optgroup label="Usuário específico">
              {props.users.map((user) => <option key={user.id} value={`user:${user.id}`}>{user.name}</option>)}
            </optgroup>
          )}
        </select>
        <FiChevronDown aria-hidden="true" />
      </label>

      <label className={styles.control}>
        <FiSliders aria-hidden="true" />
        <span className={styles.srOnly}>Status</span>
        <select value={props.status} onChange={(event) => props.onStatusChange(event.target.value)}>
          <option value="all">Todos os status</option>
          {props.statuses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <FiChevronDown aria-hidden="true" />
      </label>

      <label className={styles.control}>
        <FiList aria-hidden="true" />
        <span className={styles.srOnly}>Ordenação</span>
        <select value={props.sort} onChange={(event) => props.onSortChange(event.target.value)}>
          {sortOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <FiChevronDown aria-hidden="true" />
      </label>

      <div className={styles.panelWrap} ref={panelRef}>
        <ThemeToggle className={styles.themeToggle} />
        <NotificationHeaderButton />
        <button
          type="button"
          className={styles.calendarButton}
          onClick={openCalendar}
          title="Abrir agenda"
          aria-label="Abrir agenda"
        >
          <FiCalendar aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${styles.filterButton} ${props.conditions.length ? styles.active : ""}`}
          onClick={openPanel}
          aria-expanded={panelOpen}
          aria-haspopup="dialog"
          aria-controls="crm-additional-filters"
        >
          <FiFilter aria-hidden="true" />
          Filtros ({props.conditions.length})
        </button>

        {panelOpen && (
          <div id="crm-additional-filters" className={styles.panel} role="dialog" aria-label="Filtros adicionais">
            <header>
              <div>
                <strong>Funil</strong>
                <small>Crie funis e combine filtros adicionais usando “E”.</small>
              </div>
              <button type="button" onClick={() => setPanelOpen(false)} aria-label="Fechar filtros"><FiX /></button>
            </header>

            {props.permissions.canTransfer && (
              <button
                type="button"
                className={styles.createFunnelButton}
                onClick={() => void createFunnel()}
                disabled={busy}
              >
                <FiPlus aria-hidden="true" />
                Criar novo funil
              </button>
            )}

            {savedFilters.length > 0 && (
              <div className={styles.savedList}>
                <span>Visualizações salvas</span>
                {savedFilters.map((filter) => (
                  <div key={filter.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(filter.conditions.map((item) => ({ ...item, id: item.id || crypto.randomUUID() })));
                        setEditingId(filter.ownerUserId ? filter.id : null);
                      }}
                    >
                      {filter.isDefault && <FiStar aria-label="Padrão" />}
                      {filter.name}
                    </button>
                    <button type="button" title="Definir como padrão" onClick={() => void definirFiltroCrmPadrao(filter.id).then(refreshSavedFilters)}><FiStar /></button>
                    <button type="button" title="Duplicar" onClick={() => void duplicarFiltroCrmSalvo(filter.id).then(refreshSavedFilters)}><FiCopy /></button>
                    {filter.ownerUserId && (
                      <button
                        type="button"
                        title="Excluir"
                        onClick={() => {
                          if (window.confirm(`Excluir definitivamente “${filter.name}”?`)) {
                            void apagarFiltroCrmSalvo(filter.id).then(refreshSavedFilters);
                          }
                        }}
                      ><FiTrash2 /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.conditions}>
              {draft.map((condition) => {
                const meta = fieldMeta(condition.field);
                const hidesValue = ["empty", "not_empty"].includes(condition.operator);
                const optionSource =
                  meta.type === "user" ? props.users.map((user) => ({ id: String(user.id), name: user.name })) :
                  meta.type === "status" ? props.statuses :
                  meta.type === "stage" ? props.stages : null;
                return (
                  <article key={condition.id}>
                    <select aria-label="Campo" value={condition.field} onChange={(event) => updateCondition(condition.id, { field: event.target.value })}>
                      {fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
                    </select>
                    <select aria-label="Operador" value={condition.operator} onChange={(event) => updateCondition(condition.id, { operator: event.target.value })}>
                      {operatorList(condition.field).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                    {!hidesValue && optionSource ? (
                      <select aria-label="Valor" value={String(condition.value ?? "")} onChange={(event) => updateCondition(condition.id, { value: event.target.value })}>
                        <option value="">Selecione</option>
                        {optionSource.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    ) : !hidesValue ? (
                      <input
                        aria-label="Valor"
                        type={meta.type === "date" ? "date" : meta.type === "number" ? "number" : "text"}
                        value={String(condition.value ?? "")}
                        onChange={(event) => updateCondition(condition.id, { value: event.target.value })}
                      />
                    ) : <span className={styles.noValue}>Sem valor</span>}
                    <button type="button" onClick={() => setDraft((current) => current.filter((item) => item.id !== condition.id))} aria-label={`Remover filtro ${meta.name}`}><FiTrash2 /></button>
                    <small title={`${meta.name} ${condition.operator} ${valueLabel(condition, props.users, props.statuses, props.stages)}`}>
                      {meta.name} · {valueLabel(condition, props.users, props.statuses, props.stages) || "sem valor"}
                    </small>
                  </article>
                );
              })}
              {!draft.length && <p>Nenhum filtro adicional ativo.</p>}
            </div>

            <button type="button" className={styles.addButton} onClick={() => setDraft((current) => [...current, newCondition()])}>
              <FiPlus aria-hidden="true" /> Adicionar filtro
            </button>

            <footer>
              <button type="button" onClick={() => setDraft([])}>Limpar todos</button>
              <button type="button" onClick={() => { setDraft(props.conditions); setPanelOpen(false); }}>Cancelar alterações</button>
              <button type="button" onClick={() => void saveFilter()} disabled={busy}><FiSave /> Salvar visualização</button>
              <button type="button" className={styles.apply} onClick={() => { props.onConditionsChange(draft); setPanelOpen(false); }}>
                Aplicar filtros
              </button>
            </footer>
          </div>
        )}

        {calendarOpen && typeof document !== "undefined" && createPortal((
          <div
            className={styles.calendarOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Agenda de contatos"
            onClick={(event) => event.target === event.currentTarget && setCalendarOpen(false)}
          >
            <section className={styles.calendarModal}>
              <header className={styles.calendarModalHeader}>
                <div>
                  <span>Agenda de clientes</span>
                  <h2>Calendário</h2>
                </div>
                <button type="button" onClick={() => setCalendarOpen(false)} aria-label="Fechar agenda">
                  <FiX />
                </button>
              </header>
              {calendarLoading ? (
                <div className={styles.calendarLoading}>Carregando agenda...</div>
              ) : (
                <CalendarView
                  contacts={calendarContacts.filter((contact) => Boolean(contact.name || contact.phone || contact.document))}
                  onOpen={(contact) => openReminder(contact)}
                  onEdit={(contact, appointment) => openReminder(contact, appointment)}
                  onCreateDate={openNewReminder}
                />
              )}
              {reminderModal && (
                <div className={styles.reminderOverlay} role="dialog" aria-modal="true" aria-label={reminderModal === "view" ? "Detalhes do lembrete" : "Agendar lembrete"} onClick={(event) => event.target === event.currentTarget && setReminderModal(null)}>
                  <section className={styles.reminderModal}>
                    <header className={styles.reminderModalHeader}>
                      <h3>{reminderModal === "view" ? "Lembrete" : reminderModal === "edit" ? "Editar lembrete" : "Novo lembrete"}</h3>
                      <button type="button" onClick={() => setReminderModal(null)} aria-label="Fechar lembrete"><FiX /></button>
                    </header>
                    {reminderModal === "view" && reminder ? (
                      <div className={styles.reminderDetails}>
                        <div className={styles.reminderDetailTitle} style={{ borderLeftColor: reminder.color || "#176b88", backgroundColor: reminder.color ? `${reminder.color}18` : undefined }}><FiCalendar /><strong>{reminder.title}</strong></div>
                        <span>{reminderContact?.name || "Contato"}</span>
                        <time>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(new Date(reminder.scheduledAt))}</time>
                        <small>Status: {reminder.status}</small>
                        <div className={styles.reminderActions}>
                          <button type="button" className={styles.reminderDeleteButton} onClick={() => void deleteReminder()} disabled={busy}><FiTrash2 /> Apagar</button>
                          <button type="button" className={styles.reminderPrimaryButton} onClick={editReminder} disabled={busy}>Editar lembrete</button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.reminderForm}>
                        {reminderModal === "new" && <label><span>Contato</span><select value={reminderContact?.id || ""} onChange={(event) => setReminderContact(calendarContacts.find((contact) => contact.id === event.target.value) || null)}><option value="">Selecione o contato</option>{calendarContacts.filter((contact) => Boolean(contact.name || contact.phone || contact.document)).map((contact) => <option key={contact.id} value={contact.id}>{contact.name || "Contato"}</option>)}</select></label>}
                        <label><span>Título</span><input value={reminderForm.title} onChange={(event) => setReminderForm({ ...reminderForm, title: event.target.value })} /></label>
                        <label><span>Data e hora</span><input type="datetime-local" value={reminderForm.scheduledAt} onChange={(event) => setReminderForm({ ...reminderForm, scheduledAt: event.target.value })} /></label>
                        <label><span>Duração (minutos)</span><input type="number" min="5" value={reminderForm.durationMinutes} onChange={(event) => setReminderForm({ ...reminderForm, durationMinutes: event.target.value })} /></label>
                        <label><span>Lembrete (minutos antes)</span><input type="number" min="0" value={reminderForm.reminderMinutes} onChange={(event) => setReminderForm({ ...reminderForm, reminderMinutes: event.target.value })} /></label>
                        <fieldset className={styles.reminderColorField}>
                          <legend>Cor do lembrete</legend>
                          <div className={styles.reminderColorChoices}>
                            {REMINDER_COLORS.map((color) => <button type="button" key={color} className={reminderForm.color === color ? styles.reminderColorActive : ""} style={{ backgroundColor: color }} onClick={() => setReminderForm({ ...reminderForm, color })} aria-label={`Selecionar cor ${color}`} aria-pressed={reminderForm.color === color} />)}
                            <label className={styles.reminderCustomColor}><span>Personalizada</span><input type="color" value={reminderForm.color} onChange={(event) => setReminderForm({ ...reminderForm, color: event.target.value })} /></label>
                          </div>
                          <div className={styles.reminderColorPreview} style={{ borderLeftColor: reminderForm.color, backgroundColor: `${reminderForm.color}18` }}><FiCalendar /><span>{reminderForm.title || "Prévia do lembrete"}</span></div>
                        </fieldset>
                        <label className={styles.reminderFullField}><span>Observação</span><textarea value={reminderForm.description} onChange={(event) => setReminderForm({ ...reminderForm, description: event.target.value })} /></label>
                        <button type="button" className={styles.reminderPrimaryButton} onClick={() => void saveReminder()} disabled={busy || !reminderContact || !reminderForm.title.trim() || !reminderForm.scheduledAt}>{busy ? "Salvando..." : "Salvar lembrete"}</button>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </section>
          </div>
        ), document.body)}
      </div>
      <span className={styles.srOnly} aria-live="polite">{props.conditions.length} filtros adicionais aplicados</span>
    </section>
  );
}
