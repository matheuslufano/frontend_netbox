import { Fragment, ReactNode } from "react";
import { FiMessageCircle } from "react-icons/fi";
import styles from "./whatsapp.module.css";

const formatRules = [
  { marker: "```", render: (children: ReactNode) => <code className={styles.monospace}>{children}</code> },
  { marker: "*", render: (children: ReactNode) => <strong>{children}</strong> },
  { marker: "_", render: (children: ReactNode) => <em>{children}</em> },
  { marker: "~", render: (children: ReactNode) => <del>{children}</del> },
];

function renderWhatsAppFormatting(text: string, ruleIndex = 0): ReactNode {
  if (!text || ruleIndex >= formatRules.length) return text;

  const rule = formatRules[ruleIndex];
  const parts: ReactNode[] = [];
  let cursor = 0;
  let partKey = 0;

  while (cursor < text.length) {
    const opening = text.indexOf(rule.marker, cursor);
    if (opening < 0) {
      parts.push(<Fragment key={`${ruleIndex}-${partKey++}`}>{renderWhatsAppFormatting(text.slice(cursor), ruleIndex + 1)}</Fragment>);
      break;
    }

    const contentStart = opening + rule.marker.length;
    const closing = text.indexOf(rule.marker, contentStart);
    if (closing < 0 || closing === contentStart) {
      parts.push(<Fragment key={`${ruleIndex}-${partKey++}`}>{renderWhatsAppFormatting(text.slice(cursor), ruleIndex + 1)}</Fragment>);
      break;
    }

    if (opening > cursor) {
      parts.push(<Fragment key={`${ruleIndex}-${partKey++}`}>{renderWhatsAppFormatting(text.slice(cursor, opening), ruleIndex + 1)}</Fragment>);
    }

    const content = text.slice(contentStart, closing);
    parts.push(
      <Fragment key={`${ruleIndex}-${partKey++}`}>
        {rule.render(rule.marker === "```" ? content : renderWhatsAppFormatting(content, ruleIndex + 1))}
      </Fragment>,
    );
    cursor = closing + rule.marker.length;
  }

  return parts;
}

export default function WhatsAppPreview({ message }: { message: string }) {
  return (
    <section className={styles.previewCard}>
      <div className={styles.sectionTitle}><FiMessageCircle /><div><h2>Prévia da mensagem</h2><p>Como o cliente enviará a mensagem.</p></div></div>
      <div className={styles.phonePreview}>
        <div className={styles.previewTop}>Netbox WhatsApp</div>
        <div className={styles.chatArea}>
          <div className={styles.bubble}>
            <div className={styles.formattedMessage}>{renderWhatsAppFormatting(message || "Sua mensagem aparecerá aqui.")}</div>
            <span>agora ✓✓</span>
          </div>
        </div>
      </div>
    </section>
  );
}
