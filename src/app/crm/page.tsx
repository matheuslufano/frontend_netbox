"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiClipboard,
  FiClock,
  FiDownload,
  FiEdit3,
  FiFilter,
  FiList,
  FiMoreVertical,
  FiPlus,
  FiRefreshCw,
  FiSend,
  FiSliders,
  FiStar,
  FiUser,
  FiX,
} from "react-icons/fi";
import {
  atualizarCrmDeal,
  atualizarCrmStage,
  criarCrmStage,
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
  {
    id: "deal-1",
    customerName: "GUILHERME",
    phone: "63992110001",
    email: "guilherme@email.com",
    city: "Palmas",
    neighborhood: "Plano Diretor Sul",
    address: "Quadra 110 Sul",
    status: "new",
    stageId: "em-atendimento",
    source: "Link Campanha Netbox",
    affiliate: "Afiliado Sabrina",
    campaign: "Campanha Julho",
    value: 149.9,
    monthlyValue: 149.9,
    plan: "Fibra 600 Mega",
    owner: "Mateus",
    activity: "1o contato - 24 horas",
    createdAt: "2026-07-04T12:53:00",
    updatedAt: "2026-07-04T12:53:00",
    lastInteractionAt: "2026-07-04T12:53:00",
    nextFollowUpAt: "2026-07-06T09:00:00",
    priority: "medium",
    attempts: 1,
    notes: "Lead pediu retorno pelo WhatsApp.",
    trackingCode: "NBX-JUL-001",
    chatmixId: "chatmix-2041",
    rdId: "rd-1001",
    sgpId: "",
    history: [
      "04/07/2026 12:53 - Lead criado via Link Campanha Netbox",
      "04/07/2026 13:10 - Primeiro contato registrado",
    ],
    tasks: [
      {
        id: "task-1",
        title: "Retornar pelo WhatsApp",
        status: "pending",
        dueAt: "2026-07-06T09:00:00",
      },
    ],
  },
  {
    id: "deal-2",
    customerName: "ARTHUR",
    phone: "63992110002",
    email: "arthur@email.com",
    city: "Paraiso do Tocantins",
    neighborhood: "Centro",
    address: "Rua 7 de Setembro",
    status: "ongoing",
    stageId: "em-atendimento",
    source: "WhatsApp direto",
    affiliate: "Afiliado Pedro",
    campaign: "Organico",
    value: 139.9,
    monthlyValue: 139.9,
    plan: "Fibra 500 Mega",
    owner: "Juliana",
    activity: "3o contato - 3 a 4 dias",
    createdAt: "2026-07-03T18:01:00",
    updatedAt: "2026-07-05T08:30:00",
    lastInteractionAt: "2026-07-05T08:30:00",
    nextFollowUpAt: "2026-07-06T14:00:00",
    priority: "low",
    attempts: 3,
    notes: "Cliente comparando planos.",
    trackingCode: "NBX-WPP-043",
    chatmixId: "chatmix-2042",
    rdId: "rd-1002",
    sgpId: "",
    history: [
      "03/07/2026 18:01 - Lead criado via WhatsApp",
      "05/07/2026 08:30 - Cliente pediu proposta",
    ],
    tasks: [
      {
        id: "task-2",
        title: "Enviar proposta de 500 Mega",
        status: "pending",
        dueAt: "2026-07-06T14:00:00",
      },
    ],
  },
  {
    id: "deal-3",
    customerName: "JOELSON SILVA",
    phone: "63992110003",
    email: "joelson@email.com",
    city: "Gurupi",
    neighborhood: "Setor Aeroporto",
    address: "Av. Goias",
    status: "presentation",
    stageId: "apresentacao",
    source: "Atendimento Chatmix",
    affiliate: "Afiliado Arthur",
    campaign: "Chatmix",
    value: 159.9,
    monthlyValue: 159.9,
    plan: "Fibra 700 Mega",
    owner: "Mateus",
    activity: "Apresentacao enviada",
    createdAt: "2026-07-04T18:24:00",
    updatedAt: "2026-07-05T17:52:00",
    lastInteractionAt: "2026-07-05T17:52:00",
    nextFollowUpAt: "2026-07-06T11:30:00",
    priority: "medium",
    attempts: 2,
    notes: "Enviar cobertura do bairro.",
    trackingCode: "NBX-CHT-091",
    chatmixId: "chatmix-2043",
    rdId: "rd-1003",
    sgpId: "",
    history: [
      "04/07/2026 18:24 - Lead criado via Chatmix",
      "05/07/2026 17:52 - Apresentacao enviada",
    ],
    tasks: [
      {
        id: "task-3",
        title: "Conferir cobertura",
        status: "pending",
        dueAt: "2026-07-06T11:30:00",
      },
    ],
  },
  {
    id: "deal-4",
    customerName: "THIAGO RODRIGUES DE SOUSA",
    phone: "63992110004",
    email: "thiago@email.com",
    city: "Palmas",
    neighborhood: "Aureny III",
    address: "Rua Tocantins",
    status: "waiting",
    stageId: "apresentacao",
    source: "Trafego pago",
    affiliate: "Afiliado Sabrina",
    campaign: "Meta Ads",
    value: 0,
    monthlyValue: 0,
    plan: "A definir",
    owner: "Carlos",
    activity: "Retorno vencido",
    createdAt: "2026-07-03T15:25:00",
    updatedAt: "2026-07-03T15:25:00",
    lastInteractionAt: "2026-07-03T15:25:00",
    nextFollowUpAt: "2026-07-04T09:00:00",
    priority: "urgent",
    attempts: 2,
    notes: "Lead parado, retorno vencido.",
    trackingCode: "NBX-META-011",
    chatmixId: "",
    rdId: "rd-1004",
    sgpId: "",
    history: [
      "03/07/2026 15:25 - Lead criado via Trafego pago",
      "04/07/2026 09:00 - Retorno venceu",
    ],
    tasks: [
      {
        id: "task-4",
        title: "Retorno urgente",
        status: "overdue",
        dueAt: "2026-07-04T09:00:00",
      },
    ],
  },
  {
    id: "deal-5",
    customerName: "JOSE VICTOR ALVES DA SILVA",
    phone: "63992110005",
    email: "jose@email.com",
    city: "Porto Nacional",
    neighborhood: "Jardim Municipal",
    address: "Rua Principal",
    status: "negotiation",
    stageId: "informacoes",
    source: "Indicacao de cliente",
    affiliate: "Afiliado Pedro",
    campaign: "Indicacao",
    value: 149.9,
    monthlyValue: 149.9,
    plan: "Fibra 600 Mega",
    owner: "Juliana",
    activity: "Conferencia de dados",
    createdAt: "2026-07-04T15:23:00",
    updatedAt: "2026-07-05T12:10:00",
    lastInteractionAt: "2026-07-05T12:10:00",
    nextFollowUpAt: "2026-07-06T16:00:00",
    priority: "high",
    attempts: 2,
    notes: "Dados cadastrais quase completos.",
    trackingCode: "NBX-IND-082",
    chatmixId: "",
    rdId: "rd-1005",
    sgpId: "",
    history: [
      "04/07/2026 15:23 - Lead criado via Indicacao",
      "05/07/2026 12:10 - Dados cadastrais recebidos",
    ],
    tasks: [
      {
        id: "task-5",
        title: "Validar CPF e endereco",
        status: "pending",
        dueAt: "2026-07-06T16:00:00",
      },
    ],
  },
  {
    id: "deal-6",
    customerName: "EDIVAN SILVANO ARRUDA",
    phone: "63992110006",
    email: "edivan@email.com",
    city: "Palmas",
    neighborhood: "Taquaralto",
    address: "Av. Tocantins",
    status: "won",
    stageId: "venda-concluida",
    source: "Afiliado",
    affiliate: "Afiliado Guilherme",
    campaign: "Afiliados Netbox",
    value: 99.9,
    monthlyValue: 99.9,
    plan: "Fibra 300 Mega",
    owner: "Mateus",
    activity: "Instalacao agendada",
    createdAt: "2026-07-04T11:16:00",
    updatedAt: "2026-07-05T09:30:00",
    lastInteractionAt: "2026-07-05T09:30:00",
    nextFollowUpAt: "2026-07-07T09:00:00",
    priority: "medium",
    attempts: 1,
    notes: "Venda concluida, aguardando instalacao.",
    trackingCode: "NBX-AFI-700",
    chatmixId: "",
    rdId: "rd-1006",
    sgpId: "sgp-7712",
    sale: {
      plan: "Fibra 300 Mega",
      monthlyValue: 99.9,
      installationFee: 0,
      closedAt: "2026-07-05T09:30:00",
      installationAt: "2026-07-07T09:00:00",
      installationStatus: "Agendada",
      commission: 30,
    },
    history: [
      "04/07/2026 11:16 - Lead criado via Afiliado Guilherme",
      "05/07/2026 09:30 - Venda concluida",
      "05/07/2026 09:31 - Comissao do afiliado gerada",
    ],
    tasks: [
      {
        id: "task-6",
        title: "Acompanhar instalacao",
        status: "pending",
        dueAt: "2026-07-07T09:00:00",
      },
    ],
  },
  {
    id: "deal-7",
    customerName: "VALDIVINA GOMES",
    phone: "63992110007",
    email: "valdivina@email.com",
    city: "Palmas",
    neighborhood: "Santa Fe",
    address: "Rua 12",
    status: "lost",
    stageId: "venda-perdida",
    source: "Sem cobertura",
    affiliate: "Afiliado Natalia",
    campaign: "Campanha Julho",
    value: 89.9,
    monthlyValue: 89.9,
    plan: "Fibra 300 Mega",
    owner: "Carlos",
    activity: "Venda perdida",
    createdAt: "2026-07-03T14:20:00",
    updatedAt: "2026-07-03T16:03:00",
    lastInteractionAt: "2026-07-03T16:03:00",
    nextFollowUpAt: "2026-07-03T16:03:00",
    priority: "low",
    attempts: 2,
    notes: "Sem cobertura no endereco informado.",
    trackingCode: "NBX-JUL-099",
    chatmixId: "",
    rdId: "rd-1007",
    sgpId: "",
    history: [
      "03/07/2026 14:20 - Lead criado",
      "03/07/2026 16:03 - Venda perdida: sem cobertura",
    ],
    tasks: [],
  },
];

