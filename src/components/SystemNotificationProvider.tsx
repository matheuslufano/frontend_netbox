"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiX,
} from "react-icons/fi";

import styles from "./systemNotifications.module.css";

export type SystemNotificationType = "success" | "error" | "warning" | "info";

export type SystemNotificationInput = {
  message: string;
  title?: string;
  type?: SystemNotificationType;
  duration?: number;
};

type SystemNotification = Required<
  Pick<SystemNotificationInput, "message" | "title" | "type" | "duration">
> & {
  id: number;
};

type SystemNotificationContextValue = {
  notify: (notification: SystemNotificationInput | string) => void;
  dismiss: (id: number) => void;
};

const NOTIFICATION_EVENT = "netbox:system-notification";
const MAX_DURATION = 10_000;
const MIN_DURATION = 1_500;
const MAX_VISIBLE_NOTIFICATIONS = 5;

const defaultTitles: Record<SystemNotificationType, string> = {
  success: "Ação concluída",
  error: "Não foi possível concluir",
  warning: "Atenção",
  info: "Informação",
};

const icons = {
  success: FiCheckCircle,
  error: FiAlertCircle,
  warning: FiAlertTriangle,
  info: FiInfo,
};

const SystemNotificationContext = createContext<SystemNotificationContextValue | null>(
  null,
);

let nextNotificationId = 0;

function normalizeText(value: unknown) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNotification(
  input: SystemNotificationInput | string,
): Omit<SystemNotification, "id"> | null {
  const data = typeof input === "string" ? { message: input } : input;
  const message = normalizeText(data?.message);

  if (!message) return null;

  const type = data.type ?? inferNotificationType(message);
  const requestedDuration = Number(data.duration ?? MAX_DURATION);
  const duration = Math.min(
    MAX_DURATION,
    Math.max(
      MIN_DURATION,
      Number.isFinite(requestedDuration) ? requestedDuration : MAX_DURATION,
    ),
  );

  return {
    message,
    title: normalizeText(data.title) || defaultTitles[type],
    type,
    duration,
  };
}

function inferNotificationType(
  message: string,
  element?: HTMLElement,
): SystemNotificationType {
  const source = `${element?.className || ""} ${message}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    element?.getAttribute("role") === "alert" ||
    /\b(erro|error|falha|falhou|invalido|nao foi possivel|indisponivel)\b/.test(
      source,
    )
  ) {
    return "error";
  }

  if (/\b(aviso|atencao|warning|cuidado)\b/.test(source)) return "warning";
  if (
    /\b(sucesso|concluido|salvo|atualizado|criado|apagado|copiado|enviado)\b/.test(
      source,
    )
  ) {
    return "success";
  }

  return "info";
}

export function notifySystem(notification: SystemNotificationInput | string) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<SystemNotificationInput | string>(NOTIFICATION_EVENT, {
      detail: notification,
    }),
  );
}

export function useSystemNotifications() {
  const context = useContext(SystemNotificationContext);

  if (!context) {
    throw new Error(
      "useSystemNotifications deve ser usado dentro de SystemNotificationProvider.",
    );
  }

  return context;
}

export default function SystemNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const timers = useRef(new Map<number, number>());
  const recentNotifications = useRef(new Map<string, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (input: SystemNotificationInput | string) => {
      const normalized = normalizeNotification(input);
      if (!normalized) return;

      const now = Date.now();
      const deduplicationKey = `${normalized.type}:${normalized.message}`;
      const lastOccurrence = recentNotifications.current.get(deduplicationKey);

      if (lastOccurrence && now - lastOccurrence < 1_500) return;
      recentNotifications.current.set(deduplicationKey, now);

      const id = ++nextNotificationId;
      const notification = { id, ...normalized };

      setNotifications((current) =>
        [...current, notification].slice(-MAX_VISIBLE_NOTIFICATIONS),
      );

      const timer = window.setTimeout(() => dismiss(id), notification.duration);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const currentTimers = timers.current;

    return () => {
      currentTimers.forEach((timer) => window.clearTimeout(timer));
      currentTimers.clear();
    };
  }, []);

  useEffect(() => {
    function handleNotification(event: Event) {
      notify((event as CustomEvent<SystemNotificationInput | string>).detail);
    }

    window.addEventListener(NOTIFICATION_EVENT, handleNotification);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleNotification);
  }, [notify]);

  useEffect(() => {
    const originalAlert = window.alert;
    const floatingAlert = (message?: unknown) => {
      const text = normalizeText(message);
      if (text) notify({ message: text, type: inferNotificationType(text) });
    };

    window.alert = floatingAlert;

    return () => {
      if (window.alert === floatingAlert) window.alert = originalAlert;
    };
  }, [notify]);

  useEffect(() => {
    const observedContent = new WeakMap<HTMLElement, string>();

    function captureElement(element: HTMLElement) {
      if (element.closest("[data-system-notifications]")) return;
      if (element.hidden || element.getAttribute("aria-hidden") === "true") return;

      const message = normalizeText(
        element.getAttribute("aria-label") || element.textContent,
      );
      if (!message || observedContent.get(element) === message) return;

      observedContent.set(element, message);
      notify({
        message,
        type: inferNotificationType(message, element),
      });
    }

    function inspectNode(node: Node) {
      const element =
        node instanceof HTMLElement ? node : node.parentElement ?? undefined;
      if (!element) return;

      const feedback = element.closest<HTMLElement>(
        '[role="alert"], [role="status"]',
      );
      if (feedback) captureElement(feedback);

      element
        .querySelectorAll<HTMLElement>('[role="alert"], [role="status"]')
        .forEach(captureElement);
    }

    document
      .querySelectorAll<HTMLElement>('[role="alert"], [role="status"]')
      .forEach(captureElement);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          inspectNode(mutation.target);
          return;
        }

        mutation.addedNodes.forEach(inspectNode);
      });
    });

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [notify]);

  return (
    <SystemNotificationContext.Provider value={{ notify, dismiss }}>
      {children}
      <section
        className={styles.notificationRegion}
        aria-label="Notificações do sistema"
        data-system-notifications
      >
        {notifications.map((notification) => {
          const Icon = icons[notification.type];
          const notificationStyle = {
            "--notification-duration": `${notification.duration}ms`,
          } as CSSProperties;

          return (
            <article
              key={notification.id}
              className={`${styles.notification} ${styles[notification.type]}`}
              role={notification.type === "error" ? "alert" : "status"}
              aria-live={notification.type === "error" ? "assertive" : "polite"}
              style={notificationStyle}
            >
              <span className={styles.icon} aria-hidden="true">
                <Icon />
              </span>
              <span className={styles.content}>
                <strong>{notification.title}</strong>
                <span>{notification.message}</span>
              </span>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => dismiss(notification.id)}
                aria-label="Fechar notificação"
                title="Fechar"
              >
                <FiX aria-hidden="true" />
              </button>
              <span className={styles.progress} aria-hidden="true" />
            </article>
          );
        })}
      </section>
    </SystemNotificationContext.Provider>
  );
}
