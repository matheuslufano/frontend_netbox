"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ContactRecord,
  getApiErrorMessage,
  editarContato,
  apagarContato,
  listarContatos,
} from "@/lib/api";
import { notify } from "@/lib/notifications/notify";
import {
  FiCalendar,
  FiEdit3,
  FiMessageCircle,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiUserX,
  FiUsers,
  FiX,
  FiTrash2,
} from "react-icons/fi";
import { RealtimeEventName, useRealtimeEvents } from "@/lib/useRealtimeEvents";
import styles from "./contatos.module.css";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const CONTACT_REALTIME_EVENTS: RealtimeEventName[] = ["chatmix-webhook", "link-converted"];

export default function ContatosPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [search, setSearch] = useState("");
  const [showUnidentified, setShowUnidentified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<ContactRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", document: "", city: "" });
  const [savingContact, setSavingContact] = useState(false);

  const loadContacts = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await listarContatos();
      setContacts(response.contacts || []);
      setError(null);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Não foi possível carregar os contatos."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const refreshFromEvent = useCallback(() => {
    void loadContacts(true);
  }, [loadContacts]);

  useRealtimeEvents(refreshFromEvent, CONTACT_REALTIME_EVENTS);

  const openContactEditor = (contact: ContactRecord) => {
    setEditingContact(contact);
    setEditForm({
      name: contact.name || "",
      phone: contact.phone || "",
      document: contact.document || "",
      city: contact.city || "",
    });
  };

  const saveContact = async () => {
    if (!editingContact) return;
    setSavingContact(true);
    try {
      await editarContato({ ...editForm, conversionIds: editingContact.conversionIds });
      notify.success({ title: "Contato atualizado", message: "As informações do contato foram salvas." });
      setEditingContact(null);
      await loadContacts(true);
    } catch (requestError) {
      notify.error({ title: "Não foi possível atualizar o contato", message: getApiErrorMessage(requestError, "Verifique os dados e tente novamente.") });
    } finally {
      setSavingContact(false);
    }
  };

  const removeContact = async () => {
    if (!editingContact || !window.confirm("Apagar este contato? O histórico de conversões será preservado.")) return;
    setSavingContact(true);
    try {
      await apagarContato(editingContact);
      notify.success({ title: "Contato apagado", message: "O contato foi removido da lista, mantendo o histórico." });
      setEditingContact(null);
      await loadContacts(true);
    } catch (requestError) {
      notify.error({ title: "Não foi possível apagar o contato", message: getApiErrorMessage(requestError, "Tente novamente em instantes.") });
    } finally {
      setSavingContact(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return contacts.filter((contact) => {
      if (isIdentified(contact) === showUnidentified) return false;
      if (!term) return true;

      return [
          contact.name,
          contact.phone,
          contact.document,
          contact.city,
          contact.source,
          contact.campaignName,
          ...contact.affiliates.map((affiliate) => affiliate.name),
          contact.linkName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(term);
    });
  }, [contacts, search, showUnidentified]);

  const unidentifiedCount = useMemo(
    () => contacts.filter((contact) => !isIdentified(contact)).length,
    [contacts],
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}><FiUsers aria-hidden="true" /> Cadastro de clientes</p>
          <h1>Contatos</h1>
          <p className={styles.subtitle}>
            Clientes identificados nas conversões e atendimentos recebidos pelo Chatmix.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void loadContacts(true)}
          disabled={refreshing}
        >
          <FiRefreshCw aria-hidden="true" className={refreshing ? styles.spinning : undefined} />
          Atualizar
        </button>
      </header>

      <section className={styles.toolbar} aria-label="Filtros de contatos">
        <label className={styles.searchBox}>
          <FiSearch aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, telefone, cidade ou campanha"
            aria-label="Buscar contatos"
          />
        </label>
        <div className={styles.toolbarActions}>
          <span className={styles.count}>{filteredContacts.length} contato(s)</span>
          <button
            type="button"
            className={`${styles.iconFilterButton} ${showUnidentified ? styles.iconFilterButtonActive : ""}`}
            onClick={() => setShowUnidentified((current) => !current)}
            aria-label={showUnidentified ? "Mostrar contatos identificados" : `Mostrar ${unidentifiedCount} contatos não identificados`}
            aria-pressed={showUnidentified}
            title={showUnidentified ? "Mostrar contatos identificados" : "Mostrar contatos não identificados"}
          >
            <FiUserX aria-hidden="true" />
          </button>
        </div>
      </section>

      {loading ? (
        <section className={styles.stateCard}>Carregando contatos...</section>
      ) : error ? (
        <section className={styles.stateCard} role="alert">
          <strong>Não foi possível carregar os contatos.</strong>
          <p>{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => void loadContacts()}>
            Tentar novamente
          </button>
        </section>
      ) : filteredContacts.length === 0 ? (
        <section className={styles.stateCard}>
          <FiUsers aria-hidden="true" />
          <strong>{showUnidentified ? "Nenhuma conversão não identificada" : "Nenhum contato identificado"}</strong>
          <p>{showUnidentified
            ? "As conversões sem nome, telefone ou documento aparecerão nesta visualização."
            : "Novos clientes identificados aparecerão aqui quando uma conversão for registrada pelo Chatmix."}</p>
        </section>
      ) : (
        <section className={styles.contactGrid} aria-label="Lista de contatos">
          {filteredContacts.map((contact) => (
            <article className={styles.contactCard} key={contact.id}>
              <div className={styles.cardHeader}>
                <ContactAvatar contact={contact} />
                <div className={styles.identity}>
                  <h2>{contact.name || "Contato não identificado"}</h2>
                  <span>{contact.source}</span>
                </div>
                <button
                  type="button"
                  className={styles.editContactButton}
                  onClick={() => openContactEditor(contact)}
                  aria-label={`Editar ${contact.name || "contato"}`}
                  title="Editar contato"
                >
                  <FiEdit3 aria-hidden="true" />
                </button>
                <div className={styles.cardStats}>
                  <strong className={styles.conversionBadge}>
                    {contact.totalAttendances} atendimento{contact.totalAttendances === 1 ? "" : "s"}
                  </strong>
                  <span>{contact.totalAffiliates} afiliado{contact.totalAffiliates === 1 ? "" : "s"}</span>
                </div>
              </div>

              <dl className={styles.details}>
                <div><dt><FiPhone aria-hidden="true" /> Telefone</dt><dd>{contact.phone || "Não informado"}</dd></div>
                <div><dt><FiMessageCircle aria-hidden="true" /> Atendimentos</dt><dd>{contact.totalAttendances}</dd></div>
                <div><dt>Conversões</dt><dd>{contact.totalConversions}</dd></div>
                <div><dt>Cidade</dt><dd>{contact.city || "Não informada"}</dd></div>
                <div><dt>Campanha</dt><dd>{contact.campaignName || contact.linkName || "Não identificada"}</dd></div>
                <div>
                  <dt>Afiliados vinculados</dt>
                  <dd title={contact.affiliates.map((affiliate) => affiliate.name).join(", ")}>
                    {contact.affiliates.length
                      ? contact.affiliates.map((affiliate) => affiliate.name).join(", ")
                      : "Nenhum afiliado vinculado"}
                  </dd>
                </div>
                <div><dt><FiCalendar aria-hidden="true" /> Primeiro cadastro</dt><dd>{formatDate(contact.firstSeenAt)}</dd></div>
                <div><dt><FiCalendar aria-hidden="true" /> Último registro</dt><dd>{formatDate(contact.lastSeenAt)}</dd></div>
              </dl>
            </article>
          ))}
        </section>
      )}

      {editingContact && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="contact-edit-title" onClick={(event) => {
          if (event.target === event.currentTarget && !savingContact) setEditingContact(null);
        }}>
          <section className={styles.editModal}>
            <header className={styles.editModalHeader}>
              <div>
                <span className={styles.eyebrow}>Cadastro de contato</span>
                <h2 id="contact-edit-title">Editar contato</h2>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setEditingContact(null)} aria-label="Fechar edição" disabled={savingContact}>
                <FiX aria-hidden="true" />
              </button>
            </header>
            <div className={styles.editForm}>
              <label><span>Nome</span><input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label>
              <label><span>Telefone</span><input value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} /></label>
              <label><span>Documento</span><input value={editForm.document} onChange={(event) => setEditForm({ ...editForm, document: event.target.value })} /></label>
              <label><span>Cidade</span><input value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} /></label>
            </div>
            <footer className={styles.editModalFooter}>
              <button type="button" className={styles.deleteContactButton} onClick={() => void removeContact()} disabled={savingContact}>
                <FiTrash2 aria-hidden="true" /> Apagar contato
              </button>
              <div>
                <button type="button" className={styles.modalSecondary} onClick={() => setEditingContact(null)} disabled={savingContact}>Cancelar</button>
                <button type="button" className={styles.modalPrimary} onClick={() => void saveContact()} disabled={savingContact}>{savingContact ? "Salvando..." : "Salvar alterações"}</button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : dateFormatter.format(date);
}