const statusOptions: Array<{ id: DealStatus; name: string; color: string }> = [
  { id: "new", name: "Nova", color: "#2563eb" },
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

function toTime(value: string) {
  const date = new Date(value).getTime();

  return Number.isNaN(date) ? 0 : date;
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
  return (
    statusOptions.find((item) => item.id === status) || statusOptions[0]
  );
}

function getStage(stages: KanbanColumn[], stageId: string) {
  return stages.find((stage) => stage.id === stageId) || stages[0];
}

function normalizeTitle(value: string) {
  return value.trim() || "Sem etapa";
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
      (item) => `${formatDateTime(item.createdAt)} - ${item.message}`
    ),
    tasks: (record.tasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      status: normalizeTaskStatus(task.status),
      dueAt: task.dueAt,
    })),
  };
}

function buildStagesFromRd(pipelines: RdPipeline[]) {
  const firstPipeline = pipelines[0];
  const colors = ["#64748b", "#0891b2", "#2563eb", "#7c3aed", "#16a34a", "#6b7280"];

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

export default function Crm() {
  const topBoardScrollRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLElement | null>(null);
  const syncingBoardScrollRef = useRef(false);

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [stages, setStages] = useState<KanbanColumn[]>(defaultStages);
  const [deals, setDeals] = useState<Deal[]>(demoDeals);
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
  const [syncDetailsOpen, setSyncDetailsOpen] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("lead");
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  const [loadingRd, setLoadingRd] = useState(false);
  const [syncMessage, setSyncMessage] = useState(
    "Kanban demonstrativo. Configure o token do RD para sincronizar."
  );
  const [syncStatus, setSyncStatus] = useState<"info" | "success" | "warning">(
    "info"
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
  const [cardEditForm, setCardEditForm] = useState<CardEditForm | null>(null);
  const [boardScrollWidth, setBoardScrollWidth] = useState(0);

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
            }))
          );
        }

        setDeals(crmData.deals.map(createDealFromBackend));
        setSyncStatus("success");
        setSyncMessage(
          crmData.sync
            ? `${crmData.sync.total} cliente(s) convertido(s) sincronizados do relatorio.`
            : "CRM carregado do banco de dados."
        );
        return;
      }
    } catch {
      setSyncStatus("warning");
      setSyncMessage(
        "Nao foi possivel carregar o CRM do banco. Tentando RD Station."
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
          "Nao foi possivel sincronizar com o RD. Exibindo dados locais."
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
          "RD conectado, mas nenhuma negociacao foi encontrada no filtro atual."
        );
        return;
      }

      setStages(nextStages);
      setDeals(
        rdDeals.map((deal: RdDeal) =>
          createDealFromRd(deal, nextStages[0]?.id || "sem-contato")
        )
      );
      setSyncStatus("success");
      setSyncMessage("Dados atualizados com sucesso.");
    } catch {
      setSyncStatus("warning");
      setSyncMessage(
        "Nao foi possivel sincronizar com o RD. Exibindo dados locais."
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

  function syncBoardScroll(
    sourceRef: { current: HTMLElement | null },
    targetRef: { current: HTMLElement | null }
  ) {
    const source = sourceRef.current;
    const target = targetRef.current;

    if (!source || !target || syncingBoardScrollRef.current) {
      return;
    }

    syncingBoardScrollRef.current = true;
    target.scrollLeft = source.scrollLeft;
    window.requestAnimationFrame(() => {
      syncingBoardScrollRef.current = false;
    });
  }

  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === selectedDealId) || null,
    [deals, selectedDealId]
  );

  const activeFilterCount = useMemo(() => {
    return Object.values(advancedFilters).filter((value) =>
      typeof value === "boolean" ? value : Boolean(value)
    ).length;
  }, [advancedFilters]);

  const filteredDeals = useMemo(() => {
    const currentUser = "Mateus";
    const filtered = deals.filter((deal) => {
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

      if (scopeFilter === "open" && ["won", "lost", "canceled"].includes(deal.status)) {
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
        !deal.source.toLowerCase().includes(advancedFilters.source.toLowerCase())
      ) {
        return false;
      }

      const minValue = Number(advancedFilters.minValue);
      const maxValue = Number(advancedFilters.maxValue);

      if (Number.isFinite(minValue) && minValue > 0 && deal.monthlyValue < minValue) {
        return false;
      }

      if (Number.isFinite(maxValue) && maxValue > 0 && deal.monthlyValue > maxValue) {
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
        return a.attempts - b.attempts || toTime(a.createdAt) - toTime(b.createdAt);
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
      amount: filteredDeals.reduce((total, deal) => total + deal.monthlyValue, 0),
    }),
    [filteredDeals]
  );

  useEffect(() => {
    function measureBoardScroll() {
      const board = boardRef.current;

      if (!board || viewMode !== "kanban") {
        setBoardScrollWidth(0);
        return;
      }

      setBoardScrollWidth(board.scrollWidth);
    }

    measureBoardScroll();
    window.addEventListener("resize", measureBoardScroll);

    return () => window.removeEventListener("resize", measureBoardScroll);
  }, [filteredDeals.length, stages.length, viewMode]);

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
    [syncMessage, syncStatus]
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
          : deal
      )
    );
  }

  async function moveDeal(dealId: string, targetStageId: string) {
    const targetStage = getStage(stages, targetStageId);
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
    } else if (targetStage.isLostStage) {
      setSyncStatus("warning");
      setSyncMessage("Venda marcada como perdida. Informe o motivo no historico.");
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
          "Card movido localmente, mas nao foi possivel salvar no banco do CRM."
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
            : "Card movido localmente, mas o RD recusou a atualizacao."
        );
      } catch {
        setSyncStatus("warning");
        setSyncMessage(
          "Card movido localmente, mas nao foi possivel atualizar o RD."
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
    const createdDeal: Deal = {
      id,
      customerName: newDeal.customerName || "NOVA NEGOCIACAO",
      phone: newDeal.phone,
      email: newDeal.email,
      city: newDeal.city,
      neighborhood: newDeal.neighborhood,
      address: newDeal.address,
      status: newDeal.status,
      stageId: newDeal.stageId,
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
    setSyncStatus("success");
    setSyncMessage("Negociacao criada e adicionada ao funil.");

    try {
      const response = await fetch("/api/rdstation/deals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createdDeal.customerName,
          customerName: createdDeal.customerName,
          phone: createdDeal.phone,
          email: createdDeal.email,
          source: createdDeal.source,
          affiliate: createdDeal.affiliate,
          campaign: createdDeal.campaign,
          stageId: createdDeal.stageId,
          pipelineId: createdDeal.pipelineId,
          value: createdDeal.monthlyValue,
          notes: createdDeal.notes,
        }),
      });

      if (!response.ok) {
        setSyncStatus("warning");
        setSyncMessage(
          "Negociacao criada localmente, mas o RD recusou a criacao."
        );
      }
    } catch {
      setSyncStatus("warning");
      setSyncMessage("Negociacao criada localmente. RD indisponivel no momento.");
    }
  }

  function handleCardAction(action: string, deal: Deal) {
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
      moveDeal(deal.id, stages.find((stage) => stage.isWonStage)?.id || deal.stageId);
      return;
    }

    if (action === "lost") {
      moveDeal(deal.id, stages.find((stage) => stage.isLostStage)?.id || deal.stageId);
      return;
    }

    if (action === "whatsapp") {
      const message =
        "Ola, tudo bem? Aqui e da Netbox. Vi seu interesse em nossos planos de internet e estou entrando em contato para te ajudar.";
      window.open(
        `https://wa.me/55${deal.phone}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer"
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
      const taskCreatedAt = new Date();

      updateDeal(deal.id, {
        activity: "Nova tarefa criada",
        tasks: [
          {
            id: `task-${taskCreatedAt.getTime()}`,
            title: "Retorno ao cliente",
            status: "pending",
            dueAt: taskCreatedAt.toISOString(),
          },
          ...deal.tasks,
        ],
      });
      return;
    }

    if (action === "archive") {
      updateDeal(deal.id, {
        status: "canceled",
        activity: "Negociacao arquivada",
      });
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
      position: Number.isFinite(position) && position > 0 ? position : undefined,
      isFinal: stageForm.isFinal || stageForm.isWonStage || stageForm.isLostStage,
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
      setSyncMessage("A coluna nao pode ser venda concluida e venda perdida ao mesmo tempo.");
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
                : stage
            )
            .sort((first, second) => {
              const firstPosition =
                first.id === updatedStage.id
                  ? payload.position ?? stages.findIndex((item) => item.id === first.id) + 1
                  : stages.findIndex((item) => item.id === first.id) + 1;
              const secondPosition =
                second.id === updatedStage.id
                  ? payload.position ?? stages.findIndex((item) => item.id === second.id) + 1
                  : stages.findIndex((item) => item.id === second.id) + 1;

              return firstPosition - secondPosition;
            })
        );
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
        setSyncMessage("Cartao atualizado na tela, mas nao foi possivel salvar no banco.");
      }
    } else if (!isDemoDeal(cardEditForm.id)) {
      try {
        const response = await fetch(`/api/rdstation/deals/${cardEditForm.id}`, {
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
        });

        setSyncStatus(response.ok ? "success" : "warning");
        setSyncMessage(
          response.ok
            ? "Cartao atualizado no RD Station CRM."
            : "Cartao atualizado na tela, mas o RD recusou a atualizacao."
        );
      } catch {
        setSyncStatus("warning");
        setSyncMessage("Cartao atualizado na tela, mas nao foi possivel salvar no RD.");
      }
    } else {
      setSyncStatus("success");
      setSyncMessage("Cartao atualizado na tela.");
    }
  }

  function renderDealCard(deal: Deal) {
    const status = getStatusMeta(deal.status);
    const alertClass = isOverdue(deal)
      ? styles.dealCardDanger
      : isNearDue(deal) || deal.priority === "urgent"
        ? styles.dealCardWarning
        : "";

    return (
      <article
        key={deal.id}
        className={`${styles.dealCard} ${alertClass}`}
        style={deal.cardColor ? { backgroundColor: deal.cardColor } : undefined}
        draggable
        onDragStart={() => setDraggingDealId(deal.id)}
        onDragEnd={() => setDraggingDealId(null)}
      >
        <button
          type="button"
          className={styles.cardMainButton}
          onClick={() => {
            setSelectedDealId(deal.id);
            setActiveDetailTab("lead");
          }}
        >
          <span className={styles.cardStatus}>
            <span
              className={styles.statusDot}
              style={{ backgroundColor: status.color }}
            />
            <span>{status.name}</span>
          </span>

          <strong className={styles.dealName}>{deal.customerName}</strong>
        </button>

        <div className={styles.cardMeta}>
          <label className={styles.prioritySelect}>
            <FiStar aria-hidden="true" />
            <select
              value={deal.priority}
              onChange={(event) =>
                updateDeal(deal.id, {
                  priority: event.target.value as Priority,
                })
              }
            >
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <span>
            <FiUser aria-hidden="true" /> {deal.affiliate || deal.campaign}
          </span>
        </div>

        <div className={styles.cardValueRow}>
          <span>{deal.source}</span>
          <strong>{formatCurrency(deal.monthlyValue)}/mes</strong>
        </div>

        <div
          className={`${styles.activity} ${
            isOverdue(deal) ? styles.activityDanger : ""
          }`}
        >
          <span>{deal.activity}</span>
          <time>{formatDateTime(deal.updatedAt)}</time>
        </div>

        <div className={styles.cardMenuWrap}>
          <button
            type="button"
            className={styles.cardMenuButton}
            title="Acoes da negociacao"
            onClick={() =>
              setActiveCardMenuId((current) =>
                current === deal.id ? null : deal.id
              )
            }
          >
            <FiMoreVertical aria-hidden="true" />
          </button>

          {activeCardMenuId === deal.id && (
            <div className={styles.cardMenu}>
              <button type="button" onClick={() => handleCardAction("details", deal)}>
                Ver detalhes
              </button>
              <button type="button" onClick={() => handleCardAction("edit", deal)}>
                Editar negociacao
              </button>
              <button type="button" onClick={() => handleCardAction("task", deal)}>
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
              <button type="button" onClick={() => handleCardAction("copy", deal)}>
                Copiar telefone
              </button>
              <button type="button" onClick={() => handleCardAction("won", deal)}>
                Marcar venda concluida
              </button>
              <button type="button" onClick={() => handleCardAction("lost", deal)}>
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
      <header className={styles.toolbar}>
        <div className={styles.viewSwitcher} aria-label="Modo de visualizacao">
          <button
            type="button"
            className={viewMode === "kanban" ? styles.viewButtonActive : styles.viewButton}
            title="Visualizacao Kanban"
            onClick={() => setViewMode("kanban")}
          >
            <FiBarChart2 aria-hidden="true" />
          </button>
          <button
            type="button"
            className={viewMode === "list" ? styles.viewButtonActive : styles.viewButton}
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
                    onClick={() => {
                      setGeneralMenuOpen(false);
                      if (label === "Ver historico de sincronizacao") {
                        setSyncDetailsOpen(true);
                      } else if (label === "Sincronizar com RD") {
                        loadRdCrm();
                      } else {
                        setSyncStatus("info");
                        setSyncMessage(`${label} preparado para o modulo do CRM.`);
                      }
                    }}
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
                    className={periodFilter === option.id ? styles.menuActive : ""}
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
            <FiRefreshCw aria-hidden="true" className={loadingRd ? styles.spin : ""} />
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
            onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
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
          className={styles.filterButton}
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
          {selectedFunnel} - {periodOptions.find((item) => item.id === periodFilter)?.name}
        </em>
      </div>

      {viewMode === "kanban" ? (
        <>
          <div
            ref={topBoardScrollRef}
            className={styles.topBoardScroll}
            aria-hidden="true"
            onScroll={() => syncBoardScroll(topBoardScrollRef, boardRef)}
          >
            <div
              className={styles.topBoardScrollContent}
              style={{ width: boardScrollWidth }}
            />
          </div>

          <section
            ref={boardRef}
            className={styles.board}
            aria-label="Funil de vendas"
            onScroll={() => syncBoardScroll(boardRef, topBoardScrollRef)}
          >
            {stages.map((stage, index) => {
              const stageDeals = filteredDeals.filter(
                (deal) => deal.stageId === stage.id
              );
              const amount = stageDeals.reduce(
                (total, deal) => total + deal.monthlyValue,
                0
              );

              return (
                <section
                  key={stage.id}
                  className={styles.column}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop(stage.id)}
                >
                  <header className={styles.columnHeader}>
                    <div>
                      <h2>
                        {stage.title} ({stageDeals.length})
                      </h2>
                      <small>SLA {stage.slaHours || "-"}h</small>
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
                        style={{ backgroundColor: getStatusMeta(deal.status).color }}
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
        <aside className={styles.sidePanel} aria-label="Painel de Filtros Avancados">
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
                  value={advancedFilters[key as keyof typeof advancedFilters] as string}
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
            <button type="button" className={styles.primaryAction} onClick={() => setAdvancedFiltersOpen(false)}>
              Aplicar filtros
            </button>
            <button type="button" className={styles.secondaryAction} onClick={clearAdvancedFilters}>
              Limpar filtros
            </button>
            <button type="button" className={styles.ghostAction} onClick={() => setAdvancedFiltersOpen(false)}>
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
              <button type="button" className={styles.primaryAction} onClick={() => handleCreateDeal(false)}>
                Salvar negociacao
              </button>
              <button type="button" className={styles.secondaryAction} onClick={() => handleCreateDeal(true)}>
                Salvar e criar tarefa
              </button>
              <button type="button" className={styles.ghostAction} onClick={() => setCreateOpen(false)}>
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
                        : current
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
                      current ? { ...current, phone: event.target.value } : current
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
                      current ? { ...current, email: event.target.value } : current
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
                      current ? { ...current, city: event.target.value } : current
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
                      current ? { ...current, plan: event.target.value } : current
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
                        : current
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
                        : current
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
                          : current
                      )
                    }
                  />
                  <input
                    value={cardEditForm.cardColor}
                    onChange={(event) =>
                      setCardEditForm((current) =>
                        current
                          ? { ...current, cardColor: event.target.value }
                          : current
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
                      current ? { ...current, notes: event.target.value } : current
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
                    current ? { ...current, cardColor: "#ffffff" } : current
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

      {selectedDeal && (
        <aside className={styles.detailPanel} aria-label="Detalhes da negociacao">
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
                {selectedDeal.tasks.map((task) => (
                  <article key={task.id}>
                    <strong>{task.title}</strong>
                    <span>{task.status}</span>
                    <time>{formatDateTime(task.dueAt)}</time>
                  </article>
                ))}
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
                <dd>{formatCurrency(selectedDeal.sale?.monthlyValue || selectedDeal.monthlyValue)}</dd>
                <dt>Taxa de instalacao</dt>
                <dd>{formatCurrency(selectedDeal.sale?.installationFee || 0)}</dd>
                <dt>Data de fechamento</dt>
                <dd>{selectedDeal.sale?.closedAt ? formatDateTime(selectedDeal.sale.closedAt) : "-"}</dd>
                <dt>Data de instalacao</dt>
                <dd>{selectedDeal.sale?.installationAt ? formatDateTime(selectedDeal.sale.installationAt) : "-"}</dd>
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
                <dd>{syncStatus === "warning" ? "Falha parcial" : "Atualizado"}</dd>
              </dl>
            )}
          </div>

          <footer className={styles.detailActions}>
            <button type="button" onClick={() => handleCardAction("whatsapp", selectedDeal)}>
              <FiSend aria-hidden="true" /> WhatsApp
            </button>
            <button type="button" onClick={() => handleCardAction("task", selectedDeal)}>
              <FiClock aria-hidden="true" /> Tarefa
            </button>
            <button type="button" onClick={() => handleCardAction("won", selectedDeal)}>
              <FiCheckCircle aria-hidden="true" /> Concluir
            </button>
          </footer>
        </aside>
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
