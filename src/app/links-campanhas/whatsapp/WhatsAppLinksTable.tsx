"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiEdit2, FiExternalLink, FiLayers, FiTrash2, FiX } from "react-icons/fi";
import { Affiliate, WhatsAppLinkItem } from "@/lib/api";
import { maskBrazilianPhone } from "./whatsappLink";
import styles from "./whatsapp.module.css";

export type WhatsAppLinkDraft = {
  name: string;
  affiliateId: number;
  whatsappNumber: string;
  message: string;
  appendAffiliateCode: boolean;
  identificationTemplate: string;
};

type EditorMode = "edit" | "duplicate" | "delete";
type ActiveEditor = { item: WhatsAppLinkItem; mode: EditorMode; anchor: HTMLButtonElement };

type Props = {
  items: WhatsAppLinkItem[];
  affiliates: Affiliate[];
  onSaveEdit: (item: WhatsAppLinkItem, draft: WhatsAppLinkDraft) => Promise<void>;
  onSaveDuplicate: (item: WhatsAppLinkItem, draft: WhatsAppLinkDraft) => Promise<void>;
  onDelete: (item: WhatsAppLinkItem) => Promise<void>;
};

function createDraft(item: WhatsAppLinkItem, duplicate: boolean): WhatsAppLinkDraft {
  return {
    name: duplicate ? `${item.name} - cópia` : item.name,
    affiliateId: item.affiliateId,
    whatsappNumber: maskBrazilianPhone(item.whatsappNumber),
    message: item.originalMessage,
    appendAffiliateCode: item.appendAffiliateCode,
    identificationTemplate: item.identificationTemplate,
  };
}

export default function WhatsAppLinksTable({ items, affiliates, onSaveEdit, onSaveDuplicate, onDelete }: Props) {
  const [activeEditor, setActiveEditor] = useState<ActiveEditor | null>(null);

  function openEditor(item: WhatsAppLinkItem, mode: EditorMode, anchor: HTMLButtonElement) {
    setActiveEditor((current) => current?.item.id === item.id && current.mode === mode ? null : { item, mode, anchor });
  }

  return (
    <section className={styles.listCard}>
      <div className={styles.listHeader}>
        <div><span className={styles.kicker}>Histórico</span><h2>Links criados</h2></div>
        <span>{items.length} registro{items.length === 1 ? "" : "s"}</span>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty}>Nenhum link WhatsApp salvo ainda.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table>
            <thead><tr><th>Nome</th><th>Afiliado / código</th><th>Mensagem</th><th>WhatsApp</th><th>Criado em</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td><strong>{item.affiliate.name}</strong><small>{item.affiliateCode}</small></td>
                  <td className={styles.messageCell}>{item.finalMessage}</td>
                  <td>{item.whatsappNumber}</td>
                  <td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))}</td>
                  <td><span className={item.active ? styles.active : styles.inactive}>{item.active ? "Ativo" : "Inativo"}</span></td>
                  <td>
                    <div className={styles.rowActions}>
                      <a href={item.whatsappUrl} target="_blank" rel="noreferrer" title="Abrir" aria-label={`Abrir ${item.name}`}><FiExternalLink aria-hidden="true" /></a>
                      <button type="button" onClick={(event) => openEditor(item, "edit", event.currentTarget)} title="Editar" aria-label={`Editar ${item.name}`}><FiEdit2 aria-hidden="true" /></button>
                      <button type="button" onClick={(event) => openEditor(item, "duplicate", event.currentTarget)} title="Duplicar" aria-label={`Duplicar ${item.name}`}><FiLayers aria-hidden="true" /></button>
                      <button type="button" className={styles.deleteIconButton} onClick={(event) => openEditor(item, "delete", event.currentTarget)} title="Apagar" aria-label={`Apagar ${item.name}`}><FiTrash2 aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeEditor && (
        <ActionPopover key={`${activeEditor.item.id}-${activeEditor.mode}`} active={activeEditor} affiliates={affiliates} onClose={() => setActiveEditor(null)} onSaveEdit={onSaveEdit} onSaveDuplicate={onSaveDuplicate} onDelete={onDelete} />
      )}
    </section>
  );
}

