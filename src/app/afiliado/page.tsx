"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import styles from "./menu.module.css";
import workspaceStyles from "@/app/configuracoes/configuracoes.module.css";
import conteine from "@/styles/components.module.css";
import {
  Affiliate,
  ClickRankingItem,
  City,
  apagarAfiliado,
  criarAfiliado,
  editarAfiliado,
  getApiErrorMessage,
  listarAfiliados,
  listarCidadesTocantins,
  obterRankingCliques,
} from "@/lib/api";
import { notify } from "@/lib/notifications/notify";

type PhotoCrop = { target: "new" | "edit"; source: string; imageWidth: number; imageHeight: number; zoom: number; offsetX: number; offsetY: number };

export default function Afiliado({ view = "home" }: { view?: "home" | "new" | "edit" }) {
  const query = useSearchParams();
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
  const [profileSearch, setProfileSearch] = useState("");
  const [workspaceMode, setWorkspaceMode] = useState<"choose" | "search">(() => view === "edit" ? "search" : "choose");
  const [photoUrl, setPhotoUrl] = useState("");
  const [editPhotoUrl, setEditPhotoUrl] = useState("");
  const [photoCrop, setPhotoCrop] = useState<PhotoCrop | null>(null);
  const [monthlyRanking, setMonthlyRanking] = useState<ClickRankingItem[]>([]);
  const photoDragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

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
    if (view !== "home") return;
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    void obterRankingCliques({ startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) })
      .then((items) => setMonthlyRanking(items.slice(0, 3)))
      .catch(() => setMonthlyRanking([]));
  }, [view]);

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

  function selectPhoto(file: File | undefined, target: "new" | "edit") {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setError("Envie uma imagem de até 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || "");
      const image = new Image();
      image.onload = () => setPhotoCrop({ target, source, imageWidth: image.naturalWidth, imageHeight: image.naturalHeight, zoom: 1, offsetX: 0, offsetY: 0 });
      image.onerror = () => setError("Não foi possível abrir a imagem.");
      image.src = source;
    };
    reader.onerror = () => setError("Não foi possível ler a imagem.");
    reader.readAsDataURL(file);
  }

  function updatePhotoCrop(changes: Partial<Pick<PhotoCrop, "zoom" | "offsetX" | "offsetY">>) {
    setPhotoCrop((current) => {
      if (!current) return current;
      const next = { ...current, ...changes };
      const baseScale = Math.max(512 / next.imageWidth, 512 / next.imageHeight);
      const limitX = Math.max(0, (next.imageWidth * baseScale * next.zoom - 512) / 2);
      const limitY = Math.max(0, (next.imageHeight * baseScale * next.zoom - 512) / 2);
      return { ...next, offsetX: Math.min(Math.max(next.offsetX, -limitX), limitX), offsetY: Math.min(Math.max(next.offsetY, -limitY), limitY) };
    });
  }

  async function confirmPhotoCrop() {
    if (!photoCrop) return;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) return;
      const scale = Math.max(512 / image.width, 512 / image.height) * photoCrop.zoom;
      const width = image.width * scale; const height = image.height * scale;
      context.drawImage(image, (512 - width) / 2 + photoCrop.offsetX, (512 - height) / 2 + photoCrop.offsetY, width, height);
      const result = canvas.toDataURL("image/jpeg", 0.88);
      photoCrop.target === "new" ? setPhotoUrl(result) : setEditPhotoUrl(result);
      setPhotoCrop(null);
    };
    image.onerror = () => setError("Não foi possível ajustar a imagem.");
    image.src = photoCrop.source;
  }

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
        photoUrl: photoUrl || undefined,
      });

      setAffiliates((current) => [createdAffiliate, ...current]);
      setName("");
      setPhone("");
      setEmail("");
      setCity(cities[0]?.name ?? "");
      setPhotoUrl("");
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
    setProfileSearch("");
    setWorkspaceMode("search");
    setEditingId(affiliate.id);
    setEditName(affiliate.name);
    setEditPhone(affiliate.phone ?? "");
    setEditEmail(affiliate.email ?? "");
    setEditCity(affiliate.city ?? cities[0]?.name ?? "");
    setEditPhotoUrl(affiliate.photoUrl ?? "");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setProfileSearch("");
    setWorkspaceMode("search");
    setEditName("");
    setEditPhone("");
    setEditEmail("");
    setEditCity("");
    setEditPhotoUrl("");
  }

  useEffect(() => {
    if (view !== "edit" || editingId || !affiliates.length) return;
    const affiliateId = Number(query.get("affiliateId"));
    const affiliate = affiliates.find((item) => item.id === affiliateId);
    if (!affiliate) return;
    const timer = window.setTimeout(() => {
      setEditingId(affiliate.id);
      setEditName(affiliate.name);
      setEditPhone(affiliate.phone ?? "");
      setEditEmail(affiliate.email ?? "");
      setEditCity(affiliate.city ?? cities[0]?.name ?? "");
      setEditPhotoUrl(affiliate.photoUrl ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [affiliates, cities, editingId, query, view]);

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
        photoUrl: editPhotoUrl || undefined,
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
      const result = await apagarAfiliado(affiliate.id, { notify: false });
      setAffiliates((current) => current.filter((item) => item.id !== affiliate.id));

      if (editingId === affiliate.id) {
        handleCancelEdit();
      }

      const deleteMessage = result.archived
        ? "O afiliado foi arquivado e o histórico vinculado foi preservado."
        : "O afiliado foi removido do banco de dados.";
      setMessage(deleteMessage);
      notify.success({
        title: result.archived ? "Afiliado arquivado" : "Afiliado removido",
        message: deleteMessage,
        context: "affiliate-deleted",
        source: "ui",
      });
    } catch (err) {
      const deleteError = getApiErrorMessage(err, "Não foi possível apagar o afiliado.");
      setError(deleteError);
      notify.error({
        title: "Falha ao apagar afiliado",
        message: deleteError,
        context: "generic",
        source: "ui",
      });
      await refreshAffiliates();
    } finally {
      setDeletingId(null);
    }
  }

  const affiliatesById = new Map(affiliates.map((affiliate) => [affiliate.id, affiliate]));
  const rankedMonthlyAffiliates = monthlyRanking.map((item) => ({ id: item.affiliateId, name: item.affiliateName, photoUrl: item.avatar || affiliatesById.get(item.affiliateId)?.photoUrl || null, clicks: item.clicks }));
  const monthlyPodium = rankedMonthlyAffiliates.slice(0, 3);

  if (view === "home") {
    return (
      <main className={`${conteine.contreine} ${styles.glassShell} ${styles.celebrationShell}`}>
        <span className={styles.celebrationOverlay} aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => <i key={index} />)}
        </span>
        <section className={`${workspaceStyles.profileSearchWorkspace} ${styles.affiliateStartWorkspace}`}>
          <div className={workspaceStyles.profileSearchHeader}>
            <div><span>Afiliados</span><h2>O que deseja fazer?</h2></div>
          </div>
          <p className={styles.affiliateStartText}>Escolha uma opção para continuar.</p>
          <div className={styles.affiliateStartOptions}>
            <Link href="/afiliado/novo"><span>Cadastrar</span><strong>+</strong><small>Novo afiliado</small></Link>
            <Link href="/afiliado/editar"><span>Editar</span><strong>⌕</strong><small>Pesquisar afiliado</small></Link>
          </div>
          {monthlyPodium.length > 0 && <section className={styles.monthlyRanking} aria-label="Afiliado do mês">
            <header><span>DESTAQUE DO MÊS</span><h3>Afiliado do mês</h3></header>
            <div className={styles.podium}>
              {[monthlyPodium[1], monthlyPodium[0], monthlyPodium[2]].filter(Boolean).map((affiliate, index) => {
                const position = index === 0 ? 2 : index === 1 ? 1 : 3;
                return <Link key={affiliate.id} href={`/links-campanhas/relatorios/link?period=30&affiliateId=${affiliate.id}`} className={`${styles.podiumItem} ${position === 1 ? styles.podiumWinner : ""}`} aria-label={`Ver relatório de ${affiliate.name}`}><span className={styles.podiumPosition}>{position}º</span><span className={styles.podiumAvatar}>{affiliate.photoUrl ? <img src={affiliate.photoUrl} alt="" /> : affiliate.name.slice(0, 1).toUpperCase()}</span><strong>{affiliate.name}</strong>{affiliate.clicks > 0 && <small>{affiliate.clicks} cliques</small>}</Link>;
              })}
            </div>
          </section>}
        </section>
      </main>
    );
  }

  return (
    <div className={`${conteine.contreine} ${styles.glassShell}`}>
      <div className={`${styles.affiliatePageLayout} ${view === "edit" ? styles.affiliateEditLayout : view === "new" ? styles.affiliateNewLayout : ""}`}>
      <div className={`${styles.glassPage} ${view === "edit" ? styles.hiddenEditSource : ""}`}>
        {view === "new" ? <header className={styles.newAffiliateHeader}><span>Afiliados</span><h2>Cadastrar novo afiliado</h2><p>Crie um perfil completo para organizar links, campanhas e resultados.</p></header> : <h2>Editar afiliado</h2>}

        {view === "new" && <form id="affiliate-create-form" className={styles.newAffiliateForm} onSubmit={handleSubmit}>
          <label className={styles.photoField}><span>{photoUrl ? <img src={photoUrl} alt="Prévia da foto" /> : "A"}</span><b>Foto do afiliado</b><input type="file" accept="image/*" onChange={(event) => selectPhoto(event.target.files?.[0], "new")} />{photoUrl && <button type="button" onClick={() => setPhotoUrl("")}>Remover foto</button>}</label>
          <label className={styles.field}><span>Nome completo</span><input
            id="affiliate-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Mariana Costa"
            autoComplete="name"
          /></label>

          <div className={styles.row}>
            <div className={styles.field}>
              <label>Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(63) 99999-9999"
                autoComplete="tel"
              />
            </div>

            <div className={styles.field}>
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@empresa.com"
                autoComplete="email"
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

          {error && <p role="alert" style={{ color: "#b00020" }}>{error}</p>}
          {message && <p role="status" style={{ color: "#137333" }}>{message}</p>}
        </form>}

        {view === "edit" && <div style={{ marginTop: 24 }}>
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
                  {false ? (
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
                    {false ? (
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
        </div>}
      </div>
      {view === "edit" && <aside className={`${workspaceStyles.profileSearchWorkspace} ${styles.affiliateEditorWorkspace}`}>
        {editingId ? (
          <>
            <div className={workspaceStyles.profileSearchHeader}>
              <div><span>Editar afiliado</span><h2>{editName || "Perfil do afiliado"}</h2></div>
            </div>
            <div className={`${workspaceStyles.editGrid} ${styles.affiliateEditForm}`}>
              <label className={styles.photoField}><span>{editPhotoUrl ? <img src={editPhotoUrl} alt="Prévia da foto" /> : editName.slice(0, 1).toUpperCase()}</span><b>Foto do afiliado</b><input type="file" accept="image/*" onChange={(event) => selectPhoto(event.target.files?.[0], "edit")} />{editPhotoUrl && <button type="button" onClick={() => setEditPhotoUrl("")}>Remover foto</button>}</label>
              <label className={workspaceStyles.field}><span>Nome</span><input value={editName} onChange={(event) => setEditName(event.target.value)} /></label>
              <label className={workspaceStyles.field}><span>E-mail</span><input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} /></label>
              <label className={workspaceStyles.field}><span>Telefone</span><input value={editPhone} onChange={(event) => setEditPhone(event.target.value)} /></label>
              <label className={workspaceStyles.field}><span>Cidade</span><select value={editCity} onChange={(event) => setEditCity(event.target.value)} disabled={loadingCities}>{loadingCities && <option>Carregando cidades...</option>}{!loadingCities && cities.length === 0 && <option>Nenhuma cidade encontrada</option>}{cities.map((cidade) => <option key={cidade.id} value={cidade.name}>{cidade.name}</option>)}</select></label>
            </div>
            <div className={workspaceStyles.formActions}>
              <button type="button" className={workspaceStyles.secondaryButton} onClick={handleCancelEdit} disabled={savingId === editingId}>Cancelar</button>
              <button type="button" className={workspaceStyles.dangerButton} onClick={() => { const affiliate = affiliates.find((item) => item.id === editingId); if (affiliate) void handleDelete(affiliate); }} disabled={savingId === editingId || deletingId === editingId}>{deletingId === editingId ? "Apagando..." : "Excluir afiliado"}</button>
              <button type="button" className={workspaceStyles.primaryButton} onClick={() => handleSaveEdit(editingId)} disabled={savingId === editingId}>{savingId === editingId ? "Salvando..." : "Salvar alterações"}</button>
            </div>
          </>
        ) : workspaceMode === "choose" ? (
          <>
            <div className={workspaceStyles.profileSearchHeader}>
              <div><span>Afiliados</span><h2>O que deseja fazer?</h2></div>
            </div>
            <div className={workspaceStyles.profileStats}>
              <button type="button" onClick={() => { document.getElementById("affiliate-create-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); window.setTimeout(() => document.getElementById("affiliate-name")?.focus(), 350); }}><span>Cadastrar</span><strong>+</strong><small>Novo afiliado</small></button>
              <button type="button" onClick={() => setWorkspaceMode("search")}><span>Editar</span><strong>{affiliates.length}</strong><small>Pesquisar afiliado</small></button>
            </div>
          </>
        ) : (
          <>
            <div className={workspaceStyles.profileSearchHeader}>
              <div><span>Editar cadastros</span><h2>Pesquisar afiliado</h2></div>
              <strong>{affiliates.length} perfis</strong>
            </div>
            <label className={workspaceStyles.profileEditSearch}>
              <input value={profileSearch} onChange={(event) => setProfileSearch(event.target.value)} placeholder="Encontre o afiliado" aria-label="Buscar afiliado para editar" />
            </label>
            <div className={styles.affiliateShortcutGrid}>
              {affiliates.filter((affiliate) => `${affiliate.name} ${affiliate.email || ""} ${affiliate.phone || ""} ${affiliate.city || ""}`.toLocaleLowerCase("pt-BR").includes(profileSearch.trim().toLocaleLowerCase("pt-BR"))).map((affiliate) => (
                <button key={affiliate.id} type="button" className={styles.affiliateShortcut} onClick={() => handleStartEdit(affiliate)} aria-label={`Editar ${affiliate.name}`}>
                  <span>{affiliate.photoUrl ? <img src={affiliate.photoUrl} alt="" /> : affiliate.name.slice(0, 1).toUpperCase()}</span>
                  <strong>{affiliate.name}</strong>
                </button>
              ))}
              {!loading && affiliates.length === 0 && <p className={styles.affiliateShortcutEmpty}>Nenhum afiliado cadastrado ainda.</p>}
            </div>
            {profileSearch.trim() ? (
              <div className={workspaceStyles.profileResultList}>
                {affiliates.filter((affiliate) => `${affiliate.name} ${affiliate.email || ""} ${affiliate.phone || ""} ${affiliate.city || ""}`.toLocaleLowerCase("pt-BR").includes(profileSearch.trim().toLocaleLowerCase("pt-BR"))).map((affiliate) => (
                  <button key={affiliate.id} type="button" className={workspaceStyles.profileResultButton} onClick={() => handleStartEdit(affiliate)}>
                    <span className={styles.searchAffiliateAvatar}>{affiliate.photoUrl ? <img src={affiliate.photoUrl} alt="" /> : affiliate.name.slice(0, 1).toUpperCase()}</span>
                    <div className={workspaceStyles.profileResultText}><span className={workspaceStyles.profileBadge}>Afiliado</span><strong>{affiliate.name}</strong><small>{affiliate.email || "Sem e-mail"}</small><small>{affiliate.city || "Sem cidade"}</small></div>
                  </button>
                ))}
                {!affiliates.some((affiliate) => `${affiliate.name} ${affiliate.email || ""} ${affiliate.phone || ""} ${affiliate.city || ""}`.toLocaleLowerCase("pt-BR").includes(profileSearch.trim().toLocaleLowerCase("pt-BR"))) && <div className={workspaceStyles.profileEmpty}><strong>Nenhum afiliado encontrado</strong><span>Tente nome, e-mail, telefone ou cidade.</span></div>}
              </div>
            ) : <div className={workspaceStyles.profileEmpty}><strong>Pesquise antes de editar</strong><span>Digite nome, e-mail, telefone ou cidade para encontrar um afiliado.</span></div>}
          </>
        )}
      </aside>}
      {photoCrop && <div className={workspaceStyles.photoCropOverlay} role="dialog" aria-modal="true" aria-label="Ajustar e cortar imagem">
        <div className={workspaceStyles.photoCropModal}>
          <div className={workspaceStyles.photoCropHeader}><div><span>Foto do perfil</span><strong>Ajustar e cortar imagem</strong></div><button type="button" onClick={() => setPhotoCrop(null)} aria-label="Fechar">×</button></div>
          <div className={workspaceStyles.photoCropPreview}><img src={photoCrop.source} alt="Prévia da foto" draggable={false} style={{ transform: `translate(${(photoCrop.offsetX / 512) * 100}%, ${(photoCrop.offsetY / 512) * 100}%) scale(${photoCrop.zoom})` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); photoDragStart.current = { x: event.clientX, y: event.clientY, offsetX: photoCrop.offsetX, offsetY: photoCrop.offsetY }; }} onPointerMove={(event) => { const drag = photoDragStart.current; if (!drag) return; const size = event.currentTarget.parentElement?.clientWidth || 320; updatePhotoCrop({ offsetX: drag.offsetX + (event.clientX - drag.x) * (512 / size), offsetY: drag.offsetY + (event.clientY - drag.y) * (512 / size) }); }} onPointerUp={() => { photoDragStart.current = null; }} onPointerCancel={() => { photoDragStart.current = null; }} /></div>
          <div className={workspaceStyles.photoCropControls}><label>Zoom ({Math.round(photoCrop.zoom * 100)}%)<input type="range" min="1" max="3" step="0.05" value={photoCrop.zoom} onChange={(event) => updatePhotoCrop({ zoom: Number(event.target.value) })} /></label><small>Arraste a imagem para posicioná-la dentro do círculo.</small></div>
          <div className={workspaceStyles.photoCropActions}><button type="button" className={workspaceStyles.secondaryButton} onClick={() => updatePhotoCrop({ zoom: 1, offsetX: 0, offsetY: 0 })}>Centralizar</button><button type="button" className={workspaceStyles.secondaryButton} onClick={() => setPhotoCrop(null)}>Cancelar</button><button type="button" className={workspaceStyles.primaryButton} onClick={() => void confirmPhotoCrop()}>Confirmar ajuste</button></div>
        </div>
      </div>}
      </div>
    </div>
  );
}
