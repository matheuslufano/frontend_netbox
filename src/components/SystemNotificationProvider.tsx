"use client";

import {
  createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from "react";
import type { IconType } from "react-icons";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";
import {
  LuBadgeCheck, LuBot, LuCopyCheck, LuLink2, LuLoaderCircle, LuMegaphone,
  LuMessageCircle, LuPanelsTopLeft, LuSave, LuShieldAlert, LuTrash2,
  LuUserMinus, LuUserPlus, LuUserRoundCog,
} from "react-icons/lu";

import { useNotificationHistory } from "@/lib/notifications/useNotificationHistory";
import { events, type NotificationType } from "@/lib/notifications/repository";
import {
  clampNotificationDuration,
  MAX_VISIBLE_NOTIFICATIONS,
  notificationDurations,
} from "@/lib/notifications/policy";
import {
  NOTIFICATION_EVENT, notify, type NotificationCommand, type NotificationIcon,
  type NotificationInput,
} from "@/lib/notifications/notify";
import styles from "./systemNotifications.module.css";

export type SystemNotificationType = NotificationType;
export type SystemNotificationInput = NotificationInput;

type ToastNotification = Required<Pick<NotificationInput, "title" | "message" | "type" | "duration">> &
  Omit<NotificationInput, "title" | "message" | "type" | "duration" | "id"> & {
    id: string;
    revision: number;
    exiting?: boolean;
  };

type ContextValue = ReturnType<typeof useNotificationHistory> & {
  notify: (notification: NotificationInput | string) => string;
  update: (id: string, notification: NotificationInput) => void;
  dismiss: (id: string) => void;
};

const EXIT_DURATION = 180;
const titles: Record<NotificationType, string> = {
  success: "Ação concluída", error: "Não foi possível concluir", warning: "Atenção",
  info: "Informação", automation: "Automação concluída", crm: "Atualização do CRM",
  security: "Aviso de segurança",
};
const typeIcons: Record<NotificationType, IconType> = {
  success: FiCheckCircle, error: FiAlertCircle, warning: FiAlertTriangle, info: FiInfo,
  automation: LuBot, crm: LuPanelsTopLeft, security: LuShieldAlert,
};
const customIcons: Record<NotificationIcon, IconType> = {
  success: FiCheckCircle, error: FiAlertCircle, warning: FiAlertTriangle, info: FiInfo,
  automation: LuBot, crm: LuPanelsTopLeft, security: LuShieldAlert,
  "user-created": LuUserPlus, "user-updated": LuUserRoundCog, "user-deleted": LuUserMinus,
  campaign: LuMegaphone, link: LuLink2, copied: LuCopyCheck, conversion: LuBadgeCheck,
  whatsapp: LuMessageCircle, saved: LuSave, deleted: LuTrash2, loading: LuLoaderCircle,
};
const contextIcons: Partial<Record<NonNullable<NotificationInput["context"]>, IconType>> = {
  "user-created": LuUserPlus, "user-updated": LuUserRoundCog, "user-deleted": LuUserMinus,
  "affiliate-created": LuUserPlus, "affiliate-updated": LuUserRoundCog, "affiliate-deleted": LuUserMinus,
  "campaign-created": LuMegaphone, "campaign-updated": LuMegaphone, "campaign-deleted": LuTrash2,
  "link-created": LuLink2, "link-updated": LuLink2, "link-deleted": LuTrash2,
  "whatsapp-link-created": LuMessageCircle, "whatsapp-link-updated": LuMessageCircle,
  "whatsapp-link-deleted": LuTrash2, "crm-card-created": LuPanelsTopLeft,
  "crm-card-updated": LuPanelsTopLeft, "crm-card-deleted": LuTrash2,
  conversion: LuBadgeCheck, "conversion-updated": LuBadgeCheck, "conversion-deleted": LuTrash2,
  "integration-error": FiAlertTriangle, "automation-error": LuBot, security: LuShieldAlert,
  copied: LuCopyCheck,
};

export function NotificationGlyph({
  type,
  context,
  icon,
  className,
}: {
  type: NotificationType;
  context?: NotificationInput["context"];
  icon?: NotificationIcon;
  className?: string;
}) {
  const Glyph = icon
    ? customIcons[icon]
    : (context && contextIcons[context]) || typeIcons[type];
  return createElement(Glyph, { className, "aria-hidden": true });
}

const NotificationContext = createContext<ContextValue | null>(null);

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function inferType(message: string, element?: HTMLElement): NotificationType {
  const source = `${element?.className || ""} ${message}`.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (element?.getAttribute("role") === "alert" || /\b(erro|falha|falhou|invalido|nao foi possivel|indisponivel)\b/.test(source)) return "error";
  if (/\b(aviso|atencao|cuidado|incompleto)\b/.test(source)) return "warning";
  if (/\b(sucesso|concluido|salvo|atualizado|criado|apagado|copiado|enviado)\b/.test(source)) return "success";
  return "info";
}

export function normalizeNotification(input: NotificationInput | string): Omit<ToastNotification, "revision"> | null {
  const data: NotificationInput = typeof input === "string" ? { message: input } : input;
  const message = clean(data.message || data.title);
  if (!message) return null;
  const type = data.type ?? inferType(message);
  return {
    ...data,
    id: data.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    type,
    title: clean(data.title) || titles[type],
    message,
    duration: clampNotificationDuration(data.duration, type),
  };
}

export function notifySystem(notification: NotificationInput | string) {
  return notify.show(notification);
}

export { notify };

export function useSystemNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useSystemNotifications deve ser usado dentro de SystemNotificationProvider.");
  return context;
}

