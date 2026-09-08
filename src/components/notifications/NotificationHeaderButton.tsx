"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiBell,
  FiBellOff,
  FiCheck,
  FiX,
  FiTrash2,
} from "react-icons/fi";
import { LuBellRing } from "react-icons/lu";
import {
  NotificationGlyph,
  useSystemNotifications,
} from "../SystemNotificationProvider";
import {
  events,
  sessionOwner,
  type AppNotification,
} from "@/lib/notifications/repository";
import styles from "./notifications.module.css";

function relativeTime(date: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(date)) / 60000));
  if (!minutes) return "Agora";
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  return minutes < 60
    ? formatter.format(-minutes, "minute")
    : minutes < 1440
      ? formatter.format(-Math.floor(minutes / 60), "hour")
      : formatter.format(-Math.floor(minutes / 1440), "day");
}

export default function NotificationHeaderButton() {
  const { unreadCount } = useSystemNotifications();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div data-system-notifications data-theme-protected>
      <button
        ref={trigger}
        type="button"
        className={styles.bell}
        title="Notificações"
        aria-label={`Abrir notificações${unreadCount ? ` — ${unreadCount} não lidas` : ""}`}
        aria-expanded={open}
        aria-controls="notification-center"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {unreadCount ? (
          <LuBellRing aria-hidden="true" />
        ) : (
          <FiBell aria-hidden="true" />
        )}
        {unreadCount > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <span className={styles.sr} aria-live="polite">
        {unreadCount} notificações não lidas
      </span>
      {open && (
        <NotificationCenter
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      )}
    </div>
  );
}

function NotificationCenter({ onClose }: { onClose: () => void }) {
  const {
    history,
    unreadCount,
    loading,
    error,
    offline,
    reload,
    markRead,
    remove,
  } = useSystemNotifications();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [navigationError, setNavigationError] = useState("");
  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => {
      clearInterval(timer);
      node.close();
      document.body.style.overflow = previous;
    };
  }, []);
  function select(item: AppNotification) {
    try {
      if (!sessionOwner()) {
        onClose();
        router.replace("/login");
        return;
      }
      const href = events[item.context][1];
      if (!markRead(item.id)) return;
      if (!href) return;
      const target = new URL(href, window.location.origin);
      if (target.pathname === window.location.pathname) {
        const current = new URLSearchParams(window.location.search);
        target.searchParams.forEach((value, key) => current.set(key, value));
        target.search = current.toString();
      }
      onClose();
      router.push(target.pathname + target.search);
    } catch {
      setNavigationError("Este item não está mais disponível.");
    }
  }
  const visible = history.filter((n) => !unreadOnly || !n.read);
  return (
    <dialog
      ref={dialog}
      id="notification-center"
      className={styles.panel}
      aria-modal="true"
      aria-labelledby="notification-title"
      data-system-notifications
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientY < rect.top ||
            event.clientX > rect.right
          )
            onClose();
        }
      }}
    >
      <header className={styles.heading}>
        <div>
          <h2 id="notification-title">Notificações</h2>
          <p>{unreadCount} não lidas</p>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label="Fechar central de notificações"
        >
          <FiX />
        </button>
        <button
          type="button"
          className={styles.readAll}
          disabled={!unreadCount}
          onClick={() => markRead()}
        >
          <FiCheck /> Marcar todas como lidas
        </button>
        <div className={styles.filters} aria-label="Filtrar notificações">
          <button
            type="button"
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
          >
            Todas
          </button>
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly(true)}
          >
            Não lidas
          </button>
        </div>
      </header>
      <div className={styles.list}>
        {offline && (
          <p role="status">
            Você está offline. As notificações podem estar desatualizadas.
          </p>
        )}
        {navigationError && <p role="alert">{navigationError}</p>}
        {error && (
          <div className={styles.empty} role="alert">
            <p>Não foi possível carregar as notificações.</p>
            <button type="button" onClick={reload}>
              Tentar novamente
            </button>
          </div>
        )}
        {loading ? (
          <div aria-label="Carregando notificações" aria-busy="true">
            {[1, 2, 3].map((n) => (
              <div key={n} className={styles.skeleton} />
            ))}
          </div>
        ) : !error && !visible.length ? (
          <div className={styles.empty}>
            <FiBellOff aria-hidden="true" />
            <h3>
              {unreadOnly ? "Tudo em dia" : "Nenhuma notificação por aqui"}
            </h3>
            <p>
              {unreadOnly
                ? "Você não possui notificações não lidas."
                : "As atualizações importantes aparecerão nesta área."}
            </p>
          </div>
        ) : (
          <ul>
            {visible.map((item) => {
              return (
                <li
                  key={item.id}
                  className={`${styles.item} ${!item.read ? styles.unread : ""}`}
                  data-type={item.type}
                >
                  <button
                    type="button"
                    className={styles.destination}
                    onClick={() => select(item)}
                  >
                    <NotificationGlyph type={item.type} context={item.context} className={styles.contextIcon} />
                    <span>
                      <strong>{item.title}</strong>
                      <span className={styles.description}>
                        {item.message ||
                          (item.href
                            ? "Acesse a tela relacionada para consultar os detalhes."
                            : "Atualização registrada no histórico.")}
                      </span>
                      <time
                        dateTime={item.createdAt}
                        title={new Date(item.createdAt).toLocaleString("pt-BR")}
                      >
                        {relativeTime(item.createdAt, now)}
                      </time>
                      <span className={styles.sr}>
                        {item.read
                          ? "Notificação lida"
                          : "Notificação não lida"}
                      </span>
                    </span>
                    {!item.read && (
                      <span className={styles.dot} aria-hidden="true" />
                    )}
                  </button>
                  <div className={styles.actions}>
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => markRead(item.id)}
                        aria-label={`Marcar como lida: ${item.title}`}
                      >
                        <FiCheck /> Marcar como lida
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label={`Excluir notificação: ${item.title}`}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </dialog>
  );
}
