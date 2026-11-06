import Image from "next/image";
import { CgArrowRightO } from "react-icons/cg";
import styles from "./FooterCredits.module.css";

const portfolioUrl = "https://matheuslufano.github.io/Meu-Portfolio/";

/** Campaign credits: the portfolio card opens on pointer hover and keyboard focus. */
export function FooterCredits({
  product = "Netbox Internet",
  adaptive = false,
}: {
  product?: string;
  adaptive?: boolean;
}) {
  return (
    <div
      className={styles.credits}
      data-ui="footer-credits"
      data-adaptive={adaptive}
    >
      <span>
        © {new Date().getFullYear()} {product}. Todos os direitos reservados a
        Netbox Internet Ltda.
      </span>
      <span className={styles.credit}>
        Site desenvolvido por{" "}
        <span className={styles.portfolio}>
          <a
            className={styles.link}
            href={portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-ui="footer-portfolio-link"
          >
            <strong>@Matheus Mota 🧑‍💻</strong>
          </a>
          <a
            className={styles.preview}
            href={portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={-1}
            aria-hidden="true"
            data-ui="footer-portfolio-preview"
          >
            <Image
              className={styles.image}
              src="/images/matheus/portfolio-preview.png"
              alt=""
              width={320}
              height={180}
            />
            <span className={styles.previewContent}>
              <strong>Matheus Mota</strong>
              <span>Desenvolvedor Web · UI/UX</span>
              <span className={styles.action}>
                Conheça meu portfólio <CgArrowRightO aria-hidden="true" />
              </span>
            </span>
          </a>
        </span>
      </span>
    </div>
  );
}
