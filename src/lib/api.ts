import axios from "axios";

export type Affiliate = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  photoUrl: string | null;
  active: boolean;
};

export type UserRole = "ADMIN" | "MANAGER" | "USER";

export type User = {
  id: number;
  name: string;
  email: string;
  city: string | null;
  photoUrl: string | null;
  createdAt: string;
  role: UserRole;
  active: boolean;
  teamId: number | null;
};

export type City = {
  id: number;
  name: string;
  uf: string;
};

export type DashboardData = {
  totalAffiliates: number;
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  topAffiliates: {
    id: number;
    name: string;
    totalClicks: number;
    totalConversions: number;
  }[];
};

export type AffiliateConversionEvent = {
  id: number;
  attendanceId?: string | null;
  type: string;
  product: string | null;
  destination: string | null;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorDocument: string | null;
  visitorCity: string | null;
  source: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  deviceType: string | null;
  browser: string | null;
  operatingSystem: string | null;
  platform: string | null;
  language: string | null;
  geoCountry: string | null;
  geoRegion: string | null;
  geoCity: string | null;
  timezone: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  convertedAt: string;
  linkId: number;
  linkName: string | null;
  shortCode: string;
  originalUrl: string;
  promoLink: string;
  whatsappLink: string;
  totalClicks: number;
  latestClickAt: string | null;
};

export type AffiliateContact = {
  id: string;
  name: string | null;
  phone: string | null;
  document: string | null;
  city: string | null;
  totalAttendances: number;
  totalConversions: number;
  firstAttendanceAt: string;
  lastAttendanceAt: string;
  attendanceIds: string[];
  shortCodes: string[];
  linkIds: number[];
  conversionIds: number[];
};

export type AffiliateStats = {
  affiliate: string;
  affiliatePhotoUrl: string | null;
  photoUrl: string | null;
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  totalContacts: number;
  contacts: AffiliateContact[];
  conversionEvents: AffiliateConversionEvent[];
  links: {
    id: number;
    name: string | null;
    shortCode: string;
    originalUrl: string;
    clicks: number;
    conversions: number;
    promoLink: string;
    whatsappLink: string;
    latestClickAt: string | null;
    conversionEvents: AffiliateConversionEvent[];
  }[];
};

export type CreateAffiliatePayload = {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  photoUrl?: string;
};

export type UpdateAffiliatePayload = Partial<CreateAffiliatePayload> & {
  active?: boolean;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  city?: string;
  photoUrl?: string;
};

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  city?: string;
  photoUrl?: string;
  role?: UserRole;
};

export type CreateLinkPayload = {
  name?: string;
  url: string;
  affiliateId?: number;
};

export type UpdateLinkPayload = {
  name?: string;
  url?: string;
  affiliateId?: number | null;
};

export type UpdateConversionPayload = {
  visitorName?: string;
  visitorPhone?: string;
  visitorDocument?: string;
  visitorCity?: string;
  product?: string;
  source?: string;
};

export type CreateLinkResponse = {
  message: string;
  link: string;
};

export type LinkItem = {
  id: number;
  name: string | null;
  originalUrl: string;
  shortCode: string;
  promoLink: string;
  clicks: number;
  conversions: number;
  whatsappLink: string;
  createdAt: string;
  qrCode: string;
  affiliate: {
    id: number;
    name: string;
    email: string | null;
    city: string | null;
  } | null;
};

export type CampaignClickEvent = {
  id: number;
  clickedAt: string;
  city: string | null;
  source: string | null;
};

export type CampaignConversionStatus =
  | "WHATSAPP_STARTED"
  | "ATTENDANCE_STARTED"
  | "LEAD_IDENTIFIED"
  | "IN_NEGOTIATION"
  | "CONVERTED"
  | "LOST"
  | "NOT_IDENTIFIED";

