"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowLeft, FiCheck, FiCopy, FiDownload, FiExternalLink, FiLink } from "react-icons/fi";
import {
  Affiliate,
  AffiliateCode,
  WhatsAppLinkItem,
  criarLinkWhatsApp,
  editarLinkWhatsApp,
  getApiErrorMessage,
  listarAfiliados,
  listarCodigosAfiliados,
  listarLinksWhatsApp,
  obterConfiguracaoWhatsApp,
} from "@/lib/api";
import WhatsAppLinksTable from "./WhatsAppLinksTable";
import WhatsAppMessageEditor from "./WhatsAppMessageEditor";
import WhatsAppPreview from "./WhatsAppPreview";
import {
  DEFAULT_IDENTIFICATION_TEMPLATE,
  buildPreviewMessage,
  maskBrazilianPhone,
  normalizeBrazilianPhone,
} from "./whatsappLink";
import styles from "./whatsapp.module.css";

const initialMessage = "Olá, gostaria de conhecer os planos da Netbox.";

export default function WhatsAppLinkPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [codes, setCodes] = useState<AffiliateCode[]>([]);
  const [items, setItems] = useState<WhatsAppLinkItem[]>([]);
  const [linkName, setLinkName] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [codeMode, setCodeMode] = useState<"existing" | "new">("existing");
  const [affiliateCodeId, setAffiliateCodeId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [appendCode, setAppendCode] = useState(true);
  const [template, setTemplate] = useState(DEFAULT_IDENTIFICATION_TEMPLATE);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [savedResult, setSavedResult] = useState<WhatsAppLinkItem | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const activeAffiliates = useMemo(() => affiliates.filter((item) => item.active).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [affiliates]);
  const selectedAffiliate = activeAffiliates.find((item) => item.id === Number(affiliateId));
  const selectedCode = codes.find((item) => item.id === Number(affiliateCodeId));
  const previewCode = codeMode === "new" ? "NOVO CÓDIGO" : selectedCode?.code || "{{codigo}}";
  const finalMessage = buildPreviewMessage(message, template, appendCode, {
    codigo: previewCode,
    afiliado: selectedAffiliate?.name,
  });

  const loadItems = useCallback(async () => setItems(await listarLinksWhatsApp()), []);

  useEffect(() => {
    Promise.all([listarAfiliados(), listarLinksWhatsApp(), obterConfiguracaoWhatsApp()])
      .then(([affiliateData, linkData, config]) => {
        setAffiliates(affiliateData);
        setItems(linkData);
        if (config.whatsappNumber) setPhone(maskBrazilianPhone(config.whatsappNumber));
      })
      .catch((err) => setError(getApiErrorMessage(err, "Não foi possível carregar o gerador.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!affiliateId) return;
    listarCodigosAfiliados({ affiliateId: Number(affiliateId) })
      .then(setCodes)
      .catch(() => setCodes([]));
  }, [affiliateId]);

  function validate() {
    if (!linkName.trim()) return "Informe um nome para o link.";
    if (linkName.trim().length > 120) return "O nome do link deve ter no máximo 120 caracteres.";
    if (!affiliateId) return "Selecione um afiliado.";
    if (codeMode === "existing" && !affiliateCodeId) return "Selecione um código de afiliado.";
    if (!/^55[1-9]{2}9?\d{8}$/.test(normalizeBrazilianPhone(phone))) return "Informe um WhatsApp brasileiro válido, com DDD.";
    if (message.length > 1000) return "A mensagem deve ter no máximo 1000 caracteres.";
    if (appendCode && !template.includes("{{codigo}}")) return "O texto de identificação deve conter {{codigo}}.";
    return "";
  }

  async function save() {
    const validation = validate();
    if (validation) { setError(validation); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = {
        name: linkName.trim(),
        affiliateId: Number(affiliateId),
        ...(codeMode === "existing" ? { affiliateCodeId: Number(affiliateCodeId) } : { generateNewCode: true }),
        whatsappNumber: normalizeBrazilianPhone(phone), message,
        appendAffiliateCode: appendCode, identificationTemplate: template,
      };
      const saved = editingId
        ? await editarLinkWhatsApp(editingId, payload)
        : await criarLinkWhatsApp(payload);
      setSavedResult(saved); setGeneratedUrl(saved.whatsappUrl); setEditingId(saved.id);
      setCodeMode("existing");
      setAffiliateCodeId(String(saved.affiliateCodeId));
      setNotice(editingId ? "Link atualizado com sucesso." : "Link salvo com sucesso.");
      await loadItems();
    } catch (err) { setError(getApiErrorMessage(err, "Não foi possível salvar o link.")); }
    finally { setSaving(false); }
  }

  async function copyUrl(url: string, success = "Link copiado com sucesso.") {
    try { await navigator.clipboard.writeText(url); setNotice(success); setError(""); }
    catch { setError("Não foi possível copiar o link."); }
  }

  function loadFromItem(item: WhatsAppLinkItem, edit: boolean) {
    setLinkName(edit ? item.name : `${item.name} - cópia`);
    setAffiliateId(String(item.affiliateId)); setCodeMode("existing"); setAffiliateCodeId(String(item.affiliateCodeId));
    setPhone(maskBrazilianPhone(item.whatsappNumber)); setMessage(item.originalMessage);
    setAppendCode(item.appendAffiliateCode); setTemplate(item.identificationTemplate);
    setGeneratedUrl(edit ? item.whatsappUrl : ""); setSavedResult(edit ? item : null);
    setEditingId(edit ? item.id : null); setNotice(edit ? "Link carregado para edição." : "Configurações duplicadas. Gere e salve a nova variação.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggle(item: WhatsAppLinkItem) {
    try { await editarLinkWhatsApp(item.id, { active: !item.active }); await loadItems(); setNotice(`Link ${item.active ? "desativado" : "ativado"} com sucesso.`); }
    catch (err) { setError(getApiErrorMessage(err, "Não foi possível alterar o status.")); }
  }

  function downloadQr() {
    if (!savedResult?.qrCode) return;
    const anchor = document.createElement("a"); anchor.href = savedResult.qrCode;
    anchor.download = `whatsapp-link-${savedResult.id}.png`; anchor.click();
  }

  if (loading) return <main className={styles.page}><p className={styles.loading}>Carregando gerador...</p></main>;

  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/links-campanhas" className={styles.back}><FiArrowLeft /> Links e Campanhas</Link>
      <div className={styles.heroIcon}><FaWhatsapp /></div><div><span className={styles.kicker}>Rastreamento e conversão</span><h1>Links personalizados do WhatsApp</h1><p>Vincule individualmente cada afiliado e seu código a uma mensagem rastreável.</p></div>
    </header>
    {(notice || error) && <div className={error ? styles.toastError : styles.toast} role={error ? "alert" : "status"}>{error || <><FiCheck /> {notice}</>}</div>}
    <div className={styles.builderGrid}>
      <section className={styles.formCard}>
        <div className={styles.sectionTitle}><FiLink /><div><h2>Configuração do link</h2><p>Defina a atribuição antes de montar a mensagem.</p></div></div>
        <label className={styles.field}><span>Nome do link</span><input value={linkName} onChange={(e) => setLinkName(e.target.value)} maxLength={120} placeholder="Ex.: Campanha Setembro — João" autoComplete="off" /></label>
        <label className={styles.field}><span>Afiliado</span><select value={affiliateId} onChange={(e) => { setAffiliateId(e.target.value); setAffiliateCodeId(""); setCodes([]); }}><option value="">Selecione</option>{activeAffiliates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <fieldset className={styles.codeBox}><legend>Identificação do afiliado</legend><div className={styles.segmented}>
          <label><input type="radio" checked={codeMode === "existing"} onChange={() => setCodeMode("existing")} /> Usar código existente</label>
          <label><input type="radio" checked={codeMode === "new"} onChange={() => setCodeMode("new")} /> Gerar novo código</label>
        </div>{codeMode === "existing" ? <label className={styles.field}><span>Código / link existente</span><select value={affiliateCodeId} onChange={(e) => setAffiliateCodeId(e.target.value)} disabled={!affiliateId}><option value="">{codes.length ? "Selecione" : "Nenhum código para este afiliado"}</option>{codes.map((item) => <option key={item.id} value={item.id}>{item.code} • {new Date(item.createdAt).toLocaleDateString("pt-BR")}</option>)}</select></label> : <p className={styles.info}>Um novo código de 8 caracteres será criado e vinculado individualmente ao afiliado selecionado.</p>}</fieldset>
        <label className={styles.field}><span>Número do WhatsApp</span><input value={phone} onChange={(e) => setPhone(maskBrazilianPhone(e.target.value))} inputMode="tel" placeholder="(63) 99999-9999" /></label>
        <label className={styles.field} htmlFor="whatsapp-message"><span>Mensagem que será enviada pelo cliente</span></label><WhatsAppMessageEditor value={message} onChange={setMessage} />
        <label className={styles.switchRow}><input type="checkbox" checked={appendCode} onChange={(e) => setAppendCode(e.target.checked)} /><span><strong>Adicionar identificação do afiliado à mensagem</strong><small>Recomendado para atribuição futura no Chatmix.</small></span></label>
        {appendCode && <label className={styles.field}><span>Texto de identificação</span><input value={template} onChange={(e) => setTemplate(e.target.value)} maxLength={500} /><small>Variáveis: {"{{codigo}}"}, {"{{afiliado}}"}</small></label>}
        <div className={styles.mainActions}><button type="button" className={styles.primaryButton} onClick={save} disabled={saving}><FaWhatsapp /> {saving ? "Gerando e salvando..." : editingId ? "Salvar alterações" : "Gerar e salvar link"}</button></div>
      </section>
      <aside className={styles.previewColumn}><WhatsAppPreview message={finalMessage} />
        {generatedUrl && <section className={styles.resultCard}><span className={styles.kicker}>Resultado</span><h2>Link gerado</h2><input readOnly value={generatedUrl} aria-label="Link gerado" /><div className={styles.resultActions}><button type="button" onClick={() => copyUrl(generatedUrl)}><FiCopy /> Copiar link</button><a href={generatedUrl} target="_blank" rel="noreferrer"><FiExternalLink /> Abrir WhatsApp</a>{savedResult && <button type="button" onClick={downloadQr}><FiDownload /> Baixar QR Code</button>}</div>{savedResult && <div className={styles.qr}><img src={savedResult.qrCode} alt="QR Code do link WhatsApp" /><small>ID do link: {savedResult.id} • Código: {savedResult.affiliateCode}</small></div>}</section>}
      </aside>
    </div>
    <WhatsAppLinksTable items={items} onCopy={(item) => copyUrl(item.whatsappUrl)} onEdit={(item) => loadFromItem(item, true)} onDuplicate={(item) => loadFromItem(item, false)} onToggle={toggle} />
  </main>;
}
