"use client";

import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiClipboard,
  FiClock,
  FiDownload,
  FiEye,
  FiEdit3,
  FiFilter,
  FiHash,
  FiList,
  FiMoreVertical,
  FiMove,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiSliders,
  FiStar,
  FiUser,
  FiX,
} from "react-icons/fi";
import {
  apagarCrmDeal,
  apagarCrmStage,
  atualizarCrmDeal,
  atualizarCrmStage,
  criarAfiliado,
  criarCampanha,
  criarCrmStage,
  criarCrmDeal,
  editarConversao,
  getApiErrorMessage,
  listarAfiliados,
  listarCampanhas,
  listarChatmixWebhookLogs,
  listarClientesSgp,
  listarCidadesTocantins,
  listarCrmDeals,
  listarUsuarios,
  listarUsuariosAtribuiveis,
  listarLinks,
  transferirCrmDeal,
  type CrmFilterCondition,
  type CrmPermissions,
  type Affiliate,
  type Campaign,
  type City,
  type CrmDeal as BackendCrmDeal,
  type LinkItem,
  type User,
} from "@/lib/api";
import {
  useRealtimeEvents,
  type RealtimeEventName,
} from "@/lib/useRealtimeEvents";
import styles from "./crm.module.css";
import CrmFilterHeader from "./CrmFilterHeader";

type DealStatus =
  | "new"
  | "ongoing"
  | "no_contact"
  | "waiting"
  | "presentation"
  | "negotiation"
  | "won"
  | "lost"
  | "canceled";

type ViewMode = "kanban" | "list";
type ScopeFilter =
  | "all"
  | "mine"
  | "team"
  | "unassigned"
  | "overdue"
  | "open"
  | "won"
  | "lost";
type SortMode =
  | "created-desc"
  | "created-asc"
  | "updated-desc"
  | "value-desc"
  | "value-asc"
  | "oldest-no-contact"
  | "next-follow-up"
  | "overdue-first";
type PeriodFilter =
  | "today"
  | "yesterday"
  | "last-7"
  | "last-30"
  | "this-month"
  | "last-month"
  | "custom";
type Priority = "low" | "medium" | "high" | "urgent";
type DetailTab =
  | "lead"
  | "service"
  | "tasks"
  | "history"
  | "sale"
  | "integrations";
type OptionsModal = "import" | "funnel" | "stages" | "permissions";
type DealOutcome = "won" | "lost";
type StageIcon = string;
type CrmLoadOptions = {
  incomingAttendanceId?: string;
  placeNewDeals?: boolean;
};
type ChatmixRealtimeMessage = {
  attendanceId?: string | number | null;
  attendance_id?: string | number | null;
  payload?: {
    attendanceId?: string | number | null;
    attendance_id?: string | number | null;
  };
};

const STAGE_ICONS_STORAGE_KEY = "crm-stage-icons-v1";
const CRM_REALTIME_EVENTS: RealtimeEventName[] = ["chatmix-webhook"];
const stageIconOptions = [
  { value: "", label: "Sem ícone" },
  { value: "/conversion-icons/whatsapp.png", label: "WhatsApp" },
  { value: "/conversion-icons/chatmix.png", label: "ChatMix" },
  { value: "/conversion-icons/sgp.png", label: "SGP" },
];

type Deal = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  neighborhood: string;
  address: string;
  status: DealStatus;
  stageId: string;
  pipelineId?: string;
  source: string;
  affiliate: string;
  campaign: string;
  value: number;
  monthlyValue: number;
  plan: string;
  cardColor?: string;
  owner: string;
  createdByUserId: number | null;
  createdByUserName: string;
  responsibleUserId: number | null;
  responsibleUserName: string;
  responsibleUserPhotoUrl: string | null;
  updatedByUserId: number | null;
  activity: string;
  createdAt: string;
  updatedAt: string;
  lastInteractionAt: string;
  nextFollowUpAt: string;
  priority: Priority;
  attempts: number;
  notes: string;
  trackingCode: string;
  chatmixId: string;
  conversionId?: number | null;
  sgpId: string;
  sale?: {
    plan: string;
    monthlyValue: number;
    installationFee: number;
    closedAt: string;
    installationAt: string | null;
    installationStatus: string;
    commission: number;
  };
  history: string[];
  tasks: Array<{
    id: string;
    title: string;
    status: "pending" | "overdue" | "done";
    dueAt: string | null;
  }>;
};

type KanbanColumn = {
  id: string;
  title: string;
  color: string;
  slaHours: number;
  isFinal?: boolean;
  isWonStage?: boolean;
  isLostStage?: boolean;
};

const funnels = [
  "Funil Vendas Chatmix",
  "Funil Afiliados",
  "Funil Renovacao",
  "Funil Pessoa Fisica",
  "Funil Pessoa Juridica",
  "Funil Pos-venda",
];

const defaultStages: KanbanColumn[] = [
  {
    id: "sem-contato",
    title: "Novo contato",
    color: "#64748b",
    slaHours: 24,
  },
  {
    id: "em-atendimento",
    title: "Em atendimento",
    color: "#0891b2",
    slaHours: 48,
  },
  {
    id: "apresentacao",
    title: "Apresentacao",
    color: "#2563eb",
    slaHours: 72,
  },
  {
    id: "informacoes",
    title: "Informações cadastrais",
    color: "#7c3aed",
    slaHours: 24,
  },
  {
    id: "venda-concluida",
    title: "Venda concluida",
    color: "#16a34a",
    slaHours: 0,
    isWonStage: true,
  },
  {
    id: "venda-perdida",
    title: "Venda perdida",
    color: "#6b7280",
    slaHours: 0,
    isLostStage: true,
  },
];

const demoDeals: Deal[] = [
];

const statusOptions: Array<{ id: DealStatus; name: string; color: string }> = [
  { id: "new", name: "Nova", color: "#fdfdfd" },
  { id: "ongoing", name: "Em andamento", color: "#0891b2" },
  { id: "no_contact", name: "Sem contato", color: "#64748b" },
  { id: "waiting", name: "Aguardando retorno", color: "#ca8a04" },
  { id: "presentation", name: "Apresentacao enviada", color: "#7c3aed" },
  { id: "negotiation", name: "Em negociação", color: "#db2777" },
  { id: "won", name: "Venda concluida", color: "#16a34a" },
  { id: "lost", name: "Venda perdida", color: "#6b7280" },
  { id: "canceled", name: "Cancelada", color: "#991b1b" },
];

const periodOptions: Array<{ id: PeriodFilter; name: string }> = [
  { id: "today", name: "Hoje" },
  { id: "yesterday", name: "Ontem" },
  { id: "last-7", name: "Ultimos 7 dias" },
  { id: "last-30", name: "Ultimos 30 dias" },
  { id: "this-month", name: "Este mês" },
  { id: "last-month", name: "Mês passado" },
  { id: "custom", name: "Período personalizado" },
];

const priorityLabels: Record<Priority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

const detailTabs: Array<{ id: DetailTab; name: string }> = [
  { id: "lead", name: "Dados do lead" },
  { id: "service", name: "Atendimento" },
  { id: "tasks", name: "Tarefas" },
  { id: "history", name: "Histórico" },
  { id: "sale", name: "Venda" },
  { id: "integrations", name: "Integracoes" },
];

type QuickStatusOption = {
  id: DealStatus;
  name: string;
  cardColor: string;
  dotColor: string;
};

type CardOptionCatalog = {
  attendants: string[];
  phones: string[];
  emails: string[];
  cities: string[];
  neighborhoods: string[];
  addresses: string[];
  sources: string[];
  conversionCodes: string[];
  affiliates: string[];
  campaigns: string[];
  plans: string[];
  estimatedValues: string[];
  statuses: QuickStatusOption[];
};

type CardTextCatalogKey = Exclude<keyof CardOptionCatalog, "statuses">;

const CRM_CARD_OPTIONS_STORAGE_KEY = "afiliados-netbox:crm:card-options-v1";
const emptyCardOptionCatalog: CardOptionCatalog = {
  attendants: [],
  phones: [],
  emails: [],
  cities: [],
  neighborhoods: [],
  addresses: [],
  sources: [],
  conversionCodes: [],
  affiliates: [],
  campaigns: [],
  plans: [],
  estimatedValues: [],
  statuses: [],
};

const quickStatusOptions: QuickStatusOption[] = [
  {
    id: "new",
    name: "Nova",
    cardColor: "#fbfdff",
    dotColor: "#2563eb",
  },
  {
    id: "ongoing",
    name: "Em andamento",
    cardColor: "#cffafe",
    dotColor: "#0891b2",
  },
  {
    id: "no_contact",
    name: "Sem contato",
    cardColor: "#fee2e2",
    dotColor: "#f87171",
  },
  {
    id: "waiting",
    name: "Aguardando retorno",
    cardColor: "#fef3c7",
    dotColor: "#ca8a04",
  },
  {
    id: "presentation",
    name: "Apresentacao enviada",
    cardColor: "#ede9fe",
    dotColor: "#7c3aed",
  },
  {
    id: "negotiation",
    name: "Em negociação",
    cardColor: "#fce7f3",
    dotColor: "#db2777",
  },
  {
    id: "won",
    name: "Venda concluida",
    cardColor: "#dcfce7",
    dotColor: "#16a34a",
  },
  {
    id: "lost",
    name: "Venda perdida",
    cardColor: "#f3f4f6",
    dotColor: "#6b7280",
  },
  {
    id: "canceled",
    name: "Cancelada",
    cardColor: "#ffe4e6",
    dotColor: "#991b1b",
  },
];

const newDealDefaults = {
  customerName: "",
  phone: "",
  email: "",
  city: "",
  neighborhood: "",
  address: "",
  source: "WhatsApp direto",
  affiliate: "",
  campaign: "",
  stageId: "sem-contato",
  status: "new" as DealStatus,
  value: "149.90",
  plan: "Fibra 600 Mega",
  owner: "Mateus",
  notes: "",
};

type StageForm = {
  id: string | null;
  name: string;
  color: string;
  slaHours: string;
  position: string;
  isFinal: boolean;
  isWonStage: boolean;
  isLostStage: boolean;
  icon: StageIcon;
};

const defaultStageForm: StageForm = {
  id: null,
  name: "",
  color: "#64748b",
  slaHours: "24",
  position: "",
  isFinal: false,
  isWonStage: false,
  isLostStage: false,
  icon: "",
};

type CardEditForm = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  neighborhood: string;
  address: string;
  createdAt: string;
  owner: string;
  responsibleUserId: number | null;
  trackingCode: string;
  status: DealStatus;
  source: string;
  affiliate: string;
  campaign: string;
  plan: string;
  monthlyValue: string;
  priority: Priority;
  cardColor: string;
  notes: string;
};

type TaskForm = {
  id: string | null;
  dealId: string;
  title: string;
  status: "pending" | "overdue" | "done";
  dueAt: string;
};

const defaultTaskForm: TaskForm = {
  id: null,
  dealId: "",
  title: "",
  status: "pending",
  dueAt: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCardDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCardTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDealPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return value || "Não informado";
}

function toTime(value: string) {
  const date = new Date(value).getTime();

  return Number.isNaN(date) ? 0 : date;
}

function toDateTimeInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 16);
}

function normalizeTextOptions(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).sort((first, second) => first.localeCompare(second, "pt-BR"));
}

function mergeStatusOptions(
  ...groups: Array<QuickStatusOption[]>
): QuickStatusOption[] {
  const options = new Map<string, QuickStatusOption>();

  groups.flat().forEach((option) => {
    if (option.id && option.name && !options.has(option.id)) {
      options.set(option.id, option);
    }
  });

  return Array.from(options.values());
}

function readCardOptionCatalog(): CardOptionCatalog {
  if (typeof window === "undefined") {
    return emptyCardOptionCatalog;
  }

  try {
    const raw = window.localStorage.getItem(CRM_CARD_OPTIONS_STORAGE_KEY);

    if (!raw) {
      return emptyCardOptionCatalog;
    }

    const parsed = JSON.parse(raw) as Partial<CardOptionCatalog>;
    const statuses = Array.isArray(parsed.statuses)
      ? parsed.statuses.filter(
          (status): status is QuickStatusOption =>
            Boolean(status) &&
            typeof status.id === "string" &&
            typeof status.name === "string" &&
            typeof status.cardColor === "string" &&
            typeof status.dotColor === "string",
        )
      : [];

    return {
      attendants: normalizeTextOptions(parsed.attendants),
      phones: normalizeTextOptions(parsed.phones),
      emails: normalizeTextOptions(parsed.emails),
      cities: normalizeTextOptions(parsed.cities),
      neighborhoods: normalizeTextOptions(parsed.neighborhoods),
      addresses: normalizeTextOptions(parsed.addresses),
      sources: normalizeTextOptions(parsed.sources),
      conversionCodes: normalizeTextOptions(parsed.conversionCodes),
      affiliates: normalizeTextOptions(parsed.affiliates),
      campaigns: normalizeTextOptions(parsed.campaigns),
      plans: normalizeTextOptions(parsed.plans),
      estimatedValues: normalizeTextOptions(parsed.estimatedValues),
      statuses,
    };
  } catch {
    return emptyCardOptionCatalog;
  }
}

function isOverdue(deal: Deal) {
  return (
    !["won", "lost", "canceled"].includes(deal.status) &&
    toTime(deal.nextFollowUpAt) > 0 &&
    toTime(deal.nextFollowUpAt) < Date.now()
  );
}

function isNearDue(deal: Deal) {
  const dueAt = toTime(deal.nextFollowUpAt);
  const diff = dueAt - Date.now();

  return (
    !isOverdue(deal) &&
    !["won", "lost", "canceled"].includes(deal.status) &&
    diff > 0 &&
    diff <= 1000 * 60 * 60 * 24
  );
}

function getStatusMeta(status: DealStatus) {
  return statusOptions.find((item) => item.id === status) || statusOptions[0];
}

function getStage(stages: KanbanColumn[], stageId: string) {
  return stages.find((stage) => stage.id === stageId) || stages[0];
}

function getQuickStatusCardColor(status: DealStatus) {
  return (
    quickStatusOptions.find((option) => option.id === status)?.cardColor || ""
  );
}

function normalizeTitle(value: string) {
  return value.trim() || "Sem etapa";
}

function isNewContactStage(stage: Pick<KanbanColumn, "id" | "title">) {
  const title = stage.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return title === "novo contato";
}

function getNewContactStageId(stages: KanbanColumn[]) {
  return (
    stages.find(isNewContactStage)?.id ||
    stages[0]?.id ||
    stages.find((stage) => !stage.isFinal)?.id ||
    "sem-contato"
  );
}

function getVisibleStageTitle(stage: Pick<KanbanColumn, "id" | "title">) {
  return stage.title;
}

function placeStageAtPosition(
  stages: KanbanColumn[],
  stage: KanbanColumn,
  position?: number,
) {
  const currentIndex = stages.findIndex((item) => item.id === stage.id);
  const withoutStage = stages.filter((item) => item.id !== stage.id);
  const requestedIndex = Number.isFinite(position)
    ? Number(position) - 1
    : currentIndex >= 0
      ? currentIndex
      : withoutStage.length;
  const targetIndex = Math.max(
    0,
    Math.min(requestedIndex, withoutStage.length),
  );
  const nextStages = [...withoutStage];

  nextStages.splice(targetIndex, 0, stage);
  return nextStages;
}

