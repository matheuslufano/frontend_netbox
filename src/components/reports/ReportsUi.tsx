import type { IconType } from "react-icons";
import Link from "next/link";
import { FiArrowLeft, FiChevronRight, FiInbox } from "react-icons/fi";
import styles from "./reports.module.css";

export function ReportBreadcrumb({ current }: { current?: string }) {
  return (
    <nav className={styles.breadcrumb} aria-label="Navegação estrutural">
      <Link href="/links-campanhas">Links e Campanhas</Link>
      <FiChevronRight aria-hidden="true" />
      {current ? (
        <>
          <Link href="/links-campanhas/relatorios">Relatórios</Link>
          <FiChevronRight aria-hidden="true" />
          <span aria-current="page">{current}</span>
        </>
      ) : (
        <span aria-current="page">Relatórios</span>
      )}
    </nav>
  );
}

export function ReportHeader({
  title,
  subtitle,
  current,
}: {
  title: string;
  subtitle: string;
  current?: string;
}) {
  return (
    <header className={styles.reportHeader}>
      <ReportBreadcrumb current={current} />
      {current && (
        <Link href="/links-campanhas/relatorios" className={styles.backButton}>
        </Link>
      )}
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}

export function ReportKpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: IconType;
}) {
  return (
    <article className={styles.kpiCard}>
      <div className={styles.kpiIcon}>
        <Icon aria-hidden="true" />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </article>
  );
}

export function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.dataSection}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  text = "Nenhum dado encontrado para os filtros selecionados.",
}: {
  text?: string;
}) {
  return (
    <div className={styles.emptyState}>
      <FiInbox aria-hidden="true" />
      <strong>Sem dados para exibir</strong>
      <span>{text}</span>
    </div>
  );
}

export { styles as reportStyles };
