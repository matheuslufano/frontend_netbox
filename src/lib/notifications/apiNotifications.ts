import { getFriendlyErrorMessage } from "./getFriendlyErrorMessage";
import { notify } from "./notify";
import { events, sessionOwner, type NotificationContext, type NotificationType } from "./repository";

type MutationDescription = {
  context: NotificationContext;
  type: NotificationType;
  loadingTitle: string;
  loadingMessage: string;
  persist: boolean;
  successTitle?: string;
};

function operation(method?: string) {
  const value = method?.toLowerCase();
  return value === "post" ? "created" : value === "delete" ? "deleted" : "updated";
}

function describeMutation(method?: string, url?: string): MutationDescription | null {
  const verb = method?.toLowerCase();
  const path = (url || "").split("?")[0];
  if (path === "/auth/login" && verb === "post") return {
    context: "security", type: "security", loadingTitle: "Entrando", loadingMessage: "Validando suas credenciais…", persist: false,
  };
  if (!["post", "put", "patch", "delete"].includes(verb || "")) return null;

  const entity = path.match(/^\/(users|affiliate|campaigns|links|whatsapp-links|crm\/deals|conversions)(?:\/[^/]+)?(?:\/responsible)?$/)?.[1];
  if (entity) {
    const prefix = ({ users: "user", affiliate: "affiliate", campaigns: "campaign", links: "link", "whatsapp-links": "whatsapp-link", "crm/deals": "crm-card", conversions: "conversion" } as const)[entity];
    const context = (prefix === "conversion" && verb === "post" ? "conversion" : `${prefix}-${operation(verb)}`) as NotificationContext;
    const type = prefix === "crm-card" ? "crm" : "success";
    return { context, type, loadingTitle: "Salvando alterações", loadingMessage: "Aguardando a confirmação do sistema…", persist: true };
  }
  if (/^\/crm\/(funnels|stages)/.test(path)) return {
    context: "generic", type: "crm", loadingTitle: "Atualizando o CRM", loadingMessage: "Salvando a configuração…", persist: false,
    successTitle: path.includes("funnels")
      ? verb === "post" ? "Funil criado" : "Funil atualizado"
      : verb === "post" ? "Etapa do CRM criada" : verb === "delete" ? "Etapa do CRM removida" : "Etapa do CRM atualizada",
  };
  if (/^\/crm\/saved-filters/.test(path)) return {
    context: "generic", type: "info", loadingTitle: "Salvando filtro", loadingMessage: "Aguardando a confirmação…", persist: false,
    successTitle: verb === "delete" ? "Filtro removido" : "Filtro salvo",
  };
  if (/chatmix|sgp|integration|webhook/i.test(path)) return {
    context: "generic", type: "automation", loadingTitle: "Processando integração", loadingMessage: "Aguardando a resposta do serviço…", persist: false,
    successTitle: "Integração concluída",
  };
  return null;
}

export function beginApiNotification(method?: string, url?: string) {
  const description = describeMutation(method, url);
  if (!description) return null;
  return notify.loading({
    title: description.loadingTitle,
    message: description.loadingMessage,
    context: description.context,
    source: "api",
  });
}

function responseName(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const record = "deal" in data && data.deal && typeof data.deal === "object"
    ? data.deal as Record<string, unknown>
    : data as Record<string, unknown>;
  const value = record.name || record.customerName || record.title;
  return typeof value === "string" && value.trim().length <= 100
    ? value.trim()
    : null;
}

function successMessage(context: NotificationContext, data: unknown) {
  const name = responseName(data);
  if (!name) return "A operação foi confirmada pelo sistema.";
  if (context === "user-created") return `${name} foi adicionado ao sistema.`;
  if (context === "user-updated") return `As informações de ${name} foram salvas.`;
  if (context === "affiliate-created") return `${name} foi cadastrado como afiliado.`;
  if (context === "affiliate-updated") return `As informações de ${name} foram salvas.`;
  if (context === "campaign-created") return `A campanha “${name}” já está disponível.`;
  if (context === "campaign-updated") return `As alterações da campanha “${name}” foram salvas.`;
  if (context === "crm-card-created") return `${name} foi adicionado ao funil comercial.`;
  return `${name} foi atualizado com sucesso.`;
}

function actorName() {
  try {
    const user = JSON.parse(localStorage.getItem("afiliados_netbox_user") || "null");
    return typeof user?.name === "string" && user.name.trim() ? user.name.trim() : "usuário atual";
  } catch {
    return "usuário atual";
  }
}

export function notifyApiSuccess(method: string | undefined, url: string | undefined, requestOwner: string | null, toastId: string | null, data?: unknown) {
  const description = describeMutation(method, url);
  if (!description || !toastId) return;
  const login = (url || "").split("?")[0] === "/auth/login";
  if (!login && (!requestOwner || requestOwner !== sessionOwner())) {
    notify.dismiss(toastId);
    return;
  }
  const title = login
    ? "Login realizado"
    : description.successTitle || events[description.context]?.[0] || "Alterações salvas";
  const icon = description.context.endsWith("deleted") ? "deleted" : undefined;
  const detail = `${successMessage(description.context, data)} Alterado por ${actorName()}.`;
  notify.update(toastId, {
    type: description.type,
    context: description.context,
    title,
    message: login ? "Bem-vindo ao Afiliados Netbox." : detail,
    duration: description.type === "automation" || description.type === "crm" ? 5_000 : 4_000,
    persist: description.persist,
    icon,
    source: "api",
  });
}

export function notifyApiFailure(method: string | undefined, url: string | undefined, error: unknown, toastId: string | null) {
  const description = describeMutation(method, url);
  if (!description || !toastId) return;
  const path = (url || "").split("?")[0];
  const integration = /chatmix|sgp|integration|webhook/i.test(path);
  const security = path === "/auth/login" || /permission|password|session/i.test(path);
  const title = integration ? "Falha na integração" : security ? "Não foi possível entrar" : "Não foi possível concluir a ação";
  notify.update(toastId, {
    type: security ? "security" : "error",
    context: integration ? "integration-error" : security ? "security" : "generic",
    title,
    message: getFriendlyErrorMessage(error, integration ? "Não foi possível comunicar com a integração." : title),
    duration: 7_000,
    // Falhas relevantes devem permanecer disponíveis na Central após o toast.
    persist: true,
    source: "api",
  });
}