function isIdentified(contact: ContactRecord) {
  return contact.identified ?? Boolean(contact.name || contact.phone || contact.document);
}

function ContactAvatar({ contact }: { contact: ContactRecord }) {
  const [failed, setFailed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const imageUrl = `https://cataas.com/cat?type=square&width=900&height=900&contact=${avatarSeed(contact.id)}`;

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!previewOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePreview();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePreview, previewOpen]);

  if (failed) {
    return (
      <div className={styles.avatar} aria-hidden="true">
        {(contact.name || "C").slice(0, 1).toUpperCase()}
      </div>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.avatar} ${styles.avatarButton}`}
        onClick={() => setPreviewOpen(true)}
        aria-label={`Ampliar foto de ${contact.name || "contato não identificado"}`}
        title="Visualizar foto"
      >
        <Image
          src={imageUrl}
          alt={`Foto de animal para ${contact.name || "contato não identificado"}`}
          width={48}
          height={48}
          unoptimized
          onError={() => setFailed(true)}
        />
      </button>

      {previewOpen && createPortal(
        <div
          className={styles.imagePreviewOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto de ${contact.name || "contato não identificado"}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) closePreview();
          }}
        >
          <div className={styles.imagePreviewCard}>
            <button
              type="button"
              className={styles.imagePreviewClose}
              onClick={closePreview}
              aria-label="Fechar visualização da foto"
              autoFocus
            >
              <FiX aria-hidden="true" />
            </button>
            <Image
              className={styles.imagePreview}
              src={imageUrl}
              alt={`Foto ampliada de animal para ${contact.name || "contato não identificado"}`}
              width={900}
              height={900}
              unoptimized
              priority
            />
            <strong>{contact.name || "Contato não identificado"}</strong>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function avatarSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `contato-${hash >>> 0}`;
}
