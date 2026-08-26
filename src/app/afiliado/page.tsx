"use client";

import { useEffect, useState } from "react";
import styles from "./menu.module.css";
import conteine from "@/styles/components.module.css";
import {
  Affiliate,
  City,
  apagarAfiliado,
  criarAfiliado,
  editarAfiliado,
  getApiErrorMessage,
  listarAfiliados,
  listarCidadesTocantins,
} from "@/lib/api";

export default function Afiliado() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCity, setEditCity] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAffiliates, setShowAffiliates] = useState(false);

  async function refreshAffiliates() {
    setLoading(true);
    try {
      const data = await listarAfiliados();
      setAffiliates(data);
    } catch {
      setAffiliates([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialAffiliates() {
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
          setLoading(false);
        }
      }
    }

    loadInitialAffiliates();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCities() {
      try {
        const list = await listarCidadesTocantins();
        if (!cancelled) {
          setCities(list);
          setCity(list[0]?.name ?? "");
        }
      } catch {
        if (!cancelled) {
          setCities([]);
          setCity("");
        }
      } finally {
        if (!cancelled) {
          setLoadingCities(false);
        }
      }
    }

    loadCities();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!name.trim() || !email.trim()) {
      setError("Nome e e-mail são obrigatorios.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailAlreadyExists = affiliates.some(
      (affiliate) => affiliate.email?.toLowerCase() === normalizedEmail,
    );

    if (emailAlreadyExists) {
      setError("E-mail já cadastrado.");
      return;
    }

    setSubmitting(true);
    try {
      const createdAffiliate = await criarAfiliado({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
      });

      setAffiliates((current) => [createdAffiliate, ...current]);
      setName("");
      setPhone("");
      setEmail("");
      setCity(cities[0]?.name ?? "");
      setMessage("Afiliado criado com sucesso.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível criar o afiliado."));
    } finally {
      setSubmitting(false);
    }
  }

  function handleStartEdit(affiliate: Affiliate) {
    setError(null);
    setMessage(null);
    setEditingId(affiliate.id);
    setEditName(affiliate.name);
    setEditPhone(affiliate.phone ?? "");
    setEditEmail(affiliate.email ?? "");
    setEditCity(affiliate.city ?? cities[0]?.name ?? "");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditPhone("");
    setEditEmail("");
    setEditCity("");
  }

  async function handleSaveEdit(id: number) {
    setError(null);
    setMessage(null);

    if (!editName.trim() || !editEmail.trim()) {
      setError("Nome e e-mail são obrigatorios.");
      return;
    }

    const normalizedEmail = editEmail.trim().toLowerCase();
    const emailAlreadyExists = affiliates.some(
      (affiliate) =>
        affiliate.id !== id &&
        affiliate.email?.toLowerCase() === normalizedEmail,
    );

    if (emailAlreadyExists) {
      setError("E-mail já cadastrado.");
      return;
    }

    setSavingId(id);
    try {
      const updatedAffiliate = await editarAfiliado(id, {
        name: editName.trim(),
        email: normalizedEmail,
        phone: editPhone.trim() || undefined,
        city: editCity.trim() || undefined,
      });

      setAffiliates((current) =>
        current.map((affiliate) =>
          affiliate.id === id ? updatedAffiliate : affiliate,
        ),
      );
      handleCancelEdit();
      setMessage("Afiliado atualizado com sucesso.");
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível atualizar o afiliado."),
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(affiliate: Affiliate) {
    setError(null);
    setMessage(null);

    const confirmed = window.confirm(`Apagar o afiliado ${affiliate.name}?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(affiliate.id);
    try {
      await apagarAfiliado(affiliate.id);
      setAffiliates((current) =>
        current.filter((item) => item.id !== affiliate.id),
      );

      if (editingId === affiliate.id) {
        handleCancelEdit();
      }

      setMessage("Afiliado apagado com sucesso.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível apagar o afiliado."));
      await refreshAffiliates();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className={`${conteine.contreine} ${styles.glassShell}`}>
      <div className={styles.glassPage}>
        <h2>Cadastro de afiliados</h2>

        <form className={styles.conteiner} onSubmit={handleSubmit}>
          <strong>Nome do afiliado</strong>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Número</label>
              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label>e-mail</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label>Cidade</label>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                disabled={loadingCities}
              >
                {loadingCities && <option>Carregando cidades...</option>}
                {!loadingCities && cities.length === 0 && (
                  <option>Nenhuma cidade encontrada</option>
                )}
                {cities.map((cidade) => (
                  <option key={cidade.id} value={cidade.name}>
                    {cidade.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.button}>
            <button type="submit" disabled={submitting}>
              {submitting ? "Criando..." : "Criar"}
            </button>
          </div>

          {error && <p style={{ color: "#b00020" }}>{error}</p>}
          {message && <p style={{ color: "#137333" }}>{message}</p>}
        </form>

        <div className={styles.conteiner} style={{ marginTop: 24 }}>
          <div className={styles.listHeader}>
            <div>
              <strong>Afiliados cadastrados</strong>
              <p className={styles.listSummary}>
                {loading
                  ? "Carregando clientes..."
                  : `${affiliates.length} cliente${
                      affiliates.length === 1 ? "" : "s"
                    } cadastrado${affiliates.length === 1 ? "" : "s"}`}
              </p>
            </div>

            <button
              type="button"
              className={styles.showListButton}
              onClick={() => setShowAffiliates((current) => !current)}
            >
              {showAffiliates
                ? "Ocultar clientes"
                : "Mostrar todos os clientes"}
            </button>
          </div>

          {showAffiliates && loading ? (
            <p>Carregando...</p>
          ) : showAffiliates && affiliates.length === 0 ? (
            <p>Nenhum afiliado cadastrado.</p>
          ) : showAffiliates ? (
            <ul className={styles.affiliateList}>
              {affiliates.map((affiliate) => (
                <li key={affiliate.id} className={styles.affiliateItem}>
                  {editingId === affiliate.id ? (
                    <div className={styles.editGrid}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        aria-label="Nome do afiliado"
                      />

                      <input
                        type="email"
                        value={editEmail}
                        onChange={(event) => setEditEmail(event.target.value)}
                        aria-label="E-mail do afiliado"
                      />

                      <input
                        type="text"
                        value={editPhone}
                        onChange={(event) => setEditPhone(event.target.value)}
                        aria-label="Número do afiliado"
                      />

                      <select
                        value={editCity}
                        onChange={(event) => setEditCity(event.target.value)}
                        disabled={loadingCities}
                        aria-label="Cidade do afiliado"
                      >
                        {loadingCities && (
                          <option>Carregando cidades...</option>
                        )}
                        {!loadingCities && cities.length === 0 && (
                          <option>Nenhuma cidade encontrada</option>
                        )}
                        {cities.map((cidade) => (
                          <option key={cidade.id} value={cidade.name}>
                            {cidade.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className={styles.affiliateInfo}>
                      <strong>{affiliate.name}</strong>
                      <span>{affiliate.email}</span>
                      {affiliate.phone && <span>{affiliate.phone}</span>}
                      {affiliate.city && <span>{affiliate.city}</span>}
                    </div>
                  )}

                  <div className={styles.actions}>
                    {editingId === affiliate.id ? (
                      <>
                        <button
                          type="button"
                          className={styles.saveButton}
                          onClick={() => handleSaveEdit(affiliate.id)}
                          disabled={savingId === affiliate.id}
                        >
                          {savingId === affiliate.id ? "Salvando..." : "Salvar"}
                        </button>

                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={handleCancelEdit}
                          disabled={savingId === affiliate.id}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => handleStartEdit(affiliate)}
                        disabled={deletingId === affiliate.id}
                      >
                        Editar
                      </button>
                    )}

                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDelete(affiliate)}
                      disabled={
                        deletingId === affiliate.id || savingId === affiliate.id
                      }
                    >
                      {deletingId === affiliate.id ? "Apagando..." : "Apagar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
