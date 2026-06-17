import axios from "axios";

export type Affiliate = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  active: boolean;
};

export type User = {
  id: number;
  name: string;
  email: string;
  city: string | null;
  createdAt: string;
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
  type: string;
  product: string | null;
  destination: string | null;
  ipAddress: string | null;
  userAgent: string | null;
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

export type AffiliateStats = {
  affiliate: string;
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
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
};

export type UpdateAffiliatePayload = Partial<CreateAffiliatePayload> & {
  active?: boolean;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  city?: string;
};

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  city?: string;
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
  topLink: {
    id: number;
    name: string | null;
    originalUrl: string;
    shortCode: string;
    promoLink: string;
    clicks: number;
    conversions: number;
    whatsappLink: string;
    affiliate: {
      id: number;
      name: string;
      email: string | null;
      city: string | null;
    } | null;
  } | null;
  links: {
    id: number;
    name: string | null;
    originalUrl: string;
    shortCode: string;
    promoLink: string;
    clicks: number;
    conversions: number;
    whatsappLink: string;
    affiliate: {
      id: number;
      name: string;
      email: string | null;
      city: string | null;
    } | null;
  }[];
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

export type HealthStatus = {
  status: string;
  database: string;
};

const defaultApiUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "/api-backend";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || defaultApiUrl,
});

function getApiBaseUrl() {
  return String(api.defaults.baseURL || "").replace(/\/+$/, "");
}

function normalizePromoLink(link: string) {
  if (!link || !link.startsWith("/")) {
    return link;
  }

  return `${getApiBaseUrl()}${link}`;
}

function normalizeConversionEvent(
  event: AffiliateConversionEvent
) {
  return {
    ...event,
    promoLink: normalizePromoLink(event.promoLink),
    whatsappLink: normalizePromoLink(event.whatsappLink),
  };
}

export function getApiErrorMessage(
  error: unknown,
  fallback: string
) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (message) {
      return String(message);
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
  payload: UpdateAffiliatePayload
) {
  const { data } = await api.put<Affiliate>(
    `/affiliate/${id}`,
    payload
  );

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

export async function editarUsuario(
  id: number,
  payload: UpdateUserPayload
) {
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

export async function editarLink(
  id: number,
  payload: UpdateLinkPayload
) {
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
  return Array.isArray(data)
    ? data.map(normalizeCampaignLinks)
    : [];
}

export async function apagarCampanha(id: number) {
  await api.delete(`/campaigns/${id}`);
}

export async function apagarLink(id: number) {
  await api.delete(`/links/${id}`);
}

export async function buscarEstatisticasAfiliado(id: number) {
  const { data } = await api.get<AffiliateStats>(
    `/affiliate/${id}/stats`
  );
  return {
    ...data,
    conversionEvents: (data.conversionEvents ?? []).map(
      normalizeConversionEvent
    ),
    links: data.links.map((link) => ({
      ...link,
      promoLink: normalizePromoLink(link.promoLink),
      whatsappLink: normalizePromoLink(link.whatsappLink),
      conversionEvents: (link.conversionEvents ?? []).map(
        normalizeConversionEvent
      ),
    })),
  };
}

export async function fazerLogin(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse>(
    "/auth/login",
    payload
  );

  return data;
}

export async function buscarStatusSgp() {
  const { data } = await api.get<SgpStatus>("/integrations/sgp/status");
  return data;
}

export async function consultarClienteSgp(document: string) {
  const { data } = await api.get<SgpCustomerResponse>(
    "/integrations/sgp/clientes",
    {
      params: {
        document,
      },
    }
  );

  return data;
}

export async function consultarSaudeSistema() {
  const { data } = await api.get<HealthStatus>("/health");
  return data;
}

export default api;
