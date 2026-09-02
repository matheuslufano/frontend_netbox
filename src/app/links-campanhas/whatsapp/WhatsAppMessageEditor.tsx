import { useRef } from "react";
import { FiBold, FiItalic, FiMinus, FiType } from "react-icons/fi";
import styles from "./whatsapp.module.css";

type Props = { value: string; onChange: (value: string) => void; maxLength?: number };

export default function WhatsAppMessageEditor({ value, onChange, maxLength = 1000 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar} aria-label="Formatação do WhatsApp">
        <button type="button" onClick={() => format("*")} title="Negrito"><FiBold /></button>
        <button type="button" onClick={() => format("_")} title="Itálico"><FiItalic /></button>
        <button type="button" onClick={() => format("~")} title="Tachado"><FiMinus /></button>
        <button type="button" onClick={() => format("```", "```")} title="Monoespaçado"><FiType /></button>
      </div>
      <textarea
        ref={ref}
        id="whatsapp-message"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxLength}
        rows={7}
        placeholder="Olá, gostaria de conhecer os planos da Netbox."
      />
      <small className={styles.counter}>{value.length}/{maxLength}</small>
    </div>
  );
}
