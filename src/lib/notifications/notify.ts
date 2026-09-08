import type { NotificationContext, NotificationType } from "./repository";

export const NOTIFICATION_EVENT = "netbox:system-notification";

export type NotificationIcon =
  | "success" | "error" | "warning" | "info" | "automation" | "crm"
  | "security" | "user-created" | "user-updated" | "user-deleted"
  | "campaign" | "link" | "copied" | "conversion" | "whatsapp"
  | "saved" | "deleted" | "loading";

export type NotificationInput = {
  id?: string;
  eventId?: string;
  title?: string;
  message?: string;
  type?: NotificationType;
  context?: NotificationContext;
  icon?: NotificationIcon;
  duration?: number;
  persist?: boolean;
  href?: string;
  entityType?: string;
  entityId?: string;
  source?: "api" | "ui" | "system";
};

type NotificationCommand =
  | { action: "show"; notification: NotificationInput | string }
  | { action: "update"; id: string; notification: NotificationInput }
  | { action: "dismiss"; id: string };

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emit(command: NotificationCommand) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<NotificationCommand>(NOTIFICATION_EVENT, { detail: command }));
  }
}

function show(input: NotificationInput | string) {
  const id = typeof input === "string" ? makeId() : input.id || makeId();
  emit({ action: "show", notification: typeof input === "string" ? input : { ...input, id } });
  return id;
}

const typed = (type: NotificationType, defaultDuration: number) =>
  (input: Omit<NotificationInput, "type">) => show({ ...input, type, duration: input.duration ?? defaultDuration });

export const notify = {
  show,
  success: typed("success", 4_000),
  error: typed("error", 7_000),
  warning: typed("warning", 6_000),
  info: typed("info", 4_000),
  automation: typed("automation", 5_000),
  crm: typed("crm", 5_000),
  security: typed("security", 6_000),
  loading(input: Omit<NotificationInput, "type" | "duration">) {
    return show({ ...input, type: "info", icon: input.icon ?? "loading", duration: 7_000 });
  },
  update(id: string, input: NotificationInput) {
    emit({ action: "update", id, notification: input });
  },
  dismiss(id: string) {
    emit({ action: "dismiss", id });
  },
  async promise<T>(promise: Promise<T>, states: {
    loading: Omit<NotificationInput, "type" | "duration">;
    success: Omit<NotificationInput, "type"> | ((value: T) => Omit<NotificationInput, "type">);
    error: Omit<NotificationInput, "type"> | ((error: unknown) => Omit<NotificationInput, "type">);
  }) {
    const id = notify.loading(states.loading);
    try {
      const value = await promise;
      const next = typeof states.success === "function" ? states.success(value) : states.success;
      notify.update(id, { ...next, type: "success", duration: next.duration ?? 4_000 });
      return value;
    } catch (error) {
      const next = typeof states.error === "function" ? states.error(error) : states.error;
      notify.update(id, { ...next, type: "error", duration: next.duration ?? 7_000 });
      throw error;
    }
  },
};

export type { NotificationCommand };