export type CampaignConversionEvent = {
  id: number;
  customerName: string;
  customerPhone: string | null;
  customerDocument: string | null;
  city: string | null;
  plan: string | null;
  seller: string | null;
  attendanceId: string | null;
  sgpCustomerId: string | null;
  convertedAt: string;
  sgpConvertedAt: string | null;
  firstClickAt: string | null;
  whatsappStartedAt: string | null;
  attendanceStartedAt: string | null;
  leadCreatedAt: string | null;
  lastAttendanceAt: string | null;
  status: CampaignConversionStatus;
  statusName: string | null;
  stageName: string | null;
  convertedInSgp: boolean;
  sgpStatus:
    | "CONVERTED"
    | "AWAITING_CONVERSION"
    | "IN_NEGOTIATION"
    | "NOT_CONVERTED"
    | "NOT_VERIFIED";
  attributionStatus: "VERIFIED" | "TRACKED" | "NOT_IDENTIFIED";
  source: string | null;
  history: {
    id: number;
    eventType: string;
    message: string;
    createdAt: string;
  }[];
};

export type CampaignLink = {
  id: number;
  name: string | null;
  originalUrl: string;
  shortCode: string;
  promoLink: string;
  clicks: number;
  clickEvents: CampaignClickEvent[];
  conversions: number;
  conversionEvents: CampaignConversionEvent[];
  whatsappLink: string;
  affiliate: {
    id: number;
    name: string;
    email: string | null;
    city: string | null;
  } | null;
};

export type Campaign = {
  id: number;
  name: string;
  destinationUrl: string;
  createdAt: string;
  totalLinks: number;
  totalAffiliates: number;
  totalClicks: number;
  totalConversions: number;
  topAffiliate: {
    id: number;
    name: string;
    email: string | null;
    city: string | null;
  } | null;
  topLink: CampaignLink | null;
  links: CampaignLink[];
};

export type CreateCampaignPayload = {
  name: string;
  destinationUrl: string;
  affiliateIds: number[];
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    city: string | null;
    photoUrl: string | null;
    role: "ADMIN" | "MANAGER" | "USER";
    teamId: number | null;
  };
};

export type SgpStatus = {
  configured: boolean;
  baseUrl?: string;
  app?: string;
  error?: string;
};

export type SgpContract = {
  id: string | null;
  plan: string | null;
  status: string;
  active: boolean | null;
  address: string | null;
  raw: unknown;
};

export type SgpCustomer = {
  id: string | null;
  name: string | null;
  document: string;
  phone: string | null;
  city: string | null;
  status: string;
  active: boolean | null;
  contracts: SgpContract[];
  raw: unknown;
};

export type SgpCustomerResponse = {
  provider: "sgp";
  customer: SgpCustomer;
  result: unknown;
};

export type SgpCustomersSummary = {
  total: number;
  active: number;
  inactive: number;
  unknown: number;
  totalContracts: number;
  activeContracts: number;
  inactiveContracts: number;
  unknownContracts: number;
  byCity: {
    city: string;
    total: number;
    active: number;
    contracts: number;
    activeContracts: number;
  }[];
};

export type SgpCustomersResponse = {
  provider: "sgp";
  customers: SgpCustomer[];
  summary: SgpCustomersSummary;
  result: unknown;
};

type SgpRawRecord = Record<string, unknown>;

export type HealthStatus = {
  status: string;
  database: string;
};

export type ChatmixWebhookLogResponse = {
  id: number;
  receivedAt: string;
  attendanceId: string | null;
  channel: {
    name: string | null;
    type: string | null;
  };
  raw: unknown;
  query: Record<string, unknown>;
  result: Record<string, unknown>;
};

export type ChatmixAttendanceMessagesResponse = {
  attendanceId: string;
  count: number;
  messages: unknown[];
  raw: unknown;
};

export type CrmStage = {
  id: string;
  title: string;
  color: string;
  slaHours: number;
  icon?: string | null;
  isFinal?: boolean;
  isWonStage?: boolean;
  isLostStage?: boolean;
};

export type CrmFunnel = {
  id: string;
  name: string;
  description: string | null;
  stages: CrmStage[];
};

export type CrmDeal = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  city: string;
  neighborhood: string;
  address: string;
  status: string;
  statusName?: string;
  statusColor?: string;
  stageId: string;
  stageName: string;
  funnelId: string;
  source: string;
  affiliate: string;
  affiliateId: number | null;
  campaign: string;
  value: number;
  monthlyValue: number;
  plan: string;
  cardColor: string;
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
  priority: string;
  attempts: number;
  notes: string;
  trackingCode: string;
  chatmixId: string;
  sgpId: string;
  conversionId: number | null;
  linkId: number | null;
  tasks: {
    id: string;
    title: string;
    status: "pending" | "overdue" | "done" | string;
    dueAt: string | null;
  }[];
  history: {
    id: string;
    eventType: string;
    message: string;
    createdAt: string;
  }[];
  sale: {
    plan: string;
    monthlyValue: number;
    installationFee: number;
    closedAt: string;
    installationAt: string | null;
    installationStatus: string;
    commission: number;
  } | null;
};

