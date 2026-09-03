import { FiCopy, FiEdit2, FiExternalLink, FiLayers, FiPower } from "react-icons/fi";
import { WhatsAppLinkItem } from "@/lib/api";
import styles from "./whatsapp.module.css";

type Props = {
  items: WhatsAppLinkItem[];
  onCopy: (item: WhatsAppLinkItem) => void;
  onEdit: (item: WhatsAppLinkItem) => void;
  onDuplicate: (item: WhatsAppLinkItem) => void;
  onToggle: (item: WhatsAppLinkItem) => void;
};

export default function WhatsAppLinksTable({ items, onCopy, onEdit, onDuplicate, onToggle }: Props) {
  return (
    <section className={styles.listCard}>
      <div className={styles.listHeader}><div><span className={styles.kicker}>Histórico</span><h2>Links criados</h2></div><span>{items.length} registro{items.length === 1 ? "" : "s"}</span></div>
      {items.length === 0 ? <p className={styles.empty}>Nenhum link WhatsApp salvo ainda.</p> : (
        <div className={styles.tableWrap}><table><thead><tr><th>Nome</th><th>Afiliado / código</th><th>Mensagem</th><th>WhatsApp</th><th>Criado em</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <td><strong>{item.name}</strong></td>
          <td><strong>{item.affiliate.name}</strong><small>{item.affiliateCode}</small></td>
          <td className={styles.messageCell}>{item.finalMessage}</td><td>{item.whatsappNumber}</td>
          <td>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.createdAt))}</td>
          <td><span className={item.active ? styles.active : styles.inactive}>{item.active ? "Ativo" : "Inativo"}</span></td>
          <td><div className={styles.rowActions}>
            <button type="button" onClick={() => onCopy(item)} title="Copiar"><FiCopy /></button>
            <a href={item.whatsappUrl} target="_blank" rel="noreferrer" title="Abrir"><FiExternalLink /></a>
            <button type="button" onClick={() => onEdit(item)} title="Editar"><FiEdit2 /></button>
            <button type="button" onClick={() => onDuplicate(item)} title="Duplicar"><FiLayers /></button>
            <button type="button" onClick={() => onToggle(item)} title={item.active ? "Desativar" : "Ativar"}><FiPower /></button>
          </div></td>
        </tr>)}</tbody></table></div>
      )}
    </section>
  );
}
