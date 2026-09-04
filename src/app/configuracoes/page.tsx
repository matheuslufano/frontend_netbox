"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Affiliate,
  ChatmixWebhookLogResponse,
  City,
  User,
  UserRole,
  apagarAfiliado,
  apagarUsuario,
  criarAfiliado,
  criarUsuario,
  editarAfiliado,
  editarUsuario,
  getApiErrorMessage,
  listarAfiliados,
  listarChatmixWebhookLogs,
  listarCidadesTocantins,
  listarUsuarios,
  listarUsuariosAtribuiveis,
} from "@/lib/api";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";
import styles from "./configuracoes.module.css";
import { FaAnglesLeft } from "react-icons/fa6";

type UserForm = {
  name: string;
  email: string;
  password: string;
  city: string;
  photoUrl: string;
  role: UserRole;
};

type AffiliateForm = {
  name: string;
  email: string;
  phone: string;
  city: string;
  active: boolean;
  photoUrl: string;
};

type ChatmixWebhookPayload = {
  id?: number | null;
  receivedAt?: string;
  attendanceId?: string | null;
  channel?: {
    name?: string | null;
    type?: string | null;
  };
  raw?: unknown;
  query?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

type ChatmixRealtimeMessage = {
  type: "chatmix-webhook";
  payload: ChatmixWebhookPayload;
  emittedAt: string;
};

type ChatmixWebhookLog = {
  id: string;
  message: ChatmixRealtimeMessage;
};

type RealtimeConnectionStatus = "connecting" | "connected" | "error";
type UserSettingsPanel = "novoUsuario" | "novoAfiliado" | "editarCadastros";
type PhotoCropTarget =
  | "newUser"
  | "newAffiliate"
  | "editUser"
  | "editAffiliate";
type PhotoCropState = {
  target: PhotoCropTarget;
  source: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
} | null;
type PhotoCropDraft = NonNullable<PhotoCropState>;
type PendingPhotoCrops = Partial<Record<PhotoCropTarget, PhotoCropDraft>>;
type SettingsSection =
  | "inicio"
  | "usuarios"
  | "ambiente"
  | "webhooks"
  | "banco"
  | "sistema";

const emptyUserForm: UserForm = {
  name: "",
  email: "",
  password: "",
  city: "",
  photoUrl: "",
  role: "USER",
};

const emptyAffiliateForm: AffiliateForm = {
  name: "",
  email: "",
  phone: "",
  city: "",
  active: true,
  photoUrl: "",
};

const chatmixRealtimeEvents: ["chatmix-webhook"] = ["chatmix-webhook"];
const userSettingsPanels: {
  id: UserSettingsPanel;
  label: string;
}[] = [
  {
    id: "editarCadastros",
    label: "Editar cadastros",
  },
  {
    id: "novoUsuario",
    label: "Cadastrar novo usuário",
  },
  {
    id: "novoAfiliado",
    label: "Cadastrar novo afiliado",
  },
];

const settingsSections: {
  id: Exclude<SettingsSection, "inicio">;
  label: string;
  helper: string;
}[] = [
  {
    id: "usuarios",
    label: "Usuários",
    helper: "Gerenciar usuários e afiliados",
  },
  {
    id: "ambiente",
    label: "Variáveis de Ambiente",
    helper: "Configurar chaves e URLs",
  },
  {
    id: "webhooks",
    label: "Webhooks Chatmix",
    helper: "Monitorar requisições",
  },
  { id: "banco", label: "Banco de dados", helper: "Acessar banco e Prisma" },
  {
    id: "sistema",
    label: "parâmetros do sistema",
    helper: "Informações do painel",
  },
];
export default function Configuracoes() {
  const [users, setUsers] = useState<User[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingProfiles, setRefreshingProfiles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingAffiliateId, setEditingAffiliateId] = useState<number | null>(
    null,
  );
  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm);
  const [affiliateForm, setAffiliateForm] =
    useState<AffiliateForm>(emptyAffiliateForm);
  const [newUser, setNewUser] = useState<UserForm>(emptyUserForm);
  const [newAffiliate, setNewAffiliate] =
    useState<AffiliateForm>(emptyAffiliateForm);
  const [chatmixLogs, setChatmixLogs] = useState<ChatmixWebhookLog[]>([]);
  const [loadingChatmixLogs, setLoadingChatmixLogs] = useState(true);
  const [chatmixConnectionStatus, setChatmixConnectionStatus] =
    useState<RealtimeConnectionStatus>("connecting");
  const [activeUserPanel, setActiveUserPanel] =
    useState<UserSettingsPanel>("novoUsuario");
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSection>("inicio");
  const [profileSearchTerm, setProfileSearchTerm] = useState("");
  const [showAllProfileResults, setShowAllProfileResults] = useState(false);
  const [profileListFilter, setProfileListFilter] = useState<
    "all" | "users" | "affiliates"
  >("all");
  const [photoCrop, setPhotoCrop] = useState<PhotoCropState>(null);
  const [pendingPhotoCrops, setPendingPhotoCrops] = useState<PendingPhotoCrops>(
    {},
  );
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);

  const activeAffiliates = useMemo(
    () => affiliates.filter((affiliate) => affiliate.active).length,
    [affiliates],
  );

  const normalizedProfileSearch = profileSearchTerm.trim().toLowerCase();
  const shouldShowProfileResults =
    showAllProfileResults || Boolean(normalizedProfileSearch);

  const filteredUsers = useMemo(() => {
    if (profileListFilter === "affiliates") {
      return [];
    }

    if (showAllProfileResults && !normalizedProfileSearch) {
      return users;
    }

    if (!normalizedProfileSearch) {
      return [];
    }

    return users.filter((user) =>
      [user.name, user.email, user.city]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedProfileSearch),
        ),
    );
  }, [normalizedProfileSearch, profileListFilter, showAllProfileResults, users]);

  const filteredAffiliates = useMemo(() => {
    if (profileListFilter === "users") {
      return [];
    }

    if (showAllProfileResults && !normalizedProfileSearch) {
      return affiliates;
    }

    if (!normalizedProfileSearch) {
      return [];
    }

    return affiliates.filter((affiliate) =>
      [affiliate.name, affiliate.email, affiliate.phone, affiliate.city]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedProfileSearch),
        ),
    );
  }, [
    affiliates,
    normalizedProfileSearch,
    profileListFilter,
    showAllProfileResults,
  ]);

  const totalFilteredProfiles =
    filteredUsers.length + filteredAffiliates.length;

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      const [usersResult, affiliatesResult, citiesResult] =
        await Promise.allSettled([
          listarUsuarios().catch(() => listarUsuariosAtribuiveis()),
          listarAfiliados(),
          listarCidadesTocantins(),
        ]);

      if (!cancelled) {
        if (usersResult.status === "fulfilled") {
          setUsers(usersResult.value);

          try {
            const storedUser = window.localStorage.getItem(
              "afiliados_netbox_user",
            );
            const storedId = storedUser
              ? Number((JSON.parse(storedUser) as { id?: unknown }).id)
              : null;
            const authenticatedUser = usersResult.value.find(
              (user) => user.id === storedId,
            );

            if (authenticatedUser) {
              setCurrentUserRole(authenticatedUser.role);
            }
          } catch {
            // Mantém o nível obtido no login quando o cadastro local é inválido.
          }
        }
        if (affiliatesResult.status === "fulfilled") {
          setAffiliates(affiliatesResult.value);
        }
        if (citiesResult.status === "fulfilled") {
          const cityList = citiesResult.value;
          setCities(cityList);
          setNewUser((current) => ({
            ...current,
            city: current.city || cityList[0]?.name || "",
          }));
          setNewAffiliate((current) => ({
            ...current,
            city: current.city || cityList[0]?.name || "",
          }));
        }

        const failures = [
          usersResult.status === "rejected" ? "usuários" : "",
          affiliatesResult.status === "rejected" ? "afiliados" : "",
          citiesResult.status === "rejected" ? "cidades" : "",
        ].filter(Boolean);

        if (failures.length > 0) {
          setError(
            `Não foi possível carregar: ${failures.join(", ")}. Tente atualizar a lista.`,
          );
        }
        setLoading(false);
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWebhookLogs() {
      try {
        const logs = await listarChatmixWebhookLogs();

        if (!cancelled) {
          setChatmixLogs(logs.map(normalizeStoredWebhookLog));
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(
              err,
              "Não foi possível carregar o histórico de webhooks.",
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingChatmixLogs(false);
        }
      }
    }

    loadWebhookLogs();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChatmixWebhookEvent = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as ChatmixRealtimeMessage;

        setChatmixLogs((current) =>
          mergeWebhookLogs(
            {
              id: String(
                message.payload.id || `${Date.now()}-${Math.random()}`,
              ),
              message,
            },
            current,
          ),
        );
      } catch {
        const fallbackMessage: ChatmixRealtimeMessage = {
          type: "chatmix-webhook",
          emittedAt: new Date().toISOString(),
          payload: {
            receivedAt: new Date().toISOString(),
            raw: event.data,
            result: {
              status: "invalid-json",
            },
          },
        };

        setChatmixLogs((current) =>
          mergeWebhookLogs(
            {
              id: `${Date.now()}-${Math.random()}`,
              message: fallbackMessage,
            },
            current,
          ),
        );
      }
    },
    [],
  );

  useRealtimeEvents(
    handleChatmixWebhookEvent,
    chatmixRealtimeEvents,
    setChatmixConnectionStatus,
  );

  function resetStatus() {
    setError(null);
    setMessage(null);
  }

  function handleProfileSearchChange(value: string) {
    setProfileSearchTerm(value);
    setShowAllProfileResults(false);
    setProfileListFilter("all");
  }

  async function handleShowAllProfiles(
    filter: "all" | "users" | "affiliates" = "all",
  ) {
    resetStatus();
    setRefreshingProfiles(true);
    setProfileSearchTerm("");
    setProfileListFilter(filter);

    try {
      const [usersResult, affiliatesResult] = await Promise.allSettled([
        listarUsuarios().catch(() => listarUsuariosAtribuiveis()),
        listarAfiliados(),
      ]);

      if (usersResult.status === "fulfilled") {
        setUsers(usersResult.value);
      }
      if (affiliatesResult.status === "fulfilled") {
        setAffiliates(affiliatesResult.value);
      }

      const failures = [
        usersResult.status === "rejected" ? "usuários" : "",
        affiliatesResult.status === "rejected" ? "afiliados" : "",
      ].filter(Boolean);

      if (failures.length > 0) {
        setError(
          `Não foi possível atualizar: ${failures.join(", ")}. Tente novamente.`,
        );
      }

      setShowAllProfileResults(true);
    } finally {
      setRefreshingProfiles(false);
    }
  }

  function backToProfileSearch() {
    clearPendingPhotoCrop("editUser");
    clearPendingPhotoCrop("editAffiliate");
    setEditingUserId(null);
    setEditingAffiliateId(null);
  }

  function startUserEdit(user: User) {
    resetStatus();
    clearPendingPhotoCrop("editUser");
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "",
      city: user.city ?? cities[0]?.name ?? "",
      photoUrl: getProfilePhotoUrl(user),
      role: user.role,
    });
  }

  function startAffiliateEdit(affiliate: Affiliate) {
    resetStatus();
    clearPendingPhotoCrop("editAffiliate");
    setEditingAffiliateId(affiliate.id);
    setAffiliateForm({
      name: affiliate.name,
      email: affiliate.email ?? "",
      phone: affiliate.phone ?? "",
      city: affiliate.city ?? cities[0]?.name ?? "",
      active: affiliate.active,
      photoUrl: getProfilePhotoUrl(affiliate),
    });
  }
  function openPhotoCropper(file: File, target: PhotoCropTarget) {
    resetStatus();

    if (!file.type.startsWith("image/")) {
      setError("Envie um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoCrop({
        target,
        source: String(reader.result || ""),
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      });
    };

    reader.readAsDataURL(file);
  }

  function removeProfilePhoto(target: PhotoCropTarget) {
    setPendingPhotoCrops((current) => {
      const next = { ...current };
      delete next[target];
      return next;
    });

    if (target === "newUser") {
      setNewUser((current) => ({ ...current, photoUrl: "" }));
    }

    if (target === "newAffiliate") {
      setNewAffiliate((current) => ({ ...current, photoUrl: "" }));
    }

    if (target === "editUser") {
      setUserForm((current) => ({ ...current, photoUrl: "" }));
    }

    if (target === "editAffiliate") {
      setAffiliateForm((current) => ({ ...current, photoUrl: "" }));
    }
  }

  function confirmPhotoCrop() {
    if (!photoCrop) {
      return;
    }

    setPendingPhotoCrops((current) => ({
      ...current,
      [photoCrop.target]: photoCrop,
    }));

    if (photoCrop.target === "newUser") {
      setNewUser((current) => ({ ...current, photoUrl: photoCrop.source }));
    }

    if (photoCrop.target === "newAffiliate") {
      setNewAffiliate((current) => ({
        ...current,
        photoUrl: photoCrop.source,
      }));
    }

    if (photoCrop.target === "editUser") {
      setUserForm((current) => ({ ...current, photoUrl: photoCrop.source }));
    }

    if (photoCrop.target === "editAffiliate") {
      setAffiliateForm((current) => ({
        ...current,
        photoUrl: photoCrop.source,
      }));
    }

    setPhotoCrop(null);
  }

  async function getProfilePhotoForSave(
    target: PhotoCropTarget,
    currentPhotoUrl: string,
  ) {
    const pendingCrop = pendingPhotoCrops[target];

    if (!pendingCrop) {
      return currentPhotoUrl;
    }

    return cropImageToDataUrl(
      pendingCrop.source,
      pendingCrop.zoom,
      pendingCrop.offsetX,
      pendingCrop.offsetY,
    );
  }

  function clearPendingPhotoCrop(target: PhotoCropTarget) {
    setPendingPhotoCrops((current) => {
      const next = { ...current };
      delete next[target];
      return next;
    });
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetStatus();

    const normalizedEmail = newUser.email.trim().toLowerCase();
    const password = newUser.password.trim();

    if (!newUser.name.trim() || !normalizedEmail || !password) {
      setError("Informe nome, e-mail e senha do usuário.");
      return;
    }

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const emailAlreadyExists = users.some(
      (user) => user.email.toLowerCase() === normalizedEmail,
    );

    if (emailAlreadyExists) {
      setError("Este e-mail já está cadastrado para outro usuário.");
      return;
    }

    setSaving(true);
    try {
      const photoUrl = await getProfilePhotoForSave(
        "newUser",
        newUser.photoUrl,
      );
      const created = await criarUsuario({
        name: newUser.name.trim(),
        email: normalizedEmail,
        password,
        city: newUser.city || undefined,
        photoUrl: photoUrl || undefined,
      });

      setUsers((current) => [
        preserveProfilePhoto(created, photoUrl),
        ...current,
      ]);
      setNewUser({
        ...emptyUserForm,
        city: cities[0]?.name ?? "",
      });
      clearPendingPhotoCrop("newUser");
      setMessage("Usuário cadastrado com sucesso.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível criar o usuário."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveUser(id: number) {
    resetStatus();

    const normalizedEmail = userForm.email.trim().toLowerCase();
    const password = userForm.password.trim();

    if (!userForm.name.trim() || !normalizedEmail) {
      setError("Nome e e-mail do usuário são obrigatorios.");
      return;
    }

    if (password && password.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const emailAlreadyExists = users.some(
      (user) => user.id !== id && user.email.toLowerCase() === normalizedEmail,
    );

    if (emailAlreadyExists) {
      setError("Este e-mail já está cadastrado para outro usuário.");
      return;
    }

    setSaving(true);
    try {
      const photoUrl = await getProfilePhotoForSave(
        "editUser",
        userForm.photoUrl,
      );
      const updated = await editarUsuario(id, {
        name: userForm.name.trim(),
        email: normalizedEmail,
        city: userForm.city || undefined,
        password: password || undefined,
        photoUrl: photoUrl || undefined,
        role: userForm.role,
      });

      if (updated.role !== userForm.role) {
        setError(
          "A API não confirmou a alteração do nível de acesso. O cadastro não foi fechado.",
        );
        return;
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === id ? preserveProfilePhoto(updated, photoUrl) : user,
        ),
      );
      setEditingUserId(null);
      clearPendingPhotoCrop("editUser");
      setMessage("Usuário atualizado com sucesso.");
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível atualizar o usuário."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(user: User) {
    resetStatus();

    const confirmed = window.confirm(
      `Apagar o usuário ${user.name}? Links criados por ele também serao removidos.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    try {
      await apagarUsuario(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setMessage("Usuário apagado com sucesso.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível apagar o usuário."));
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAffiliate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetStatus();

    if (!newAffiliate.name.trim() || !newAffiliate.email.trim()) {
      setError("Informe nome e e-mail do afiliado.");
      return;
    }

    setSaving(true);
    try {
      const photoUrl = await getProfilePhotoForSave(
        "newAffiliate",
        newAffiliate.photoUrl,
      );
      const created = await criarAfiliado({
        name: newAffiliate.name.trim(),
        email: newAffiliate.email.trim().toLowerCase(),
        phone: newAffiliate.phone.trim() || undefined,
        city: newAffiliate.city || undefined,
        photoUrl: photoUrl || undefined,
      });

      if (!newAffiliate.active) {
        const inactive = await editarAfiliado(created.id, {
          active: false,
        });
        setAffiliates((current) => [
          preserveProfilePhoto(inactive, photoUrl),
          ...current,
        ]);
      } else {
        setAffiliates((current) => [
          preserveProfilePhoto(created, photoUrl),
          ...current,
        ]);
      }

      setNewAffiliate({
        ...emptyAffiliateForm,
        city: cities[0]?.name ?? "",
      });
      clearPendingPhotoCrop("newAffiliate");
      setMessage("Afiliado cadastrado com sucesso.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível criar o afiliado."));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAffiliate(id: number) {
    resetStatus();

    if (!affiliateForm.name.trim() || !affiliateForm.email.trim()) {
      setError("Nome e e-mail do afiliado são obrigatorios.");
      return;
    }

    setSaving(true);
    try {
      const photoUrl = await getProfilePhotoForSave(
        "editAffiliate",
        affiliateForm.photoUrl,
      );
      const updated = await editarAfiliado(id, {
        name: affiliateForm.name.trim(),
        email: affiliateForm.email.trim().toLowerCase(),
        phone: affiliateForm.phone.trim() || undefined,
        city: affiliateForm.city || undefined,
        active: affiliateForm.active,
        photoUrl: photoUrl || undefined,
      });

      setAffiliates((current) =>
        current.map((affiliate) =>
          affiliate.id === id
            ? preserveProfilePhoto(updated, photoUrl)
            : affiliate,
        ),
      );
      setEditingAffiliateId(null);
      clearPendingPhotoCrop("editAffiliate");
      setMessage("Afiliado atualizado com sucesso.");
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Não foi possível atualizar o afiliado."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAffiliate(affiliate: Affiliate) {
    resetStatus();

    const confirmed = window.confirm(`Apagar o afiliado ${affiliate.name}?`);

    if (!confirmed) {
      return;
    }

    setSaving(true);
    try {
      await apagarAfiliado(affiliate.id);
      setAffiliates((current) =>
        current.filter((item) => item.id !== affiliate.id),
      );
      setMessage("Afiliado apagado com sucesso.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível apagar o afiliado."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p>Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.settingsShell}>
        <div className={styles.settingsPanel}>
          <aside className={styles.settingsMenu}>
            {activeSettingsSection === "usuarios" ? (
              <>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => setActiveSettingsSection("inicio")}
                >
                  <FaAnglesLeft />
                </button>

                <div className={styles.userWorkspaceTitle}>
                  <span>Usuários e afiliados</span>
                  <strong>Gerenciamento</strong>
                </div>

                <label className={styles.searchField}>
                  <span className={styles.searchIcon} aria-hidden="true" />
                  <input placeholder="Pesquisa" />
                </label>

                <nav className={styles.userSubmenu}>
                  {userSettingsPanels.map((panel) => (
                    <button
                      key={panel.id}
                      type="button"
                      className={`${styles.userSubmenuButton} ${
                        activeUserPanel === panel.id
                          ? styles.userSubmenuButtonActive
                          : ""
                      }`}
                      onClick={() => setActiveUserPanel(panel.id)}
                    >
                      <span>{panel.label}</span>
                      {panel.id === "novoUsuario" && <small>Novo acesso</small>}
                      {panel.id === "novoAfiliado" && (
                        <small>Novo vendedor</small>
                      )}
                      {panel.id === "editarCadastros" && (
                        <small>Editar ou apagar</small>
                      )}
                    </button>
                  ))}
                </nav>
              </>
            ) : (
              <>
                <strong>Configurações</strong>

                <label className={styles.searchField}>
                  <span className={styles.searchIcon} aria-hidden="true" />
                  <input placeholder="Pesquisa" />
                </label>

                <nav className={styles.settingsOptions}>
                  {settingsSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className={styles.settingsOption}
                      onClick={() => setActiveSettingsSection(section.id)}
                    >
                      <span>{section.label}</span>
                      <small>{section.helper}</small>
                    </button>
                  ))}
                </nav>
              </>
            )}
          </aside>

          <main className={styles.settingsContent}>
            {message && <p className={styles.success} role="status">{message}</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}

            {activeSettingsSection === "inicio" && (
              <section className={styles.aboutPanel}>
                <strong>Painel Netbox</strong>
                <h2>
                  Internet de Verdade
                  <br />
                  Paraiso do Tocantins - TO
                </h2>
                <p>
                  Versao
                  <br />
                  v0.1.1
                  <br />
                  2026-06-17
                </p>
                <p>
                  Backend:
                  <br />
                  Conectado
                </p>
                <p>Banco de dados</p>
              </section>
            )}

            {activeSettingsSection === "usuarios" && (
              <section className={styles.userWorkspaceContent}>
                {activeUserPanel === "novoUsuario" && (
                  <form
                    className={styles.editorCard}
                    onSubmit={handleCreateUser}
                  >
                    <div className={styles.editorHeader}>
                      <div>
                        <span>Cadastro de usuário</span>
                        <h2>Novo usuário do painel</h2>
                      </div>
                      <strong>{users.length} usuários</strong>
                    </div>

                    <ProfilePhotoPicker
                      label="Foto do usuário"
                      name={newUser.name}
                      photoUrl={newUser.photoUrl}
                      onSelectFile={(file) => openPhotoCropper(file, "newUser")}
                      onRemove={() => removeProfilePhoto("newUser")}
                    />

                    <div className={styles.editorGrid}>
                      <Field
                        label="Nome"
                        value={newUser.name}
                        onChange={(value) =>
                          setNewUser((current) => ({ ...current, name: value }))
                        }
                      />
                      <Field
                        label="E-mail"
                        type="email"
                        value={newUser.email}
                        onChange={(value) =>
                          setNewUser((current) => ({
                            ...current,
                            email: value,
                          }))
                        }
                      />
                      <Field
                        label="Senha"
                        type="password"
                        value={newUser.password}
                        onChange={(value) =>
                          setNewUser((current) => ({
                            ...current,
                            password: value,
                          }))
                        }
                      />
                      <CitySelect
                        cities={cities}
                        value={newUser.city}
                        onChange={(value) =>
                          setNewUser((current) => ({ ...current, city: value }))
                        }
                      />
                    </div>

                    <div className={styles.formActions}>
                      <button
                        type="submit"
                        className={styles.primaryButton}
                        disabled={saving}
                      >
                        Cadastrar usuário
                      </button>
                    </div>
                  </form>
                )}

                {activeUserPanel === "novoAfiliado" && (
                  <form
                    className={styles.editorCard}
                    onSubmit={handleCreateAffiliate}
                  >
                    <div className={styles.editorHeader}>
                      <div>
                        <span>Cadastro de afiliado</span>
                        <h2>Novo afiliado comercial</h2>
                      </div>
                      <strong>{activeAffiliates} ativos</strong>
                    </div>

                    <ProfilePhotoPicker
                      label="Foto do afiliado"
                      name={newAffiliate.name}
                      photoUrl={newAffiliate.photoUrl}
                      onSelectFile={(file) =>
                        openPhotoCropper(file, "newAffiliate")
                      }
                      onRemove={() => removeProfilePhoto("newAffiliate")}
                    />

                    <div className={styles.editorGrid}>
                      <Field
                        label="Nome"
                        value={newAffiliate.name}
                        onChange={(value) =>
                          setNewAffiliate((current) => ({
                            ...current,
                            name: value,
                          }))
                        }
                      />
                      <Field
                        label="E-mail"
                        type="email"
                        value={newAffiliate.email}
                        onChange={(value) =>
                          setNewAffiliate((current) => ({
                            ...current,
                            email: value,
                          }))
                        }
                      />
                      <Field
                        label="Telefone"
                        value={newAffiliate.phone}
                        onChange={(value) =>
                          setNewAffiliate((current) => ({
                            ...current,
                            phone: value,
                          }))
                        }
                      />
                      <CitySelect
                        cities={cities}
                        value={newAffiliate.city}
                        onChange={(value) =>
                          setNewAffiliate((current) => ({
                            ...current,
                            city: value,
                          }))
                        }
                      />
                    </div>

                    <label className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={newAffiliate.active}
                        onChange={(event) =>
                          setNewAffiliate((current) => ({
                            ...current,
                            active: event.target.checked,
                          }))
                        }
                      />
                      <span>Afiliado ativo</span>
                    </label>

                    <div className={styles.formActions}>
                      <button
                        type="submit"
                        className={styles.primaryButton}
                        disabled={saving}
                      >
                        Cadastrar afiliado
                      </button>
                    </div>
                  </form>
                )}

                {activeUserPanel === "editarCadastros" && (
                  <section className={styles.profileSearchWorkspace}>
                    {editingUserId || editingAffiliateId ? (
                      <>
                        <div className={styles.profileSearchHeader}>
                          <div className={styles.profileEditHeading}>
                            <button
                              type="button"
                              className={`${styles.backButton} ${styles.profileHeaderBackButton}`}
                              onClick={backToProfileSearch}
                              disabled={saving}
                              aria-label="Voltar para pesquisar perfis"
                              title="Voltar"
                            >
                              &lt;&lt;
                            </button>
                            <div>
                              <span>Editar perfil</span>
                              <h2>
                                {editingUserId
                                  ? "Editar usuário"
                                  : "Editar afiliado"}
                              </h2>
                            </div>
                          </div>
                        </div>

                        {editingUserId && (
                          <section className={styles.profileEditorScreen}>
                            <ProfilePhotoPicker
                              label="Foto do usuário"
                              name={userForm.name}
                              photoUrl={userForm.photoUrl}
                              onSelectFile={(file) =>
                                openPhotoCropper(file, "editUser")
                              }
                              onRemove={() => removeProfilePhoto("editUser")}
                            />

                            <div className={styles.editGrid}>
                              <Field
                                label="Nome"
                                value={userForm.name}
                                onChange={(value) =>
                                  setUserForm((current) => ({
                                    ...current,
                                    name: value,
                                  }))
                                }
                              />
                              <Field
                                label="E-mail"
                                type="email"
                                value={userForm.email}
                                onChange={(value) =>
                                  setUserForm((current) => ({
                                    ...current,
                                    email: value,
                                  }))
                                }
                              />
                              <Field
                                label="Nova senha"
                                type="password"
                                value={userForm.password}
                                onChange={(value) =>
                                  setUserForm((current) => ({
                                    ...current,
                                    password: value,
                                  }))
                                }
                              />
                              <CitySelect
                                cities={cities}
                                value={userForm.city}
                                onChange={(value) =>
                                  setUserForm((current) => ({
                                    ...current,
                                    city: value,
                                  }))
                                }
                              />
                              <UserRoleSelect
                                value={userForm.role}
                                disabled={currentUserRole !== "ADMIN"}
                                onChange={(role) =>
                                  setUserForm((current) => ({
                                    ...current,
                                    role,
                                  }))
                                }
                              />
                            </div>

                            <div className={styles.formActions}>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => {
                                  clearPendingPhotoCrop("editUser");
                                  setEditingUserId(null);
                                }}
                                disabled={saving}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className={styles.dangerButton}
                                onClick={() => {
                                  const selectedUser = users.find(
                                    (user) => user.id === editingUserId,
                                  );

                                  if (selectedUser) {
                                    handleDeleteUser(selectedUser);
                                  }
                                }}
                                disabled={saving}
                              >
                                Apagar cadastro
                              </button>
                              <button
                                type="button"
                                className={styles.primaryButton}
                                onClick={() => handleSaveUser(editingUserId)}
                                disabled={saving}
                              >
                                Salvar alterações
                              </button>
                            </div>
                          </section>
                        )}

                        {editingAffiliateId && (
                          <section className={styles.profileEditorScreen}>
                            <ProfilePhotoPicker
                              label="Foto do afiliado"
                              name={affiliateForm.name}
                              photoUrl={affiliateForm.photoUrl}
                              onSelectFile={(file) =>
                                openPhotoCropper(file, "editAffiliate")
                              }
                              onRemove={() =>
                                removeProfilePhoto("editAffiliate")
                              }
                            />

                            <div className={styles.editGrid}>
                              <Field
                                label="Nome"
                                value={affiliateForm.name}
                                onChange={(value) =>
                                  setAffiliateForm((current) => ({
                                    ...current,
                                    name: value,
                                  }))
                                }
                              />
                              <Field
                                label="E-mail"
                                type="email"
                                value={affiliateForm.email}
                                onChange={(value) =>
                                  setAffiliateForm((current) => ({
                                    ...current,
                                    email: value,
                                  }))
                                }
                              />
                              <Field
                                label="Telefone"
                                value={affiliateForm.phone}
                                onChange={(value) =>
                                  setAffiliateForm((current) => ({
                                    ...current,
                                    phone: value,
                                  }))
                                }
                              />
                              <CitySelect
                                cities={cities}
                                value={affiliateForm.city}
                                onChange={(value) =>
                                  setAffiliateForm((current) => ({
                                    ...current,
                                    city: value,
                                  }))
                                }
                              />
                            </div>

                            <label className={styles.checkRow}>
                              <input
                                type="checkbox"
                                checked={affiliateForm.active}
                                onChange={(event) =>
                                  setAffiliateForm((current) => ({
                                    ...current,
                                    active: event.target.checked,
                                  }))
                                }
                              />
                              <span>Afiliado ativo</span>
                            </label>

                            <div className={styles.formActions}>
                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => {
                                  clearPendingPhotoCrop("editAffiliate");
                                  setEditingAffiliateId(null);
                                }}
                                disabled={saving}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className={styles.dangerButton}
                                onClick={() => {
                                  const selectedAffiliate = affiliates.find(
                                    (affiliate) =>
                                      affiliate.id === editingAffiliateId,
                                  );

                                  if (selectedAffiliate) {
                                    handleDeleteAffiliate(selectedAffiliate);
                                  }
                                }}
                                disabled={saving}
                              >
                                Apagar cadastro
                              </button>
                              <button
                                type="button"
                                className={styles.primaryButton}
                                onClick={() =>
                                  handleSaveAffiliate(editingAffiliateId)
                                }
                                disabled={saving}
                              >
                                Salvar alterações
                              </button>
                            </div>
                          </section>
                        )}
                      </>
                    ) : (
                      <>
                        <div className={styles.profileSearchHeader}>
                          <div>
                            <span>Editar cadastros</span>
                            <h2>Pesquisar perfil</h2>
                          </div>
                          <strong>
                            {users.length + affiliates.length} perfis
                          </strong>
                        </div>

                        <label className={styles.profileEditSearch}>
                          <button
                            type="button"
                            className={styles.profileSearchButton}
                            aria-label="Listar usuários existentes"
                            title="Listar usuários existentes"
                            onClick={() => void handleShowAllProfiles()}
                            disabled={refreshingProfiles}
                          >
                            <span
                              className={styles.searchIcon}
                              aria-hidden="true"
                            />
                          </button>
                          <input
                            value={profileSearchTerm}
                            onChange={(event) =>
                              handleProfileSearchChange(event.target.value)
                            }
                            placeholder="Encontre o perfil"
                          />
                        </label>

                        {!shouldShowProfileResults && (
                          <>
                            <div className={styles.profileStats}>
                              <button
                                type="button"
                                onClick={() => void handleShowAllProfiles("users")}
                                disabled={refreshingProfiles}
                                aria-label="Mostrar todos os usuários"
                              >
                                <span>Usuários</span>
                                <strong>{users.length}</strong>
                                <small>Ver todos</small>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleShowAllProfiles("affiliates")
                                }
                                disabled={refreshingProfiles}
                                aria-label="Mostrar todos os afiliados"
                              >
                                <span>Afiliados</span>
                                <strong>{affiliates.length}</strong>
                                <small>Ver todos</small>
                              </button>
                            </div>

                            <div className={styles.profileEmpty}>
                              <strong>Pesquise antes de editar</strong>
                              <span>
                                Digite nome, e-mail, telefone ou cidade. Os
                                resultados aparecem em uma lista simples; clique
                                em um perfil para editar.
                              </span>
                            </div>
                          </>
                        )}

                        {shouldShowProfileResults &&
                          totalFilteredProfiles === 0 && (
                            <div className={styles.profileEmpty}>
                              <strong>Nenhum perfil encontrado</strong>
                              <span>
                                Tente pesquisar pelo nome, e-mail, telefone ou
                                cidade cadastrada.
                              </span>
                            </div>
                          )}

                        {shouldShowProfileResults &&
                          totalFilteredProfiles > 0 && (
                            <div className={styles.profileResultList}>
                              {filteredUsers.map((user) => (
                                <button
                                  key={`user-${user.id}`}
                                  type="button"
                                  className={styles.profileResultButton}
                                  onClick={() => startUserEdit(user)}
                                >
                                  <ProfileMiniAvatar
                                    profile={user}
                                    name={user.name}
                                  />
                                  <div className={styles.profileResultText}>
                                    <span className={styles.profileBadge}>
                                      Usuário
                                    </span>
                                    <strong>{user.name}</strong>
                                    <small>{user.email}</small>
                                    <small>{user.city ?? "Sem cidade"}</small>
                                  </div>
                                </button>
                              ))}

                              {filteredAffiliates.map((affiliate) => (
                                <button
                                  key={`affiliate-${affiliate.id}`}
                                  type="button"
                                  className={styles.profileResultButton}
                                  onClick={() => startAffiliateEdit(affiliate)}
                                >
                                  <ProfileMiniAvatar
                                    profile={affiliate}
                                    name={affiliate.name}
                                  />
                                  <div className={styles.profileResultText}>
                                    <span className={styles.profileBadge}>
                                      Afiliado
                                    </span>
                                    <strong>{affiliate.name}</strong>
                                    <small>
                                      {affiliate.email ?? "Sem e-mail"}
                                    </small>
                                    <small>
                                      {affiliate.city ?? "Sem cidade"} |{" "}
                                      {affiliate.active ? "Ativo" : "Inativo"}
                                    </small>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                      </>
                    )}
                  </section>
                )}
              </section>
            )}

            {activeSettingsSection === "webhooks" && (
              <section className={styles.webhookStage}>
                <WebhookMonitor
                  logs={chatmixLogs}
                  loading={loadingChatmixLogs}
                  status={chatmixConnectionStatus}
                  onClear={() => setChatmixLogs([])}
                />
              </section>
            )}

            {activeSettingsSection === "ambiente" && (
              <section className={styles.systemPanel}>
                <div className={styles.summaryCard}>
                  <span>Backend</span>
                  <strong>
                    {process.env.NEXT_PUBLIC_API_URL ? "Online" : "Padrão"}
                  </strong>
                </div>
                <div className={styles.summaryCard}>
                  <span>Eventos em tempo real</span>
                  <strong>
                    {connectionStatusLabel(chatmixConnectionStatus)}
                  </strong>
                </div>
              </section>
            )}

            {activeSettingsSection === "banco" && (
              <section className={styles.systemPanel}>
                <div className={`${styles.summaryCard} ${styles.databaseCard}`}>
                  <span>Banco de dados</span>
                  <strong>Prisma Studio</strong>
                  <p>
                    Abre o visualizador online do banco conectado ao backend
                    deste projeto.
                  </p>
                  <a
                    className={styles.databaseButton}
                    href="/prisma-studio"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir banco de dados
                  </a>
                </div>
              </section>
            )}

            {activeSettingsSection === "sistema" && (
              <section className={styles.aboutPanel}>
                <strong>Painel Netbox</strong>
                <h2>
                  Internet de Verdade
                  <br />
                  Paraiso do Tocantins - TO
                </h2>
                <p>
                  Versao
                  <br />
                  v0.1.1
                  <br />
                  2026-06-17
                </p>
                <p>
                  Backend:
                  <br />
                  Conectado
                </p>
                <p>Banco de dados</p>
              </section>
            )}
          </main>
        </div>
      </section>

      {photoCrop && (
        <div
          className={styles.photoCropOverlay}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.photoCropModal}>
            <div className={styles.photoCropHeader}>
              <div>
                <span>Foto do perfil</span>
                <strong>Ajustar e cortar imagem</strong>
              </div>
              <button type="button" onClick={() => setPhotoCrop(null)}>
                X
              </button>
            </div>

            <div className={styles.photoCropPreview}>
              <img
                src={photoCrop.source}
                alt="Previa da foto"
                style={{
                  transform: `translate(${photoCrop.offsetX}px, ${photoCrop.offsetY}px) scale(${photoCrop.zoom})`,
                }}
              />
              <span className={styles.photoCropGuide} aria-hidden="true" />
            </div>

            <div className={styles.photoCropControls}>
              <label>
                Zoom
                <input
                  type="range"
                  min="1"
                  max="2.6"
                  step="0.05"
                  value={photoCrop.zoom}
                  onChange={(event) =>
                    setPhotoCrop((current) =>
                      current
                        ? { ...current, zoom: Number(event.target.value) }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                Horizontal
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="1"
                  value={photoCrop.offsetX}
                  onChange={(event) =>
                    setPhotoCrop((current) =>
                      current
                        ? { ...current, offsetX: Number(event.target.value) }
                        : current,
                    )
                  }
                />
              </label>
              <label>
                Vertical
                <input
                  type="range"
                  min="-120"
                  max="120"
                  step="1"
                  value={photoCrop.offsetY}
                  onChange={(event) =>
                    setPhotoCrop((current) =>
                      current
                        ? { ...current, offsetY: Number(event.target.value) }
                        : current,
                    )
                  }
                />
              </label>
            </div>

            <div className={styles.photoCropActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setPhotoCrop(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={confirmPhotoCrop}
              >
                Confirmar ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function capitalizeStatus(status: RealtimeConnectionStatus) {
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function connectionStatusLabel(status: RealtimeConnectionStatus) {
  if (status === "connected") {
    return "Conectado";
  }

  if (status === "error") {
    return "Erro na conexão";
  }

  return "Conectando";
}

function WebhookMonitor({
  logs,
  loading,
  status,
  onClear,
}: {
  logs: ChatmixWebhookLog[];
  loading: boolean;
  status: RealtimeConnectionStatus;
  onClear: () => void;
}) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const selectedLogExists = logs.some((log) => log.id === selectedLogId);
  const activeLogId = selectedLogExists ? selectedLogId : (logs[0]?.id ?? null);
  const activeLog = logs.find((log) => log.id === activeLogId) || logs[0];

  return (
    <section className={styles.webhookMonitor}>
      <div className={styles.webhookTopbar}>
        <div>
          <h2>Webhooks</h2>
          <span>Chatmix em tempo real</span>
        </div>
        <div className={styles.webhookActions}>
          <span
            className={`${styles.liveBadge} ${
              styles[`liveBadge${capitalizeStatus(status)}`]
            }`}
          >
            {connectionStatusLabel(status)}
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onClear}
            disabled={!logs.length}
          >
            Limpar
          </button>
        </div>
      </div>

      {activeLog ? (
        <WebhookLogItem log={activeLog} />
      ) : (
        <div className={styles.webhookEmpty}>
          <strong>
            {loading
              ? "Carregando webhooks salvos..."
              : "Nenhum webhook salvo ainda."}
          </strong>
          <span>
            Configure a URL http://72.62.8.85:3001/webhooks/chatmix no Chatmix e
            deixe esta página aberta durante o teste.
          </span>
        </div>
      )}

      {logs.length > 1 && (
        <div className={styles.webhookHistory}>
          {logs.slice(0, 10).map((log) => (
            <button
              key={log.id}
              type="button"
              className={
                activeLog?.id === log.id
                  ? styles.webhookHistoryButtonActive
                  : ""
              }
              onClick={() => setSelectedLogId(log.id)}
            >
              <strong>{webhookStatus(log)}</strong>
              <span>{formatDateTime(log.message.payload.receivedAt)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function WebhookLogItem({ log }: { log: ChatmixWebhookLog }) {
  const payload = log.message.payload;
  const receivedAt = payload.receivedAt || log.message.emittedAt;
  const resultStatus = webhookStatus(log);
  const jsonToShow = {
    raw: payload.raw,
    query: payload.query,
    result: payload.result,
  };

  return (
    <article className={styles.webhookInspector}>
      <div className={styles.requestTitle}>
        <strong>POST /</strong>
        <span>
          From Chatmix at {formatDateTime(receivedAt)}
          {payload.attendanceId ? ` | Atendimento ${payload.attendanceId}` : ""}
        </span>
      </div>

      <section className={styles.requestBlock}>
        <h3>Headers</h3>
        <div className={styles.headersTable}>
          <div>
            <span>Content-Type</span>
            <strong>application/json</strong>
          </div>
          <div>
            <span>Channel</span>
            <strong>{payload.channel?.name || "Chatmix"}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{resultStatus}</strong>
          </div>
          <div>
            <span>Webhook URL</span>
            <strong>http://72.62.8.85:3001/webhooks/chatmix</strong>
          </div>
        </div>
      </section>

      <div className={styles.bodyHeader}>
        <h3>Body</h3>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(JSON.stringify(jsonToShow, null, 2))
          }
        >
          Copy
        </button>
      </div>
      <pre className={styles.webhookJson}>
        {JSON.stringify(jsonToShow, null, 2)}
      </pre>
    </article>
  );
}

function webhookStatus(log: ChatmixWebhookLog) {
  const status = log.message.payload.result?.status;
  return typeof status === "string" ? status : "recebido";
}

function normalizeStoredWebhookLog(
  log: ChatmixWebhookLogResponse,
): ChatmixWebhookLog {
  return {
    id: String(log.id),
    message: {
      type: "chatmix-webhook",
      emittedAt: log.receivedAt,
      payload: {
        id: log.id,
        receivedAt: log.receivedAt,
        attendanceId: log.attendanceId,
        channel: log.channel,
        raw: log.raw,
        query: log.query,
        result: log.result,
      },
    },
  };
}

function mergeWebhookLogs(
  incoming: ChatmixWebhookLog,
  current: ChatmixWebhookLog[],
) {
  const withoutDuplicate = current.filter((log) => log.id !== incoming.id);
  return [incoming, ...withoutDuplicate].slice(0, 50);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "Agora";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR");
}

function ProfilePhotoPicker({
  label,
  name,
  photoUrl,
  onSelectFile,
  onRemove,
}: {
  label: string;
  name: string;
  photoUrl: string;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.photoUploadBlock}>
      <div className={styles.photoPreviewCircle}>
        {photoUrl ? (
          <img src={photoUrl} alt={`Foto de ${name || "perfil"}`} />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      <div className={styles.photoUploadInfo}>
        <span>{label}</span>
        <strong>Imagem circular do perfil</strong>
        <small>Envie uma foto, ajuste o zoom e corte antes de salvar.</small>

        <div className={styles.photoUploadActions}>
          <label>
            Escolher foto
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  onSelectFile(file);
                }

                event.target.value = "";
              }}
            />
          </label>
          {photoUrl && (
            <button type="button" onClick={onRemove}>
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileMiniAvatar({
  profile,
  name,
}: {
  profile: unknown;
  name: string;
}) {
  const photoUrl = getProfilePhotoUrl(profile);

  return (
    <span className={styles.profileMiniAvatar}>
      {photoUrl ? (
        <img src={photoUrl} alt={`Foto de ${name}`} />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getProfilePhotoUrl(profile: unknown) {
  const source = profile as {
    photoUrl?: string | null;
    avatarUrl?: string | null;
    imageUrl?: string | null;
    profileImageUrl?: string | null;
  };

  return (
    source.photoUrl ||
    source.avatarUrl ||
    source.imageUrl ||
    source.profileImageUrl ||
    ""
  );
}

function preserveProfilePhoto<T>(profile: T, photoUrl: string): T {
  if (!photoUrl) {
    return profile;
  }

  return { ...profile, photoUrl } as T;
}

function cropImageToDataUrl(
  source: string,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const size = 512;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Canvas indisponivel"));
        return;
      }

      canvas.width = size;
      canvas.height = size;

      const baseScale = Math.max(size / image.width, size / image.height);
      const scale = baseScale * zoom;
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const drawX = (size - drawWidth) / 2 + offsetX * 1.8;
      const drawY = (size - drawHeight) / 2 + offsetY * 1.8;

      context.clearRect(0, 0, size, size);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    image.onerror = reject;
    image.src = source;
  });
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CitySelect({
  cities,
  value,
  onChange,
}: {
  cities: City[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>Cidade</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Sem cidade</option>
        {cities.map((city) => (
          <option key={city.id} value={city.name}>
            {city.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function UserRoleSelect({
  value,
  disabled,
  onChange,
}: {
  value: UserRole;
  disabled: boolean;
  onChange: (value: UserRole) => void;
}) {
  return (
    <label className={styles.field}>
      <span>Nível de acesso</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as UserRole)}
      >
        <option value="USER">Usuário</option>
        <option value="MANAGER">Gerente</option>
        <option value="ADMIN">Administrador</option>
      </select>
      {disabled && (
        <small>
          Entre com uma conta Administrador para alterar este nível.
        </small>
      )}
    </label>
  );
}