export type CrmDealsResponse = {
  funnels: {
    id: string;
    name: string;
    description: string | null;
    stages: CrmStage[];
  }[];
  stages: CrmStage[];
  statuses: {
    id: string;
    name: string;
    color: string | null;
    isFinal: boolean;
  }[];
  deals: CrmDeal[];
  currentUser: {
    id: number;
    name: string;
    email: string;
    photoUrl: string | null;
    role: "ADMIN" | "MANAGER" | "USER";
    teamId: number | null;
  };
  permissions: CrmPermissions;
  sync: {
    created: number;
    updated: number;
    total: number;
  } | null;
};

const defaultApiUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "/api-backend";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || defaultApiUrl,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("afiliados_netbox_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export type CrmPermissions = {
  canViewAll: boolean;
  canViewTeam: boolean;
  canViewUnassigned: boolean;
  canShareFilters: boolean;
  canTransfer: boolean;
};

export type CrmFilterCondition = {
  id?: string;
  field: string;
  operator: string;
  value: string | number | Array<string | number> | null;
};

export type SavedCrmFilter = {
  id: string;
  name: string;
  ownerUserId: number;
  ownerName?: string;
  funnelId: string | null;
  conditions: CrmFilterCondition[];
  sort: { mode: string } | null;
  visibility: "PRIVATE" | "SHARED";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrmQuery = {
  syncConverted?: boolean;
  funnelId?: string;
  scope?: string;
  responsibleUserId?: number;
  status?: string;
  sort?: string;
  filters?: CrmFilterCondition[];
};

function getApiBaseUrl() {
  return String(api.defaults.baseURL || "").replace(/\/+$/, "");
}

function normalizePromoLink(link: string) {
  if (!link || !link.startsWith("/")) {
    return link;
  }

  return `${getApiBaseUrl()}${link}`;
}

function normalizeConversionEvent(event: AffiliateConversionEvent) {
  return {
    ...event,
    promoLink: normalizePromoLink(event.promoLink),
    whatsappLink: normalizePromoLink(event.whatsappLink),
  };
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const status = error.response?.status;
    const statusText = error.response?.statusText;
    const messages: string[] = [];

    if (data && typeof data === "object") {
      const payload = data as {
        error?: unknown;
        message?: unknown;
        details?: unknown;
      };

      if (payload.error) {
        messages.push(String(payload.error));
      }

      if (payload.message && payload.message !== payload.error) {
        messages.push(String(payload.message));
      }

      if (payload.details) {
        if (typeof payload.details === "string") {
          messages.push(payload.details);
        } else {
          messages.push(JSON.stringify(payload.details));
        }
      }
    } else if (typeof data === "string" && data.trim()) {
      const text = data.trim();
      // Remove HTML tags when backend returns an error page (e.g. Express error)
      const stripped = text.includes("<")
        ? text
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : text;

      if (stripped) {
        messages.push(stripped);
      }
    }

    if (messages.length > 0) {
      return messages.join(" - ");
    }

    if (status) {
      return `${fallback} (${status}${statusText ? ` ${statusText}` : ""})`;
    }

    if (error.request) {
      return `${fallback} - API indisponivel ou sem resposta`;
    }

    if (error.message) {
      return `${fallback} - ${error.message}`;
    }
  }

  return fallback;
}

export async function listarAfiliados() {
  const { data } = await api.get<Affiliate[]>("/affiliate");
  return Array.isArray(data) ? data : [];
}

export async function criarAfiliado(payload: CreateAffiliatePayload) {
  const { data } = await api.post<Affiliate>("/affiliate", payload);
  return {
    ...data,
    city: data.city ?? payload.city ?? null,
    phone: data.phone ?? payload.phone ?? null,
  };
}

export async function editarAfiliado(
  id: number,
  payload: UpdateAffiliatePayload,
) {
  const { data } = await api.put<Affiliate>(`/affiliate/${id}`, payload);

  return {
    ...data,
    city: data.city ?? payload.city ?? null,
    phone: data.phone ?? payload.phone ?? null,
  };
}

