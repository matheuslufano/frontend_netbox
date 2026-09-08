export type NotificationType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "automation"
  | "crm"
  | "security";
export const events = {
  "user-created": ["Usuário criado", "/configuracoes?section=usuarios"],
  "user-updated": ["Usuário atualizado", "/configuracoes?section=usuarios"],
  "user-deleted": ["Usuário removido", "/configuracoes?section=usuarios"],
  "affiliate-created": ["Afiliado criado", "/configuracoes?section=usuarios"],
  "affiliate-updated": [
    "Afiliado atualizado",
    "/configuracoes?section=usuarios",
  ],
  "affiliate-deleted": ["Afiliado removido", "/configuracoes?section=usuarios"],
  "campaign-created": ["Campanha criada", "/campanhas"],
  "campaign-updated": ["Campanha atualizada", "/campanhas"],
  "campaign-deleted": ["Campanha removida", "/campanhas"],
  "link-created": ["Link criado", "/links-campanhas/relatorios/whatsapp"],
  "link-updated": ["Link atualizado", "/links-campanhas/relatorios/whatsapp"],
  "link-deleted": ["Link removido", "/links-campanhas/relatorios/whatsapp"],
  "whatsapp-link-created": [
    "Link do WhatsApp criado",
    "/links-campanhas/whatsapp",
  ],
  "whatsapp-link-updated": [
    "Link do WhatsApp atualizado",
    "/links-campanhas/whatsapp",
  ],
  "whatsapp-link-deleted": [
    "Link do WhatsApp removido",
    "/links-campanhas/whatsapp",
  ],
  "crm-card-created": ["Cartão criado no CRM", "/crm"],
  "crm-card-updated": ["Cartão atualizado no CRM", "/crm"],
  "crm-card-deleted": ["Cartão removido do CRM", "/crm"],
  conversion: ["Conversão registrada", "/links-campanhas/relatorios"],
  "conversion-updated": ["Conversão atualizada", "/links-campanhas/relatorios"],
  "conversion-deleted": ["Conversão removida", "/links-campanhas/relatorios"],
  "integration-error": ["Falha na integração", "/integracoes"],
  "automation-error": ["Falha na automação", "/crm"],
  security: ["Permissão ou sessão alterada", "/configuracoes"],
  generic: ["Atualização do sistema", ""],
  copied: ["Link copiado", ""],
} as const;
export type NotificationContext = keyof typeof events;
export interface AppNotification {
  id: string;
  type: NotificationType;
  context: NotificationContext;
  title: string;
  message?: string;
  href?: string;
  entityType?: string;
  entityId?: string;
  icon?: NotificationType;
  read: boolean;
  readAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
export function sessionOwner(): string | null {
  if (!localStorage.getItem("afiliados_netbox_token")) return null;
  const user = JSON.parse(
    localStorage.getItem("afiliados_netbox_user") || "null",
  );
  return user?.id != null ? String(user.id) : null;
}
const key = (owner: string) => `netbox:notifications:v1:${owner}`;
// Only canonical, non-personal text and destinations go to disk. Never serialize input metadata.
function safe(item: AppNotification): AppNotification {
  return {
    id: item.id,
    context: item.context,
    type: item.type,
    title: events[item.context][0],
    message: item.message,
    href: events[item.context][1] || undefined,
    read: item.read,
    readAt: item.readAt,
    createdAt: item.createdAt,
  };
}
export const notificationRepository = {
  load(owner: string): AppNotification[] {
    const data: unknown = JSON.parse(localStorage.getItem(key(owner)) || "[]");
    if (!Array.isArray(data)) throw new Error("Invalid history");
    return data
      .filter(
        (n): n is AppNotification =>
          n &&
          typeof n.id === "string" &&
          Object.hasOwn(events, n.context) &&
          [
            "success",
            "error",
            "warning",
            "info",
            "automation",
            "crm",
            "security",
          ].includes(n.type) &&
          typeof n.read === "boolean" &&
          typeof n.createdAt === "string" &&
          Number.isFinite(Date.parse(n.createdAt)),
      )
      .map(safe)
      .filter((n, i, all) => all.findIndex((x) => x.id === n.id) === i)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 200);
  },
  save(owner: string, items: AppNotification[]) {
    localStorage.setItem(
      key(owner),
      JSON.stringify(items.slice(0, 200).map(safe)),
    );
  },
};