export default function SystemNotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const history = useNotificationHistory();
  const addHistory = history.add;
  const recent = useRef(new Map<string, number>());
  const removalTimers = useRef(new Map<string, number>());
  const lastApiFeedbackAt = useRef(0);

  const persist = useCallback((toast: ToastNotification) => {
    if (!toast.persist) return;
    const context = toast.context ?? "generic";
    addHistory({
      id: toast.eventId || toast.id, context, type: toast.type,
      title: events[context][0], href: events[context][1] || undefined,
      read: false, createdAt: new Date().toISOString(),
    });
  }, [addHistory]);

  const show = useCallback((input: NotificationInput | string) => {
    const normalized = normalizeNotification(input);
    if (!normalized) return "";
    const now = Date.now();
    if (
      normalized.source !== "api" &&
      ["success", "error"].includes(normalized.type) &&
      now - lastApiFeedbackAt.current < 1_000
    ) {
      return normalized.id;
    }
    const key = normalized.eventId || `${normalized.type}:${normalized.title}:${normalized.message}`;
    const previous = recent.current.get(key);
    if (previous && (normalized.eventId || now - previous < 1_500)) return normalized.id;
    if (recent.current.size > 500) recent.current.clear();
    recent.current.set(key, now);
    if (normalized.source === "api") lastApiFeedbackAt.current = now;
    const toast = { ...normalized, revision: 0 };
    persist(toast);
    setToasts((current) => [...current, toast]);
    return toast.id;
  }, [persist]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.map((toast) => toast.id === id ? { ...toast, exiting: true } : toast));
    if (removalTimers.current.has(id)) return;
    removalTimers.current.set(id, window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      removalTimers.current.delete(id);
    }, EXIT_DURATION));
  }, []);

  const update = useCallback((id: string, input: NotificationInput) => {
    if (input.source === "api") lastApiFeedbackAt.current = Date.now();
    setToasts((current) => {
      if (!current.some((toast) => toast.id === id)) {
        const normalized = normalizeNotification({ ...input, id });
        if (!normalized) return current;
        const restored = { ...normalized, revision: 0 };
        persist(restored);
        return [...current, restored];
      }
      return current.map((toast) => {
      if (toast.id !== id) return toast;
      const normalized = normalizeNotification({ ...toast, ...input, id, persist: input.persist ?? toast.persist });
      if (!normalized) return toast;
      const next = { ...normalized, exiting: false, revision: toast.revision + 1 };
      persist(next);
      return next;
      });
    });
  }, [persist]);

  useEffect(() => {
    const timers = removalTimers.current;
    return () => { timers.forEach(clearTimeout); timers.clear(); };
  }, []);

  useEffect(() => {
    function handle(event: Event) {
      const command = (event as CustomEvent<NotificationCommand>).detail;
      if (!command || typeof command !== "object" || !("action" in command)) {
        show(command as unknown as NotificationInput | string);
      } else if (command.action === "show") show(command.notification);
      else if (command.action === "update") update(command.id, command.notification);
      else dismiss(command.id);
    }
    window.addEventListener(NOTIFICATION_EVENT, handle);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handle);
  }, [dismiss, show, update]);

  useEffect(() => {
    const original = window.alert;
    const replacement = (value?: unknown) => {
      const message = clean(value);
      if (message) show({ message, type: inferType(message), source: "ui" });
    };
    window.alert = replacement;
    return () => { if (window.alert === replacement) window.alert = original; };
  }, [show]);

  useEffect(() => {
    const seen = new WeakMap<HTMLElement, string>();
    function capture(element: HTMLElement) {
      if (element.closest("[data-system-notifications]") || element.hidden || element.getAttribute("aria-hidden") === "true") return;
      if (Date.now() - lastApiFeedbackAt.current < 1_000 && ["alert", "status"].includes(element.getAttribute("role") || "")) return;
      const message = clean(element.getAttribute("aria-label") || element.textContent);
      if (!message || seen.get(element) === message) return;
      seen.set(element, message);
      show({ message, type: inferType(message, element), source: "ui" });
    }
    function inspect(node: Node) {
      const element = node instanceof HTMLElement ? node : node.parentElement;
      if (!element) return;
      const feedback = element.closest<HTMLElement>('[role="alert"], [role="status"]');
      if (feedback) capture(feedback);
      element.querySelectorAll<HTMLElement>('[role="alert"], [role="status"]').forEach(capture);
    }
    document.querySelectorAll<HTMLElement>('[role="alert"], [role="status"]').forEach(capture);
    const observer = new MutationObserver((mutations) => mutations.forEach((mutation) => {
      if (mutation.type === "characterData") inspect(mutation.target);
      else mutation.addedNodes.forEach(inspect);
    }));
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [show]);

  const value = useMemo(() => ({ ...history, notify: show, update, dismiss }), [history, show, update, dismiss]);
  return <NotificationContext.Provider value={value}>
    {children}
    <section className={styles.notificationRegion} aria-label="Notificações do sistema" data-system-notifications data-theme-protected>
      {toasts.slice(0, MAX_VISIBLE_NOTIFICATIONS).map((toast) => <ToastItem key={`${toast.id}:${toast.revision}`} toast={toast} dismiss={dismiss} />)}
    </section>
  </NotificationContext.Provider>;
}