export async function apagarAfiliado(id: number) {
  await api.delete(`/affiliate/${id}`);
}

export async function listarUsuarios() {
  const { data } = await api.get<User[]>("/users");
  return Array.isArray(data) ? data : [];
}

export async function criarUsuario(payload: CreateUserPayload) {
  const { data } = await api.post<User>("/users", payload);
  return data;
}

export async function editarUsuario(id: number, payload: UpdateUserPayload) {
  const { data } = await api.put<User>(`/users/${id}`, payload);
  return data;
}

export async function apagarUsuario(id: number) {
  await api.delete(`/users/${id}`);
}

export async function listarCidadesTocantins() {
  const { data } = await api.get<City[]>("/cities/tocantins");
  return Array.isArray(data) ? data : [];
}

export async function buscarDashboard() {
  const { data } = await api.get<DashboardData>("/dashboard");
  return data;
}

export async function criarLink(payload: CreateLinkPayload) {
  const { data } = await api.post<CreateLinkResponse>("/links", payload);
  return {
    ...data,
    link: normalizePromoLink(data.link),
  };
}

export async function listarLinks() {
  const { data } = await api.get<LinkItem[]>("/links");
  return Array.isArray(data)
    ? data.map((link) => ({
        ...link,
        promoLink: normalizePromoLink(link.promoLink),
        whatsappLink: normalizePromoLink(link.whatsappLink),
      }))
    : [];
}

export async function editarLink(id: number, payload: UpdateLinkPayload) {
  const { data } = await api.put<LinkItem>(`/links/${id}`, payload);
  return {
    ...data,
    promoLink: normalizePromoLink(data.promoLink),
    whatsappLink: normalizePromoLink(data.whatsappLink),
  };
}

function normalizeCampaignLinks(campaign: Campaign) {
  const links = campaign.links.map((link) => ({
    ...link,
    promoLink: normalizePromoLink(link.promoLink),
    whatsappLink: normalizePromoLink(link.whatsappLink),
  }));

  const topLink = campaign.topLink
    ? {
        ...campaign.topLink,
        promoLink: normalizePromoLink(campaign.topLink.promoLink),
        whatsappLink: normalizePromoLink(campaign.topLink.whatsappLink),
      }
    : null;

  return {
    ...campaign,
    links,
    topLink,
  };
}

export async function criarCampanha(payload: CreateCampaignPayload) {
  const { data } = await api.post<Campaign>("/campaigns", payload);
  return normalizeCampaignLinks(data);
}

export async function listarCampanhas() {
  const { data } = await api.get<Campaign[]>("/campaigns");
  return Array.isArray(data) ? data.map(normalizeCampaignLinks) : [];
}

export async function apagarCampanha(id: number) {
  await api.delete(`/campaigns/${id}`);
}

export async function editarCampanha(
  id: number,
  payload: {
    name: string;
    destinationUrl: string;
    links: { id?: number; affiliateId: number; shortCode: string }[];
  },
) {
  const { data } = await api.put<Campaign>(`/campaigns/${id}`, payload);
  return normalizeCampaignLinks(data);
}

export async function apagarLink(id: number) {
  await api.delete(`/links/${id}`);
}

export async function editarConversao(
  id: number,
  payload: UpdateConversionPayload,
) {
  const { data } = await api.put<AffiliateConversionEvent>(
    `/conversions/${id}`,
    payload,
  );

  return data;
}

export async function apagarConversao(id: number) {
  await api.delete(`/conversions/${id}`);
}

export async function buscarEstatisticasAfiliado(id: number) {
  const { data } = await api.get<AffiliateStats>(`/affiliate/${id}/stats`);
  return {
    ...data,
    conversionEvents: (data.conversionEvents ?? []).map(
      normalizeConversionEvent,
    ),
    links: data.links.map((link) => ({
      ...link,
      promoLink: normalizePromoLink(link.promoLink),
      whatsappLink: normalizePromoLink(link.whatsappLink),
      conversionEvents: (link.conversionEvents ?? []).map(
        normalizeConversionEvent,
      ),
    })),
  };
}

export async function fazerLogin(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse>("/auth/login", payload);

  return data;
}

export async function buscarStatusSgp() {
  const { data } = await api.get<SgpStatus>("/integrations/sgp/status");
  return data;
}

