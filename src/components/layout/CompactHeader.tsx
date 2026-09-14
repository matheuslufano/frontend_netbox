"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiCalendar, FiChevronRight, FiTrash2, FiX } from "react-icons/fi";
import { apagarAgendamentoContato, atualizarAgendamentoContato, consultarSaudeSistema, criarAgendamentoContato, listarAgendaContatos, type AgendaContact } from "@/lib/api";
import { CalendarView } from "@/app/contatos/page";
import styles from "./header.module.css";
import NotificationHeaderButton from "@/components/notifications/NotificationHeaderButton";
import ThemeToggle from "@/components/theme/ThemeToggle";

type ConnectionState = "checking" | "online" | "offline";
type HeaderReminder = { id: string; title: string; scheduledAt: string; status: string; color?: string | null };
type ReminderForm = { title: string; scheduledAt: string; durationMinutes: string; reminderMinutes: string; description: string; color: string };

const HEALTH_REFRESH_MS = 30000;
const REMINDER_COLORS = ["#176b88", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#dc2626", "#475569"];

const routeLabels: Record<string, string> = {
  "/": "Início",
  "/links": "Links e QR",
  "/afiliado": "Afiliado",
  "/criar-campanha": "Criar Campanha",
  "/campanhas": "Campanhas",
  "/dashboard": "Dashboard",
  "/relatorios": "Relatórios",
  "/sgp": "SGP",
  "/links-campanhas": "Links e Campanhas",
  "/links-campanhas/whatsapp": "WhatsApp",
  "/links-campanhas/relatorios": "Relat\u00f3rios",
  "/links-campanhas/relatorios/cliques": "Links clicados",
  "/links-campanhas/relatorios/whatsapp": "WhatsApp",
  "/links-campanhas/relatorios/link": "Link Individual",
  "/links-campanhas/relatorios/campanha": "Campanha",
  "/configuracoes": "Configura\u00e7\u00f5es",
  "/crm": "CRM",
  "/fluxograma-conversoes": "Fluxograma",
  "/integracoes": "Integrações",
};

function formatRouteSegment(segment: string) {
  if (/^\d+$/.test(segment)) return "Detalhes";
  return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CompactHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [backendState, setBackendState] =
    useState<ConnectionState>("checking");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarContacts, setCalendarContacts] = useState<AgendaContact[]>([]);
  const [selectedReminder, setSelectedReminder] = useState<{ contact: AgendaContact; appointment: HeaderReminder } | null>(null);
  const [editingReminder, setEditingReminder] = useState(false);
  const [reminderForm, setReminderForm] = useState<ReminderForm>({ title: "", scheduledAt: "", durationMinutes: "30", reminderMinutes: "15", description: "", color: "#176b88" });
  const [reminderSaving, setReminderSaving] = useState(false);
  const [creatingReminder, setCreatingReminder] = useState(false);
  const [newReminderContact, setNewReminderContact] = useState<AgendaContact | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const health = await consultarSaudeSistema();

        if (!cancelled) {
          setBackendState(health.status === "online" ? "online" : "offline");
        }
      } catch {
        if (!cancelled) {
          setBackendState("offline");
        }
      }
    }

    loadHealth();

    const interval = window.setInterval(loadHealth, HEALTH_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  function openCalendar() {
    setCalendarOpen(true);
    setCalendarLoading(true);
    void listarAgendaContatos()
      .then((result) => setCalendarContacts(result.contacts || []))
      .catch(() => setCalendarContacts([]))
      .finally(() => setCalendarLoading(false));
  }

  function toDateTimeLocal(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  }

  function showReminder(contact: AgendaContact, appointment?: HeaderReminder) {
    const item = appointment || contact.nextAppointment;
    if (!item) return;
    setSelectedReminder({ contact, appointment: item });
    setCreatingReminder(false);
    setEditingReminder(false);
  }

  function openNewReminder(date: Date) {
    setSelectedReminder(null);
    setNewReminderContact(null);
    setReminderForm({ title: "Retorno com cliente", scheduledAt: toDateTimeLocal(date.toISOString()), durationMinutes: "30", reminderMinutes: "15", description: "", color: "#176b88" });
    setCreatingReminder(true);
    setEditingReminder(true);
  }

  function startReminderEdit() {
    if (!selectedReminder) return;
    setReminderForm({ title: selectedReminder.appointment.title, scheduledAt: toDateTimeLocal(selectedReminder.appointment.scheduledAt), durationMinutes: "30", reminderMinutes: "15", description: "", color: selectedReminder.appointment.color || "#176b88" });
    setEditingReminder(true);
  }

  async function saveReminderEdit() {
    const contact = selectedReminder?.contact || newReminderContact;
    if (!contact || !reminderForm.title.trim() || !reminderForm.scheduledAt) return;
    setReminderSaving(true);
    try {
      const payload = { ...reminderForm, durationMinutes: Number(reminderForm.durationMinutes), reminderMinutes: Number(reminderForm.reminderMinutes) };
      if (creatingReminder) await criarAgendamentoContato(contact.id, payload);
      else if (selectedReminder) await atualizarAgendamentoContato(contact.id, Number(selectedReminder.appointment.id), payload);
      const result = await listarAgendaContatos();
      setCalendarContacts(result.contacts || []);
      setSelectedReminder(null);
      setNewReminderContact(null);
      setCreatingReminder(false);
      setEditingReminder(false);
    } finally {
      setReminderSaving(false);
    }
  }

  async function deleteReminder() {
    if (!selectedReminder || !window.confirm(`Apagar o lembrete “${selectedReminder.appointment.title}”?`)) return;
    setReminderSaving(true);
    try {
      await apagarAgendamentoContato(selectedReminder.contact.id, Number(selectedReminder.appointment.id));
      const result = await listarAgendaContatos();
      setCalendarContacts(result.contacts || []);
      setSelectedReminder(null);
      setEditingReminder(false);
    } finally {
      setReminderSaving(false);
    }
  }

  const breadcrumbs = useMemo(() => {
    const segments = String(pathname || "").split("/").filter(Boolean);
    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      return { href, label: routeLabels[href] || formatRouteSegment(segment) };
    });
  }, [pathname]);

  return (
    <header className={styles.compactHeader}>
      <div className={styles.compactLeft}>
        <button
          type="button"
          className={styles.headerBackButton}
          onClick={() => router.back()}
          aria-label="Voltar para a página anterior"
          title="Voltar"
        >
          <FiArrowLeft aria-hidden="true" />
        </button>

        <nav className={styles.compactBrand} aria-label="Navegação estrutural">
          <Link href="/dashboard" className={styles.breadcrumbLink}>
            Painel Netbox
          </Link>
          {breadcrumbs.map((breadcrumb, index) => {
            const current = index === breadcrumbs.length - 1;
            return (
              <span className={styles.breadcrumbItem} key={breadcrumb.href}>
                <FiChevronRight aria-hidden="true" />
                {current ? (
                  <strong aria-current="page">{breadcrumb.label}</strong>
                ) : (
                  <Link href={breadcrumb.href} className={styles.breadcrumbLink}>
                    {breadcrumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className={styles.compactTools}>
        <ThemeToggle className={styles.themeToggle} />
        <NotificationHeaderButton />
        <button type="button" className={styles.calendarButton} onClick={openCalendar} title="Abrir agenda" aria-label="Abrir agenda">
          <FiCalendar aria-hidden="true" />
        </button>
        <div className={styles.compactHealth} title={`Backend: ${getConnectionLabel(backendState)}`}>
        <span
          className={`${styles.compactLed} ${
            backendState === "online"
              ? styles.compactLedOnline
              : backendState === "offline"
                ? styles.compactLedOffline
                : styles.compactLedChecking
          }`}
          aria-hidden="true"
        />
        <span>Backend</span>
        </div>
      </div>
      {calendarOpen && typeof document !== "undefined" && createPortal(
        <div className={styles.calendarOverlay} role="dialog" aria-modal="true" aria-label="Agenda de contatos" onClick={(event) => event.target === event.currentTarget && setCalendarOpen(false)}>
          <section className={styles.calendarModal}>
            <header className={styles.calendarModalHeader}>
              <div><span>Agenda de clientes</span><h2>Calendário</h2></div>
              <button type="button" onClick={() => setCalendarOpen(false)} aria-label="Fechar agenda"><FiX /></button>
            </header>
            {calendarLoading ? <div className={styles.calendarLoading}>Carregando agenda...</div> : <CalendarView contacts={calendarContacts.filter((contact) => Boolean(contact.name || contact.phone || contact.document))} onOpen={(contact) => showReminder(contact)} onEdit={(contact, appointment) => showReminder(contact, appointment)} onCreateDate={openNewReminder} />}
            {(selectedReminder || creatingReminder) && <div className={styles.headerReminderOverlay} role="dialog" aria-modal="true" aria-label={creatingReminder ? "Novo lembrete" : "Detalhes do lembrete"} onClick={(event) => event.target === event.currentTarget && (setSelectedReminder(null), setCreatingReminder(false))}><section className={styles.headerReminderModal}><header><h3>{creatingReminder ? "Novo lembrete" : editingReminder ? "Editar lembrete" : "Lembrete"}</h3><button type="button" onClick={() => { setSelectedReminder(null); setCreatingReminder(false); }} aria-label="Fechar lembrete"><FiX /></button></header>{editingReminder ? <div className={styles.headerReminderForm}>{creatingReminder && <label><span>Contato</span><select value={newReminderContact?.id || ""} onChange={(event) => setNewReminderContact(calendarContacts.find((contact) => contact.id === event.target.value) || null)}><option value="">Selecione o contato</option>{calendarContacts.filter((contact) => Boolean(contact.name || contact.phone || contact.document)).map((contact) => <option key={contact.id} value={contact.id}>{contact.name || "Contato"}</option>)}</select></label>}<label><span>Título</span><input value={reminderForm.title} onChange={(event) => setReminderForm({ ...reminderForm, title: event.target.value })} /></label><label><span>Data e hora</span><input type="datetime-local" value={reminderForm.scheduledAt} onChange={(event) => setReminderForm({ ...reminderForm, scheduledAt: event.target.value })} /></label><label><span>Duração</span><input type="number" min="5" value={reminderForm.durationMinutes} onChange={(event) => setReminderForm({ ...reminderForm, durationMinutes: event.target.value })} /></label><label><span>Lembrete antes (minutos)</span><input type="number" min="0" value={reminderForm.reminderMinutes} onChange={(event) => setReminderForm({ ...reminderForm, reminderMinutes: event.target.value })} /></label><fieldset className={styles.reminderColorField}><legend>Cor do lembrete</legend><div className={styles.reminderColorChoices}>{REMINDER_COLORS.map((color) => <button type="button" key={color} className={reminderForm.color === color ? styles.reminderColorActive : ""} style={{ backgroundColor: color }} onClick={() => setReminderForm({ ...reminderForm, color })} aria-label={`Selecionar cor ${color}`} aria-pressed={reminderForm.color === color} />)}<label className={styles.reminderCustomColor}><span>Personalizada</span><input type="color" value={reminderForm.color} onChange={(event) => setReminderForm({ ...reminderForm, color: event.target.value })} /></label></div><div className={styles.reminderColorPreview} style={{ borderLeftColor: reminderForm.color, backgroundColor: `${reminderForm.color}18` }}><FiCalendar /><span>{reminderForm.title || "Prévia do lembrete"}</span></div></fieldset><label className={styles.headerReminderFull}><span>Observação</span><textarea value={reminderForm.description} onChange={(event) => setReminderForm({ ...reminderForm, description: event.target.value })} /></label><button type="button" onClick={() => void saveReminderEdit()} disabled={reminderSaving}>{reminderSaving ? "Salvando..." : creatingReminder ? "Agendar lembrete" : "Salvar alterações"}</button></div> : <div className={styles.headerReminderDetails}><div className={styles.reminderDetailTitle} style={{ borderLeftColor: selectedReminder?.appointment.color || "#176b88", backgroundColor: selectedReminder?.appointment.color ? `${selectedReminder.appointment.color}18` : undefined }}><FiCalendar /><strong>{selectedReminder?.appointment.title}</strong></div><span>{selectedReminder?.contact.name || "Contato"}</span><time>{selectedReminder && new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(new Date(selectedReminder.appointment.scheduledAt))}</time><small>Status: {selectedReminder?.appointment.status}</small><div className={styles.headerReminderActions}><button type="button" className={styles.headerReminderDelete} onClick={() => void deleteReminder()} disabled={reminderSaving}><FiTrash2 /> Apagar</button><button type="button" onClick={startReminderEdit} disabled={reminderSaving}>Editar lembrete</button></div></div>}</section></div>}
          </section>
        </div>,
        document.body,
      )}
    </header>
  );
}

function getConnectionLabel(state: ConnectionState) {
  if (state === "online") {
    return "conectado";
  }

  if (state === "offline") {
    return "offline";
  }

  return "verificando";
}
