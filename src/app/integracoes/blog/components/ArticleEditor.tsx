"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiArchive,
  FiEdit3,
  FiEye,
  FiSave,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { getApiErrorMessage } from "@/lib/api";
import { blogApi } from "../api";
import {
  Article,
  Author,
  Category,
  statusLabel,
  type ArticleUpdate,
} from "../types";
import BlockEditor from "./BlockEditor";
import ArticlePreview from "./ArticlePreview";
import ArticleInformation from "./ArticleInformation";
import EditorTabs, { type EditorTab } from "./EditorTabs";
import styles from "../blog.module.css";

function emptyArticle(): Article {
  return {
    id: crypto.randomUUID(),
    title: "",
    slug: "",
    summary: "",
    category: "",
    cover: "",
    coverAlt: "",
    author: "",
    status: "draft",
    content: [],
    revision: 1,
    createdAt: "",
    updatedAt: "",
    publishedAt: "",
  };
}
export default function ArticleEditor({ id }: { id?: string }) {
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [saved, setSaved] = useState("");
  const [authors, setAuthors] = useState<Author[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [creating, setCreating] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("information");
  const [sidePreview, setSidePreview] = useState(false);
  const previousTab = useRef<EditorTab>("information");
  const form = useRef<HTMLFormElement>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const uploading = uploadCount > 0;
  function trackUpload(active: boolean) {
    setUploadCount((count) => Math.max(0, count + (active ? 1 : -1)));
  }
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dirty =
    uploading || (article !== null && JSON.stringify(article) !== saved);
  useEffect(() => {
    let active = true;
    Promise.all([
      id ? blogApi.article(id) : Promise.resolve(emptyArticle()),
      blogApi.categories(),
      blogApi.authors(),
    ])
      .then(([item, list, people]) => {
        if (active) {
          setArticle(item);
          setSaved(JSON.stringify(item));
          setCategories(list);
          setAuthors(people);
          if (
            new URLSearchParams(window.location.search).get("preview") === "1"
          )
            setActiveTab("preview");
        }
      })
      .catch((e) => {
        if (active) setError(getApiErrorMessage(e, "Erro ao carregar editor."));
      });
    return () => {
      active = false;
    };
  }, [id]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        (event.target as HTMLElement).closest("a[href]") &&
        !window.confirm("Descartar alterações não salvas?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    // Navigation API covers browser back/forward in supported browsers without rewriting history.
    const navigation = (window as unknown as { navigation?: EventTarget })
      .navigation;
    const traverse = (event: Event) => {
      if (
        (event as Event & { navigationType?: string }).navigationType ===
          "traverse" &&
        event.cancelable &&
        !window.confirm("Descartar alterações não salvas?")
      )
        event.preventDefault();
    };
    navigation?.addEventListener("navigate", traverse);
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
      navigation?.removeEventListener("navigate", traverse);
    };
  }, [dirty]);
  function patch(value: ArticleUpdate) {
    setArticle((current) =>
      current
        ? {
            ...current,
            ...(typeof value === "function" ? value(current) : value),
          }
        : current,
    );
  }
  function selectTab(tab: EditorTab) {
    if (tab !== "preview") previousTab.current = tab;
    setActiveTab(tab);
  }
  function backToBlog() {
    if (!dirty || window.confirm("Descartar alterações não salvas?"))
      router.push("/integracoes/blog");
  }
  /** Reveal required metadata before browser validation tries to focus an otherwise hidden input. */
  function validateInformation() {
    const invalid = form.current?.querySelector<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input:invalid, select:invalid, textarea:invalid");
    if (!invalid) return true;
    selectTab("information");
    requestAnimationFrame(() => {
      invalid.focus();
      invalid.reportValidity();
    });
    return false;
  }
  async function save(action?: string) {
    if (!article || busy || uploading || !validateInformation()) return;
    if (
      action &&
      action !== "publish" &&
      !window.confirm("Retirar este artigo da API pública?")
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let result = article;
      if (creating || dirty) {
        result = await blogApi.save(article, creating);
        setCreating(false);
        setArticle(result);
        setSaved(JSON.stringify(result));
      }
      if (action) {
        result = await blogApi.publish(result, action);
        setArticle(result);
        setSaved(JSON.stringify(result));
      }
      setMessage(
        action === "publish"
          ? "Versão disponibilizada na API pública. A exibição no site depende da configuração dele."
          : action
            ? "Artigo retirado da API pública."
            : "Alterações salvas no banco. A versão pública não foi alterada.",
      );
      if (creating) {
        window.history.replaceState(null, "", `/integracoes/blog/${result.id}`);
      }
    } catch (e) {
      setError(
        getApiErrorMessage(
          e,
          "Operação não concluída. O conteúdo salvo foi preservado.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={`${styles.page} ${styles.editorPage} ${activeTab === "preview" ? styles.fullPreviewEditor : ""}`}>
      <EditorTabs
        active={activeTab}
        onChange={selectTab}
        onBack={backToBlog}
        showTabs={Boolean(article)}
      />
      <div className={styles.editorBody}>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        {message && (
          <p role="status" className={styles.notice}>
            {message}
          </p>
        )}
        {!article ? (
          <p>Carregando editor…</p>
        ) : (
          <>
            <form
              ref={form}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className={styles.stack}
            >
              <fieldset disabled={busy} className={styles.fields}>
                <section
                  className={styles.tabPanel}
                  id="article-panel-information"
                  role="tabpanel"
                  aria-labelledby="article-tab-information"
                  hidden={activeTab !== "information"}
                  tabIndex={0}
                >
                  <ArticleInformation
                    article={article}
                    categories={categories}
                    authors={authors}
                    existing={Boolean(id)}
                    onChange={patch}
                    onBusyChange={trackUpload}
                  />
                </section>
                <section
                  className={styles.tabPanel}
                  id="article-panel-content"
                  role="tabpanel"
                  aria-labelledby="article-tab-content"
                  hidden={activeTab !== "content"}
                  tabIndex={0}
                >
                  <div
                    className={styles.contentWorkspace}
                    data-split={sidePreview}
                  >
                    <BlockEditor
                      value={article.content}
                      onChange={(content) => patch({ content })}
                      onBusyChange={trackUpload}
                      disabled={busy}
                      sidePreview={sidePreview}
                      onToggleSidePreview={() =>
                        setSidePreview((value) => !value)
                      }
                    />
                    {sidePreview && activeTab === "content" && (
                      <aside aria-label="Prévia completa ao lado do editor">
                        <ArticlePreview
                          article={article}
                          previewId="article-side-preview"
                        />
                      </aside>
                    )}
                  </div>
                </section>
                <section
                  className={`${styles.tabPanel} ${styles.previewPage}`}
                  id="article-panel-preview"
                  role="tabpanel"
                  aria-labelledby="article-tab-preview"
                  hidden={activeTab !== "preview"}
                  tabIndex={0}
                  data-ui="blog-live-preview"
                >
                  {activeTab === "preview" && (
                    <ArticlePreview
                      article={article}
                      previewId="article-page-preview"
                      fullSize
                    />
                  )}
                </section>
              </fieldset>
              <fieldset disabled={uploading || busy} className={styles.fields}>
                <div className={`${styles.actions} ${styles.editorActions}`}>
                  <button disabled={busy} type="submit">
                    <FiSave aria-hidden="true" />
                    {busy ? "Salvando…" : "Salvar"}
                  </button>
                  <button
                    disabled={busy}
                    type="button"
                    onClick={() => void save("publish")}
                  >
                    <FiUploadCloud aria-hidden="true" />
                    {article.status === "published" ? "Atualizar" : "Publicar"}
                  </button>
                  {!creating && (
                    <>
                      <button
                        disabled={busy}
                        type="button"
                        title="Retirar publicação e voltar a rascunho"
                        aria-label="Retirar publicação e voltar a rascunho"
                        onClick={() => void save("unpublish")}
                      >
                        <FiEdit3 aria-hidden="true" />
                        <span className={styles.srOnly}>Despublicar</span>
                      </button>
                      <button
                        disabled={busy}
                        type="button"
                        title="Arquivar artigo"
                        aria-label="Arquivar artigo"
                        onClick={() => void save("archive")}
                      >
                        <FiArchive aria-hidden="true" />
                        <span className={styles.srOnly}>Arquivar</span>
                      </button>
                    </>
                  )}
                </div>
              </fieldset>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
