"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  LuCheck,
  LuExternalLink,
  LuGift,
  LuGlobe,
  LuHeart,
  LuMonitor,
  LuPalette,
  LuPartyPopper,
  LuRefreshCw,
  LuSave,
  LuSmartphone,
  LuSnowflake,
  LuSparkles,
} from "react-icons/lu";
import { getApiErrorMessage } from "@/lib/api";
import {
  themeApi,
  type SeasonalTheme,
  type ThemeConfiguration,
  type ThemeEffect,
  type ThemeScope,
  type ThemeSetting,
} from "./themeApi";
import { previewSites } from "../../previewSites";
import styles from "./ThemeSettings.module.css";

const scopeNames: Record<ThemeScope, string> = {
  blog: "Blog",
  institutional: "Site institucional",
};
const effectIcons: Record<ThemeEffect, typeof LuSnowflake> = {
  snow: LuSnowflake,
  stars: LuSparkles,
  confetti: LuPartyPopper,
  petals: LuSparkles,
  hearts: LuHeart,
  eggs: LuGift,
  flags: LuPartyPopper,
  bats: LuSparkles,
};

/** Real public-site preview uses a URL override; only Save writes shared settings. */
export default function ThemeSettings() {
  const [configuration, setConfiguration] = useState<ThemeConfiguration | null>(
    null,
  );
  const [drafts, setDrafts] = useState<ThemeSetting[]>([]);
  const [scope, setScope] = useState<ThemeScope>("blog");
  const [mobile, setMobile] = useState(false);
  const [previewDestination, setPreviewDestination] =
    useState<keyof typeof previewSites>("official");
  const previewSite = previewSites[previewDestination];
  const nextPreviewDestination =
    previewDestination === "official" ? "vercel" : "official";
  const [footerPreview, setFooterPreview] = useState(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const previewStage = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(1280);

  useEffect(() => {
    const element = previewStage.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) =>
      setPreviewWidth(entries[0].contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [configuration]);

  useEffect(() => {
    const controller = new AbortController();
    themeApi
      .read(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setConfiguration(data);
        setDrafts(data.settings);
        setError("");
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            getApiErrorMessage(reason, "Não foi possível carregar os temas."),
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);

  const draft = drafts.find((setting) => setting.scope === scope);
  const saved = configuration?.settings.find(
    (setting) => setting.scope === scope,
  );
  const theme = configuration?.catalog.find(
    (theme) => theme.id === draft?.themeId,
  );
  const dirty =
    draft?.themeId !== saved?.themeId || draft?.enabled !== saved?.enabled;
  function edit(change: Partial<Pick<ThemeSetting, "themeId" | "enabled">>) {
    setDrafts((current) =>
      current.map((setting) =>
        setting.scope === scope ? { ...setting, ...change } : setting,
      ),
    );
    setMessage("");
  }
  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await themeApi.save(draft);
      setConfiguration(
        (current) =>
          current && {
            ...current,
            settings: current.settings.map((setting) =>
              setting.scope === updated.scope ? updated : setting,
            ),
          },
      );
      setDrafts((current) =>
        current.map((setting) =>
          setting.scope === updated.scope ? updated : setting,
        ),
      );
      setMessage(
        updated.enabled
          ? `${scopeNames[updated.scope]}: tema ativado. As páginas abertas recebem a alteração em até 30 segundos.`
          : `${scopeNames[updated.scope]}: tema desativado.`,
      );
    } catch (reason) {
      setError(
        getApiErrorMessage(
          reason,
          "Não foi possível salvar. Recarregue a configuração e tente novamente.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  const preview = new URL(
    scope === "blog" ? "/site/blog" : "/site",
    previewSite.origin,
  );
  preview.searchParams.set(
    "previewTheme",
    draft?.enabled ? draft.themeId : "none",
  );
  if (footerPreview) preview.hash = "seasonal-footer-decoration";

  return (
    <div
      id="blog-theme-settings"
      className={styles.settings}
      data-component="seasonal-theme-settings"
    >
      <header className={styles.header}>
        <div>
          <small>APARÊNCIA POR OCASIÃO</small>
          <h1>
            Temas comemorativos <span className={styles.titleAccent}>✦</span>
          </h1>
          <p>
            Um detalhe especial para cada época. Ative quando quiser e desative
            para voltar ao visual habitual.
          </p>
        </div>
        <LuPalette aria-hidden="true" />
      </header>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
          <button
            id="theme-reload-settings"
            type="button"
            onClick={() => {
              setLoading(true);
              setRefresh((value) => value + 1);
            }}
            disabled={saving}
          >
            <LuRefreshCw aria-hidden="true" />
            Recarregar configuração
          </button>
        </div>
      )}
      {message && (
        <p className={styles.notice} role="status">
          {message}
        </p>
      )}
      {loading ? (
        <p role="status">Carregando temas…</p>
      ) : (
        configuration &&
        draft && (
          <>
            <div className={styles.workspace}>
              <aside
                className={styles.sidebar}
                aria-label="Configurações do tema"
              >
                <div className={styles.sidebarHeading}>
                  <span className={styles.sectionEyebrow}>01 / DESTINO</span>
                  <h2>Onde aplicar o tema?</h2>
                  <p>Selecione qual página você deseja personalizar.</p>
                </div>
                <div
                  className={styles.destination}
                  role="group"
                  aria-label="Site que deseja configurar"
                >
                  {(["blog", "institutional"] as const).map((destination) => (
                    <button
                      id={`theme-scope-${destination}`}
                      key={destination}
                      type="button"
                      aria-pressed={scope === destination}
                      onClick={() => {
                        setScope(destination);
                        setMessage("");
                      }}
                      disabled={saving}
                    >
                      {scopeNames[destination]}
                      <span>
                        {configuration?.settings.find(
                          (setting) => setting.scope === destination,
                        )?.enabled
                          ? "Tema ativo"
                          : "Sem tema ativo"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className={styles.sidebarHeading}>
                  <span className={styles.sectionEyebrow}>02 / ATIVAÇÃO</span>
                  <h2>Personalização</h2>
                </div>
                <div className={styles.activation}>
                  <div>
                    <strong>{scopeNames[scope]}</strong>
                    <p>
                      {draft.enabled
                        ? `${theme?.name || "Tema"} selecionado${dirty ? " — alteração ainda não salva" : ""}.`
                        : "As decorações comemorativas estão desativadas."}
                    </p>
                  </div>
                  <label htmlFor="theme-enabled-toggle">
                    <input
                      id="theme-enabled-toggle"
                      type="checkbox"
                      checked={draft.enabled}
                      disabled={saving || !configuration.canManage}
                      onChange={(event) =>
                        edit({ enabled: event.target.checked })
                      }
                    />
                    Ativar tema
                  </label>
                  <button
                    id="theme-save-settings"
                    className={styles.save}
                    type="button"
                    disabled={saving || !dirty || !configuration.canManage}
                    onClick={() => void save()}
                  >
                    <LuSave aria-hidden="true" />
                    {saving ? "Salvando…" : "Salvar alterações"}
                  </button>
                </div>
                {!configuration.canManage && (
                  <p className={styles.notice}>
                    Você pode visualizar os temas. A ativação e desativação
                    estão disponíveis para administradores e gestores.
                  </p>
                )}
                <div className={styles.sidebarHeading}>
                  <span className={styles.sectionEyebrow}>03 / OCASIÃO</span>
                  <h2>Escolha a ocasião</h2>
                  <p>
                    Escolha uma decoração e acompanhe o resultado na prévia.
                  </p>
                </div>
                <fieldset
                  className={styles.catalog}
                  id="seasonal-theme-catalog"
                >
                  <legend className={styles.visuallyHidden}>
                    Escolha a ocasião
                  </legend>
                  {configuration.catalog.map((item: SeasonalTheme) => {
                    const Icon = effectIcons[item.effect];
                    return (
                      <label
                        key={item.id}
                        htmlFor={`seasonal-theme-${item.id}`}
                        className={styles.themeCard}
                        data-selected={draft.themeId === item.id}
                        style={
                          {
                            "--theme-swatch":
                              item.colors[0] === "#ffffff"
                                ? "#b8d7e8"
                                : item.colors[0],
                          } as CSSProperties
                        }
                      >
                        <input
                          id={`seasonal-theme-${item.id}`}
                          type="radio"
                          name="seasonal-theme-preset"
                          value={item.id}
                          checked={draft.themeId === item.id}
                          disabled={saving}
                          onChange={() =>
                            edit({ themeId: item.id, enabled: true })
                          }
                        />
                        <span className={styles.themeIcon}>
                          <Icon aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{item.name}</strong>
                          <small>{item.occasion}</small>
                          <span className={styles.description}>
                            {item.description}
                          </span>
                        </span>
                        {draft.themeId === item.id && (
                          <LuCheck aria-hidden="true" />
                        )}
                      </label>
                    );
                  })}
                </fieldset>
              </aside>
              <section
                className={styles.preview}
                id="seasonal-theme-preview"
                aria-labelledby="theme-preview-heading"
              >
                <header className={styles.previewHeader}>
                  <div>
                    <h2 id="theme-preview-heading">
                      Prévia do {scopeNames[scope]}
                    </h2>
                    <p>
                      {draft.enabled ? theme?.name : "Visual habitual"} ·
                      nenhuma alteração é salva pela prévia
                    </p>
                  </div>
                  <a
                    id="theme-open-preview"
                    href={preview.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir prévia em outra aba"
                  >
                    <LuExternalLink aria-hidden="true" />
                  </a>
                </header>
                <div
                  id="theme-preview-controls"
                  data-destination={previewDestination}
                  className={styles.previewControls}
                  role="group"
                  aria-label="Opções da prévia"
                >
                  <button
                    id="theme-preview-site-toggle"
                    type="button"
                    title={`Alternar para ${previewSites[nextPreviewDestination].label}`}
                    aria-label={`Site da prévia: ${previewSite.label}. Alternar para ${previewSites[nextPreviewDestination].label}`}
                    onClick={() =>
                      setPreviewDestination(nextPreviewDestination)
                    }
                  >
                    <LuGlobe aria-hidden="true" />
                    {previewSite.label}
                  </button>
                  <button
                    id="theme-preview-desktop"
                    type="button"
                    aria-pressed={!mobile}
                    onClick={() => setMobile(false)}
                  >
                    <LuMonitor aria-hidden="true" />
                    Desktop
                  </button>
                  <button
                    id="theme-preview-mobile"
                    type="button"
                    aria-pressed={mobile}
                    onClick={() => setMobile(true)}
                  >
                    <LuSmartphone aria-hidden="true" />
                    Celular
                  </button>
                  <button
                    id="theme-preview-footer"
                    type="button"
                    aria-pressed={footerPreview}
                    onClick={() => {
                      setFooterPreview((value) => !value);
                      setPreviewRevision((value) => value + 1);
                    }}
                  >
                    Ver {footerPreview ? "início" : "rodapé"}
                  </button>
                  <button
                    id="theme-refresh-preview"
                    type="button"
                    onClick={() => setPreviewRevision((value) => value + 1)}
                    aria-label="Recarregar prévia"
                  >
                    <LuRefreshCw aria-hidden="true" />
                  </button>
                </div>
                <div
                  ref={previewStage}
                  className={styles.previewStage}
                  data-mobile={mobile}
                  style={
                    mobile
                      ? undefined
                      : {
                          height: `${Math.min(1, previewWidth / 1280) * 900}px`,
                        }
                  }
                >
                  <iframe
                    id="seasonal-theme-preview-frame"
                    key={`${preview.href}-${previewRevision}`}
                    title={`Prévia em ${previewSite.label} do ${scopeNames[scope]} com ${draft.enabled ? theme?.name : "tema desativado"}`}
                    src={preview.href}
                    style={
                      mobile
                        ? undefined
                        : {
                            width: "1280px",
                            height: "900px",
                            transform: `scale(${Math.min(1, previewWidth / 1280)})`,
                          }
                    }
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
                <p className={styles.previewNote}>
                  A prévia usa {previewSite.label}. Alternar o endereço não
                  altera as configurações salvas. Se ele não carregar neste
                  quadro, use o botão para abrir em outra aba. Blog e
                  institucional têm configurações independentes.
                </p>
              </section>
            </div>
          </>
        )
      )}
    </div>
  );
}
