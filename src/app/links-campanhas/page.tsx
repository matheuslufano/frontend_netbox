import Link from "next/link";
import { BsMegaphoneFill } from "react-icons/bs";
import { FiArrowRight, FiPlusCircle } from "react-icons/fi";
import { PiLinkFill } from "react-icons/pi";
import { FaWhatsapp } from "react-icons/fa";
import styles from "./links-campanhas.module.css";

const actions = [
  {
    href: "/links-campanhas/whatsapp",
    title: "Link do WhatsApp",
    description:
      "Crie mensagens com código de afiliado, QR Code e rastreamento por campanha.",
    icon: FaWhatsapp,
    label: "Criar link do WhatsApp",
  },
  {
    href: "/links",
    title: "Links e QR Code",
    description:
      "Crie links promocionais, gere QR Codes e acompanhe os acessos por afiliado.",
    icon: PiLinkFill,
    label: "Gerenciar links",
  },
  {
    href: "/criar-campanha",
    title: "Criar campanha",
    description:
      "Monte campanhas comerciais e distribua links personalizados para afiliados ativos.",
    icon: FiPlusCircle,
    label: "Nova campanha",
  },
  {
    href: "/campanhas",
    title: "Campanhas",
    description:
      "Acompanhe campanhas criadas, ranking, cliques, desempenho e conversões.",
    icon: BsMegaphoneFill,
    label: "Ver campanhas",
  },
];

export default function LinksCampanhasPage() {
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>Central de crescimento</span>
            <h1>Links e Campanhas</h1>
            <p>
              Organize suas estratégias de divulgação, acompanhe campanhas e
              monitore os resultados dos afiliados em um só lugar.
            </p>
          </div>
        </header>


        <div className={styles.actionGrid}>
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className={styles.actionCard}
              >
                <div className={styles.actionTop}>
                  <div className={styles.actionIcon}>
                    <Icon aria-hidden="true" />
                  </div>

                  <FiArrowRight
                    className={styles.actionArrow}
                    aria-hidden="true"
                  />
                </div>

                <div className={styles.actionContent}>
                  <strong>{action.title}</strong>
                  <span>{action.description}</span>
                </div>

                <div className={styles.actionFooter}>
                  <small>{action.label}</small>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
