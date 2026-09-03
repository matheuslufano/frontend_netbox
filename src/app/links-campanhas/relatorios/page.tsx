import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowRight, FiBarChart2, FiLink } from "react-icons/fi";
import { BsMegaphoneFill } from "react-icons/bs";
import {
  ReportHeader,
  reportStyles as styles,
} from "@/components/reports/ReportsUi";

const reports = [
  {
    href: "/links-campanhas/relatorios/whatsapp",
    title: "Relatório do WhatsApp",
    description:
      "Acompanhe os atendimentos e resultados gerados pelos links de divulgação enviados para o WhatsApp.",
    icon: FaWhatsapp,
    indicators: ["Cliques", "Atendimentos", "Leads", "Conversões"],
    featured: true,
  },
  {
    href: "/links-campanhas/relatorios/link",
    title: "Relatório de Link Individual",
    description:
      "Analise detalhadamente o desempenho de um link específico de divulgação.",
    icon: FiLink,
    indicators: ["Cliques únicos", "Origem", "Dispositivo", "Conversões"],
  },
  {
    href: "/links-campanhas/relatorios/campanha",
    title: "Relatório de Campanha",
    description:
      "Tenha uma visão consolidada do desempenho de todos os afiliados e links de uma campanha.",
    icon: BsMegaphoneFill,
    indicators: ["Afiliados", "Links", "Ranking", "Conversões"],
  },
];

export default function ReportsHubPage() {
  return (
    <main className={styles.page}>
      <div className={styles.surface}>
        <ReportHeader
          title="Relatórios"
          subtitle="Acompanhe o desempenho das campanhas, links e afiliados da Netbox."
        />
        <div className={styles.reportGrid}>
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <article
                key={report.href}
                className={`${styles.reportCard} ${report.featured ? styles.reportCardFeatured : ""}`}
              >
                <div className={styles.cardTop}>
                  <div
                    className={`${styles.cardIcon} ${report.featured ? styles.featuredIcon : ""}`}
                  >
                    <Icon aria-hidden="true" />
                  </div>
                  {report.featured && (
                    <span className={styles.badge}>Conversão via WhatsApp</span>
                  )}
                </div>
                <h2>{report.title}</h2>
                <p>{report.description}</p>
                
                <Link href={report.href} className={styles.openButton}>
                  Abrir relatório <FiArrowRight aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
