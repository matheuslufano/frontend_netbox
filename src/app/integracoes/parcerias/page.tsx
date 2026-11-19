import Image from "next/image";
import Link from "next/link";
import { LuArrowLeft, LuArrowUpRight } from "react-icons/lu";
import styles from "./partnerships.module.css";

/** Seleção do parceiro antes de acessar a gestão da campanha. */
export default function PartnershipsPage() {
  return (
    <main id="partnerships-directory" className={styles.page}>
      <Link id="partnerships-back" href="/integracoes" className={styles.action}>
        <LuArrowLeft aria-hidden="true" /> Integrações
      </Link>
      <header className={styles.heading}>
        <p>INTEGRAÇÕES / PARCERIAS</p>
        <h1>Escolha um parceiro</h1>
        <p>Acesse o parceiro para configurar campanhas e acompanhar as participações.</p>
      </header>
      <section id="partnerships-partner-list" className={styles.partnerGrid} aria-label="Parceiros disponíveis">
        <Link id="partnership-locomotiva-open" href="/integracoes/parcerias/locomotiva" className={styles.partnerLink} data-component="partner-selector">
          <div className={styles.partnerLogo}>
            <Image src="/parcerias/locomotiva-logo.png" alt="Locomotiva Restaurante" width={1130} height={705} />
          </div>
          <div className={styles.partnerDescription}>
            <h2>Locomotiva Reserva</h2>
            <p>Campanha de inauguração do Restaurante Locomotiva.</p>
            <span>Gerenciar parceria <LuArrowUpRight aria-hidden="true" /></span>
          </div>
        </Link>
      </section>
    </main>
  );
}
