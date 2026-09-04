"use client";

import Head from "next/head";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Affiliate,
  criarCampanha,
  getApiErrorMessage,
  listarAfiliados,
} from "@/lib/api";
import conteine from "@/styles/components.module.css";
import styles from "./menu.module.css";

const defaultLandingPageUrl =
  process.env.NEXT_PUBLIC_LANDING_PAGE_URL || "";

export default function CriarProjetos() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [destinationUrl, setDestinationUrl] = useState(defaultLandingPageUrl);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [selectedAffiliateIds, setSelectedAffiliateIds] = useState<number[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeAffiliates = useMemo(
    () => affiliates.filter((affiliate) => affiliate.active),
    [affiliates]
  );

  const allSelected =
    activeAffiliates.length > 0 &&
    selectedAffiliateIds.length === activeAffiliates.length;

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

  function toggleAffiliate(id: number) {
    setSelectedAffiliateIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleAllAffiliates() {
    setSelectedAffiliateIds(
      allSelected
        ? []
        : activeAffiliates.map((affiliate) => affiliate.id)
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!name.trim() || !destinationUrl.trim()) {
      setError("Informe o nome da campanha e a URL de destino.");
      return;
    }

    if (selectedAffiliateIds.length === 0) {
      setError("Selecione pelo menos um afiliado.");
      return;
    }

    setSubmitting(true);

    try {
      const campaign = await criarCampanha({
        name: name.trim(),
        destinationUrl: destinationUrl.trim(),
        affiliateIds: selectedAffiliateIds,
      });

      setMessage(
        `Campanha criada com ${campaign.totalLinks} links de divulgação.`
      );
      setName("");
      setDestinationUrl(defaultLandingPageUrl);
      setSelectedAffiliateIds([]);
      router.push("/campanhas");
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Não foi possível criar a campanha."
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={conteine.contreine}>
      <div className={styles.menu}>
        <Head>
          <title>Criar campanha</title>
        </Head>

        <h1>Criar campanha</h1>

        <form className={styles.conteiner} onSubmit={handleSubmit}>
          <div className={styles.fieldBlock}>
            <label htmlFor="campaign-name">Nome da campanha</label>
            <input
              id="campaign-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Fibra 600 Mega - Julho"
            />
          </div>

          <div className={styles.fieldBlock}>
            <label htmlFor="destination-url">URL de destino</label>
            <input
              id="destination-url"
              type="url"
              value={destinationUrl}
              onChange={(event) => setDestinationUrl(event.target.value)}
              placeholder={
                defaultLandingPageUrl || "https://netbox.com.br/oferta"
              }
            />
          </div>

          <div className={styles.groupHeader}>
            <div>
              <strong>Grupo de afiliados</strong>
              <p>
                Cada afiliado selecionado recebe um link de divulgação único.
              </p>
            </div>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={toggleAllAffiliates}
              disabled={loadingAffiliates || activeAffiliates.length === 0}
            >
              {allSelected ? "Limpar seleção" : "Selecionar todos"}
            </button>
          </div>

          {loadingAffiliates ? (
            <p>Carregando afiliados...</p>
          ) : activeAffiliates.length === 0 ? (
            <p>Nenhum afiliado ativo encontrado.</p>
          ) : (
            <div className={styles.affiliateGrid}>
              {activeAffiliates.map((affiliate) => (
                <label
                  key={affiliate.id}
                  className={styles.affiliateOption}
                >
                  <input
                    type="checkbox"
                    checked={selectedAffiliateIds.includes(affiliate.id)}
                    onChange={() => toggleAffiliate(affiliate.id)}
                  />

                  <span>
                    <strong>{affiliate.name}</strong>
                    <small>
                      {affiliate.email ?? "Sem e-mail"}
                      {affiliate.city ? ` • ${affiliate.city}` : ""}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className={styles.button}>
            <button type="submit" disabled={submitting}>
              {submitting ? "Criando campanha..." : "Criar campanha"}
            </button>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className={styles.success} role="status">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