function ToastItem({ toast, dismiss }: { toast: ToastNotification; dismiss: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const arm = useCallback(() => {
    startedAt.current = Date.now();
    timer.current = window.setTimeout(() => dismiss(toast.id), remaining.current);
  }, [dismiss, toast.id]);
  useEffect(() => { arm(); return () => { if (timer.current) clearTimeout(timer.current); }; }, [arm]);
  function pause() {
    if (paused) return;
    if (timer.current) clearTimeout(timer.current);
    remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    setPaused(true);
  }
  function resume() {
    if (!paused) return;
    setPaused(false);
    arm();
  }
  const style = { "--notification-duration": `${toast.duration}ms` } as CSSProperties;
  return <article
    className={`${styles.notification} ${styles[toast.type]} ${toast.exiting ? styles.exiting : ""}`}
    role={toast.type === "error" ? "alert" : "status"}
    aria-live={toast.type === "error" ? "assertive" : "polite"}
    aria-atomic="true" style={style} onMouseEnter={pause} onMouseLeave={resume}
    onFocusCapture={pause} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) resume(); }}
  >
    <span className={`${styles.icon} ${toast.icon === "loading" ? styles.spinning : ""}`} aria-hidden="true"><NotificationGlyph type={toast.type} context={toast.context} icon={toast.icon} /></span>
    <span className={styles.content}><strong>{toast.title}</strong><span>{toast.message}</span></span>
    <button type="button" className={styles.closeButton} onClick={() => dismiss(toast.id)} aria-label="Fechar notificação" title="Fechar"><FiX aria-hidden="true" /></button>
    <span className={`${styles.progress} ${paused ? styles.paused : ""}`} aria-hidden="true" />
  </article>;
}