export async function consultarClienteSgp(query: string) {
  const { data } = await api.get<SgpCustomerResponse>(
    "/integrations/sgp/clientes",
    {
      params: {
        query,
      },
    },
  );

  return data;
}

async function consultarClienteSgpParaLista(query: string) {
  const { data } = await api.get<SgpCustomerResponse>(
    "/integrations/sgp/clientes",
    {
      params: {
        query,
      },
      timeout: 12000,
    },
  );

  return data;
}

const SGP_CUSTOMER_LIST_QUERIES = [
  "paraiso",
  "colinas",
  "guarai",
  "barrolandia",
  "miranorte",
  "miracema",
  "tocantinia",
  "goianorte",
  "colmeia",
  "brasilandia",
  "rio dos bois",
  "presidente kenedy",
  "tabocao",
  "lajeado",
  "pedro afonso",
  "santa maria",
  "itacaja",
];

function readString(record: SgpRawRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function readRawArray(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as SgpRawRecord;
  const list = record[key];

  return Array.isArray(list)
    ? list.filter(
        (item): item is SgpRawRecord =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

function readFirstStringArrayValue(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const first = value.find((item) => typeof item === "string" && item.trim());

  return typeof first === "string" ? first.trim() : null;
}

function normalizeSgpActiveStatus(status: string, rawStatus: unknown) {
  if (typeof rawStatus === "number") {
    if (rawStatus === 1) {
      return true;
    }

    if ([2, 3, 4, 5, 6].includes(rawStatus)) {
      return false;
    }
  }

  const normalized = status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("ativo") && !normalized.includes("inativo")) {
    return true;
  }

  if (
    normalized.includes("cancel") ||
    normalized.includes("inativo") ||
    normalized.includes("suspens") ||
    normalized.includes("bloque")
  ) {
    return false;
  }

  return null;
}

function buildSgpAddress(contract: SgpRawRecord) {
  const parts = [
    readString(contract, ["endereco_logradouro"]),
    readString(contract, ["endereco_numero"]),
    readString(contract, ["endereco_bairro"]),
    readString(contract, ["endereco_cidade"]),
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

function normalizeSgpContract(contract: SgpRawRecord): SgpContract {
  const status =
    readString(contract, ["contratoStatusDisplay", "status"]) ||
    "Status não identificado";

  return {
    id: readString(contract, ["contratoId", "id"]) || null,
    plan:
      readString(contract, [
        "servico_plano",
        "planointernet",
        "plano",
        "plan",
      ]) || null,
    status,
    active: normalizeSgpActiveStatus(status, contract.contratoStatus),
    address: buildSgpAddress(contract),
    raw: contract,
  };
}

function summarizeSgpCustomers(customers: SgpCustomer[]): SgpCustomersSummary {
  const cityMap = new Map<
    string,
    {
      city: string;
      total: number;
      active: number;
      contracts: number;
      activeContracts: number;
    }
  >();
  const allContracts = customers.flatMap((customer) => customer.contracts);

  customers.forEach((customer) => {
    const city = customer.city || "Cidade não informada";
    const current = cityMap.get(city) ?? {
      city,
      total: 0,
      active: 0,
      contracts: 0,
      activeContracts: 0,
    };

    current.total += 1;
    if (customer.active) {
      current.active += 1;
    }
    current.contracts += customer.contracts.length;
    current.activeContracts += customer.contracts.filter(
      (contract) => contract.active === true,
    ).length;

    cityMap.set(city, current);
  });

  return {
    total: customers.length,
    active: customers.filter((customer) => customer.active === true).length,
    inactive: customers.filter((customer) => customer.active === false).length,
    unknown: customers.filter((customer) => customer.active === null).length,
    totalContracts: allContracts.length,
    activeContracts: allContracts.filter((contract) => contract.active === true)
      .length,
    inactiveContracts: allContracts.filter(
      (contract) => contract.active === false,
    ).length,
    unknownContracts: allContracts.filter(
      (contract) => contract.active === null,
    ).length,
    byCity: Array.from(cityMap.values()).sort(
      (first, second) => second.total - first.total,
    ),
  };
}

function buildSgpCustomersFromContracts(contracts: SgpRawRecord[]) {
  const customersByKey = new Map<
    string,
    SgpCustomer & { contracts: SgpContract[] }
  >();
  const contractIdsByCustomer = new Map<string, Set<string>>();

  contracts.forEach((contract, index) => {
    const id = readString(contract, ["clienteId", "cliente_id"]);
    const document = readString(contract, ["cpfCnpj", "documento", "document"]);
    const name = readString(contract, ["razaoSocial", "cliente", "nome"]);
    const key = id || document || name || `cliente-${index}`;
    const phone =
      readFirstStringArrayValue(contract.telefones) ||
      readString(contract, ["telefone", "celular"]) ||
      null;
    const city = readString(contract, ["endereco_cidade", "cidade"]) || null;
    const normalizedContract = normalizeSgpContract(contract);
    const current =
      customersByKey.get(key) ??
      ({
        id: id || null,
        name: name || null,
        document,
        phone,
        city,
        status: "Status não identificado",
        active: null,
        contracts: [],
        raw: contract,
      } satisfies SgpCustomer);
    const contractIds = contractIdsByCustomer.get(key) ?? new Set<string>();
    const contractKey = normalizedContract.id || `contrato-${index}`;

    if (!contractIds.has(contractKey)) {
      current.contracts.push(normalizedContract);
      contractIds.add(contractKey);
    }

    current.active = current.contracts.some((item) => item.active === true)
      ? true
      : current.contracts.every((item) => item.active === false)
        ? false
        : null;
    current.status = current.active
      ? "Ativo"
      : current.active === false
        ? "Inativo"
        : "Status não identificado";
    current.phone = current.phone || phone;
    current.city = current.city || city;

    customersByKey.set(key, current);
    contractIdsByCustomer.set(key, contractIds);
  });

  return Array.from(customersByKey.values()).sort((first, second) =>
    String(first.name || "").localeCompare(String(second.name || ""), "pt-BR"),
  );
}

async function listarClientesSgpPorCidades() {
  const results = await Promise.allSettled(
    SGP_CUSTOMER_LIST_QUERIES.map((query) =>
      consultarClienteSgpParaLista(query),
    ),
  );
  const contracts = results.flatMap((result) =>
    result.status === "fulfilled"
      ? readRawArray(result.value.result, "contratos")
      : [],
  );
  const customers = buildSgpCustomersFromContracts(contracts);

  return {
    provider: "sgp" as const,
    customers,
    summary: summarizeSgpCustomers(customers),
    result: {
      source: "city-search-fallback",
      queries: SGP_CUSTOMER_LIST_QUERIES,
      contracts: contracts.length,
    },
  };
}

export async function listarClientesSgp() {
  let data: SgpCustomersResponse;

  try {
    const response = await api.get<SgpCustomersResponse>(
      "/integrations/sgp/clientes/list",
      {
        timeout: 10000,
      },
    );
    data = response.data;
  } catch {
    return listarClientesSgpPorCidades();
  }

  if (Array.isArray(data.customers) && data.customers.length > 0) {
    return data;
  }

  const listMessage =
    data.result && typeof data.result === "object"
      ? String((data.result as SgpRawRecord).msg || "")
      : "";

  if (
    !Array.isArray(data.customers) ||
    data.customers.length === 0 ||
    listMessage.includes("CPF/CNPJ") ||
    listMessage.includes("Contrato ID")
  ) {
    return listarClientesSgpPorCidades();
  }

  return data;
}

export async function consultarSaudeSistema() {
  const { data } = await api.get<HealthStatus>("/health");
  return data;
}

export async function listarChatmixWebhookLogs(limit = 50) {
  const { data } = await api.get<ChatmixWebhookLogResponse[]>(
    "/webhooks/chatmix/logs",
    {
      params: {
        limit,
      },
    },
  );

  return Array.isArray(data) ? data : [];
}

export async function buscarMensagensAtendimentoChatmix(
  attendanceId: string,
): Promise<ChatmixAttendanceMessagesResponse> {
  const response = await fetch(
    `/api/integrations/chatmix/attendances/${encodeURIComponent(attendanceId)}/messages`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message?: unknown }).message || "")
        : "";

    throw new Error(message || `Erro HTTP ${response.status} ao consultar o Chatmix.`);
  }

  return data as ChatmixAttendanceMessagesResponse;
}

export async function listarCrmDeals(
  query: boolean | CrmQuery = true,
  signal?: AbortSignal,
) {
  const params: Record<string, unknown> =
    typeof query === "boolean"
      ? { syncConverted: query }
      : {
          ...query,
          filters: query.filters?.length
            ? JSON.stringify(query.filters)
            : undefined,
        };
  const { data } = await api.get<CrmDealsResponse>("/crm/deals", {
    params,
    signal,
  });
  const defaultPermissions: CrmPermissions = {
    canViewAll: false,
    canViewTeam: false,
    canViewUnassigned: false,
    canShareFilters: false,
    canTransfer: true,
  };

  return {
    ...data,
    deals: Array.isArray(data.deals) ? data.deals : [],
    stages: Array.isArray(data.stages) ? data.stages : [],
    statuses: Array.isArray(data.statuses) ? data.statuses : [],
    funnels: Array.isArray(data.funnels) ? data.funnels : [],
    permissions: {
      ...defaultPermissions,
      ...(data.permissions || {}),
    },
  };
}

export async function listarUsuariosAtribuiveis() {
  const { data } = await api.get<User[]>("/crm/assignable-users");
  return data;
}

export async function criarCrmFunnel(payload: {
  name: string;
  description?: string;
  sourceFunnelId?: string;
}) {
  const { data } = await api.post<CrmFunnel>("/crm/funnels", payload);
  return data;
}

export async function transferirCrmDeal(
  id: string | number,
  responsibleUserId: number | null,
  responsibleUserName = "",
) {
  const { data } = await api.put(`/crm/deals/${id}`, {
    responsibleUserId,
    // Compatibilidade com o backend anterior à migração de responsáveis.
    owner: responsibleUserName,
  });
  return data;
}

export async function listarFiltrosCrmSalvos() {
  const { data } = await api.get<SavedCrmFilter[]>("/crm/saved-filters");
  return data;
}

export async function criarFiltroCrmSalvo(
  payload: Omit<SavedCrmFilter, "id" | "ownerUserId" | "createdAt" | "updatedAt">,
) {
  const { data } = await api.post<SavedCrmFilter>("/crm/saved-filters", payload);
  return data;
}

export async function atualizarFiltroCrmSalvo(
  id: string,
  payload: Partial<SavedCrmFilter>,
) {
  const { data } = await api.put<SavedCrmFilter>(
    `/crm/saved-filters/${id}`,
    payload,
  );
  return data;
}

export async function duplicarFiltroCrmSalvo(id: string) {
  const { data } = await api.post<SavedCrmFilter>(
    `/crm/saved-filters/${id}/duplicate`,
  );
  return data;
}

export async function apagarFiltroCrmSalvo(id: string) {
  await api.delete(`/crm/saved-filters/${id}`);
}

export async function definirFiltroCrmPadrao(id: string) {
  await api.put(`/crm/saved-filters/${id}/default`);
}

export async function atualizarCrmDeal(
  id: string | number,
  payload: Record<string, unknown>,
) {
  const { data } = await api.put(`/crm/deals/${id}`, payload);
  return data;
}

export async function criarCrmDeal(payload: Record<string, unknown>) {
  const { data } = await api.post<{ deal?: CrmDeal } | CrmDeal>(
    "/crm/deals",
    payload,
  );

  if (data && typeof data === "object" && "deal" in data) {
    return data.deal as CrmDeal;
  }

  return data as CrmDeal;
}

export async function apagarCrmDeal(id: string | number) {
  await api.delete(`/crm/deals/${id}`);
}

export type CrmStagePayload = {
  funnelId?: string | number;
  name?: string;
  title?: string;
  color?: string;
  slaHours?: number;
  position?: number;
  icon?: string;
  isFinal?: boolean;
  isWonStage?: boolean;
  isLostStage?: boolean;
};

export async function criarCrmStage(payload: CrmStagePayload) {
  const { data } = await api.post<{ stage: CrmStage }>("/crm/stages", payload);
  return data.stage;
}

export async function atualizarCrmStage(
  id: string | number,
  payload: CrmStagePayload,
) {
  const { data } = await api.put<{ stage: CrmStage }>(
    `/crm/stages/${id}`,
    payload,
  );
  return data.stage;
}

export async function apagarCrmStage(id: string | number) {
  const { data } = await api.delete<{
    deletedStageId: string;
    fallbackStageId: string;
    movedDeals: number;
  }>(`/crm/stages/${id}`);
  return data;
}

export default api;
