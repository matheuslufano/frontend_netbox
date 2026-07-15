"use client";

import {
  type CSSProperties,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
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
  atualizarCrmDeal,
  atualizarCrmStage,
  criarCrmStage,
  criarCrmDeal,
  listarChatmixWebhookLogs,
  listarClientesSgp,
  listarCrmDeals,
  type CrmDeal as BackendCrmDeal,
} from "@/lib/api";
import styles from "./crm.module.css";

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

const STAGE_ICONS_STORAGE_KEY = "crm-stage-icons-v1";
const stageIconOptions = [
  { value: "", label: "Sem icone" },
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
  rdId: string;
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

type RdDeal = {
  id: string;
  name?: string;
  customerName?: string;
  status: DealStatus;
  value: number;
  source: string;
  affiliate: string;
  activity: string;
  updatedAt: string;
  stageId?: string;
  pipelineId?: string;
  stageName?: string;
};

type RdPipeline = {
  id: string;
  name: string;
  stages: Array<{
    id: string;
    name: string;
  }>;
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
    title: "Sem contato",
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
    title: "Informacoes cadastrais",
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
  { id: "negotiation", name: "Em negociacao", color: "#db2777" },
  { id: "won", name: "Venda concluida", color: "#16a34a" },
  { id: "lost", name: "Venda perdida", color: "#6b7280" },
  { id: "canceled", name: "Cancelada", color: "#991b1b" },
];

const scopeOptions: Array<{ id: ScopeFilter; name: string }> = [
  { id: "all", name: "Todas as negociacoes" },
  { id: "mine", name: "Minhas negociacoes" },
  { id: "team", name: "Negociacoes da equipe" },
  { id: "unassigned", name: "Negociacoes sem responsavel" },
  { id: "overdue", name: "Negociacoes atrasadas" },
  { id: "open", name: "Negociacoes abertas" },
  { id: "won", name: "Negociacoes ganhas" },
  { id: "lost", name: "Negociacoes perdidas" },
];

const sortOptions: Array<{ id: SortMode; name: string }> = [
  { id: "created-desc", name: "Criadas por ultimo" },
  { id: "created-asc", name: "Criadas primeiro" },
  { id: "updated-desc", name: "Atualizadas por ultimo" },
  { id: "value-desc", name: "Maior valor" },
  { id: "value-asc", name: "Menor valor" },
  { id: "oldest-no-contact", name: "Mais antigas sem contato" },
  { id: "next-follow-up", name: "Proximo contato mais proximo" },
  { id: "overdue-first", name: "Leads atrasados primeiro" },
];

const periodOptions: Array<{ id: PeriodFilter; name: string }> = [
  { id: "today", name: "Hoje" },
  { id: "yesterday", name: "Ontem" },
  { id: "last-7", name: "Ultimos 7 dias" },
  { id: "last-30", name: "Ultimos 30 dias" },
  { id: "this-month", name: "Este mes" },
  { id: "last-month", name: "Mes passado" },
  { id: "custom", name: "Periodo personalizado" },
];

const priorityLabels: Record<Priority, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const detailTabs: Array<{ id: DetailTab; name: string }> = [
  { id: "lead", name: "Dados do lead" },
  { id: "service", name: "Atendimento" },
  { id: "tasks", name: "Tarefas" },
  { id: "history", name: "Historico" },
  { id: "sale", name: "Venda" },
  { id: "integrations", name: "Integracoes" },
];

const quickStatusOptions: Array<{
  id: DealStatus;
  name: string;
  cardColor: string;
  dotColor: string;
}> = [
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
    name: "Em negociacao",
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

function formatDealPhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return value || "Nao informado";
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

function mergeLocalDealEdits(sourceDeals: Deal[]) {
  const edits = readLocalDealEdits();

  return sourceDeals.map((deal) => {
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

function createDealFromRd(record: RdDeal, fallbackStageId: string): Deal {
  const id = record.id || `rd-${Date.now()}`;
  const name = record.customerName || record.name || "Negociacao sem nome";
  const now = new Date().toISOString();

  return {
    id,
    customerName: name,
    phone: "",
    email: "",
    city: "",
    neighborhood: "",
    address: "",
    status: record.status || "ongoing",
    stageId: record.stageId || fallbackStageId,
    pipelineId: record.pipelineId,
    source: record.source || "RD Station CRM",
    affiliate: record.affiliate || "RD Station CRM",
    campaign: "RD Station",
    value: record.value || 0,
    monthlyValue: record.value || 0,
    plan: "A definir",
    owner: record.affiliate || "RD Station CRM",
    activity: record.activity || "Criar tarefa",
    createdAt: record.updatedAt || now,
    updatedAt: record.updatedAt || now,
    lastInteractionAt: record.updatedAt || now,
    nextFollowUpAt: record.updatedAt || now,
    priority: "medium",
    attempts: 0,
    notes: "Sincronizado do RD Station CRM.",
    trackingCode: "",
    chatmixId: "",
    rdId: id,
    sgpId: "",
    history: [`${formatDateTime(now)} - Negociacao sincronizada do RD`],
    tasks: [],
  };
}

function normalizeBackendStatus(value: string): DealStatus {
  return statusOptions.some((status) => status.id === value)
    ? (value as DealStatus)
    : "ongoing";
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
    customerName: record.customerName || "Negociacao sem nome",
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
    owner: record.owner || "Equipe Netbox",
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
    rdId: record.rdId || "",
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
    activity: deal.activity,
    lastInteractionAt: deal.lastInteractionAt,
    nextFollowUpAt: deal.nextFollowUpAt,
    priority: deal.priority,
    attempts: deal.attempts,
    notes: deal.notes,
    trackingCode: deal.trackingCode,
    chatmixId: deal.chatmixId,
    rdId: deal.rdId,
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

function buildStagesFromRd(pipelines: RdPipeline[]) {
  const firstPipeline = pipelines[0];
  const colors = [
    "#64748b",
    "#0891b2",
    "#2563eb",
    "#7c3aed",
    "#16a34a",
    "#6b7280",
  ];

  if (!firstPipeline?.stages?.length) {
    return defaultStages;
  }

  return firstPipeline.stages.map((stage, index) => {
    const title = normalizeTitle(stage.name);
    const normalized = title.toLowerCase();

    return {
      id: stage.id,
      title,
      color: colors[index % colors.length],
      slaHours: 24,
      isWonStage: normalized.includes("conclu") || normalized.includes("vend"),
      isLostStage: normalized.includes("perd") || normalized.includes("nao"),
    };
  });
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
  const [deals, setDeals] = useState<Deal[]>(() =>
    mergeLocalDealEdits(demoDeals),
  );
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
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
  const [loadingRd, setLoadingRd] = useState(false);
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
      // Mantem os icones vazios quando o armazenamento estiver indisponivel.
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

  const loadRdCrm = useCallback(async () => {
    setLoadingRd(true);
    setSyncStatus("info");
    setSyncMessage("Sincronizando CRM com clientes convertidos...");

    try {
      const crmData = await listarCrmDeals(true);

      if (crmData.deals.length > 0) {
        if (crmData.stages.length > 0) {
          setStages(
            crmData.stages.map((stage) => ({
              id: stage.id,
              title: stage.title,
              color: stage.color,
              slaHours: stage.slaHours,
              isFinal: stage.isFinal,
              isWonStage: stage.isWonStage,
              isLostStage: stage.isLostStage,
            })),
          );
        }

        setDeals(crmData.deals.map(createDealFromBackend));
        setSyncStatus("success");
        setSyncMessage(
          crmData.sync
            ? `${crmData.sync.total} cliente(s) convertido(s) sincronizados do relatorio.`
            : "CRM carregado do banco de dados.",
        );
        return;
      }
    } catch {
      setSyncStatus("warning");
      setSyncMessage(
        "Nao foi possivel carregar o CRM do banco. Tentando RD Station.",
      );
    }

    try {
      const [pipelinesResponse, dealsResponse] = await Promise.all([
        fetch("/api/rdstation/pipelines"),
        fetch("/api/rdstation/deals"),
      ]);

      if (!pipelinesResponse.ok || !dealsResponse.ok) {
        setSyncStatus("warning");
        setSyncMessage(
          "Nao foi possivel sincronizar com o RD. Exibindo dados locais.",
        );
        return;
      }

      const pipelinesData = await pipelinesResponse.json();
      const dealsData = await dealsResponse.json();
      const pipelines = Array.isArray(pipelinesData?.pipelines)
        ? pipelinesData.pipelines
        : [];
      const rdDeals = Array.isArray(dealsData?.deals) ? dealsData.deals : [];
      const nextStages = buildStagesFromRd(pipelines);

      if (rdDeals.length === 0) {
        setSyncStatus("success");
        setSyncMessage(
          "RD conectado, mas nenhuma negociacao foi encontrada no filtro atual.",
        );
        return;
      }

      setStages(nextStages);
      setDeals(
        rdDeals.map((deal: RdDeal) =>
          createDealFromRd(deal, nextStages[0]?.id || "sem-contato"),
        ),
      );
      setSyncStatus("success");
      setSyncMessage("Dados atualizados com sucesso.");
    } catch {
      setSyncStatus("warning");
      setSyncMessage(
        "Nao foi possivel sincronizar com o RD. Exibindo dados locais.",
      );
    } finally {
      setLoadingRd(false);
    }
  }, []);

  useEffect(() => {
    const sync = window.setTimeout(() => {
      loadRdCrm();
    }, 0);

    return () => window.clearTimeout(sync);
  }, [loadRdCrm]);

  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === selectedDealId) || null,
    [deals, selectedDealId],
  );

  const activeFilterCount = useMemo(() => {
    return Object.values(advancedFilters).filter((value) =>
      typeof value === "boolean" ? value : Boolean(value),
    ).length;
  }, [advancedFilters]);

  const filteredDeals = useMemo(() => {
    const currentUser = "Mateus";
    const filtered = deals.filter((deal) => {
      if (deal.status === "canceled" && statusFilter !== "canceled") {
        return false;
      }

      if (statusFilter !== "all" && deal.status !== statusFilter) {
        return false;
      }

      if (scopeFilter === "mine" && deal.owner !== currentUser) {
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
  }, [advancedFilters, deals, scopeFilter, sortMode, statusFilter]);

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
        integration: "RD Station",
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
                `${formatDateTime(new Date().toISOString())} - Negociacao atualizada`,
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
      setSyncMessage("Informe o titulo da tarefa.");
      return;
    }

    const now = new Date().toISOString();
    const dueAt = taskForm.dueAt ? new Date(taskForm.dueAt).toISOString() : null;
    const currentDeal = deals.find((deal) => deal.id === taskForm.dealId);

    if (!currentDeal) {
      setSyncStatus("warning");
      setSyncMessage("Negociacao nao encontrada para cadastrar a tarefa.");
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
        ? "Tarefa atualizada na tela, mas nao foi possivel salvar no backend."
        : "Tarefa criada na tela, mas nao foi possivel salvar no backend.",
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
      "Tarefa apagada na tela, mas nao foi possivel salvar no backend.",
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
      setSyncMessage("Venda concluida. Comissao do afiliado preparada.");
      if (movedDeal?.status !== "won") {
        showDealOutcome("won", movedDeal?.customerName || "Negociacao");
      }
    } else if (targetStage.isLostStage) {
      setSyncStatus("warning");
      setSyncMessage(
        "Venda marcada como perdida. Informe o motivo no historico.",
      );
      if (movedDeal?.status !== "lost") {
        showDealOutcome("lost", movedDeal?.customerName || "Negociacao");
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
          "Card movido localmente, mas nao foi possivel salvar no banco do CRM.",
        );
      }
      return;
    }

    if (!isDemoDeal(dealId)) {
      try {
        const response = await fetch(`/api/rdstation/deals/${dealId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stage_id: targetStageId,
          }),
        });

        setSyncStatus(response.ok ? "success" : "warning");
        setSyncMessage(
          response.ok
            ? "Etapa atualizada no RD Station CRM."
            : "Card movido localmente, mas o RD recusou a atualizacao.",
        );
      } catch {
        setSyncStatus("warning");
        setSyncMessage(
          "Card movido localmente, mas nao foi possivel atualizar o RD.",
        );
      }
    }
  }

  function handleDrop(targetStageId: string) {
    if (!draggingDealId) {
      return;
    }

    moveDeal(draggingDealId, targetStageId);
    setDraggingDealId(null);
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
      customerName: newDeal.customerName || "NOVA NEGOCIACAO",
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
      owner: newDeal.owner,
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
      rdId: "",
      sgpId: "",
      history: [`${formatDateTime(now)} - Negociacao criada manualmente`],
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
    setSyncMessage("Salvando negociacao no backend...");

    try {
      const savedDeal = await criarCrmDeal(createBackendDealPayload(createdDeal));

      setDeals((current) =>
        current.map((deal) =>
          deal.id === id ? createDealFromBackend(savedDeal) : deal,
        ),
      );
      setSyncStatus("success");
      setSyncMessage("Negociacao criada e salva no backend.");
    } catch {
      setDeals((current) => current.filter((deal) => deal.id !== id));
      setSyncStatus("warning");
      setSyncMessage(
        "Nao foi possivel salvar a negociacao no backend. O cartao nao foi criado.",
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
      setSyncMessage("Telefone copiado para a area de transferencia.");
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
        activity: "Negociacao arquivada",
      };

      updateDeal(deal.id, patch);
      setSyncStatus("warning");
      setSyncMessage(
        "Negociacao arquivada. Ela pode ser restaurada em Opcoes.",
      );

      if (/^\d+$/.test(deal.id)) {
        try {
          await atualizarCrmDeal(deal.id, patch);
          setSyncStatus("success");
          setSyncMessage("Negociacao arquivada no backend.");
        } catch {
          setSyncStatus("warning");
          setSyncMessage(
            "Negociacao arquivada na tela, mas nao foi possivel salvar no backend.",
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
      getStatusMeta(deal.status).name,
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
    link.download = `negociacoes-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setSyncStatus("success");
    setSyncMessage(`${filteredDeals.length} negociacao(oes) exportada(s).`);
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
        source: "Importacao manual",
        affiliate: "Sem afiliado",
        campaign: "Importacao",
        value: 0,
        monthlyValue: 0,
        owner: "Equipe Netbox",
        activity: "Lead importado",
        createdAt: now,
        updatedAt: now,
        lastInteractionAt: now,
        nextFollowUpAt: now,
        priority: "medium" as Priority,
        attempts: 0,
        notes: "Lead importado pelo menu de opcoes.",
        trackingCode: `NBX-IMP-${String(Date.now()).slice(-4)}-${index + 1}`,
        chatmixId: "",
        rdId: "",
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
      setSyncMessage("Nao foi possivel sincronizar com Chatmix.");
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
      setSyncMessage("Nao foi possivel sincronizar com SGP.");
    }
  }

  function handleGeneralMenuAction(label: string) {
    setGeneralMenuOpen(false);

    if (label === "Exportar negociacoes") {
      exportDealsCsv();
      return;
    }

    if (label === "Importar leads") {
      setOptionsModal("import");
      return;
    }

    if (label === "Negociacoes arquivadas") {
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

    if (label === "Ver historico de sincronizacao") {
      setSyncDetailsOpen(true);
      return;
    }

    if (label === "Sincronizar com RD") {
      loadRdCrm();
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

    if (label === "Configurar permissoes") {
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
      activity: "Negociacao restaurada",
      cardColor: "",
    };

    updateDeal(deal.id, patch);
    setSyncStatus("success");
    setSyncMessage("Negociacao restaurada para o funil.");

    if (!/^\d+$/.test(deal.id)) {
      return;
    }

    try {
      await atualizarCrmDeal(deal.id, patch);
      setSyncStatus("success");
      setSyncMessage("Negociacao restaurada no backend.");
    } catch {
      setSyncStatus("warning");
      setSyncMessage(
        "Negociacao restaurada na tela, mas nao foi possivel salvar no backend.",
      );
    }
  }

  async function deleteArchivedDeal(dealId: string) {
    if (/^\d+$/.test(dealId)) {
      try {
        await apagarCrmDeal(dealId);
      } catch {
        setSyncStatus("warning");
        setSyncMessage("Nao foi possivel apagar a negociacao no backend.");
        return;
      }
    }

    setDeals((current) => current.filter((deal) => deal.id !== dealId));

    if (selectedDealId === dealId) {
      setSelectedDealId(null);
    }

    setSyncStatus("success");
    setSyncMessage("Negociacao apagada do backend.");
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
        "A coluna nao pode ser venda concluida e venda perdida ao mesmo tempo.",
      );
      return;
    }

    try {
      if (stageForm.id) {
        const updatedStage = await atualizarCrmStage(stageForm.id, payload);
        setStages((current) =>
          current
            .map((stage) =>
              stage.id === updatedStage.id
                ? {
                    id: updatedStage.id,
                    title: updatedStage.title,
                    color: updatedStage.color,
                    slaHours: updatedStage.slaHours,
                    isFinal: updatedStage.isFinal,
                    isWonStage: updatedStage.isWonStage,
                    isLostStage: updatedStage.isLostStage,
                  }
                : stage,
            )
            .sort((first, second) => {
              const firstPosition =
                first.id === updatedStage.id
                  ? (payload.position ??
                    stages.findIndex((item) => item.id === first.id) + 1)
                  : stages.findIndex((item) => item.id === first.id) + 1;
              const secondPosition =
                second.id === updatedStage.id
                  ? (payload.position ??
                    stages.findIndex((item) => item.id === second.id) + 1)
                  : stages.findIndex((item) => item.id === second.id) + 1;

              return firstPosition - secondPosition;
            }),
        );
        setStageIcons((current) => ({
          ...current,
          [updatedStage.id]: stageForm.icon,
        }));
        setSyncMessage("Coluna atualizada com sucesso.");
      } else {
        const createdStage = await criarCrmStage(payload);
        setStages((current) => [
          ...current,
          {
            id: createdStage.id,
            title: createdStage.title,
            color: createdStage.color,
            slaHours: createdStage.slaHours,
            isFinal: createdStage.isFinal,
            isWonStage: createdStage.isWonStage,
            isLostStage: createdStage.isLostStage,
          },
        ]);
        setStageIcons((current) => ({
          ...current,
          [createdStage.id]: stageForm.icon,
        }));
        setSyncMessage("Coluna criada com sucesso.");
      }

      setSyncStatus("success");
      setStageModalOpen(false);
      setStageForm(defaultStageForm);
      await loadRdCrm();
    } catch {
      setSyncStatus("warning");
      setSyncMessage("Nao foi possivel salvar a configuracao da coluna.");
    }
  }

  function handleDeleteStage() {
    if (!stageForm.id) {
      return;
    }

    const remainingStages = stages.filter((stage) => stage.id !== stageForm.id);

    if (remainingStages.length === 0) {
      setSyncStatus("warning");
      setSyncMessage("O funil precisa ter pelo menos uma coluna.");
      return;
    }

    const fallbackStage = remainingStages[0];
    const movedDeals = deals.filter(
      (deal) => deal.stageId === stageForm.id,
    ).length;

    setStages(remainingStages);
    setStageIcons((current) => {
      const next = { ...current };
      delete next[stageForm.id as string];
      return next;
    });
    setDeals((current) =>
      current.map((deal) =>
        deal.stageId === stageForm.id
          ? {
              ...deal,
              stageId: fallbackStage.id,
              updatedAt: new Date().toISOString(),
              history: [
                `${formatDateTime(new Date().toISOString())} - Coluna removida; negociacao movida para ${fallbackStage.title}`,
                ...deal.history,
              ],
            }
          : deal,
      ),
    );
    setStageModalOpen(false);
    setStageForm(defaultStageForm);
    setSyncStatus("warning");
    setSyncMessage(
      movedDeals > 0
        ? `Coluna apagada. ${movedDeals} negociacao(oes) movida(s) para ${fallbackStage.title}.`
        : "Coluna apagada.",
    );
  }

  function openEditCardModal(deal: Deal) {
    setCardEditForm({
      id: deal.id,
      customerName: deal.customerName,
      phone: deal.phone,
      email: deal.email,
      city: deal.city,
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
    const patch: Partial<Deal> = {
      customerName: cardEditForm.customerName.trim() || "NEGOCIACAO SEM NOME",
      phone: cardEditForm.phone.trim(),
      email: cardEditForm.email.trim(),
      city: cardEditForm.city.trim(),
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
      notes: cardEditForm.notes.trim(),
    };

    updateDeal(cardEditForm.id, patch);
    setCardEditOpen(false);
    setCardEditForm(null);

    if (/^\d+$/.test(cardEditForm.id)) {
      try {
        await atualizarCrmDeal(cardEditForm.id, {
          customerName: patch.customerName,
          phone: patch.phone,
          email: patch.email,
          city: patch.city,
          plan: patch.plan,
          monthlyValue: patch.monthlyValue,
          priorityLevel: patch.priority,
          cardColor: patch.cardColor,
          notes: patch.notes,
        });
        setSyncStatus("success");
        setSyncMessage("Cartao atualizado com sucesso.");
      } catch {
        setSyncStatus("warning");
        setSyncMessage(
          "Cartao atualizado na tela, mas nao foi possivel salvar no banco.",
        );
      }
    } else if (!isDemoDeal(cardEditForm.id)) {
      try {
        const response = await fetch(
          `/api/rdstation/deals/${cardEditForm.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerName: patch.customerName,
              phone: patch.phone,
              email: patch.email,
              source: patch.source,
              affiliate: patch.affiliate,
              campaign: patch.campaign,
              plan: patch.plan,
              monthlyValue: patch.monthlyValue,
              priority: patch.priority,
              cardColor: patch.cardColor,
              notes: patch.notes,
            }),
          },
        );

        setSyncStatus(response.ok ? "success" : "warning");
        setSyncMessage(
          response.ok
            ? "Cartao atualizado no RD Station CRM."
            : "Cartao atualizado na tela, mas o RD recusou a atualizacao.",
        );
      } catch {
        setSyncStatus("warning");
        setSyncMessage(
          "Cartao atualizado na tela, mas nao foi possivel salvar no RD.",
        );
      }
    } else {
      setSyncStatus("success");
      setSyncMessage("Cartao atualizado na tela.");
    }
  }

  async function handleQuickStatusChange(
    deal: Deal,
    option: (typeof quickStatusOptions)[number],
  ) {
    setActiveStatusMenuId(null);
    updateDeal(deal.id, {
      status: option.id,
      cardColor: option.cardColor,
      activity: option.name,
    });
    setSyncStatus("success");
    setSyncMessage(`Status do cartao alterado para ${option.name}.`);

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
      if (/^\d+$/.test(deal.id)) {
        await atualizarCrmDeal(deal.id, {
          status: option.id,
          cardColor: option.cardColor,
          activity: option.name,
        });
      } else {
        const response = await fetch(`/api/rdstation/deals/${deal.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: option.id,
            cardColor: option.cardColor,
            activity: option.name,
          }),
        });

        if (!response.ok) {
          throw new Error("RD recusou a atualizacao.");
        }
      }

      setSyncStatus("success");
      setSyncMessage(`Status ${option.name} salvo no CRM.`);
    } catch {
      setSyncStatus("warning");
      setSyncMessage(
        `Status ${option.name} aplicado na tela, mas nao foi possivel salvar no CRM.`,
      );
    }
  }

  function renderDealCard(deal: Deal) {
    const status = getStatusMeta(deal.status);
    const quickStatus =
      quickStatusOptions.find((option) => option.id === deal.status) || null;
    const statusLabel = quickStatus?.name || status.name;
    const statusColor = quickStatus?.dotColor || status.color;
    const alertClass = isOverdue(deal)
      ? styles.dealCardDanger
      : isNearDue(deal) || deal.priority === "urgent"
        ? styles.dealCardWarning
        : "";
    const visualClass = getDealVisualClass(deal.status);
    const serviceCode = deal.chatmixId || deal.id;
    const conversionCode = deal.conversionId
      ? String(deal.conversionId)
      : deal.trackingCode || "Nao informado";

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
            <strong>{deal.customerName}</strong>
          </div>
          <time dateTime={deal.createdAt}>
            <FiCalendar aria-hidden="true" />
            {formatCardDate(deal.createdAt)}
          </time>
        </header>

        <strong className={styles.dealServiceTitle}>
          Negociacao Atendimento #{serviceCode}
        </strong>

        <div className={styles.dealInfoList}>
          <div>
            <FiUser aria-hidden="true" />
            <span>
              <small>Atendente Chatmix</small>
              <strong>{deal.owner || "Nao informado"}</strong>
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
              <small>Codigo de conversao</small>
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
                {quickStatusOptions.map((option) => (
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
            aria-label="Ver detalhes da negociacao"
            title="Ver detalhes da negociacao"
            onClick={() => handleCardAction("details", deal)}
          >
            <FiEye aria-hidden="true" />
          </button>
        </div>

        <div className={styles.dealOrigin}>
          <span aria-hidden="true">i</span>
          <strong>Origem:</strong>
          <p>{deal.source || "Nao informada"}</p>
        </div>

        <div className={styles.cardMenuWrap}>
          <button
            type="button"
            className={styles.cardMenuButton}
            title="Acoes da negociacao"
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
                Editar negociacao
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
                Arquivar negociacao
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
                ? "Otimo trabalho, essa negociacao foi finalizada com sucesso."
                : "Tudo bem. O historico foi salvo para analise e melhoria do funil."}
            </p>
            <span>{dealOutcome.dealName}</span>
          </div>
        </div>
      )}

      <header className={styles.toolbar}>
        <div className={styles.viewSwitcher} aria-label="Modo de visualizacao">
          <button
            type="button"
            className={
              viewMode === "kanban"
                ? styles.viewButtonActive
                : styles.viewButton
            }
            title="Visualizacao Kanban"
            onClick={() => setViewMode("kanban")}
          >
            <FiBarChart2 aria-hidden="true" />
          </button>
          <button
            type="button"
            className={
              viewMode === "list" ? styles.viewButtonActive : styles.viewButton
            }
            title="Visualizacao em Lista"
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
              title="Opcoes"
              onClick={() => setGeneralMenuOpen((current) => !current)}
            >
              <FiMoreVertical aria-hidden="true" />
            </button>
            {generalMenuOpen && (
              <div className={styles.generalMenu}>
                {[
                  ["Exportar negociacoes", FiDownload],
                  ["Importar leads", FiClipboard],
                  ["Negociacoes arquivadas", FiClock],
                  ["Configurar funil", FiSliders],
                  ["Configurar etapas", FiList],
                  ["Ver historico de sincronizacao", FiClock],
                  ["Sincronizar com RD", FiRefreshCw],
                  ["Sincronizar com Chatmix", FiRefreshCw],
                  ["Sincronizar com SGP", FiRefreshCw],
                  ["Configurar permissoes", FiUser],
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
            onClick={loadRdCrm}
          >
            <FiRefreshCw
              aria-hidden="true"
              className={loadingRd ? styles.spin : ""}
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

      <section className={styles.filters} aria-label="Filtros do CRM">
        <label className={styles.selectWrap}>
          <FiFilter aria-hidden="true" />
          <select
            value={selectedFunnel}
            onChange={(event) => setSelectedFunnel(event.target.value)}
          >
            {funnels.map((funnel) => (
              <option key={funnel} value={funnel}>
                {funnel.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.selectWrap}>
          <FiUser aria-hidden="true" />
          <select
            value={scopeFilter}
            onChange={(event) =>
              setScopeFilter(event.target.value as ScopeFilter)
            }
          >
            {scopeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.selectWrap}>
          <FiSliders aria-hidden="true" />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as DealStatus | "all")
            }
          >
            <option value="all">Todos os status</option>
            {statusOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.selectWrap}>
          <FiList aria-hidden="true" />
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={`${styles.filterButton} ${
            activeFilterCount > 0 ? styles.filterButtonActive : ""
          }`}
          onClick={() => setAdvancedFiltersOpen(true)}
        >
          <FiFilter aria-hidden="true" />
          <span>Filtros ({activeFilterCount})</span>
        </button>
      </section>

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
        <span>{loadingRd ? "Sincronizando RD..." : syncMessage}</span>
        <FiChevronDown aria-hidden="true" />
      </button>

      <div className={styles.summaryBar}>
        <span>
          {totals.deals}{" "}
          {activeFilterCount > 0 || statusFilter !== "all"
            ? "Negociacoes encontradas"
            : "Negociacoes"}
        </span>
        <strong>{formatCurrency(totals.amount)}</strong>
        <em>
          {selectedFunnel} -{" "}
          {periodOptions.find((item) => item.id === periodFilter)?.name}
        </em>
      </div>

      {viewMode === "kanban" ? (
        <>
          <section className={styles.board} aria-label="Funil de vendas">
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
                  className={styles.column}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(stage.id)}
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

                  <div className={styles.cards}>
                    {stageDeals.length > 0 ? (
                      stageDeals.map(renderDealCard)
                    ) : (
                      <div className={styles.emptyColumn}>Sem negociacoes</div>
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
        <section className={styles.listView} aria-label="Lista de negociacoes">
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
                <th>Responsavel</th>
                <th>Data de criacao</th>
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
                          backgroundColor: getStatusMeta(deal.status).color,
                        }}
                      />
                      {getStatusMeta(deal.status).name}
                    </span>
                  </td>
                  <td>{deal.source}</td>
                  <td>{deal.affiliate}</td>
                  <td>{formatCurrency(deal.monthlyValue)}</td>
                  <td>{deal.owner || "Sem responsavel"}</td>
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
              ["owner", "Responsavel"],
              ["source", "Origem do lead"],
              ["minValue", "Valor minimo"],
              ["maxValue", "Valor maximo"],
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
              <h2>Criar negociacao</h2>
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
                ["address", "Endereco"],
                ["source", "Origem do lead"],
                ["affiliate", "Afiliado"],
                ["campaign", "Campanha"],
                ["value", "Valor estimado"],
                ["plan", "Plano de interesse"],
                ["owner", "Responsavel"],
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
                <span>Observacao</span>
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
                Salvar negociacao
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
                <span>Posicao no funil</span>
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
                <span>Icone da coluna</span>
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
                          setSyncMessage("O icone deve ter no maximo 300 KB.");
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
                  PNG, JPG, WebP ou SVG de ate 300 KB.
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
                  onClick={handleDeleteStage}
                >
                  Apagar coluna
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
                <span>Titulo da tarefa</span>
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
              <h2>Editar cartao</h2>
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
                <input
                  value={cardEditForm.phone}
                  onChange={(event) =>
                    setCardEditForm((current) =>
                      current
                        ? { ...current, phone: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                <span>E-mail</span>
                <input
                  value={cardEditForm.email}
                  onChange={(event) =>
                    setCardEditForm((current) =>
                      current
                        ? { ...current, email: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                <span>Cidade</span>
                <input
                  value={cardEditForm.city}
                  onChange={(event) =>
                    setCardEditForm((current) =>
                      current
                        ? { ...current, city: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                <span>Plano</span>
                <input
                  value={cardEditForm.plan}
                  onChange={(event) =>
                    setCardEditForm((current) =>
                      current
                        ? { ...current, plan: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                <span>Valor mensal</span>
                <input
                  value={cardEditForm.monthlyValue}
                  onChange={(event) =>
                    setCardEditForm((current) =>
                      current
                        ? { ...current, monthlyValue: event.target.value }
                        : current,
                    )
                  }
                />
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
                <span>Cor do cartao</span>
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
                <span>Observacao</span>
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
                Salvar cartao
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
                <h2>Negociacoes arquivadas</h2>
                <span>{archivedDeals.length} item(ns) arquivado(s)</span>
              </div>
              <button type="button" onClick={() => setArchivedOpen(false)}>
                <FiX aria-hidden="true" />
              </button>
            </header>

            <div className={styles.archiveList}>
              {archivedDeals.length === 0 ? (
                <div className={styles.emptyColumn}>
                  Nenhuma negociacao arquivada
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
                            backgroundColor: getStatusMeta(deal.status).color,
                          }}
                        />
                        <span>{getStatusMeta(deal.status).name}</span>
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
                      <strong>{formatCurrency(deal.monthlyValue)}/mes</strong>
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
            aria-label="Fechar detalhes da negociacao"
            onClick={() => setSelectedDealId(null)}
          />
          <aside
            className={styles.detailPanel}
            aria-label="Detalhes da negociacao"
          >
          <header>
            <div>
              <span>{getStatusMeta(selectedDeal.status).name}</span>
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
                <dt>Endereco</dt>
                <dd>{selectedDeal.address}</dd>
                <dt>Origem</dt>
                <dd>{selectedDeal.source}</dd>
                <dt>Afiliado</dt>
                <dd>{selectedDeal.affiliate}</dd>
                <dt>Campanha</dt>
                <dd>{selectedDeal.campaign}</dd>
                <dt>Codigo de rastreio</dt>
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
                <dd>{getStatusMeta(selectedDeal.status).name}</dd>
                <dt>Etapa atual</dt>
                <dd>{getStage(stages, selectedDeal.stageId)?.title}</dd>
                <dt>Responsavel</dt>
                <dd>{selectedDeal.owner}</dd>
                <dt>Numero de tentativas</dt>
                <dd>{selectedDeal.attempts}</dd>
                <dt>Ultimo contato</dt>
                <dd>{formatDateTime(selectedDeal.lastInteractionAt)}</dd>
                <dt>Proximo contato</dt>
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
                <dt>Codigo do cliente no SGP</dt>
                <dd>{selectedDeal.sgpId || "-"}</dd>
                <dt>Comissao do afiliado</dt>
                <dd>{formatCurrency(selectedDeal.sale?.commission || 0)}</dd>
              </dl>
            )}

            {activeDetailTab === "integrations" && (
              <dl>
                <dt>ID no Chatmix</dt>
                <dd>{selectedDeal.chatmixId || "-"}</dd>
                <dt>ID no RD</dt>
                <dd>{selectedDeal.rdId || "-"}</dd>
                <dt>ID no SGP</dt>
                <dd>{selectedDeal.sgpId || "-"}</dd>
                <dt>Ultima sincronizacao</dt>
                <dd>{formatDateTime(selectedDeal.updatedAt)}</dd>
                <dt>Status da sincronizacao</dt>
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
                {optionsModal === "permissions" && "Configurar permissoes"}
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
                  <span>Visualizacao padrao</span>
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
                  <span>Status padrao do filtro</span>
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
                  Equipe pode mover cartoes
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
                  Equipe pode editar cartoes
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
                    setSyncMessage("Configuracao salva para esta sessao.");
                  }}
                >
                  Salvar configuracao
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
              <h2>Historico de sincronizacao</h2>
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