function darkenHexColor(value: string, amount = 48) {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);

  if (!match) {
    return "#b8c3cc";
  }

  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((item) => item + item)
          .join("")
      : match[1];
  const channels = [0, 2, 4].map((start) =>
    Math.max(0, parseInt(hex.slice(start, start + 2), 16) - amount),
  );

  return `#${channels
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

const CRM_LOCAL_DEAL_EDITS_KEY = "afiliados-netbox:crm:deal-edits";

type LocalDealEdits = Record<string, Partial<Deal>>;

function readLocalDealEdits(): LocalDealEdits {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CRM_LOCAL_DEAL_EDITS_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as LocalDealEdits)
      : {};
  } catch {
    return {};
  }
}

function persistLocalDealEdit(dealId: string, patch: Partial<Deal>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const edits = readLocalDealEdits();

    window.localStorage.setItem(
      CRM_LOCAL_DEAL_EDITS_KEY,
      JSON.stringify({
        ...edits,
        [dealId]: {
          ...edits[dealId],
          ...patch,
        },
      }),
    );
  } catch {
    // A edição continua aplicada na tela quando o armazenamento está indisponível.
  }
}

function mergeLocalDealEdits(sourceDeals: Deal[]) {
  const edits = readLocalDealEdits();

  return sourceDeals.map((deal) => {
    // Cartões persistidos sempre usam o backend como fonte de verdade.
    if (/^\d+$/.test(deal.id)) {
      return deal;
    }

    const localEdit = edits[deal.id];

    if (!localEdit) {
      return deal;
    }

    return {
      ...deal,
      ...localEdit,
      history: Array.isArray(localEdit.history)
        ? localEdit.history
        : deal.history,
      tasks: Array.isArray(localEdit.tasks) ? localEdit.tasks : deal.tasks,
      sale: localEdit.sale === undefined ? deal.sale : localEdit.sale,
    };
  });
}

function normalizeBackendStatus(value: string): DealStatus {
  return value?.trim() ? (value as DealStatus) : "ongoing";
}

function normalizeBackendPriority(value: string): Priority {
  return ["low", "medium", "high", "urgent"].includes(value)
    ? (value as Priority)
    : "medium";
}

function normalizeTaskStatus(value: string): "pending" | "overdue" | "done" {
  return value === "overdue" || value === "done" ? value : "pending";
}

function createDealFromBackend(record: BackendCrmDeal): Deal {
  const now = new Date().toISOString();

  return {
    id: record.id,
    customerName: record.customerName || "Negociação sem nome",
    phone: record.phone || "",
    email: record.email || "",
    city: record.city || "",
    neighborhood: record.neighborhood || "",
    address: record.address || "",
    status: normalizeBackendStatus(record.status),
    stageId: record.stageId,
    pipelineId: record.funnelId,
    source: record.source || "CRM",
    affiliate: record.affiliate || "Sem afiliado",
    campaign: record.campaign || "Sem campanha",
    value: Number(record.value) || 0,
    monthlyValue: Number(record.monthlyValue) || 0,
    plan: record.plan || "A definir",
    cardColor: record.cardColor || "",
    owner:
      record.responsibleUserName ||
      (!record.responsibleUserId ? record.owner || "" : ""),
    createdByUserId: record.createdByUserId,
    createdByUserName: record.createdByUserName || "",
    responsibleUserId: record.responsibleUserId ?? null,
    responsibleUserName:
      record.responsibleUserName ||
      (!record.responsibleUserId ? record.owner || "" : ""),
    responsibleUserPhotoUrl: record.responsibleUserPhotoUrl,
    updatedByUserId: record.updatedByUserId,
    activity: record.activity || "1o contato - 24 horas",
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
    lastInteractionAt: record.lastInteractionAt || record.updatedAt || now,
    nextFollowUpAt: record.nextFollowUpAt || record.updatedAt || now,
    priority: normalizeBackendPriority(record.priority),
    attempts: Number(record.attempts) || 0,
    notes: record.notes || "",
    trackingCode: record.trackingCode || "",
    chatmixId: record.chatmixId || "",
    conversionId: record.conversionId,
    sgpId: record.sgpId || "",
    sale: record.sale
      ? {
          plan: record.sale.plan,
          monthlyValue: Number(record.sale.monthlyValue) || 0,
          installationFee: Number(record.sale.installationFee) || 0,
          closedAt: record.sale.closedAt,
          installationAt: record.sale.installationAt,
          installationStatus: record.sale.installationStatus,
          commission: Number(record.sale.commission) || 0,
        }
      : undefined,
    history: (record.history || []).map(
      (item) => `${formatDateTime(item.createdAt)} - ${item.message}`,
    ),
    tasks: (record.tasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      status: normalizeTaskStatus(task.status),
      dueAt: task.dueAt,
    })),
  };
}

function createBackendDealPayload(deal: Deal) {
  return {
    customerName: deal.customerName,
    phone: deal.phone,
    email: deal.email,
    city: deal.city,
    neighborhood: deal.neighborhood,
    address: deal.address,
    status: deal.status,
    stageId: deal.stageId,
    funnelId: deal.pipelineId,
    source: deal.source,
    affiliate: deal.affiliate,
    campaign: deal.campaign,
    value: deal.value,
    monthlyValue: deal.monthlyValue,
    plan: deal.plan,
    cardColor: deal.cardColor || "",
    owner: deal.owner,
    responsibleUserId: deal.responsibleUserId,
    activity: deal.activity,
    lastInteractionAt: deal.lastInteractionAt,
    nextFollowUpAt: deal.nextFollowUpAt,
    priority: deal.priority,
    attempts: deal.attempts,
    notes: deal.notes,
    trackingCode: deal.trackingCode,
    chatmixId: deal.chatmixId,
    sgpId: deal.sgpId,
  };
}

function createBackendTaskPayload(deal: Deal) {
  return {
    activity: deal.activity,
    nextFollowUpAt: deal.nextFollowUpAt,
    tasks: deal.tasks,
    history: deal.history,
  };
}

function isDemoDeal(id: string) {
  return /^deal-\d+$/.test(id);
}

function getDealVisualClass(status: DealStatus) {
  if (status === "won") {
    return styles.dealCardWon;
  }

  if (status === "lost") {
    return styles.dealCardLost;
  }

  if (status === "canceled") {
    return styles.dealCardCanceled;
  }

  return "";
}

function getDealBorderColor(deal: Deal) {
  if (deal.cardColor) {
    return darkenHexColor(deal.cardColor);
  }

  if (isOverdue(deal)) {
    return "#e11d48";
  }

  if (isNearDue(deal) || deal.priority === "urgent") {
    return "#d97706";
  }

  if (deal.status === "won") {
    return "#15803d";
  }

  if (deal.status === "lost") {
    return "#475569";
  }

  if (deal.status === "canceled") {
    return "#7f1d1d";
  }

  return darkenHexColor(getQuickStatusCardColor(deal.status) || "#e2e8f0");
}

export default function Crm() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [stages, setStages] = useState<KanbanColumn[]>(defaultStages);
  const [stageIcons, setStageIcons] = useState<Record<string, StageIcon>>({});
  const [stageIconsLoaded, setStageIconsLoaded] = useState(false);
  const [cardOptionCatalog, setCardOptionCatalog] =
    useState<CardOptionCatalog>(emptyCardOptionCatalog);
  const [cardOptionCatalogLoaded, setCardOptionCatalogLoaded] = useState(false);
  const [databaseAffiliates, setDatabaseAffiliates] = useState<Affiliate[]>([]);
  const [databaseCampaigns, setDatabaseCampaigns] = useState<Campaign[]>([]);
  const [databaseCities, setDatabaseCities] = useState<City[]>([]);
  const [databaseLinks, setDatabaseLinks] = useState<LinkItem[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [availableFunnels, setAvailableFunnels] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedFunnelId, setSelectedFunnelId] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState<number | null>(
    null,
  );
  const [filterConditions, setFilterConditions] = useState<
    CrmFilterCondition[]
  >([]);
  const [crmPermissions, setCrmPermissions] = useState<CrmPermissions>({
    canViewAll: false,
    canViewTeam: false,
    canViewUnassigned: false,
    canShareFilters: false,
    canTransfer: false,
  });
  const [currentCrmUser, setCurrentCrmUser] = useState<{
    id: number;
    name: string;
  } | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const stored = window.localStorage.getItem("afiliados_netbox_user");
      if (!stored) return null;
      const user = JSON.parse(stored) as { id?: unknown; name?: unknown };
      const id = Number(user.id);
      return Number.isInteger(id) && typeof user.name === "string"
        ? { id, name: user.name }
        : null;
    } catch {
      return null;
    }
  });
  const [deals, setDeals] = useState<Deal[]>(() =>
    mergeLocalDealEdits(demoDeals),
  );
  const dealsRef = useRef<Deal[]>(deals);
  const initialCrmLoadedRef = useRef(false);
  const crmRequestRef = useRef<AbortController | null>(null);
  const knownAttendanceIdsRef = useRef<Set<string>>(new Set());
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null);
  const [deletingStageId, setDeletingStageId] = useState<string | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState(funnels[0]);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("created-desc");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("last-30");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [generalMenuOpen, setGeneralMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [cardEditOpen, setCardEditOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [syncDetailsOpen, setSyncDetailsOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [optionsModal, setOptionsModal] = useState<OptionsModal | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("lead");
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  const [activeStatusMenuId, setActiveStatusMenuId] = useState<string | null>(
    null,
  );
  const [observationDealId, setObservationDealId] = useState<string | null>(
    null,
  );
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [syncMessage, setSyncMessage] = useState(
    "Kanban demonstrativo. Configure o token do RD para sincronizar.",
  );
  const [syncStatus, setSyncStatus] = useState<"info" | "success" | "warning">(
    "info",
  );
  const [advancedFilters, setAdvancedFilters] = useState({
    affiliate: "",
    campaign: "",
    city: "",
    owner: "",
    source: "",
    minValue: "",
    maxValue: "",
    overdue: false,
    noContact: false,
    pendingTask: false,
  });
  const [newDeal, setNewDeal] = useState(newDealDefaults);
  const [stageForm, setStageForm] = useState<StageForm>(defaultStageForm);

  useEffect(() => {
    let storedIcons: Record<string, StageIcon> = {};

    try {
      const stored = window.localStorage.getItem(STAGE_ICONS_STORAGE_KEY);
      if (stored) {
        storedIcons = JSON.parse(stored) as Record<string, StageIcon>;
      }
    } catch {
      // Mantém os ícones vazios quando o armazenamento estiver indisponível.
    }

    queueMicrotask(() => {
      setStageIcons(storedIcons);
      setStageIconsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!stageIconsLoaded) {
      return;
    }

    window.localStorage.setItem(
      STAGE_ICONS_STORAGE_KEY,
      JSON.stringify(stageIcons),
    );
  }, [stageIcons, stageIconsLoaded]);

  useEffect(() => {
    const storedCatalog = readCardOptionCatalog();

    queueMicrotask(() => {
      setCardOptionCatalog(storedCatalog);
      setCardOptionCatalogLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!cardOptionCatalogLoaded) {
      return;
    }

    try {
      window.localStorage.setItem(
        CRM_CARD_OPTIONS_STORAGE_KEY,
        JSON.stringify(cardOptionCatalog),
      );
    } catch {
      // As opções continuam disponíveis durante a sessão atual.
    }
  }, [cardOptionCatalog, cardOptionCatalogLoaded]);

  useEffect(() => {
    let active = true;

    void Promise.allSettled([
      listarAfiliados(),
      listarCampanhas(),
      listarCidadesTocantins(),
      listarLinks(),
      listarUsuariosAtribuiveis().catch(() => listarUsuarios()),
    ]).then(([affiliates, campaigns, cities, links, users]) => {
      if (!active) {
        return;
      }

      if (affiliates.status === "fulfilled") {
        setDatabaseAffiliates(affiliates.value);
      }
      if (campaigns.status === "fulfilled") {
        setDatabaseCampaigns(campaigns.value);
      }
      if (cities.status === "fulfilled") {
        setDatabaseCities(cities.value);
      }
      if (links.status === "fulfilled") {
        setDatabaseLinks(links.value);
      }
      if (users.status === "fulfilled") {
        setAssignableUsers(users.value);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    dealsRef.current = deals;
    deals.forEach((deal) => {
      if (deal.chatmixId) {
        knownAttendanceIdsRef.current.add(String(deal.chatmixId));
      }
    });
  }, [deals]);

  const [cardEditForm, setCardEditForm] = useState<CardEditForm | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(defaultTaskForm);
  const [importLeadsText, setImportLeadsText] = useState("");
  const [permissionSettings, setPermissionSettings] = useState({
    teamCanMoveCards: true,
    teamCanEditCards: true,
    teamCanDeleteColumns: false,
  });
  const [dealOutcome, setDealOutcome] = useState<{
    type: DealOutcome;
    dealName: string;
  } | null>(null);

  const loadCrm = useCallback(async (options: CrmLoadOptions = {}) => {
    crmRequestRef.current?.abort();
    const requestController = new AbortController();
    crmRequestRef.current = requestController;
    const placeIncomingWebhookDeals = options.placeNewDeals ?? false;
    const incomingAttendanceId = options.incomingAttendanceId?.trim() || "";
    setLoadingCrm(true);
    setSyncStatus("info");
    setSyncMessage("Sincronizando CRM com clientes convertidos...");

    try {
      const crmData = await listarCrmDeals({
        syncConverted: !initialCrmLoadedRef.current,
        funnelId: selectedFunnelId || undefined,
        scope: scopeFilter,
        responsibleUserId: responsibleUserId || undefined,
        status: statusFilter,
        sort: sortMode,
        filters: filterConditions,
      }, requestController.signal);

      setAvailableFunnels(
        crmData.funnels.map((funnel) => ({
          id: funnel.id,
          name: funnel.name,
        })),
      );
      if (crmData.permissions) {
        setCrmPermissions(crmData.permissions);
      }
      if (crmData.currentUser?.id) {
        setCurrentCrmUser({
          id: crmData.currentUser.id,
          name: crmData.currentUser.name,
        });
      }
      if (!selectedFunnelId && crmData.funnels[0]) {
        setSelectedFunnelId(crmData.funnels[0].id);
        setSelectedFunnel(crmData.funnels[0].name);
      } else {
        const activeFunnel = crmData.funnels.find(
          (funnel) => funnel.id === selectedFunnelId,
        );
        if (activeFunnel) setSelectedFunnel(activeFunnel.name);
      }

      if (crmData.statuses.length > 0) {
        const apiStatuses: QuickStatusOption[] = crmData.statuses.map(
          (status) => ({
            id: status.id as DealStatus,
            name: status.name,
            cardColor: "#e0f2fe",
            dotColor: status.color || "#0369a1",
          }),
        );

        setCardOptionCatalog((current) => ({
          ...current,
          statuses: mergeStatusOptions(current.statuses, apiStatuses),
        }));
      }

      {
        const nextStages =
          crmData.stages.length > 0
            ? crmData.stages.map((stage) => ({
                id: stage.id,
                title: getVisibleStageTitle(stage),
                color: stage.color,
                slaHours: stage.slaHours,
                isFinal: stage.isFinal,
                isWonStage: stage.isWonStage,
                isLostStage: stage.isLostStage,
              }))
            : defaultStages;
        const backendStageIcons = Object.fromEntries(
          crmData.stages
            .filter((stage) => Boolean(stage.icon))
            .map((stage) => [stage.id, stage.icon as string]),
        );
        const newContactStageId = getNewContactStageId(nextStages);
        const knownDealIds = new Set(
          dealsRef.current.map((deal) => deal.id),
        );
        const mappedDeals = mergeLocalDealEdits(
          crmData.deals.map(createDealFromBackend),
        );
        const incomingWebhookDeals = placeIncomingWebhookDeals
          ? mappedDeals.filter(
              (deal) =>
                (incomingAttendanceId !== "" &&
                  String(deal.chatmixId) === incomingAttendanceId) ||
                !knownDealIds.has(deal.id),
            )
          : [];
        const incomingWebhookIds = new Set(
          incomingWebhookDeals.map((deal) => deal.id),
        );
        const nextDeals = mappedDeals.map((deal) =>
          incomingWebhookIds.has(deal.id)
            ? {
                ...deal,
                stageId: newContactStageId,
                status: "new" as DealStatus,
                activity: "Novo atendimento recebido via webhook",
              }
            : deal,
        );

        setStages(nextStages);
        if (Object.keys(backendStageIcons).length > 0) {
          setStageIcons((current) => ({
            ...current,
            ...backendStageIcons,
          }));
        }
        setDeals(nextDeals);
        dealsRef.current = nextDeals;
        initialCrmLoadedRef.current = true;

        if (incomingWebhookDeals.length > 0) {
          await Promise.allSettled(
            incomingWebhookDeals
              .filter((deal) => /^\d+$/.test(deal.id))
              .map((deal) =>
                atualizarCrmDeal(deal.id, {
                  stageId: newContactStageId,
                  status: "new",
                  activity: "Novo atendimento recebido via webhook",
                }),
              ),
          );
        }

        setSyncStatus("success");
        setSyncMessage(
          incomingWebhookDeals.length > 0
            ? `${incomingWebhookDeals.length} novo(s) atendimento(s) recebido(s) em Novo contato.`
            : crmData.sync
            ? `${crmData.sync.total} cliente(s) convertido(s) sincronizados do relatório.`
            : "CRM carregado do banco de dados.",
        );
        setLoadingCrm(false);
        return incomingWebhookDeals.length;
      }
    } catch (error) {
      if (
        requestController.signal.aborted ||
        (error instanceof Error && error.name === "CanceledError")
      ) {
        return 0;
      }
      setSyncStatus("warning");
      setSyncMessage(
        getApiErrorMessage(error, "Não foi possível carregar o CRM do banco."),
      );
    } finally {
      if (crmRequestRef.current === requestController) {
        setLoadingCrm(false);
      }
    }
  }, [
    filterConditions,
    responsibleUserId,
    scopeFilter,
    selectedFunnelId,
    sortMode,
    statusFilter,
  ]);

  useEffect(() => {
    const sync = window.setTimeout(() => {
      void loadCrm().finally(() => {
        initialCrmLoadedRef.current = true;
      });
    }, 0);

    return () => window.clearTimeout(sync);
  }, [loadCrm]);

  const refreshCrmFromWebhook = useCallback(
    (event: MessageEvent<string>) => {
      let attendanceId = "";

      try {
        const message = JSON.parse(event.data) as ChatmixRealtimeMessage;
        const rawAttendanceId =
          message.payload?.attendanceId ??
          message.payload?.attendance_id ??
          message.attendanceId ??
          message.attendance_id;
        attendanceId =
          rawAttendanceId == null ? "" : String(rawAttendanceId).trim();
      } catch {
        // Sem identificador, ainda atualiza os novos cartões do webhook.
      }

      const isNewAttendance = Boolean(
        attendanceId && !knownAttendanceIdsRef.current.has(attendanceId),
      );
      const options: CrmLoadOptions = {
        incomingAttendanceId: isNewAttendance ? attendanceId : undefined,
        placeNewDeals: attendanceId
          ? isNewAttendance
          : initialCrmLoadedRef.current,
      };

      void loadCrm(options).then((placedDeals) => {
        if (isNewAttendance && !placedDeals) {
          window.setTimeout(() => {
            void loadCrm({
              incomingAttendanceId: attendanceId,
              placeNewDeals: true,
            });
          }, 900);
        }
      });
    },
    [loadCrm],
  );

  useRealtimeEvents(refreshCrmFromWebhook, CRM_REALTIME_EVENTS);

  const cardFieldOptions = useMemo(
    () => ({
      attendants: normalizeTextOptions([
        ...cardOptionCatalog.attendants,
        ...deals.map((deal) => deal.owner),
      ]),
      phones: normalizeTextOptions([
        ...cardOptionCatalog.phones,
        ...deals.map((deal) => deal.phone),
      ]),
      emails: normalizeTextOptions([
        ...cardOptionCatalog.emails,
        ...deals.map((deal) => deal.email),
      ]),
      cities: normalizeTextOptions([
        ...cardOptionCatalog.cities,
        ...databaseCities.map((city) => city.name),
        ...deals.map((deal) => deal.city),
      ]),
      neighborhoods: normalizeTextOptions([
        ...cardOptionCatalog.neighborhoods,
        ...deals.map((deal) => deal.neighborhood),
      ]),
      addresses: normalizeTextOptions([
        ...cardOptionCatalog.addresses,
        ...deals.map((deal) => deal.address),
      ]),
      sources: normalizeTextOptions([
        ...cardOptionCatalog.sources,
        ...deals.map((deal) => deal.source),
      ]),
      conversionCodes: normalizeTextOptions([
        ...cardOptionCatalog.conversionCodes,
        ...databaseLinks.map((link) => link.shortCode),
        ...deals.flatMap((deal) => [
          deal.trackingCode,
          deal.conversionId ? String(deal.conversionId) : "",
        ]),
      ]),
      affiliates: normalizeTextOptions([
        ...cardOptionCatalog.affiliates,
        ...databaseAffiliates
          .filter((affiliate) => affiliate.active)
          .map((affiliate) => affiliate.name),
        ...deals.map((deal) => deal.affiliate),
      ]),
      campaigns: normalizeTextOptions([
        ...cardOptionCatalog.campaigns,
        ...databaseCampaigns.map((campaign) => campaign.name),
        ...deals.map((deal) => deal.campaign),
      ]),
      plans: normalizeTextOptions([
        ...cardOptionCatalog.plans,
        ...deals.map((deal) => deal.plan),
      ]),
      estimatedValues: normalizeTextOptions([
        ...cardOptionCatalog.estimatedValues,
        ...deals
          .filter((deal) => deal.monthlyValue > 0)
          .map((deal) => String(deal.monthlyValue)),
      ]),
    }),
    [
      cardOptionCatalog,
      databaseAffiliates,
      databaseCampaigns,
      databaseCities,
      databaseLinks,
      deals,
    ],
  );

  const conversionCodeOptions = cardFieldOptions.conversionCodes;
  const affiliateOptions = cardFieldOptions.affiliates;

  const allStatusOptions = useMemo(() => {
    const catalogStatuses = mergeStatusOptions(
      quickStatusOptions,
      cardOptionCatalog.statuses,
    );
    const knownIds = new Set(catalogStatuses.map((status) => status.id));
    const statusesFromDeals = deals
      .filter((deal) => !knownIds.has(deal.status))
      .map((deal) => ({
        id: deal.status,
        name: deal.activity || deal.status,
        cardColor: deal.cardColor || "#e0f2fe",
        dotColor: "#0369a1",
      }));

    return mergeStatusOptions(catalogStatuses, statusesFromDeals);
  }, [cardOptionCatalog.statuses, deals]);

  function getVisibleStatusMeta(status: DealStatus) {
    const option = allStatusOptions.find((item) => item.id === status);

    return option
      ? { id: option.id, name: option.name, color: option.dotColor }
      : getStatusMeta(status);
  }

  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === selectedDealId) || null,
    [deals, selectedDealId],
  );

  const legacyActiveFilterCount = useMemo(() => {
    return Object.values(advancedFilters).filter((value) =>
      typeof value === "boolean" ? value : Boolean(value),
    ).length;
  }, [advancedFilters]);
  const activeFilterCount = filterConditions.length + legacyActiveFilterCount;

  const filteredDeals = useMemo(() => {
    const filtered = deals.filter((deal) => {
      if (deal.status === "canceled" && statusFilter !== "canceled") {
        return false;
      }

      if (statusFilter !== "all" && deal.status !== statusFilter) {
        return false;
      }

      if (
        responsibleUserId !== null &&
        deal.responsibleUserId !== responsibleUserId &&
        !(
          !deal.responsibleUserId &&
          deal.owner ===
            assignableUsers.find((user) => user.id === responsibleUserId)?.name
        )
      ) {
        return false;
      }

      if (
        scopeFilter === "mine" &&
        currentCrmUser &&
        deal.responsibleUserId !== currentCrmUser.id &&
        !(
          !deal.responsibleUserId &&
          deal.owner.trim().toLocaleLowerCase("pt-BR") ===
            currentCrmUser.name.trim().toLocaleLowerCase("pt-BR")
        )
      ) {
        return false;
      }

      if (scopeFilter === "unassigned" && deal.owner) {
        return false;
      }

      if (scopeFilter === "overdue" && !isOverdue(deal)) {
        return false;
      }

      if (
        scopeFilter === "open" &&
        ["won", "lost", "canceled"].includes(deal.status)
      ) {
        return false;
      }

      if (scopeFilter === "won" && deal.status !== "won") {
        return false;
      }

      if (scopeFilter === "lost" && deal.status !== "lost") {
        return false;
      }

      if (
        advancedFilters.affiliate &&
        !deal.affiliate
          .toLowerCase()
          .includes(advancedFilters.affiliate.toLowerCase())
      ) {
        return false;
      }

      if (
        advancedFilters.campaign &&
        !deal.campaign
          .toLowerCase()
          .includes(advancedFilters.campaign.toLowerCase())
      ) {
        return false;
      }

      if (
        advancedFilters.city &&
        !deal.city.toLowerCase().includes(advancedFilters.city.toLowerCase())
      ) {
        return false;
      }

      if (
        advancedFilters.owner &&
        !deal.owner.toLowerCase().includes(advancedFilters.owner.toLowerCase())
      ) {
        return false;
      }

      if (
        advancedFilters.source &&
        !deal.source
          .toLowerCase()
          .includes(advancedFilters.source.toLowerCase())
      ) {
        return false;
      }

      const minValue = Number(advancedFilters.minValue);
      const maxValue = Number(advancedFilters.maxValue);

      if (
        Number.isFinite(minValue) &&
        minValue > 0 &&
        deal.monthlyValue < minValue
      ) {
        return false;
      }

      if (
        Number.isFinite(maxValue) &&
        maxValue > 0 &&
        deal.monthlyValue > maxValue
      ) {
        return false;
      }

      if (advancedFilters.overdue && !isOverdue(deal)) {
        return false;
      }

      if (advancedFilters.noContact && deal.attempts > 0) {
        return false;
      }

      if (
        advancedFilters.pendingTask &&
        !deal.tasks.some((task) => task.status !== "done")
      ) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "created-asc") {
        return toTime(a.createdAt) - toTime(b.createdAt);
      }

      if (sortMode === "updated-desc") {
        return toTime(b.updatedAt) - toTime(a.updatedAt);
      }

      if (sortMode === "value-desc") {
        return b.monthlyValue - a.monthlyValue;
      }

      if (sortMode === "value-asc") {
        return a.monthlyValue - b.monthlyValue;
      }

      if (sortMode === "oldest-no-contact") {
        return (
          a.attempts - b.attempts || toTime(a.createdAt) - toTime(b.createdAt)
        );
      }

      if (sortMode === "next-follow-up") {
        return toTime(a.nextFollowUpAt) - toTime(b.nextFollowUpAt);
      }

      if (sortMode === "overdue-first") {
        return Number(isOverdue(b)) - Number(isOverdue(a));
      }

      return toTime(b.createdAt) - toTime(a.createdAt);
    });
  }, [
    advancedFilters,
    assignableUsers,
    currentCrmUser,
    deals,
    responsibleUserId,
    scopeFilter,
    sortMode,
    statusFilter,
  ]);

  const totals = useMemo(
    () => ({
      deals: filteredDeals.length,
      amount: filteredDeals.reduce(
        (total, deal) => total + deal.monthlyValue,
        0,
      ),
    }),
    [filteredDeals],
  );

  const archivedDeals = useMemo(
    () => deals.filter((deal) => deal.status === "canceled"),
    [deals],
  );

  const syncLogs = useMemo(
    () => [
      {
        integration: "Banco do CRM",
        date: formatDateTime(new Date().toISOString()),
        status: syncStatus === "warning" ? "Falha" : "Sucesso",
        message: syncMessage,
        user: "Mateus",
      },
      {
        integration: "Chatmix",
        date: "05/07/2026 17:52",
        status: "Sucesso",
        message: "Atendimentos importados para o funil.",
        user: "Sistema",
      },
      {
        integration: "SGP",
        date: "05/07/2026 09:31",
        status: "Sucesso",
        message: "Venda validada como cliente/contrato.",
        user: "Sistema",
      },
    ],
    [syncMessage, syncStatus],
  );

  function updateDeal(dealId: string, patch: Partial<Deal>) {
    setDeals((current) =>
      current.map((deal) =>
        deal.id === dealId
          ? {
              ...deal,
              ...patch,
              updatedAt: new Date().toISOString(),
              history: [
                `${formatDateTime(new Date().toISOString())} - Negociação atualizada`,
                ...deal.history,
              ],
            }
          : deal,
      ),
    );
  }

  function showDealOutcome(type: DealOutcome, dealName: string) {
    setDealOutcome({
      type,
      dealName,
    });

    window.setTimeout(() => {
      setDealOutcome(null);
    }, 2600);
  }

  function createTaskForDeal(dealId: string) {
    setTaskForm({
      ...defaultTaskForm,
      dealId,
      dueAt: toDateTimeInputValue(new Date().toISOString()),
    });
    setTaskModalOpen(true);
    setSelectedDealId(dealId);
    setActiveDetailTab("tasks");
  }

  function editTaskForDeal(dealId: string, taskId: string) {
    const deal = deals.find((item) => item.id === dealId);
    const task = deal?.tasks.find((item) => item.id === taskId);

    if (!task) {
      return;
    }

    setTaskForm({
      id: task.id,
      dealId,
      title: task.title,
      status: task.status,
      dueAt: toDateTimeInputValue(task.dueAt),
    });
    setTaskModalOpen(true);
    setSelectedDealId(dealId);
    setActiveDetailTab("tasks");
  }

  async function persistTaskChanges(
    nextDeal: Deal,
    successMessage: string,
    warningMessage: string,
  ) {
    if (!/^\d+$/.test(nextDeal.id)) {
      setSyncStatus("success");
      setSyncMessage(successMessage);
      return;
    }

    try {
      await atualizarCrmDeal(nextDeal.id, createBackendTaskPayload(nextDeal));
      setSyncStatus("success");
      setSyncMessage(successMessage);
    } catch {
      setSyncStatus("warning");
      setSyncMessage(warningMessage);
    }
  }

  async function handleSaveTask() {
    const title = taskForm.title.trim();

    if (!title) {
      setSyncStatus("warning");
      setSyncMessage("Informe o título da tarefa.");
      return;
    }

    const now = new Date().toISOString();
    const dueAt = taskForm.dueAt ? new Date(taskForm.dueAt).toISOString() : null;
    const currentDeal = deals.find((deal) => deal.id === taskForm.dealId);

    if (!currentDeal) {
      setSyncStatus("warning");
      setSyncMessage("Negociação não encontrada para cadastrar a tarefa.");
      return;
    }

    const task = {
      id: taskForm.id || `task-${Date.now()}`,
      title,
      status: taskForm.status,
      dueAt,
    };
    const isEditing = Boolean(taskForm.id);
    const nextTasks = isEditing
      ? currentDeal.tasks.map((item) => (item.id === task.id ? task : item))
      : [task, ...currentDeal.tasks];
    const message = isEditing
      ? `Tarefa atualizada: ${task.title}`
      : `Tarefa criada: ${task.title}`;
    const nextDeal: Deal = {
      ...currentDeal,
      activity: isEditing ? "Tarefa atualizada" : "Nova tarefa criada",
      updatedAt: now,
      nextFollowUpAt: dueAt || currentDeal.nextFollowUpAt,
      tasks: nextTasks,
      history: [`${formatDateTime(now)} - ${message}`, ...currentDeal.history],
    };

    setDeals((current) =>
      current.map((deal) => (deal.id === nextDeal.id ? nextDeal : deal)),
    );

    setTaskModalOpen(false);
    setTaskForm(defaultTaskForm);

    await persistTaskChanges(
      nextDeal,
      isEditing ? "Tarefa atualizada e salva." : "Tarefa criada e salva.",
      isEditing
        ? "Tarefa atualizada na tela, mas não foi possível salvar no backend."
        : "Tarefa criada na tela, mas não foi possível salvar no backend.",
    );
  }

  async function deleteTaskForDeal(dealId: string, taskId: string) {
    const now = new Date().toISOString();
    const currentDeal = deals.find((deal) => deal.id === dealId);

    if (!currentDeal) {
      return;
    }

    const task = currentDeal.tasks.find((item) => item.id === taskId);
    const nextDeal: Deal = {
      ...currentDeal,
      activity: "Tarefa apagada",
      updatedAt: now,
      tasks: currentDeal.tasks.filter((item) => item.id !== taskId),
      history: [
        `${formatDateTime(now)} - Tarefa apagada${task ? `: ${task.title}` : ""}`,
        ...currentDeal.history,
      ],
    };

    setDeals((current) =>
      current.map((deal) => (deal.id === nextDeal.id ? nextDeal : deal)),
    );

    await persistTaskChanges(
      nextDeal,
      "Tarefa apagada e salva.",
      "Tarefa apagada na tela, mas não foi possível salvar no backend.",
    );
  }

  async function moveDeal(dealId: string, targetStageId: string) {
    const targetStage = getStage(stages, targetStageId);
    const movedDeal = deals.find((deal) => deal.id === dealId);
    const targetStatus = targetStage.isWonStage
      ? "won"
      : targetStage.isLostStage
        ? "lost"
        : undefined;

    updateDeal(dealId, {
      stageId: targetStageId,
      ...(targetStatus ? { status: targetStatus } : {}),
    });

    if (targetStage.isWonStage) {
      setSyncStatus("success");
      setSyncMessage("Venda concluida. Comissão do afiliado preparada.");
      if (movedDeal?.status !== "won") {
        showDealOutcome("won", movedDeal?.customerName || "Negociação");
      }
    } else if (targetStage.isLostStage) {
      setSyncStatus("warning");
      setSyncMessage(
        "Venda marcada como perdida. Informe o motivo no histórico.",
      );
      if (movedDeal?.status !== "lost") {
        showDealOutcome("lost", movedDeal?.customerName || "Negociação");
      }
    }

    if (!isDemoDeal(dealId) && /^\d+$/.test(dealId)) {
      try {
        await atualizarCrmDeal(dealId, {
          stageId: targetStageId,
          ...(targetStatus ? { status: targetStatus } : {}),
        });

        setSyncStatus("success");
        setSyncMessage("Etapa atualizada no banco do CRM.");
      } catch {
        setSyncStatus("warning");
        setSyncMessage(
          "Card movido localmente, mas não foi possível salvar no banco do CRM.",
        );
      }
      return;
    }

  }

  function handleDrop(targetStageId: string) {
    if (!draggingDealId) {
      return;
    }

    moveDeal(draggingDealId, targetStageId);
    setDraggingDealId(null);
  }

  function getEdgeScrollDelta(
    pointerPosition: number,
    start: number,
    end: number,
    edgeSize: number,
    maxSpeed: number,
  ) {
    if (pointerPosition < start + edgeSize) {
      const intensity = Math.min(
        1,
        Math.max(0, (start + edgeSize - pointerPosition) / edgeSize),
      );
      return -Math.max(4, Math.ceil(maxSpeed * intensity));
    }

    if (pointerPosition > end - edgeSize) {
      const intensity = Math.min(
        1,
        Math.max(0, (pointerPosition - (end - edgeSize)) / edgeSize),
      );
      return Math.max(4, Math.ceil(maxSpeed * intensity));
    }

    return 0;
  }

  function handleBoardDragOver(event: ReactDragEvent<HTMLElement>) {
    event.preventDefault();

    if (!draggingDealId && !draggingStageId) {
      return;
    }

    const board = event.currentTarget;
    const bounds = board.getBoundingClientRect();
    const edgeSize = Math.min(110, Math.max(64, bounds.width * 0.12));
    const delta = getEdgeScrollDelta(
      event.clientX,
      bounds.left,
      bounds.right,
      edgeSize,
      30,
    );

    if (delta !== 0) {
      board.scrollLeft += delta;
    }
  }

  function handleCardsDragOver(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!draggingDealId) {
      return;
    }

    const cards = event.currentTarget;
    const bounds = cards.getBoundingClientRect();
    const edgeSize = Math.min(92, Math.max(52, bounds.height * 0.18));
    const delta = getEdgeScrollDelta(
      event.clientY,
      bounds.top,
      bounds.bottom,
      edgeSize,
      24,
    );

    if (delta !== 0) {
      cards.scrollTop += delta;
    }
  }

  async function handleStageDrop(targetStageId: string) {
    if (!draggingStageId || draggingStageId === targetStageId) {
      setDraggingStageId(null);
      return;
    }

    const sourceIndex = stages.findIndex(
      (stage) => stage.id === draggingStageId,
    );
    const targetIndex = stages.findIndex((stage) => stage.id === targetStageId);

    if (sourceIndex < 0 || targetIndex < 0) {
      setDraggingStageId(null);
      return;
    }

    const reorderedStages = [...stages];
    const [movedStage] = reorderedStages.splice(sourceIndex, 1);
    reorderedStages.splice(targetIndex, 0, movedStage);
    setStages(reorderedStages);
    setDraggingStageId(null);

    const results = await Promise.allSettled(
      reorderedStages.map((stage, index) =>
        atualizarCrmStage(stage.id, { position: index + 1 }),
      ),
    );
    const failed = results.some((result) => result.status === "rejected");

    setSyncStatus(failed ? "warning" : "success");
    setSyncMessage(
      failed
        ? "Colunas reordenadas na tela, mas alguma posição não foi salva."
        : "Ordem das colunas atualizada com sucesso.",
    );
  }

  async function handleCreateDeal(saveAndTask = false) {
    const value = Number(newDeal.value.replace(",", "."));
    const id = `deal-${Date.now()}`;
    const now = new Date().toISOString();
    const fallbackStageId = stages.some((stage) => stage.id === newDeal.stageId)
      ? newDeal.stageId
      : stages[0]?.id || "sem-contato";
    const createdDeal: Deal = {
      id,
      customerName: newDeal.customerName || "NOVA NEGOCIAÇÃO",
      phone: newDeal.phone,
      email: newDeal.email,
      city: newDeal.city,
      neighborhood: newDeal.neighborhood,
      address: newDeal.address,
      status: newDeal.status,
      stageId: fallbackStageId,
      source: newDeal.source,
      affiliate: newDeal.affiliate || "Sem afiliado",
      campaign: newDeal.campaign || "Manual",
      value: Number.isFinite(value) ? value : 0,
      monthlyValue: Number.isFinite(value) ? value : 0,
      plan: newDeal.plan,
      owner: currentCrmUser?.name || newDeal.owner,
      createdByUserId: currentCrmUser?.id || null,
      createdByUserName: currentCrmUser?.name || "",
      responsibleUserId: currentCrmUser?.id || undefined,
      responsibleUserName: currentCrmUser?.name || newDeal.owner,
      responsibleUserPhotoUrl: null,
      updatedByUserId: null,
      activity: saveAndTask ? "Criar tarefa" : "1o contato - 24 horas",
      createdAt: now,
      updatedAt: now,
      lastInteractionAt: now,
      nextFollowUpAt: now,
      priority: "medium",
      attempts: 0,
      notes: newDeal.notes,
      trackingCode: `NBX-MAN-${String(Date.now()).slice(-4)}`,
      chatmixId: "",
      sgpId: "",
      history: [`${formatDateTime(now)} - Negociação criada manualmente`],
      tasks: saveAndTask
        ? [
            {
              id: `task-${Date.now()}`,
              title: "Primeiro contato",
              status: "pending",
              dueAt: now,
            },
          ]
        : [],
    };

    setDeals((current) => [createdDeal, ...current]);
    setCreateOpen(false);
    setNewDeal(newDealDefaults);
    setSyncStatus("info");
    setSyncMessage("Salvando negociação no backend...");

    try {
      const savedDeal = await criarCrmDeal(createBackendDealPayload(createdDeal));

      setDeals((current) =>
        current.map((deal) =>
          deal.id === id ? createDealFromBackend(savedDeal) : deal,
        ),
      );
      setSyncStatus("success");
      setSyncMessage("Negociação criada e salva no backend.");
    } catch (error) {
      setDeals((current) => current.filter((deal) => deal.id !== id));
      setSyncStatus("warning");
      setSyncMessage(
        getApiErrorMessage(
          error,
          "Não foi possível salvar a negociação no backend. O cartão não foi criado.",
        ),
      );
    }
  }

  async function handleTransferDeal(deal: Deal, nextUserId: number | null) {
    const targetName =
      assignableUsers.find((user) => user.id === nextUserId)?.name ||
      "Sem responsável";
    if (
      !window.confirm(
        `Transferir ${deal.customerName} para ${targetName}?`,
      )
    ) {
      return;
    }

    const previous = deals;
    setDeals((current) =>
      current.map((item) =>
        item.id === deal.id
          ? {
              ...item,
              responsibleUserId: nextUserId,
              responsibleUserName: targetName,
              owner: nextUserId ? targetName : "",
            }
          : item,
      ),
    );
    try {
      await transferirCrmDeal(deal.id, nextUserId, targetName);
      setSyncStatus("success");
      setSyncMessage(`Negociação transferida para ${targetName}.`);
      void loadCrm();
    } catch (error) {
      setDeals(previous);
      setSyncStatus("warning");
      setSyncMessage(
        getApiErrorMessage(error, "Não foi possível transferir a negociação."),
      );
    }
  }

  async function handleCardAction(action: string, deal: Deal) {
    setActiveCardMenuId(null);

    if (action === "details") {
      setSelectedDealId(deal.id);
      setActiveDetailTab("lead");
      return;
    }

    if (action === "edit") {
      openEditCardModal(deal);
      return;
    }

    if (action === "won") {
      moveDeal(
        deal.id,
        stages.find((stage) => stage.isWonStage)?.id || deal.stageId,
      );
      return;
    }

    if (action === "lost") {
      moveDeal(
        deal.id,
        stages.find((stage) => stage.isLostStage)?.id || deal.stageId,
      );
      return;
    }

    if (action === "whatsapp") {
      const message =
        "Ola, tudo bem? Aqui e da Netbox. Vi seu interesse em nossos planos de internet e estou entrando em contato para te ajudar.";
      window.open(
        `https://wa.me/55${deal.phone}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    if (action === "copy") {
      navigator.clipboard?.writeText(deal.phone);
      setSyncStatus("success");
      setSyncMessage("Telefone copiado para a área de transferencia.");
      return;
    }

    if (action === "task") {
      createTaskForDeal(deal.id);
      return;
    }

    if (action === "archive") {
      const patch: Partial<Deal> = {
        status: "canceled",
        cardColor: deal.cardColor || getQuickStatusCardColor(deal.status),
        activity: "Negociação arquivada",
      };

      updateDeal(deal.id, patch);
      setSyncStatus("warning");
      setSyncMessage(
        "Negociação arquivada. Ela pode ser restaurada em Opções.",
      );

      if (/^\d+$/.test(deal.id)) {
        try {
          await atualizarCrmDeal(deal.id, patch);
          setSyncStatus("success");
          setSyncMessage("Negociação arquivada no backend.");
        } catch {
          setSyncStatus("warning");
          setSyncMessage(
            "Negociação arquivada na tela, mas não foi possível salvar no backend.",
          );
        }
      }

      return;
    }

    setSelectedDealId(deal.id);
  }

  function clearAdvancedFilters() {
    setAdvancedFilters({
      affiliate: "",
      campaign: "",
      city: "",
      owner: "",
      source: "",
      minValue: "",
      maxValue: "",
      overdue: false,
      noContact: false,
      pendingTask: false,
    });
  }

  function exportDealsCsv() {
    const headers = [
      "Cliente",
      "Telefone",
      "Email",
      "Cidade",
      "Status",
      "Etapa",
      "Origem",
      "Afiliado",
      "Campanha",
      "Valor mensal",
      "Atualizado em",
    ];
    const rows = filteredDeals.map((deal) => [
      deal.customerName,
      deal.phone,
      deal.email,
      deal.city,
      getVisibleStatusMeta(deal.status).name,
      getStage(stages, deal.stageId)?.title || "",
      deal.source,
      deal.affiliate,
      deal.campaign,
      String(deal.monthlyValue).replace(".", ","),
      formatDateTime(deal.updatedAt),
    ]);
    const escapeCell = (value: string) =>
      `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `negociações-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setSyncStatus("success");
    setSyncMessage(`${filteredDeals.length} negociação(oes) exportada(s).`);
  }

  async function importLeadsFromText() {
    const lines = importLeadsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setSyncStatus("warning");
      setSyncMessage("Cole ao menos um lead para importar.");
      return;
    }

    const now = new Date().toISOString();
    const fallbackStageId = stages[0]?.id || "sem-contato";
    const importedDeals = lines.map((line, index) => {
      const [customerName, phone = "", email = "", city = ""] = line
        .split(/[;,]/)
        .map((value) => value.trim());

      return {
        ...newDealDefaults,
        id: `import-${Date.now()}-${index}`,
        customerName: customerName || "LEAD IMPORTADO",
        phone,
        email,
        city,
        stageId: fallbackStageId,
        status: "no_contact" as DealStatus,
        source: "Importação manual",
        affiliate: "Sem afiliado",
        campaign: "Importação",
        value: 0,
        monthlyValue: 0,
        owner: "Equipe Netbox",
        createdByUserId: null,
        createdByUserName: "",
        responsibleUserId: null,
        responsibleUserName: "",
        responsibleUserPhotoUrl: null,
        updatedByUserId: null,
        activity: "Lead importado",
        createdAt: now,
        updatedAt: now,
        lastInteractionAt: now,
        nextFollowUpAt: now,
        priority: "medium" as Priority,
        attempts: 0,
        notes: "Lead importado pelo menu de opções.",
        trackingCode: `NBX-IMP-${String(Date.now()).slice(-4)}-${index + 1}`,
        chatmixId: "",
        sgpId: "",
        history: [`${formatDateTime(now)} - Lead importado manualmente`],
        tasks: [],
      } satisfies Deal;
    });

    setDeals((current) => [...importedDeals, ...current]);
    setImportLeadsText("");
    setOptionsModal(null);
    setSyncStatus("info");
    setSyncMessage(`Salvando ${importedDeals.length} lead(s) no backend...`);

    const results = await Promise.allSettled(
      importedDeals.map((deal) => criarCrmDeal(createBackendDealPayload(deal))),
    );
    const savedDeals = results
      .map((result, index) =>
        result.status === "fulfilled"
          ? {
              temporaryId: importedDeals[index].id,
              deal: createDealFromBackend(result.value),
            }
          : null,
      )
      .filter(
        (item): item is { temporaryId: string; deal: Deal } => item !== null,
      );
    const savedByTemporaryId = new Map(
      savedDeals.map((item) => [item.temporaryId, item.deal]),
    );
    const failedIds = new Set(
      importedDeals
        .filter((deal) => !savedByTemporaryId.has(deal.id))
        .map((deal) => deal.id),
    );

    setDeals((current) =>
      current
        .filter((deal) => !failedIds.has(deal.id))
        .map((deal) => savedByTemporaryId.get(deal.id) || deal),
    );
    setSyncStatus(savedDeals.length === importedDeals.length ? "success" : "warning");
    setSyncMessage(
      `${savedDeals.length} de ${importedDeals.length} lead(s) importado(s) foram salvos no backend.`,
    );
  }

  async function syncChatmix() {
    setSyncStatus("info");
    setSyncMessage("Sincronizando com Chatmix...");

    try {
      const logs = await listarChatmixWebhookLogs(20);

      setSyncStatus("success");
      setSyncMessage(
        `${logs.length} evento(s) recentes do Chatmix consultado(s).`,
      );
    } catch {
      setSyncStatus("warning");
      setSyncMessage("Não foi possível sincronizar com Chatmix.");
    }
  }

  async function syncSgp() {
    setSyncStatus("info");
    setSyncMessage("Sincronizando com SGP...");

    try {
      const data = await listarClientesSgp();

      setSyncStatus("success");
      setSyncMessage(`${data.summary.total} cliente(s) consultado(s) no SGP.`);
    } catch {
      setSyncStatus("warning");
      setSyncMessage("Não foi possível sincronizar com SGP.");
    }
  }

  function handleGeneralMenuAction(label: string) {
    setGeneralMenuOpen(false);

    if (label === "Exportar negociações") {
      exportDealsCsv();
      return;
    }

    if (label === "Importar leads") {
      setOptionsModal("import");
      return;
    }

    if (label === "Negociações arquivadas") {
      setArchivedOpen(true);
      return;
    }

    if (label === "Configurar funil") {
      setOptionsModal("funnel");
      return;
    }

    if (label === "Configurar etapas") {
      setOptionsModal("stages");
      return;
    }

    if (label === "Ver histórico de sincronização") {
      setSyncDetailsOpen(true);
      return;
    }

    if (label === "Atualizar CRM") {
      loadCrm();
      return;
    }

    if (label === "Sincronizar com Chatmix") {
      syncChatmix();
      return;
    }

    if (label === "Sincronizar com SGP") {
      syncSgp();
      return;
    }

    if (label === "Configurar permissões") {
      setOptionsModal("permissions");
    }
  }

  async function restoreArchivedDeal(deal: Deal) {
    const fallbackStageId = stages.some((stage) => stage.id === deal.stageId)
      ? deal.stageId
      : stages[0]?.id || "sem-contato";
    const patch: Partial<Deal> = {
      status: "ongoing",
      stageId: fallbackStageId,
      activity: "Negociação restaurada",
      cardColor: "",
    };

    updateDeal(deal.id, patch);
    setSyncStatus("success");
    setSyncMessage("Negociação restaurada para o funil.");

    if (!/^\d+$/.test(deal.id)) {
      return;
    }

    try {
      await atualizarCrmDeal(deal.id, patch);
      setSyncStatus("success");
      setSyncMessage("Negociação restaurada no backend.");
    } catch {
      setSyncStatus("warning");
      setSyncMessage(
        "Negociação restaurada na tela, mas não foi possível salvar no backend.",
      );
    }
  }

  async function deleteArchivedDeal(dealId: string) {
    if (/^\d+$/.test(dealId)) {
      try {
        await apagarCrmDeal(dealId);
      } catch {
        setSyncStatus("warning");
        setSyncMessage("Não foi possível apagar a negociação no backend.");
        return;
      }
    }

    setDeals((current) => current.filter((deal) => deal.id !== dealId));

    if (selectedDealId === dealId) {
      setSelectedDealId(null);
    }

    setSyncStatus("success");
    setSyncMessage("Negociação apagada do backend.");
  }

  function openCreateStageModal() {
    setStageForm({
      ...defaultStageForm,
      position: String(stages.length + 1),
    });
    setStageModalOpen(true);
  }

  function openEditStageModal(stage: KanbanColumn, position: number) {
    setStageForm({
      id: stage.id,
      name: stage.title,
      color: stage.color,
      slaHours: String(stage.slaHours ?? 0),
      position: String(position),
      isFinal: Boolean(stage.isFinal),
      isWonStage: Boolean(stage.isWonStage),
      isLostStage: Boolean(stage.isLostStage),
      icon: stageIcons[stage.id] || "",
    });
    setStageModalOpen(true);
  }

  async function handleSaveStage() {
    const name = stageForm.name.trim();
    const slaHours = Number(stageForm.slaHours);
    const position = Number(stageForm.position);
    const payload = {
      name,
      color: stageForm.color,
      icon: stageForm.icon,
      slaHours: Number.isFinite(slaHours) && slaHours >= 0 ? slaHours : 0,
      position:
        Number.isFinite(position) && position > 0 ? position : undefined,
      isFinal:
        stageForm.isFinal || stageForm.isWonStage || stageForm.isLostStage,
      isWonStage: stageForm.isWonStage,
      isLostStage: stageForm.isLostStage,
    };

    if (!name) {
      setSyncStatus("warning");
      setSyncMessage("Informe o nome da coluna.");
      return;
    }

    if (stageForm.isWonStage && stageForm.isLostStage) {
      setSyncStatus("warning");
      setSyncMessage(
        "A coluna não pode ser venda concluida e venda perdida ao mesmo tempo.",
      );
      return;
    }

    try {
      if (stageForm.id) {
        const updatedStage = await atualizarCrmStage(stageForm.id, payload);
        const updatedColumn: KanbanColumn = {
          id: updatedStage.id,
          title: updatedStage.title,
          color: updatedStage.color,
          slaHours: updatedStage.slaHours,
          isFinal: updatedStage.isFinal,
          isWonStage: updatedStage.isWonStage,
          isLostStage: updatedStage.isLostStage,
        };
        const nextStages = placeStageAtPosition(
          stages,
          updatedColumn,
          payload.position,
        );

        await Promise.all(
          nextStages.map((stage, index) =>
            atualizarCrmStage(stage.id, { position: index + 1 }),
          ),
        );
        setStages(nextStages);
        setStageIcons((current) => ({
          ...current,
          [updatedStage.id]: updatedStage.icon ?? stageForm.icon,
        }));
        setSyncMessage("Coluna atualizada com sucesso.");
      } else {
        const createdStage = await criarCrmStage(payload);
        const createdColumn: KanbanColumn = {
          id: createdStage.id,
          title: createdStage.title,
          color: createdStage.color,
          slaHours: createdStage.slaHours,
          isFinal: createdStage.isFinal,
          isWonStage: createdStage.isWonStage,
          isLostStage: createdStage.isLostStage,
        };
        const nextStages = placeStageAtPosition(
          stages,
          createdColumn,
          payload.position,
        );

        await Promise.all(
          nextStages.map((stage, index) =>
            atualizarCrmStage(stage.id, { position: index + 1 }),
          ),
        );
        setStages(nextStages);
        setStageIcons((current) => ({
          ...current,
          [createdStage.id]: createdStage.icon ?? stageForm.icon,
        }));
        setSyncMessage("Coluna criada com sucesso.");
      }

      setSyncStatus("success");
      setStageModalOpen(false);
      setStageForm(defaultStageForm);
    } catch {
      setSyncStatus("warning");
      setSyncMessage("Não foi possível salvar a configuração da coluna.");
    }
  }

  async function handleDeleteStage() {
    const stageId = stageForm.id;

    if (!stageId || deletingStageId) {
      return;
    }

    const remainingStages = stages.filter((stage) => stage.id !== stageId);

    if (remainingStages.length === 0) {
      setSyncStatus("warning");
      setSyncMessage("O funil precisa ter pelo menos uma coluna.");
      return;
    }

    const fallbackStage = remainingStages[0];
    const dealsToMove = deals.filter(
      (deal) => deal.stageId === stageId,
    );
    setDeletingStageId(stageId);

    try {
      setSyncStatus("info");
      setSyncMessage("Apagando coluna no backend do CRM...");

      const deleteResult = await apagarCrmStage(stageId);
      const persistedFallbackStage =
        remainingStages.find(
          (stage) => stage.id === deleteResult.fallbackStageId,
        ) || fallbackStage;

      dealsToMove.forEach((deal) =>
        persistLocalDealEdit(deal.id, { stageId: persistedFallbackStage.id }),
      );
      setStages(remainingStages);
      setStageIcons((current) => {
        const next = { ...current };
        delete next[stageId];
        return next;
      });
      setDeals((current) =>
        current.map((deal) =>
          deal.stageId === stageId
            ? {
                ...deal,
                stageId: persistedFallbackStage.id,
                updatedAt: new Date().toISOString(),
                history: [
                  `${formatDateTime(new Date().toISOString())} - Coluna removida; negociação movida para ${persistedFallbackStage.title}`,
                  ...deal.history,
                ],
              }
            : deal,
        ),
      );
      setStageModalOpen(false);
      setStageForm(defaultStageForm);
      setSyncStatus("success");
      setSyncMessage(
        deleteResult.movedDeals > 0
          ? `Coluna apagada no backend. ${deleteResult.movedDeals} negociação(oes) movida(s) para ${persistedFallbackStage.title}.`
          : "Coluna apagada do backend do CRM.",
      );
    } catch (error) {
      setSyncStatus("warning");
      setSyncMessage(
        getApiErrorMessage(error, "O backend recusou a exclusão da coluna."),
      );
    } finally {
      setDeletingStageId(null);
    }
  }

  async function addCardTextOption(catalogKey: CardTextCatalogKey) {
    const prompts = {
      attendants: "Nome do novo atendente Chatmix:",
      phones: "Novo telefone:",
      emails: "Novo e-mail:",
      cities: "Nova cidade:",
      neighborhoods: "Novo bairro:",
      addresses: "Novo endereço:",
      sources: "Nova origem:",
      conversionCodes: "Novo código de rastreio:",
      affiliates: "Nome do novo afiliado:",
      campaigns: "Nome da nova campanha:",
      plans: "Novo plano de interesse:",
      estimatedValues: "Novo valor estimado:",
    } as const;
    const formFields = {
      attendants: "owner",
      phones: "phone",
      emails: "email",
      cities: "city",
      neighborhoods: "neighborhood",
      addresses: "address",
      sources: "source",
      conversionCodes: "trackingCode",
      affiliates: "affiliate",
      campaigns: "campaign",
      plans: "plan",
      estimatedValues: "monthlyValue",
    } as const;
    let value = window.prompt(prompts[catalogKey])?.trim();

    if (!value) {
      return;
    }

    if (catalogKey === "affiliates") {
      const email = window.prompt("E-mail do novo afiliado:")?.trim();

      if (!email) {
        setSyncStatus("warning");
        setSyncMessage("Informe o e-mail para cadastrar o afiliado no banco.");
        return;
      }

      try {
        const affiliate = await criarAfiliado({ name: value, email });
        value = affiliate.name;
        setDatabaseAffiliates((current) => [...current, affiliate]);
      } catch (error) {
        setSyncStatus("warning");
        setSyncMessage(
          getApiErrorMessage(error, "Não foi possível cadastrar o afiliado."),
        );
        return;
      }
    }

    if (catalogKey === "campaigns") {
      const affiliate = databaseAffiliates.find(
        (item) => item.name === cardEditForm?.affiliate && item.active,
      );
      const destinationUrl = window
        .prompt("URL de destino da nova campanha:", window.location.origin)
        ?.trim();

      if (!affiliate || !destinationUrl) {
        setSyncStatus("warning");
        setSyncMessage(
          "Selecione um afiliado cadastrado e informe a URL da campanha.",
        );
        return;
      }

      try {
        const campaign = await criarCampanha({
          name: value,
          destinationUrl,
          affiliateIds: [affiliate.id],
        });
        value = campaign.name;
        setDatabaseCampaigns((current) => [...current, campaign]);
      } catch (error) {
        setSyncStatus("warning");
        setSyncMessage(
          getApiErrorMessage(error, "Não foi possível cadastrar a campanha."),
        );
        return;
      }
    }

    setCardOptionCatalog((current) => ({
      ...current,
      [catalogKey]: normalizeTextOptions([...current[catalogKey], value]),
    }));
    setCardEditForm((current) =>
      current
        ? {
            ...current,
            [formFields[catalogKey]]: value,
          }
        : current,
    );
  }

  function addCardStatusOption() {
    const name = window.prompt("Nome do novo status do atendimento:")?.trim();

    if (!name) {
      return;
    }

    const existing = allStatusOptions.find(
      (option) => option.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
    );

    if (existing) {
      setCardEditForm((current) =>
        current
          ? {
              ...current,
              status: existing.id,
              cardColor: existing.cardColor,
            }
          : current,
      );
      return;
    }

    const slug = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const baseId = `custom_${slug || "status"}`;
    const id = allStatusOptions.some((option) => option.id === baseId)
      ? `${baseId}_${Date.now().toString(36)}`
      : baseId;
    const option: QuickStatusOption = {
      id: id as DealStatus,
      name,
      cardColor: "#e0f2fe",
      dotColor: "#0369a1",
    };

    setCardOptionCatalog((current) => ({
      ...current,
      statuses: mergeStatusOptions(current.statuses, [option]),
    }));
    setCardEditForm((current) =>
      current
        ? {
            ...current,
            status: option.id,
            cardColor: option.cardColor,
          }
        : current,
    );
  }

  function openEditCardModal(deal: Deal) {
    setCardEditForm({
      id: deal.id,
      customerName: deal.customerName,
      phone: deal.phone,
      email: deal.email,
      city: deal.city,
      neighborhood: deal.neighborhood,
      address: deal.address,
      createdAt: toDateTimeInputValue(deal.createdAt),
      owner: deal.owner,
      responsibleUserId:
        deal.responsibleUserId ??
        assignableUsers.find(
          (user) =>
            user.name.trim().toLocaleLowerCase("pt-BR") ===
            (deal.responsibleUserName || deal.owner)
              .trim()
              .toLocaleLowerCase("pt-BR"),
        )?.id ??
        null,
      trackingCode:
        deal.trackingCode ||
        (deal.conversionId ? String(deal.conversionId) : ""),
      status: deal.status,
      source: deal.source,
      affiliate: deal.affiliate,
      campaign: deal.campaign,
      plan: deal.plan,
      monthlyValue: String(deal.monthlyValue || ""),
      priority: deal.priority,
      cardColor: deal.cardColor || "#ffffff",
      notes: deal.notes,
    });
    setCardEditOpen(true);
  }

  function handleDealCardClick(event: MouseEvent<HTMLElement>, deal: Deal) {
    const target = event.target;

    if (
      target instanceof Element &&
      target.closest("button, a, input, select, textarea, label")
    ) {
      return;
    }

    openEditCardModal(deal);
  }

  async function handleSaveCardEdit() {
    if (!cardEditForm) {
      return;
    }

    const monthlyValue = Number(cardEditForm.monthlyValue.replace(",", "."));
    const originalDeal = deals.find((deal) => deal.id === cardEditForm.id);
    const createdAtDate = new Date(cardEditForm.createdAt);
    const createdAt = Number.isNaN(createdAtDate.getTime())
      ? originalDeal?.createdAt || new Date().toISOString()
      : createdAtDate.toISOString();
    const selectedStatus = allStatusOptions.find(
      (option) => option.id === cardEditForm.status,
    );
    const selectedAffiliate = databaseAffiliates.find(
      (affiliate) => affiliate.name === cardEditForm.affiliate,
    );
    const selectedCampaign = databaseCampaigns.find(
      (campaign) => campaign.name === cardEditForm.campaign,
    );
    const selectedResponsible = assignableUsers.find(
      (user) => user.id === cardEditForm.responsibleUserId,
    );
    const patch: Partial<Deal> = {
      customerName: cardEditForm.customerName.trim() || "NEGOCIAÇÃO SEM NOME",
      phone: cardEditForm.phone.trim(),
      email: cardEditForm.email.trim(),
      city: cardEditForm.city.trim(),
      neighborhood: cardEditForm.neighborhood.trim(),
      address: cardEditForm.address.trim(),
      createdAt,
      owner: selectedResponsible?.name || "",
      responsibleUserId: cardEditForm.responsibleUserId,
      responsibleUserName: selectedResponsible?.name || "",
      responsibleUserPhotoUrl: selectedResponsible?.photoUrl || null,
      trackingCode: cardEditForm.trackingCode.trim(),
      status: cardEditForm.status,
      source: cardEditForm.source.trim(),
      affiliate: cardEditForm.affiliate.trim(),
      campaign: cardEditForm.campaign.trim(),
      plan: cardEditForm.plan.trim(),
      monthlyValue: Number.isFinite(monthlyValue) ? monthlyValue : 0,
      value: Number.isFinite(monthlyValue) ? monthlyValue : 0,
      priority: cardEditForm.priority,
      cardColor:
        cardEditForm.cardColor.toLowerCase() === "#ffffff"
          ? ""
          : cardEditForm.cardColor,
      activity: selectedStatus?.name || originalDeal?.activity || "",
      notes: cardEditForm.notes.trim(),
    };

    let conversionSyncFailed = false;

    if (originalDeal?.conversionId) {
      try {
        await editarConversao(originalDeal.conversionId, {
          visitorName: patch.customerName,
          visitorPhone: patch.phone,
          visitorCity: patch.city,
          product: patch.plan,
          source: patch.source,
        });
      } catch {
        conversionSyncFailed = true;
      }
    }

    if (/^\d+$/.test(cardEditForm.id)) {
      try {
        await atualizarCrmDeal(cardEditForm.id, {
          customerName: patch.customerName,
          phone: patch.phone,
          email: patch.email,
          city: patch.city,
          neighborhood: patch.neighborhood,
          address: patch.address,
          createdAt: patch.createdAt,
          trackingCode: patch.trackingCode,
          status: patch.status,
          source: patch.source,
          affiliate: patch.affiliate,
          affiliateId: selectedAffiliate?.id ?? null,
          campaign: patch.campaign,
          campaignId: selectedCampaign?.id ?? null,
          activity: patch.activity,
          plan: patch.plan,
          value: patch.value,
          monthlyValue: patch.monthlyValue,
          priorityLevel: patch.priority,
          cardColor: patch.cardColor,
          notes: patch.notes,
        });
        if (
          originalDeal?.responsibleUserId !== cardEditForm.responsibleUserId
        ) {
          await transferirCrmDeal(
            cardEditForm.id,
            cardEditForm.responsibleUserId,
            selectedResponsible?.name || "",
          );
        }
        setSyncStatus(conversionSyncFailed ? "warning" : "success");
        setSyncMessage(
          conversionSyncFailed
            ? "Cartão salvo, mas não foi possível sincronizar a conversão."
            : "Cartão e dados da conversão atualizados com sucesso.",
        );
      } catch (error) {
        setSyncStatus("warning");
        setSyncMessage(
          getApiErrorMessage(
            error,
            "Não foi possível salvar ou vincular o responsável no banco.",
          ),
        );
        return;
      }
    } else {
      setSyncStatus(conversionSyncFailed ? "warning" : "success");
      setSyncMessage(
        conversionSyncFailed
          ? "Cartão atualizado, mas não foi possível sincronizar a conversão."
          : "Cartão e dados da conversão atualizados.",
      );
    }

    updateDeal(cardEditForm.id, patch);
    if (!/^\d+$/.test(cardEditForm.id)) {
      persistLocalDealEdit(cardEditForm.id, patch);
    }
    setCardEditOpen(false);
    setCardEditForm(null);

    if (/^\d+$/.test(cardEditForm.id)) {
      void loadCrm();
    }
  }

  async function handleQuickStatusChange(
    deal: Deal,
    option: QuickStatusOption,
  ) {
    setActiveStatusMenuId(null);
    const previousDeals = deals;
    updateDeal(deal.id, {
      status: option.id,
      cardColor: option.cardColor,
      activity: option.name,
    });
    setSyncStatus("info");
    setSyncMessage(`Salvando status ${option.name}...`);

    if (
      (option.id === "won" || option.id === "lost") &&
      deal.status !== option.id
    ) {
      showDealOutcome(option.id, deal.customerName);
    }

    if (isDemoDeal(deal.id)) {
      return;
    }

    try {
      await atualizarCrmDeal(deal.id, {
        status: option.id,
        cardColor: option.cardColor,
        activity: option.name,
      });

      setSyncStatus("success");
      setSyncMessage(`Status ${option.name} salvo no CRM.`);
      void loadCrm();
    } catch (error) {
      setDeals(previousDeals);
      setSyncStatus("warning");
      setSyncMessage(
        getApiErrorMessage(
          error,
          `Não foi possível salvar o status ${option.name}.`,
        ),
      );
    }
  }

  function renderDealCard(deal: Deal) {
    const status = getVisibleStatusMeta(deal.status);
    const quickStatus =
      allStatusOptions.find((option) => option.id === deal.status) || null;
    const statusLabel = quickStatus?.name || status.name;
    const statusColor = quickStatus?.dotColor || status.color;
    const alertClass = isOverdue(deal)
      ? styles.dealCardDanger
      : isNearDue(deal) || deal.priority === "urgent"
        ? styles.dealCardWarning
        : "";
    const visualClass = getDealVisualClass(deal.status);
    const serviceCode = deal.chatmixId || deal.id;
    const conversionCode =
      deal.trackingCode ||
      (deal.conversionId ? String(deal.conversionId) : "Não informado");
    const notes = deal.notes.trim();
    const responsibleUser = assignableUsers.find(
      (user) =>
        user.id === deal.responsibleUserId ||
        user.name.trim().toLocaleLowerCase("pt-BR") ===
          (deal.responsibleUserName || deal.owner)
            .trim()
            .toLocaleLowerCase("pt-BR"),
    );
    const responsiblePhotoUrl =
      deal.responsibleUserPhotoUrl || responsibleUser?.photoUrl || "";
    const responsibleDisplayName =
      responsibleUser?.name ||
      deal.responsibleUserName ||
      deal.owner ||
      "Sem responsável";

    return (
      <article
        key={deal.id}
        className={`${styles.dealCard} ${visualClass} ${alertClass}`}
        style={
          {
            "--deal-border": getDealBorderColor(deal),
            ...(deal.cardColor ? { backgroundColor: deal.cardColor } : {}),
          } as CSSProperties
        }
        draggable
        onClick={(event) => handleDealCardClick(event, deal)}
        onDragStart={() => setDraggingDealId(deal.id)}
        onDragEnd={() => setDraggingDealId(null)}
      >
        <header className={styles.dealCardHeader}>
          <div className={styles.dealCustomer}>
            <FiUser aria-hidden="true" />
            <strong>#{serviceCode}</strong>
          </div>
          <time dateTime={deal.createdAt}>
            <FiCalendar aria-hidden="true" />
            {formatCardDate(deal.createdAt)}
          </time>
        </header>

        <strong className={styles.dealServiceTitle}>
          Cliente: {deal.customerName}
        </strong>

        <div className={styles.dealInfoList}>
          <div>
            <span
              className={`${styles.ownerAvatar} ${
                responsiblePhotoUrl ? styles.ownerAvatarPhoto : ""
              }`}
              style={
                responsiblePhotoUrl
                  ? { backgroundImage: `url("${responsiblePhotoUrl}")` }
                  : undefined
              }
              title={responsibleDisplayName}
              aria-label={`Responsável: ${responsibleDisplayName}`}
            >
              {!responsiblePhotoUrl &&
                responsibleDisplayName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
            </span>
            <span>
              <small>Responsável</small>
              {crmPermissions.canTransfer ? (
                <select
                  className={styles.ownerSelect}
                  value={
                    deal.responsibleUserId ??
                    assignableUsers.find(
                      (user) =>
                        user.name.trim().toLocaleLowerCase("pt-BR") ===
                        (deal.responsibleUserName || deal.owner)
                          .trim()
                          .toLocaleLowerCase("pt-BR"),
                    )?.id ??
                    ""
                  }
                  aria-label={`Responsável por ${deal.customerName}`}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    event.stopPropagation();
                    void handleTransferDeal(
                      deal,
                      event.target.value ? Number(event.target.value) : null,
                    );
                  }}
                >
                  <option value="">Sem responsável</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              ) : (
                <strong>
                  {deal.responsibleUserName || "Sem responsável"}
                </strong>
              )}
            </span>
          </div>
          <div>
            <FiPhone aria-hidden="true" />
            <span>
              <small>Cliente em atendimento</small>
              <strong>{formatDealPhone(deal.phone)}</strong>
            </span>
          </div>
          <div>
            <FiHash aria-hidden="true" />
            <span>
              <small>Código de conversão</small>
              <strong>{conversionCode}</strong>
            </span>
          </div>
        </div>

        <div className={styles.dealBadges}>
          <div className={styles.cardStatusWrap}>
            <button
              type="button"
              className={styles.cardStatus}
              style={{ backgroundColor: statusColor }}
              onClick={() => {
                setActiveCardMenuId(null);
                setActiveStatusMenuId((current) =>
                  current === deal.id ? null : deal.id,
                );
              }}
              aria-expanded={activeStatusMenuId === deal.id}
            >
              <span
                className={styles.statusDot}
                style={{ backgroundColor: statusColor }}
              />
              <span>{statusLabel}</span>
              <FiChevronDown aria-hidden="true" />
            </button>

            {activeStatusMenuId === deal.id && (
              <div className={styles.statusMiniMenu}>
                {allStatusOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      deal.status === option.id ? styles.statusMiniActive : ""
                    }
                    onClick={() => handleQuickStatusChange(deal, option)}
                  >
                    <span
                      className={styles.statusColorSwatch}
                      style={{ backgroundColor: option.cardColor }}
                    />
                    <span>{option.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className={styles.dealDetailsButton}
            aria-label="Ver detalhes da negociação"
            title="Ver detalhes da negociação"
            onClick={() => handleCardAction("details", deal)}
          >
            <FiEye aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.dealObservationButton}
            aria-label={`Ver observação de ${deal.customerName}`}
            title="Ver observação"
            onClick={(event) => {
              event.stopPropagation();
              setObservationDealId(deal.id);
            }}
          >
            <FiClipboard aria-hidden="true" />
          </button>
        </div>

        <div className={styles.dealCardFooter}>
          <div className={styles.dealOrigin}>
            <span aria-hidden="true">i</span>
            <strong>Origem:</strong>
            <p>{deal.affiliate || "Afiliado não informado"}</p>
          </div>
          <time
            className={styles.dealCreatedTime}
            dateTime={deal.createdAt}
            title={`Atendimento criado em ${formatDateTime(deal.createdAt)}`}
          >
            {formatCardTime(deal.createdAt)}
          </time>
        </div>

        {observationDealId === deal.id && (
          <div
            className={styles.observationOverlay}
            role="presentation"
            onMouseLeave={() => setObservationDealId(null)}
            onClick={(event) => {
              event.stopPropagation();
              setObservationDealId(null);
            }}
          >
            <section
              className={styles.observationPopup}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`observation-title-${deal.id}`}
              onClick={(event) => event.stopPropagation()}
            >
              <header>
                <div>
                  <span>Negociação</span>
                  <strong id={`observation-title-${deal.id}`}>
                    Observação de {deal.customerName}
                  </strong>
                </div>
                <button
                  type="button"
                  aria-label="Fechar observação"
                  onClick={() => setObservationDealId(null)}
                >
                  <FiX aria-hidden="true" />
                </button>
              </header>
              <p>
                {notes || "Nenhuma observação cadastrada para esta negociação."}
              </p>
            </section>
          </div>
        )}

        <div className={styles.cardMenuWrap}>
          <button
            type="button"
            className={styles.cardMenuButton}
            title="Ações da negociação"
            onClick={() =>
              setActiveCardMenuId((current) =>
                current === deal.id ? null : deal.id,
              )
            }
          >
            <FiMoreVertical aria-hidden="true" />
          </button>

          {activeCardMenuId === deal.id && (
            <div className={styles.cardMenu}>
              <button
                type="button"
                onClick={() => handleCardAction("details", deal)}
              >
                Ver detalhes
              </button>
              <button
                type="button"
                onClick={() => handleCardAction("edit", deal)}
              >
                Editar negociação
              </button>
              <button
                type="button"
                onClick={() => handleCardAction("task", deal)}
              >
                Criar tarefa
              </button>
              <button
                type="button"
                onClick={() => handleCardAction("contact", deal)}
              >
                Registrar contato
              </button>
              <button
                type="button"
                onClick={() => handleCardAction("whatsapp", deal)}
              >
                Enviar WhatsApp
              </button>
              <button
                type="button"
                onClick={() => handleCardAction("copy", deal)}
              >
                Copiar telefone
              </button>
              <button
                type="button"
                onClick={() => handleCardAction("won", deal)}
              >
                Marcar venda concluida
              </button>
              <button
                type="button"
                onClick={() => handleCardAction("lost", deal)}
              >
                Marcar venda perdida
              </button>
              <button
                type="button"
                className={styles.dangerItem}
                onClick={() => handleCardAction("archive", deal)}
              >
                Arquivar negociação
              </button>
            </div>
          )}
        </div>
      </article>
    );
  }

  return (
    <main className={styles.page}>
      {dealOutcome && (
        <div
          className={`${styles.resultAnimationOverlay} ${
            dealOutcome.type === "won" ? styles.outcomeWon : styles.outcomeLost
          }`}
          aria-live="polite"
        >
          <div className={styles.outcomeBurst} aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <span key={index} style={{ "--i": index } as CSSProperties} />
            ))}
          </div>
          <div className={styles.resultAnimationCard}>
            <div className={styles.outcomeIcon} aria-hidden="true">
              {dealOutcome.type === "won" ? <FiCheckCircle /> : <FiClock />}
            </div>
            <strong>
              {dealOutcome.type === "won"
                ? "Venda concluida!"
                : "Venda perdida registrada"}
            </strong>
            <p>
              {dealOutcome.type === "won"
                ? "Ótimo trabalho, essa negociação foi finalizada com sucesso."
                : "Tudo bem. O histórico foi salvo para análise e melhoria do funil."}
            </p>
            <span>{dealOutcome.dealName}</span>
          </div>
        </div>
      )}

      <header className={styles.toolbar}>
        <div className={styles.viewSwitcher} aria-label="Modo de visualização">
          <button
            type="button"
            className={
              viewMode === "kanban"
                ? styles.viewButtonActive
                : styles.viewButton
            }
            title="Visualização Kanban"
            onClick={() => setViewMode("kanban")}
          >
            <FiBarChart2 aria-hidden="true" />
          </button>
          <button
            type="button"
            className={
              viewMode === "list" ? styles.viewButtonActive : styles.viewButton
            }
            title="Visualização em Lista"
            onClick={() => setViewMode("list")}
          >
            <FiList aria-hidden="true" />
          </button>
        </div>

        <div className={styles.actions}>
          <div className={styles.popoverWrap}>
            <button
              type="button"
              className={styles.iconButton}
              title="Opções"
              onClick={() => setGeneralMenuOpen((current) => !current)}
            >
              <FiMoreVertical aria-hidden="true" />
            </button>
            {generalMenuOpen && (
              <div className={styles.generalMenu}>
                {[
                  ["Exportar negociações", FiDownload],
                  ["Importar leads", FiClipboard],
                  ["Negociações arquivadas", FiClock],
                  ["Configurar funil", FiSliders],
                  ["Configurar etapas", FiList],
                  ["Ver histórico de sincronização", FiClock],
                  ["Atualizar CRM", FiRefreshCw],
                  ["Sincronizar com Chatmix", FiRefreshCw],
                  ["Sincronizar com SGP", FiRefreshCw],
                  ["Configurar permissões", FiUser],
                ].map(([label, Icon]) => (
                  <button
                    key={label as string}
                    type="button"
                    onClick={() => handleGeneralMenuAction(label as string)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label as string}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.popoverWrap}>
            <button
              type="button"
              className={styles.iconButton}
              title="Calendario"
              onClick={() => setCalendarOpen((current) => !current)}
            >
              <FiCalendar aria-hidden="true" />
            </button>
            {calendarOpen && (
              <div className={styles.periodMenu}>
                {periodOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      periodFilter === option.id ? styles.menuActive : ""
                    }
                    onClick={() => {
                      setPeriodFilter(option.id);
                      setCalendarOpen(false);
                    }}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.iconButton}
            title="Atualizar"
            onClick={() => void loadCrm()}
          >
            <FiRefreshCw
              aria-hidden="true"
              className={loadingCrm ? styles.spin : ""}
            />
          </button>
          <button
            type="button"
            className={styles.createButton}
            onClick={() => setCreateOpen(true)}
          >
            <FiPlus aria-hidden="true" />
            <span>Criar</span>
          </button>
        </div>
      </header>

      <CrmFilterHeader
        funnels={availableFunnels}
        funnelId={selectedFunnelId}
        onFunnelChange={(value) => {
          setSelectedFunnelId(value);
          const funnel = availableFunnels.find((item) => item.id === value);
          if (funnel) setSelectedFunnel(funnel.name);
        }}
        onFunnelCreated={(funnel) => {
          setAvailableFunnels((current) => [
            ...current.filter((item) => item.id !== funnel.id),
            funnel,
          ]);
          setSelectedFunnelId(funnel.id);
          setSelectedFunnel(funnel.name);
        }}
        scope={scopeFilter}
        onScopeChange={(value) => setScopeFilter(value as ScopeFilter)}
        responsibleUserId={responsibleUserId}
        onResponsibleUserChange={setResponsibleUserId}
        statuses={allStatusOptions.map((item) => ({
          id: item.id,
          name: item.name,
        }))}
        status={statusFilter}
        onStatusChange={(value) =>
          setStatusFilter(value as DealStatus | "all")
        }
        stages={stages.map((stage) => ({
          id: stage.id,
          name: stage.title,
        }))}
        sort={sortMode}
        onSortChange={(value) => setSortMode(value as SortMode)}
        users={assignableUsers}
        permissions={crmPermissions}
        conditions={filterConditions}
        onConditionsChange={setFilterConditions}
        onResultMessage={(message) => {
          setSyncStatus("info");
          setSyncMessage(message);
        }}
      />

      <button
        type="button"
        className={`${styles.syncAlert} ${styles[syncStatus]}`}
        onClick={() => setSyncDetailsOpen(true)}
      >
        {syncStatus === "warning" ? (
          <FiAlertTriangle aria-hidden="true" />
        ) : (
          <FiCheckCircle aria-hidden="true" />
        )}
        <span>{loadingCrm ? "Atualizando CRM..." : syncMessage}</span>
        <FiChevronDown aria-hidden="true" />
      </button>

      <div className={styles.summaryBar}>
        <span>
          {totals.deals}{" "}
          {activeFilterCount > 0 || statusFilter !== "all"
            ? "Negociações encontradas"
            : "Negociações"}
        </span>
        <strong>{formatCurrency(totals.amount)}</strong>
        <em>
          {selectedFunnel} -{" "}
          {periodOptions.find((item) => item.id === periodFilter)?.name}
        </em>
      </div>

      {viewMode === "kanban" ? (
        <>
          <section
            className={styles.board}
            aria-label="Funil de vendas"
            onDragOver={handleBoardDragOver}
          >
            {stages.map((stage, index) => {
              const stageDeals = filteredDeals.filter(
                (deal) => deal.stageId === stage.id,
              );
              const amount = stageDeals.reduce(
                (total, deal) => total + deal.monthlyValue,
                0,
              );

              return (
                <section
                  key={stage.id}
                  className={`${styles.column} ${
                    draggingStageId === stage.id ? styles.columnDragging : ""
                  }`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggingStageId) {
                      void handleStageDrop(stage.id);
                    } else {
                      handleDrop(stage.id);
                    }
                  }}
                >
                  <header className={styles.columnHeader}>
                    <div className={styles.columnIdentity}>
                      {stageIcons[stage.id] && (
                        <span
                          className={styles.columnIcon}
                          style={{ backgroundImage: `url("${stageIcons[stage.id]}")` }}
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <h2>
                          {stage.title} ({stageDeals.length})
                        </h2>
                        <small>SLA {stage.slaHours || "-"}h</small>
                      </div>
                    </div>
                    <div className={styles.columnTools}>
                      <span>{formatCurrency(amount)}</span>
                      <button
                        type="button"
                        className={styles.columnDragHandle}
                        draggable
                        title="Mover coluna"
                        aria-label={`Mover coluna ${stage.title}`}
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", stage.id);
                          setDraggingDealId(null);
                          setDraggingStageId(stage.id);
                        }}
                        onDragEnd={() => setDraggingStageId(null)}
                      >
                        <FiMove aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Atualizar etapa"
                        onClick={() => {
                          setSyncStatus("success");
                          setSyncMessage(`Etapa ${stage.title} atualizada.`);
                        }}
                      >
                        <FiRefreshCw aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        title="Editar coluna"
                        onClick={() => openEditStageModal(stage, index + 1)}
                      >
                        <FiEdit3 aria-hidden="true" />
                      </button>
                    </div>
                  </header>

                  <div
                    className={styles.cards}
                    onDragOver={handleCardsDragOver}
                  >
                    {stageDeals.length > 0 ? (
                      stageDeals.map(renderDealCard)
                    ) : (
                      <div className={styles.emptyColumn}>Sem negociações</div>
                    )}
                  </div>
                </section>
              );
            })}

            <section className={`${styles.column} ${styles.addColumn}`}>
              <button
                type="button"
                className={styles.addColumnButton}
                onClick={openCreateStageModal}
              >
                <FiPlus aria-hidden="true" />
                <strong>Adicionar coluna</strong>
                <span>Criar nova etapa no funil atual</span>
              </button>
            </section>
          </section>
        </>
      ) : (
        <section className={styles.listView} aria-label="Lista de negociações">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Telefone</th>
                <th>Etapa</th>
                <th>Status</th>
                <th>Origem</th>
                <th>Afiliado</th>
                <th>Valor</th>
                <th>Responsável</th>
                <th>Data de criação</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal) => (
                <tr
                  key={deal.id}
                  onClick={() => {
                    setSelectedDealId(deal.id);
                    setActiveDetailTab("lead");
                  }}
                >
                  <td>{deal.customerName}</td>
                  <td>{deal.phone}</td>
                  <td>{getStage(stages, deal.stageId)?.title}</td>
                  <td>
                    <span className={styles.tableStatus}>
                      <span
                        style={{
                          backgroundColor:
                            getVisibleStatusMeta(deal.status).color,
                        }}
                      />
                      {getVisibleStatusMeta(deal.status).name}
                    </span>
                  </td>
                  <td>{deal.source}</td>
                  <td>{deal.affiliate}</td>
                  <td>{formatCurrency(deal.monthlyValue)}</td>
                  <td>{deal.owner || "Sem responsável"}</td>
                  <td>{formatDateTime(deal.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {advancedFiltersOpen && (
        <aside
          className={styles.sidePanel}
          aria-label="Painel de Filtros Avancados"
        >
          <header>
            <h2>Painel de Filtros Avancados</h2>
            <button type="button" onClick={() => setAdvancedFiltersOpen(false)}>
              <FiX aria-hidden="true" />
            </button>
          </header>

          <div className={styles.filterGrid}>
            {[
              ["affiliate", "Afiliado"],
              ["campaign", "Campanha"],
              ["city", "Cidade"],
              ["owner", "Responsável"],
              ["source", "Origem do lead"],
              ["minValue", "Valor mínimo"],
              ["maxValue", "Valor máximo"],
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  value={
                    advancedFilters[
                      key as keyof typeof advancedFilters
                    ] as string
                  }
                  onChange={(event) =>
                    setAdvancedFilters((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={advancedFilters.overdue}
              onChange={(event) =>
                setAdvancedFilters((current) => ({
                  ...current,
                  overdue: event.target.checked,
                }))
              }
            />
            Leads atrasados
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={advancedFilters.noContact}
              onChange={(event) =>
                setAdvancedFilters((current) => ({
                  ...current,
                  noContact: event.target.checked,
                }))
              }
            />
            Leads sem contato
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={advancedFilters.pendingTask}
              onChange={(event) =>
                setAdvancedFilters((current) => ({
                  ...current,
                  pendingTask: event.target.checked,
                }))
              }
            />
            Leads com tarefa pendente
          </label>

          <footer>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => setAdvancedFiltersOpen(false)}
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={clearAdvancedFilters}
            >
              Limpar filtros
            </button>
            <button
              type="button"
              className={styles.ghostAction}
              onClick={() => setAdvancedFiltersOpen(false)}
            >
              Fechar
            </button>
          </footer>
        </aside>
      )}

      {createOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <section className={styles.modal}>
            <header>
              <h2>Criar negociação</h2>
              <button type="button" onClick={() => setCreateOpen(false)}>
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className={styles.formGrid}>
              {[
                ["customerName", "Nome do cliente"],
                ["phone", "Telefone"],
                ["email", "E-mail"],
                ["city", "Cidade"],
                ["neighborhood", "Bairro"],
                ["address", "Endereço"],
                ["source", "Origem do lead"],
                ["affiliate", "Afiliado"],
                ["campaign", "Campanha"],
                ["value", "Valor estimado"],
                ["plan", "Plano de interesse"],
                ["owner", "Responsável"],
              ].map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    value={newDeal[key as keyof typeof newDeal]}
                    onChange={(event) =>
                      setNewDeal((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                </label>
              ))}

              <label>
                <span>Etapa inicial</span>
                <select
                  value={newDeal.stageId}
                  onChange={(event) =>
                    setNewDeal((current) => ({
                      ...current,
                      stageId: event.target.value,
                    }))
                  }
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Status</span>
                <select
                  value={newDeal.status}
                  onChange={(event) =>
                    setNewDeal((current) => ({
                      ...current,
                      status: event.target.value as DealStatus,
                    }))
                  }
                >
                  {statusOptions.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.fullField}>
                <span>Observação</span>
                <textarea
                  value={newDeal.notes}
                  onChange={(event) =>
                    setNewDeal((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <footer>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => handleCreateDeal(false)}
              >
                Salvar negociação
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => handleCreateDeal(true)}
              >
                Salvar e criar tarefa
              </button>
              <button
                type="button"
                className={styles.ghostAction}
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </button>
            </footer>
          </section>
        </div>
      )}

      {stageModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <section className={styles.stageModal}>
            <header>
              <h2>{stageForm.id ? "Editar coluna" : "Adicionar coluna"}</h2>
              <button
                type="button"
                onClick={() => {
                  setStageModalOpen(false);
                  setStageForm(defaultStageForm);
                }}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className={styles.formGrid}>
              <label>
                <span>Nome da coluna</span>
                <input
                  value={stageForm.name}
                  onChange={(event) =>
                    setStageForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Cor da coluna</span>
                <div className={styles.colorField}>
                  <input
                    type="color"
                    value={stageForm.color}
                    onChange={(event) =>
                      setStageForm((current) => ({
                        ...current,
                        color: event.target.value,
                      }))
                    }
                  />
                  <input
                    value={stageForm.color}
                    onChange={(event) =>
                      setStageForm((current) => ({
                        ...current,
                        color: event.target.value,
                      }))
                    }
                  />
                </div>
              </label>

              <label>
                <span>SLA em horas</span>
                <input
                  type="number"
                  min="0"
                  value={stageForm.slaHours}
                  onChange={(event) =>
                    setStageForm((current) => ({
                      ...current,
                      slaHours: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Posição no funil</span>
                <input
                  type="number"
                  min="1"
                  value={stageForm.position}
                  onChange={(event) =>
                    setStageForm((current) => ({
                      ...current,
                      position: event.target.value,
                    }))
                  }
                />
              </label>

              <label className={styles.fullField}>
                <span>Ícone da coluna</span>
                <div className={styles.stageIconEditor}>
                  <span
                    className={styles.stageIconPreview}
                    style={
                      stageForm.icon
                        ? { backgroundImage: `url("${stageForm.icon}")` }
                        : undefined
                    }
                    aria-hidden="true"
                  />
                  <select
                    value={
                      stageIconOptions.some(
                        (option) => option.value === stageForm.icon,
                      )
                        ? stageForm.icon
                        : "custom"
                    }
                    onChange={(event) =>
                      setStageForm((current) => ({
                        ...current,
                        icon:
                          event.target.value === "custom"
                            ? current.icon
                            : event.target.value,
                      }))
                    }
                  >
                    {stageIconOptions.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    {stageForm.icon.startsWith("data:image/") && (
                      <option value="custom">Imagem enviada</option>
                    )}
                  </select>
                  <label className={styles.stageIconUpload}>
                    Enviar imagem
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;

                        if (file.size > 300_000) {
                          setSyncStatus("warning");
                          setSyncMessage("O ícone deve ter no máximo 300 KB.");
                          event.target.value = "";
                          return;
                        }

                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setStageForm((current) => ({
                              ...current,
                              icon: reader.result as StageIcon,
                            }));
                          }
                        };
                        reader.readAsDataURL(file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <small className={styles.fieldHint}>
                  PNG, JPG, WebP ou SVG de até 300 KB.
                </small>
              </label>
            </div>

            <div className={styles.stageOptions}>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={stageForm.isFinal}
                  onChange={(event) =>
                    setStageForm((current) => ({
                      ...current,
                      isFinal: event.target.checked,
                    }))
                  }
                />
                Etapa final
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={stageForm.isWonStage}
                  onChange={(event) =>
                    setStageForm((current) => ({
                      ...current,
                      isWonStage: event.target.checked,
                      isLostStage: event.target.checked
                        ? false
                        : current.isLostStage,
                      isFinal: event.target.checked || current.isFinal,
                    }))
                  }
                />
                Venda concluida
              </label>
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={stageForm.isLostStage}
                  onChange={(event) =>
                    setStageForm((current) => ({
                      ...current,
                      isLostStage: event.target.checked,
                      isWonStage: event.target.checked
                        ? false
                        : current.isWonStage,
                      isFinal: event.target.checked || current.isFinal,
                    }))
                  }
                />
                Venda perdida
              </label>
            </div>

            <footer>
              {stageForm.id && (
                <button
                  type="button"
                  className={styles.deleteAction}
                  disabled={deletingStageId === stageForm.id}
                  onClick={() => void handleDeleteStage()}
                >
                  {deletingStageId === stageForm.id
                    ? "Apagando..."
                    : "Apagar coluna"}
                </button>
              )}
              <button
                type="button"
                className={styles.primaryAction}
                onClick={handleSaveStage}
              >
                Salvar coluna
              </button>
              <button
                type="button"
                className={styles.ghostAction}
                onClick={() => {
                  setStageModalOpen(false);
                  setStageForm(defaultStageForm);
                }}
              >
                Cancelar
              </button>
            </footer>
          </section>
        </div>
      )}

      {taskModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <section className={styles.taskModal}>
            <header>
              <h2>{taskForm.id ? "Editar tarefa" : "Criar tarefa"}</h2>
              <button
                type="button"
                onClick={() => {
                  setTaskModalOpen(false);
                  setTaskForm(defaultTaskForm);
                }}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className={styles.formGrid}>
              <label className={styles.fullField}>
                <span>Título da tarefa</span>
                <input
                  value={taskForm.title}
                  placeholder="Ex: Ligar para confirmar instalacao"
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Status</span>
                <select
                  value={taskForm.status}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      status: event.target.value as TaskForm["status"],
                    }))
                  }
                >
                  <option value="pending">Pendente</option>
                  <option value="overdue">Atrasada</option>
                  <option value="done">Concluida</option>
                </select>
              </label>

              <label>
                <span>Prazo</span>
                <input
                  type="datetime-local"
                  value={taskForm.dueAt}
                  onChange={(event) =>
                    setTaskForm((current) => ({
                      ...current,
                      dueAt: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <footer>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={handleSaveTask}
              >
                Salvar tarefa
              </button>
              <button
                type="button"
                className={styles.ghostAction}
                onClick={() => {
                  setTaskModalOpen(false);
                  setTaskForm(defaultTaskForm);
                }}
              >
                Cancelar
              </button>
            </footer>
          </section>
        </div>
      )}

      {cardEditOpen && cardEditForm && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <section className={styles.cardEditModal}>
            <header>
              <h2>Editar cartão</h2>
              <button
                type="button"
                onClick={() => {
                  setCardEditOpen(false);
                  setCardEditForm(null);
                }}
              >
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className={styles.formGrid}>
              <label>
                <span>Nome do cliente</span>
                <input
                  value={cardEditForm.customerName}
                  onChange={(event) =>
                    setCardEditForm((current) =>
                      current
                        ? { ...current, customerName: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                <span>Telefone</span>
                <div className={styles.catalogField}>
                  <input
                    type="tel"
                    list="crm-phone-options"
                    placeholder="Digite o telefone"
                    value={cardEditForm.phone}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, phone: event.target.value }
                          : current,
                      )
                    }
                  />
                  <datalist id="crm-phone-options">
                    {cardFieldOptions.phones.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("phones")}
                    aria-label="Adicionar telefone"
                    title="Adicionar telefone"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>E-mail</span>
                <div className={styles.catalogField}>
                  <input
                    type="email"
                    list="crm-email-options"
                    placeholder="Digite o e-mail"
                    value={cardEditForm.email}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, email: event.target.value }
                          : current,
                      )
                    }
                  />
                  <datalist id="crm-email-options">
                    {cardFieldOptions.emails.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("emails")}
                    aria-label="Adicionar e-mail"
                    title="Adicionar e-mail"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Cidade</span>
                <div className={styles.catalogField}>
                  <select
                    value={cardEditForm.city}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, city: event.target.value }
                          : current,
                      )
                    }
                  >
                    <option value="">Não informada</option>
                    {cardFieldOptions.cities.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("cities")}
                    aria-label="Adicionar cidade"
                    title="Adicionar cidade"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Bairro</span>
                <div className={styles.catalogField}>
                  <select
                    value={cardEditForm.neighborhood}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, neighborhood: event.target.value }
                          : current,
                      )
                    }
                  >
                    <option value="">Não informado</option>
                    {cardFieldOptions.neighborhoods.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("neighborhoods")}
                    aria-label="Adicionar bairro"
                    title="Adicionar bairro"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label className={styles.fullField}>
                <span>Endereço</span>
                <div className={styles.catalogField}>
                  <input
                    list="crm-address-options"
                    placeholder="Digite o endereço"
                    value={cardEditForm.address}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, address: event.target.value }
                          : current,
                      )
                    }
                  />
                  <datalist id="crm-address-options">
                    {cardFieldOptions.addresses.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("addresses")}
                    aria-label="Adicionar endereço"
                    title="Adicionar endereço"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Data</span>
                <input
                  type="datetime-local"
                  value={cardEditForm.createdAt}
                  onChange={(event) =>
                    setCardEditForm((current) =>
                      current
                        ? { ...current, createdAt: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                <span>Responsável pela negociação</span>
                <select
                  value={cardEditForm.responsibleUserId ?? ""}
                  disabled={!crmPermissions.canTransfer}
                  onChange={(event) => {
                    const nextId = event.target.value
                      ? Number(event.target.value)
                      : null;
                    const nextUser = assignableUsers.find(
                      (user) => user.id === nextId,
                    );
                    setCardEditForm((current) =>
                      current
                        ? {
                            ...current,
                            responsibleUserId: nextId,
                            owner: nextUser?.name || "",
                          }
                        : current,
                    );
                  }}
                >
                  <option value="">Sem responsável</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                
              </label>

              <label>
                <span>Código de rastreio</span>
                <div className={styles.catalogField}>
                  <input
                    list="crm-tracking-code-options"
                    placeholder="Digite o código"
                    value={cardEditForm.trackingCode}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, trackingCode: event.target.value }
                          : current,
                      )
                    }
                  />
                  <datalist id="crm-tracking-code-options">
                    {conversionCodeOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("conversionCodes")}
                    aria-label="Adicionar código de rastreio"
                    title="Adicionar código de rastreio"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Status do atendimento</span>
                <div className={styles.catalogField}>
                  <select
                    value={cardEditForm.status}
                    onChange={(event) => {
                      const status = event.target.value as DealStatus;
                      const option = allStatusOptions.find(
                        (item) => item.id === status,
                      );

                      setCardEditForm((current) =>
                        current
                          ? {
                              ...current,
                              status,
                              cardColor:
                                option?.cardColor || current.cardColor,
                            }
                          : current,
                      );
                    }}
                  >
                    {allStatusOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={addCardStatusOption}
                    aria-label="Adicionar status de atendimento"
                    title="Adicionar status de atendimento"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Origem</span>
                <div className={styles.catalogField}>
                  <select
                    value={cardEditForm.source}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, source: event.target.value }
                          : current,
                      )
                    }
                  >
                    <option value="">Não informada</option>
                    {cardFieldOptions.sources.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("sources")}
                    aria-label="Adicionar origem"
                    title="Adicionar origem"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Afiliado</span>
                <div className={styles.catalogField}>
                  <select
                    value={cardEditForm.affiliate}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, affiliate: event.target.value }
                          : current,
                      )
                    }
                  >
                    <option value="">Não informado</option>
                    {affiliateOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("affiliates")}
                    aria-label="Adicionar afiliado"
                    title="Adicionar afiliado"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Campanha</span>
                <div className={styles.catalogField}>
                  <select
                    value={cardEditForm.campaign}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, campaign: event.target.value }
                          : current,
                      )
                    }
                  >
                    <option value="">Não informada</option>
                    {cardFieldOptions.campaigns.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("campaigns")}
                    aria-label="Adicionar campanha"
                    title="Adicionar campanha"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Plano de interesse</span>
                <div className={styles.catalogField}>
                  <select
                    value={cardEditForm.plan}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, plan: event.target.value }
                          : current,
                      )
                    }
                  >
                    <option value="">Não informado</option>
                    {cardFieldOptions.plans.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("plans")}
                    aria-label="Adicionar plano de interesse"
                    title="Adicionar plano de interesse"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Valor estimado</span>
                <div className={styles.catalogField}>
                  <select
                    value={cardEditForm.monthlyValue}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, monthlyValue: event.target.value }
                          : current,
                      )
                    }
                  >
                    <option value="">Não informado</option>
                    {cardFieldOptions.estimatedValues.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={styles.catalogAddButton}
                    onClick={() => void addCardTextOption("estimatedValues")}
                    aria-label="Adicionar valor estimado"
                    title="Adicionar valor estimado"
                  >
                    <FiPlus aria-hidden="true" />
                  </button>
                </div>
              </label>

              <label>
                <span>Prioridade</span>
                <select
                  value={cardEditForm.priority}
                  onChange={(event) =>
                    setCardEditForm((current) =>
                      current
                        ? {
                            ...current,
                            priority: event.target.value as Priority,
                          }
                        : current,
                    )
                  }
                >
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Cor do cartão</span>
                <div className={styles.colorField}>
                  <input
                    type="color"
                    value={cardEditForm.cardColor || "#ffffff"}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, cardColor: event.target.value }
                          : current,
                      )
                    }
                  />
                  <input
                    value={cardEditForm.cardColor}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, cardColor: event.target.value }
                          : current,
                      )
                    }
                  />
                </div>
              </label>

              <label className={styles.fullField}>
                <span>Observação</span>
                <textarea
                  value={cardEditForm.notes}
                  onChange={(event) =>
                    setCardEditForm((current) =>
                      current
                        ? { ...current, notes: event.target.value }
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <footer>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={handleSaveCardEdit}
              >
                Salvar cartão
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() =>
                  setCardEditForm((current) =>
                    current ? { ...current, cardColor: "#ffffff" } : current,
                  )
                }
              >
                Remover cor
              </button>
              <button
                type="button"
                className={styles.ghostAction}
                onClick={() => {
                  setCardEditOpen(false);
                  setCardEditForm(null);
                }}
              >
                Cancelar
              </button>
            </footer>
          </section>
        </div>
      )}

      {archivedOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <section className={styles.archiveModal}>
            <header>
              <div>
                <h2>Negociações arquivadas</h2>
                <span>{archivedDeals.length} item(ns) arquivado(s)</span>
              </div>
              <button type="button" onClick={() => setArchivedOpen(false)}>
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className={styles.archiveList}>
              {archivedDeals.length === 0 ? (
                <div className={styles.emptyColumn}>
                  Nenhuma negociação arquivada
                </div>
              ) : (
                archivedDeals.map((deal) => (
                  <article
                    key={deal.id}
                    className={`${styles.dealCard} ${styles.archiveCard}`}
                    style={
                      {
                        "--deal-border": getDealBorderColor(deal),
                        ...(deal.cardColor
                          ? { backgroundColor: deal.cardColor }
                          : {}),
                      } as CSSProperties
                    }
                  >
                    <div className={styles.cardMainButton}>
                      <span className={styles.cardStatus}>
                        <span
                          className={styles.statusDot}
                          style={{
                            backgroundColor:
                              getVisibleStatusMeta(deal.status).color,
                          }}
                        />
                        <span>{getVisibleStatusMeta(deal.status).name}</span>
                        <FiClock aria-hidden="true" />
                      </span>
                      <strong className={styles.dealName}>
                        {deal.customerName}
                      </strong>
                    </div>

                    <div className={styles.cardMeta}>
                      <span>
                        <FiUser aria-hidden="true" />{" "}
                        {deal.affiliate || deal.campaign}
                      </span>
                      <span>
                        {deal.phone || deal.city || deal.source || "Sem origem"}
                      </span>
                    </div>

                    <div className={styles.cardValueRow}>
                      <span>{deal.source}</span>
                      <strong>{formatCurrency(deal.monthlyValue)}/mês</strong>
                    </div>

                    <div className={styles.activity}>
                      <span>{deal.activity}</span>
                      <time>{formatDateTime(deal.updatedAt)}</time>
                    </div>

                    <div className={styles.archiveActions}>
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        onClick={() => {
                          setArchivedOpen(false);
                          setSelectedDealId(deal.id);
                          setActiveDetailTab("lead");
                        }}
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        onClick={() => {
                          setArchivedOpen(false);
                          openEditCardModal(deal);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        onClick={() => {
                          setArchivedOpen(false);
                          createTaskForDeal(deal.id);
                        }}
                      >
                        Tarefa
                      </button>
                      <button
                        type="button"
                        className={styles.primaryAction}
                        onClick={() => restoreArchivedDeal(deal)}
                      >
                        Resgatar
                      </button>
                      <button
                        type="button"
                        className={styles.deleteAction}
                        onClick={() => deleteArchivedDeal(deal.id)}
                      >
                        Apagar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <footer>
              <button
                type="button"
                className={styles.ghostAction}
                onClick={() => setArchivedOpen(false)}
              >
                Fechar
              </button>
            </footer>
          </section>
        </div>
      )}

      {selectedDeal && (
        <>
          <button
            type="button"
            className={styles.detailBackdrop}
            aria-label="Fechar detalhes da negociação"
            onClick={() => setSelectedDealId(null)}
          />
          <aside
            className={styles.detailPanel}
            aria-label="Detalhes da negociação"
          >
          <header>
            <div>
              <span>{getVisibleStatusMeta(selectedDeal.status).name}</span>
              <h2>{selectedDeal.customerName}</h2>
            </div>
            <button type="button" onClick={() => setSelectedDealId(null)}>
              <FiX aria-hidden="true" />
            </button>
          </header>

          <nav className={styles.detailTabs}>
            {detailTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeDetailTab === tab.id ? styles.tabActive : ""}
                onClick={() => setActiveDetailTab(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </nav>

          <div className={styles.detailContent}>
            {activeDetailTab === "lead" && (
              <dl>
                <dt>Telefone</dt>
                <dd>{selectedDeal.phone}</dd>
                <dt>E-mail</dt>
                <dd>{selectedDeal.email}</dd>
                <dt>Cidade</dt>
                <dd>{selectedDeal.city}</dd>
                <dt>Bairro</dt>
                <dd>{selectedDeal.neighborhood}</dd>
                <dt>Endereço</dt>
                <dd>{selectedDeal.address}</dd>
                <dt>Origem</dt>
                <dd>{selectedDeal.source}</dd>
                <dt>Afiliado</dt>
                <dd>{selectedDeal.affiliate}</dd>
                <dt>Campanha</dt>
                <dd>{selectedDeal.campaign}</dd>
                <dt>Código de rastreio</dt>
                <dd>{selectedDeal.trackingCode || "-"}</dd>
                <dt>Plano de interesse</dt>
                <dd>{selectedDeal.plan}</dd>
                <dt>Valor estimado</dt>
                <dd>{formatCurrency(selectedDeal.monthlyValue)}</dd>
              </dl>
            )}

            {activeDetailTab === "service" && (
              <dl>
                <dt>Status</dt>
                <dd>{getVisibleStatusMeta(selectedDeal.status).name}</dd>
                <dt>Etapa atual</dt>
                <dd>{getStage(stages, selectedDeal.stageId)?.title}</dd>
                <dt>Responsável</dt>
                <dd>{selectedDeal.owner}</dd>
                <dt>Número de tentativas</dt>
                <dd>{selectedDeal.attempts}</dd>
                <dt>Último contato</dt>
                <dd>{formatDateTime(selectedDeal.lastInteractionAt)}</dd>
                <dt>Próximo contato</dt>
                <dd>{formatDateTime(selectedDeal.nextFollowUpAt)}</dd>
                <dt>Observacoes</dt>
                <dd>{selectedDeal.notes}</dd>
              </dl>
            )}

            {activeDetailTab === "tasks" && (
              <div className={styles.taskList}>
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => handleCardAction("task", selectedDeal)}
                >
                  Criar nova tarefa
                </button>
                {selectedDeal.tasks.length === 0 ? (
                  <div className={styles.emptyColumn}>
                    Nenhuma tarefa cadastrada
                  </div>
                ) : (
                  selectedDeal.tasks.map((task) => (
                    <article key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        <span>{task.status}</span>
                        <time>
                          {task.dueAt ? formatDateTime(task.dueAt) : "Sem prazo"}
                        </time>
                      </div>
                      <div className={styles.taskActions}>
                        <button
                          type="button"
                          className={styles.secondaryAction}
                          onClick={() =>
                            editTaskForDeal(selectedDeal.id, task.id)
                          }
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className={styles.deleteAction}
                          onClick={() =>
                            deleteTaskForDeal(selectedDeal.id, task.id)
                          }
                        >
                          Apagar
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}

            {activeDetailTab === "history" && (
              <ol className={styles.timeline}>
                {selectedDeal.history.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            )}

            {activeDetailTab === "sale" && (
              <dl>
                <dt>Plano contratado</dt>
                <dd>{selectedDeal.sale?.plan || selectedDeal.plan}</dd>
                <dt>Valor mensal</dt>
                <dd>
                  {formatCurrency(
                    selectedDeal.sale?.monthlyValue ||
                      selectedDeal.monthlyValue,
                  )}
                </dd>
                <dt>Taxa de instalacao</dt>
                <dd>
                  {formatCurrency(selectedDeal.sale?.installationFee || 0)}
                </dd>
                <dt>Data de fechamento</dt>
                <dd>
                  {selectedDeal.sale?.closedAt
                    ? formatDateTime(selectedDeal.sale.closedAt)
                    : "-"}
                </dd>
                <dt>Data de instalacao</dt>
                <dd>
                  {selectedDeal.sale?.installationAt
                    ? formatDateTime(selectedDeal.sale.installationAt)
                    : "-"}
                </dd>
                <dt>Status da instalacao</dt>
                <dd>{selectedDeal.sale?.installationStatus || "Pendente"}</dd>
                <dt>Código do cliente no SGP</dt>
                <dd>{selectedDeal.sgpId || "-"}</dd>
                <dt>Comissão do afiliado</dt>
                <dd>{formatCurrency(selectedDeal.sale?.commission || 0)}</dd>
              </dl>
            )}

            {activeDetailTab === "integrations" && (
              <dl>
                <dt>ID no Chatmix</dt>
                <dd>{selectedDeal.chatmixId || "-"}</dd>
                <dt>ID no SGP</dt>
                <dd>{selectedDeal.sgpId || "-"}</dd>
                <dt>Última sincronização</dt>
                <dd>{formatDateTime(selectedDeal.updatedAt)}</dd>
                <dt>Status da sincronização</dt>
                <dd>
                  {syncStatus === "warning" ? "Falha parcial" : "Atualizado"}
                </dd>
              </dl>
            )}
          </div>

          <footer className={styles.detailActions}>
            <button
              type="button"
              onClick={() => openEditCardModal(selectedDeal)}
            >
              <FiEdit3 aria-hidden="true" /> Editar
            </button>
            <button
              type="button"
              onClick={() => handleCardAction("whatsapp", selectedDeal)}
            >
              <FiSend aria-hidden="true" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => handleCardAction("task", selectedDeal)}
            >
              <FiClock aria-hidden="true" /> Tarefa
            </button>
            <button
              type="button"
              onClick={() => handleCardAction("won", selectedDeal)}
            >
              <FiCheckCircle aria-hidden="true" /> Concluir
            </button>
          </footer>
          </aside>
        </>
      )}

      {optionsModal && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <section className={styles.optionModal}>
            <header>
              <h2>
                {optionsModal === "import" && "Importar leads"}
                {optionsModal === "funnel" && "Configurar funil"}
                {optionsModal === "stages" && "Configurar etapas"}
                {optionsModal === "permissions" && "Configurar permissões"}
              </h2>
              <button type="button" onClick={() => setOptionsModal(null)}>
                <FiX aria-hidden="true" />
              </button>
            </header>

            {optionsModal === "import" && (
              <div className={styles.optionBody}>
                <label className={styles.fullField}>
                  <span>Leads para importar</span>
                  <textarea
                    value={importLeadsText}
                    placeholder={
                      "Nome; telefone; email; cidade\nMaria Souza; 63999999999; maria@email.com; Palmas"
                    }
                    onChange={(event) => setImportLeadsText(event.target.value)}
                  />
                </label>
              </div>
            )}

            {optionsModal === "funnel" && (
              <div className={styles.optionBody}>
                <label>
                  <span>Funil ativo</span>
                  <select
                    value={selectedFunnel}
                    onChange={(event) => setSelectedFunnel(event.target.value)}
                  >
                    {funnels.map((funnel) => (
                      <option key={funnel} value={funnel}>
                        {funnel}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Visualização padrão</span>
                  <select
                    value={viewMode}
                    onChange={(event) =>
                      setViewMode(event.target.value as ViewMode)
                    }
                  >
                    <option value="kanban">Kanban</option>
                    <option value="list">Lista</option>
                  </select>
                </label>
                <label>
                  <span>Status padrão do filtro</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as DealStatus | "all")
                    }
                  >
                    <option value="all">Todos os status</option>
                    {statusOptions.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {optionsModal === "stages" && (
              <div className={styles.optionBody}>
                <div className={styles.optionList}>
                  {stages.map((stage, index) => (
                    <article key={stage.id}>
                      <span style={{ backgroundColor: stage.color }} />
                      <strong>{stage.title}</strong>
                      <small>{stage.slaHours}h SLA</small>
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        onClick={() => {
                          setOptionsModal(null);
                          openEditStageModal(stage, index + 1);
                        }}
                      >
                        Editar
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {optionsModal === "permissions" && (
              <div className={styles.optionBody}>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={permissionSettings.teamCanMoveCards}
                    onChange={(event) =>
                      setPermissionSettings((current) => ({
                        ...current,
                        teamCanMoveCards: event.target.checked,
                      }))
                    }
                  />
                  Equipe pode mover cartões
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={permissionSettings.teamCanEditCards}
                    onChange={(event) =>
                      setPermissionSettings((current) => ({
                        ...current,
                        teamCanEditCards: event.target.checked,
                      }))
                    }
                  />
                  Equipe pode editar cartões
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={permissionSettings.teamCanDeleteColumns}
                    onChange={(event) =>
                      setPermissionSettings((current) => ({
                        ...current,
                        teamCanDeleteColumns: event.target.checked,
                      }))
                    }
                  />
                  Equipe pode apagar colunas
                </label>
              </div>
            )}

            <footer>
              {optionsModal === "import" && (
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={importLeadsFromText}
                >
                  Importar leads
                </button>
              )}
              {optionsModal === "stages" && (
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => {
                    setOptionsModal(null);
                    openCreateStageModal();
                  }}
                >
                  Adicionar etapa
                </button>
              )}
              {(optionsModal === "funnel" ||
                optionsModal === "permissions") && (
                <button
                  type="button"
                  className={styles.primaryAction}
                  onClick={() => {
                    setOptionsModal(null);
                    setSyncStatus("success");
                    setSyncMessage("Configuração salva para esta sessão.");
                  }}
                >
                  Salvar configuração
                </button>
              )}
              <button
                type="button"
                className={styles.ghostAction}
                onClick={() => setOptionsModal(null)}
              >
                Fechar
              </button>
            </footer>
          </section>
        </div>
      )}

      {syncDetailsOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <section className={styles.syncModal}>
            <header>
              <h2>Histórico de sincronização</h2>
              <button type="button" onClick={() => setSyncDetailsOpen(false)}>
                <FiX aria-hidden="true" />
              </button>
            </header>
            {syncLogs.map((log) => (
              <article key={`${log.integration}-${log.date}`}>
                <strong>{log.integration}</strong>
                <span>{log.date}</span>
                <b>{log.status}</b>
                <p>{log.message}</p>
                <small>{log.user}</small>
              </article>
            ))}
          </section>
        </div>
      )}
    </main>
  );
}
