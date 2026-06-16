"use client";

import Head from "next/head";
import { useEffect, useState } from "react";
import {
  FiCopy,
  FiDownload,
  FiExternalLink,
  FiEye,
  FiLink,
  FiRefreshCw,
  FiTag,
  FiUser,
  FiX,
} from "react-icons/fi";
import {
  Affiliate,
  LinkItem,
  criarLink,
  getApiErrorMessage,
  listarAfiliados,
  listarLinks,
} from "@/lib/api";
import { formatDisplayLink } from "@/lib/links";
import conteine from "@/styles/components.module.css";
import styles from "./links.module.css";

const defaultLandingPageUrl =
  process.env.NEXT_PUBLIC_LANDING_PAGE_URL || "";

export default function Links() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState(defaultLandingPageUrl);
  const [affiliateId, setAffiliateId] = useState("");
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [linksModalOpen, setLinksModalOpen] = useState(false);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAffiliates() {
      try {
        const data = await listarAfiliados();
        if (!cancelled) {
          setAffiliates(data);
        }
      } catch {
        if (!cancelled) {
          setAffiliates([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAffiliates(false);
        }
      }
    }

    loadAffiliates();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedLink(null);
    setCopyHint(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Informe a URL de destino.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: {
        name?: string;
        url: string;
        affiliateId?: number;
      } = {
        url: trimmed,
      };

      if (name.trim()) {
        payload.name = name.trim();
      }

      if (affiliateId !== "") {
        payload.affiliateId = Number(affiliateId);
      }

      const data = await criarLink(payload);
      setCreatedLink(data.link);
      setName("");
      setUrl(defaultLandingPageUrl);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Nao foi possivel criar o link. Tente novamente."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!createdLink) return;

    try {
      await navigator.clipboard.writeText(createdLink);
      setCopyHint("Copiado para a area de transferencia.");
    } catch {
      setCopyHint("Nao foi possivel copiar automaticamente.");
    }
  }

  async function loadLinks() {
    setLoadingLinks(true);
    setLinksError(null);

    try {
      const data = await listarLinks();
      setLinks(data);
    } catch (err) {
      setLinksError(
        getApiErrorMessage(
          err,
          "Nao foi possivel carregar os links criados."
        )
      );
    } finally {
      setLoadingLinks(false);
    }
  }

  async function openLinksModal() {
    setLinksModalOpen(true);
    await loadLinks();
  }

  async function copyStoredLink(link: LinkItem) {
    try {
      await navigator.clipboard.writeText(link.promoLink);
      setCopiedLinkId(link.id);
      window.setTimeout(() => setCopiedLinkId(null), 2000);
    } catch {
      setLinksError("Nao foi possivel copiar o link.");
    }
  }

  async function downloadQrCode(link: LinkItem) {
    try {
      const fileName = buildQrCodeFileName(link);
      const anchor = document.createElement("a");
      let objectUrl: string | null = null;

      if (link.qrCode.startsWith("data:")) {
        anchor.href = link.qrCode;
      } else {
        const response = await fetch(link.qrCode);
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        anchor.href = objectUrl;
      }

      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    } catch {
      setLinksError("Nao foi possivel baixar o QR code.");
    }
  }

  return (
    <div className={conteine.contreine}>
      <div className={styles.page}>
        <Head>
          <title>Criador de links</title>
        </Head>

        <header className={styles.header}>
          <span className={styles.badge}>Links e QR</span>
          <h1>Crie rapido um link de afiliado</h1>
          <p>
            Nomeie campanhas, escolha um afiliado e gere um link curto para
            acompanhar resultados no relatorio.
          </p>
        </header>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <FiLink aria-hidden="true" />
            </div>

            <div>
              <h2>Novo link encurtado</h2>
              <p>Preencha os dados abaixo para criar um link rastreavel.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field} htmlFor="link-name">
              <span>
                <FiTag aria-hidden="true" />
                Nome do link
              </span>
              <input
                id="link-name"
                type="text"
                name="name"
                placeholder="Ex: Plano familia - Maio"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </label>

            <label className={styles.field} htmlFor="dest-url">
              <span>
                <FiExternalLink aria-hidden="true" />
                URL de destino
              </span>
              <input
                id="dest-url"
                type="url"
                name="url"
                placeholder={
                  defaultLandingPageUrl || "https://exemplo.com/pagina"
                }
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
              />
            </label>

            <label className={styles.field} htmlFor="affiliate">
              <span>
                <FiUser aria-hidden="true" />
                Afiliado
              </span>
              <select
                id="affiliate"
                value={affiliateId}
                onChange={(e) => setAffiliateId(e.target.value)}
                disabled={loadingAffiliates}
              >
                <option value="">
                  {loadingAffiliates ? "Carregando afiliados..." : "Nenhum"}
                </option>
                {affiliates.map((affiliate) => (
                  <option key={affiliate.id} value={String(affiliate.id)}>
                    {affiliate.name}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.actions}>
              <button
                type="submit"
                disabled={submitting}
                className={styles.primaryButton}
              >
                <FiLink aria-hidden="true" />
                {submitting ? "Gerando..." : "Gerar link"}
              </button>
            </div>
                      <button
            type="button"
            className={styles.viewLinksButton}
            onClick={openLinksModal}
          >
            <FiEye aria-hidden="true" />
            Ver links criados
          </button>
          </form>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {createdLink && (
            <div className={styles.result}>
              <div className={styles.resultText}>
                <span>Seu link</span>
                <a href={createdLink} target="_blank" rel="noopener noreferrer">
                  {formatDisplayLink(createdLink)}
                </a>
                <small title={createdLink}>
                  Link completo preservado ao copiar
                </small>
              </div>

              <button
                type="button"
                onClick={copyLink}
                className={styles.copyButton}
              >
                <FiCopy aria-hidden="true" />
                Copiar
              </button>

              {copyHint && (
                <p className={styles.copyHint}>{copyHint}</p>
              )}
            </div>
          )}
        </section>

        {linksModalOpen && (
          <div className={styles.modalBackdrop}>
            <section
              className={styles.linksModal}
              aria-labelledby="created-links-title"
            >
              <div className={styles.modalHeader}>
                <div>
                  <span className={styles.badge}>Biblioteca</span>
                  <h2 id="created-links-title">
                    Links criados
                  </h2>
                  <p>
                    Veja, copie, abra e use o QR code de cada link de divulgacao.
                  </p>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={loadLinks}
                    disabled={loadingLinks}
                    aria-label="Atualizar links"
                  >
                    <FiRefreshCw aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => setLinksModalOpen(false)}
                    aria-label="Fechar"
                  >
                    <FiX aria-hidden="true" />
                  </button>
                </div>
              </div>

              {linksError && (
                <p className={styles.error} role="alert">
                  {linksError}
                </p>
              )}

              {loadingLinks ? (
                <p className={styles.loadingText}>Carregando links...</p>
              ) : links.length === 0 ? (
                <div className={styles.emptyLinks}>
                  <strong>Nenhum link criado.</strong>
                  <p>Gere um link para ele aparecer nesta lista.</p>
                </div>
              ) : (
                <div className={styles.linksGrid}>
                  {links.map((link) => (
                    <article key={link.id} className={styles.linkCard}>
                      <div className={styles.linkCardBody}>
                        <div className={styles.linkMeta}>
                          <strong>{link.name || "Link sem nome"}</strong>
                          <span>
                            {link.affiliate?.name ?? "Sem afiliado"} |{" "}
                            {link.clicks} clique{link.clicks === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className={styles.linkGroup}>
                          <span>Divulgacao</span>
                          <a
                            href={link.promoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={link.promoLink}
                          >
                            {formatDisplayLink(link.promoLink)}
                          </a>
                        </div>

                        <div className={styles.linkGroup}>
                          <span>Destino</span>
                          <a
                            href={link.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={link.originalUrl}
                          >
                            {formatDisplayLink(link.originalUrl)}
                          </a>
                        </div>

                        <div className={styles.linkActions}>
                          <a
                            href={link.promoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.secondaryButton}
                          >
                            Ver
                          </a>
                          <button
                            type="button"
                            className={styles.copyButton}
                            onClick={() => copyStoredLink(link)}
                          >
                            <FiCopy aria-hidden="true" />
                            {copiedLinkId === link.id ? "Copiado" : "Copiar"}
                          </button>
                        </div>
                      </div>

                      <div className={styles.qrBox}>
                        <img
                          src={link.qrCode}
                          alt={`QR code do link ${link.name || link.shortCode}`}
                        />
                        <span>QR code</span>
                        <button
                          type="button"
                          className={styles.qrDownloadButton}
                          onClick={() => downloadQrCode(link)}
                        >
                          <FiDownload aria-hidden="true" />
                          Baixar QR
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function buildQrCodeFileName(link: LinkItem) {
  const label = link.name || link.affiliate?.name || link.shortCode;
  const safeLabel = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `qr-code-${safeLabel || link.id}.png`;
}