function ActionPopover({ active, affiliates, onClose, onSaveEdit, onSaveDuplicate, onDelete }: {
  active: ActiveEditor;
  affiliates: Affiliate[];
  onClose: () => void;
  onSaveEdit: Props["onSaveEdit"];
  onSaveDuplicate: Props["onSaveDuplicate"];
  onDelete: Props["onDelete"];
}) {
  const duplicate = active.mode === "duplicate";
  const [draft, setDraft] = useState(() => createDraft(active.item, duplicate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ top: 12, left: 12 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const affiliateOptions = [...affiliates].sort((first, second) =>
    first.name.localeCompare(second.name, "pt-BR"),
  );

  useEffect(() => {
    const updatePosition = () => {
      const anchorRect = active.anchor.getBoundingClientRect();
      const popoverRect = popoverRef.current?.getBoundingClientRect();
      const width = popoverRect?.width || Math.min(380, window.innerWidth - 24);
      const height = popoverRect?.height || 500;
      const left = anchorRect.right + 10 + width <= window.innerWidth ? anchorRect.right + 10 : Math.max(12, anchorRect.left - width - 10);
      const top = Math.max(12, Math.min(anchorRect.top, window.innerHeight - height - 12));
      setPosition({ top, left });
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !active.anchor.contains(target)) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [active.anchor, onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (active.mode === "edit") await onSaveEdit(active.item, draft);
      if (active.mode === "duplicate") await onSaveDuplicate(active.item, draft);
      if (active.mode === "delete") await onDelete(active.item);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível concluir a operação.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div ref={popoverRef} className={`${styles.actionPopover} ${active.mode === "delete" ? styles.deletePopover : ""}`} style={{ top: position.top, left: position.left }} role="dialog" aria-modal="false" aria-labelledby="whatsapp-action-title">
      <div className={styles.actionPopoverHeader}>
        <div><span>{active.mode === "edit" ? "Editar link" : active.mode === "duplicate" ? "Duplicar link" : "Apagar link"}</span><strong id="whatsapp-action-title">{active.item.name}</strong></div>
        <button type="button" onClick={onClose} aria-label="Fechar"><FiX aria-hidden="true" /></button>
      </div>
      <form onSubmit={submit}>
        {active.mode === "delete" ? (
          <p className={styles.deleteConfirmation}>Esta ação apaga o link WhatsApp da lista. O código original do afiliado será preservado.</p>
        ) : (
          <>
            <label><span>Nome do link</span><input value={draft.name} maxLength={120} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <label>
              <span>Afiliado responsável</span>
              <select
                value={draft.affiliateId}
                required
                onChange={(event) =>
                  setDraft({ ...draft, affiliateId: Number(event.target.value) })
                }
              >
                {affiliateOptions.map((affiliate) => (
                  <option
                    key={affiliate.id}
                    value={affiliate.id}
                    disabled={!affiliate.active && affiliate.id !== active.item.affiliateId}
                  >
                    {affiliate.name}{!affiliate.active ? " (inativo)" : ""}
                  </option>
                ))}
              </select>
              {draft.affiliateId !== active.item.affiliateId && (
                <small className={styles.affiliateChangeHint}>
                  Um novo código será criado para o afiliado selecionado.
                </small>
              )}
            </label>
            <label><span>Número do WhatsApp</span><input value={draft.whatsappNumber} inputMode="tel" required onChange={(event) => setDraft({ ...draft, whatsappNumber: maskBrazilianPhone(event.target.value) })} /></label>
            <label><span>Mensagem</span><textarea value={draft.message} maxLength={1000} rows={4} onChange={(event) => setDraft({ ...draft, message: event.target.value })} /></label>
            <label className={styles.popoverCheckbox}><input type="checkbox" checked={draft.appendAffiliateCode} onChange={(event) => setDraft({ ...draft, appendAffiliateCode: event.target.checked })} /><span>Adicionar identificação do afiliado</span></label>
            {draft.appendAffiliateCode && <label><span>Texto de identificação</span><input value={draft.identificationTemplate} maxLength={500} required onChange={(event) => setDraft({ ...draft, identificationTemplate: event.target.value })} /></label>}
          </>
        )}
        {error && <p className={styles.popoverError} role="alert">{error}</p>}
        <div className={styles.actionPopoverFooter}>
          <button type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className={active.mode === "delete" ? styles.confirmDeleteButton : styles.confirmSaveButton} disabled={saving}>
            {saving ? "Salvando..." : active.mode === "delete" ? "Apagar link" : duplicate ? "Salvar cópia" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
