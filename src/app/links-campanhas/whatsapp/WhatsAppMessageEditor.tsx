import { FormEvent, useEffect, useRef, useState } from "react";
import { FiBold, FiBookOpen, FiCheck, FiItalic, FiMinus, FiSave, FiTrash2, FiType, FiX } from "react-icons/fi";
import { WhatsAppMessageTemplate, apagarTextoWhatsApp, getApiErrorMessage, listarTextosWhatsApp, salvarTextoWhatsApp } from "@/lib/api";
import { notify } from "@/lib/notifications/notify";
import styles from "./whatsapp.module.css";

type Props = { value: string; onChange: (value: string) => void; maxLength?: number };
type Panel = "save" | "library" | null;

export default function WhatsAppMessageEditor({ value, onChange, maxLength = 1000 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<WhatsAppMessageTemplate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedTemplate = templates.find((item) => item.id === Number(selectedId));

  useEffect(() => {
    if (!panel) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [panel]);

  function format(prefix: string, suffix = prefix) {
    const element = ref.current;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end) || "texto";
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`.slice(0, maxLength);
    onChange(next);
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  async function openLibrary() {
    setPanel("library");
    setError("");
    setLoading(true);
    try {
      const items = await listarTextosWhatsApp();
      setTemplates(items);
      setSelectedId((current) => current && items.some((item) => item.id === Number(current)) ? current : items[0]?.id.toString() || "");
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Não foi possível carregar os textos salvos."));
    } finally {
      setLoading(false);
    }
  }

  async function saveTemplate(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return setError("Escreva uma mensagem antes de salvá-la.");
    if (!templateName.trim()) return setError("Informe um nome para a mensagem.");
    setLoading(true);
    setError("");
    try {
      const saved = await salvarTextoWhatsApp({ name: templateName.trim(), message: value });
      setTemplates((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setSelectedId(String(saved.id));
      setTemplateName("");
      setPanel(null);
      notify.success({ title: "Texto salvo", message: `A mensagem “${saved.name}” foi salva com sucesso.` });
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Não foi possível salvar o texto."));
    } finally {
      setLoading(false);
    }
  }

  function applyTemplate() {
    if (!selectedTemplate) return;
    onChange(selectedTemplate.message);
    setPanel(null);
    notify.success({ title: "Texto carregado", message: `A mensagem “${selectedTemplate.name}” foi aplicada.` });
  }

  async function deleteTemplate() {
    if (!selectedTemplate) return;
    if (!window.confirm(`Apagar o texto salvo “${selectedTemplate.name}”?`)) return;
    setLoading(true);
    setError("");
    try {
      await apagarTextoWhatsApp(selectedTemplate.id);
      const remaining = templates.filter((item) => item.id !== selectedTemplate.id);
      setTemplates(remaining);
      setSelectedId(remaining[0]?.id.toString() || "");
      notify.success({ title: "Texto apagado", message: `A mensagem “${selectedTemplate.name}” foi apagada.` });
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Não foi possível apagar o texto salvo."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar} aria-label="Formatação e textos do WhatsApp">
        <button type="button" onClick={() => format("*")} title="Negrito" aria-label="Negrito"><FiBold /></button>
        <button type="button" onClick={() => format("_")} title="Itálico" aria-label="Itálico"><FiItalic /></button>
        <button type="button" onClick={() => format("~")} title="Tachado" aria-label="Tachado"><FiMinus /></button>
        <button type="button" onClick={() => format("```", "```")} title="Monoespaçado" aria-label="Monoespaçado"><FiType /></button>
        <span className={styles.toolbarSavedActions}>
          <button type="button" onClick={() => { setPanel("save"); setError(""); }} title="Salvar este texto" aria-label="Salvar este texto"><FiSave /></button>
          <button type="button" onClick={() => void openLibrary()} title="Consultar textos salvos" aria-label="Consultar textos salvos"><FiBookOpen /></button>
        </span>
      </div>

      {panel && (
        <div ref={panelRef} className={styles.messageTemplatePopover} role="dialog" aria-label={panel === "save" ? "Salvar texto" : "Textos salvos"}>
          <div className={styles.messageTemplateHeader}>
            <strong>{panel === "save" ? "Salvar mensagem" : "Textos salvos"}</strong>
            <button type="button" onClick={() => setPanel(null)} title="Fechar" aria-label="Fechar"><FiX /></button>
          </div>
          {panel === "save" ? (
            <form onSubmit={saveTemplate}>
              <label htmlFor="whatsapp-template-name">Nome da mensagem</label>
              <input id="whatsapp-template-name" value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={120} placeholder="Ex.: Apresentação dos planos" autoFocus />
              <button className={styles.messageTemplatePrimaryAction} type="submit" disabled={loading} title="Confirmar salvamento" aria-label="Confirmar salvamento"><FiCheck /></button>
            </form>
          ) : (
            <div className={styles.messageTemplateLibrary}>
              {loading && templates.length === 0 ? <p>Carregando textos...</p> : templates.length === 0 && !error ? <p>Nenhum texto salvo ainda.</p> : (
                <>
                  <label htmlFor="whatsapp-template-select">Selecione uma mensagem</label>
                  <select id="whatsapp-template-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} size={Math.min(templates.length, 5)}>
                    {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  {selectedTemplate && <p className={styles.messageTemplatePreview}>{selectedTemplate.message}</p>}
                  <div className={styles.messageTemplateActions}>
                    <button type="button" onClick={applyTemplate} disabled={!selectedTemplate || loading} title="Usar texto selecionado" aria-label="Usar texto selecionado"><FiCheck /></button>
                    <button type="button" className={styles.messageTemplateDelete} onClick={() => void deleteTemplate()} disabled={!selectedTemplate || loading} title="Apagar texto selecionado" aria-label="Apagar texto selecionado"><FiTrash2 /></button>
                  </div>
                </>
              )}
            </div>
          )}
          {error && <p className={styles.messageTemplateError} role="alert">{error}</p>}
        </div>
      )}

      <textarea ref={ref} id="whatsapp-message" value={value} onChange={(event) => onChange(event.target.value)} maxLength={maxLength} rows={7} placeholder="Olá, gostaria de conhecer os planos da Netbox." />
      <small className={styles.counter}>{value.length}/{maxLength}</small>
    </div>
  );
}
