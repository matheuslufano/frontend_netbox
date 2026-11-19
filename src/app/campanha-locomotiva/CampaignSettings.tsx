"use client";

import { useEffect, useState } from "react";
import { LuExternalLink, LuSave, LuSend } from "react-icons/lu";
import CampaignSchedule from "./CampaignSchedule";
import CampaignRuleFields from "./CampaignRuleFields";
import { configLabels, requiredDocumentApprovals, type CampaignConfig, type Dashboard, type SettingsOperation } from "./types";
import styles from "./CampaignSettings.module.css";

const sections = [
  { id: "restaurant", title: "Restaurante e contato", fields: ["address", "contact"] },
  { id: "schedule", title: "Datas e horários", fields: ["dates", "arrivalTimes"] },
  { id: "voucher", title: "Voucher e acompanhantes", fields: ["voucher", "companions", "excess", "balance", "cancellation"] },
  { id: "content", title: "Conteúdo do influenciador", fields: ["publication", "tags"] },
  { id: "image", title: "Uso de imagem", fields: ["imageChannels", "imagePurpose", "imageDuration", "imageEditing", "imagePromotion"] },
  { id: "documents", title: "Documentos e aprovação", fields: ["approvedBy", "conditions", "imageTerm", "privacy"] },
  { id: "publication", title: "Publicação e inscrições", fields: ["mail"] },
];
const documents = ["conditions", "imageTerm", "privacy"];
const notes = /rascunho|\bminuta\b|\bpendente de\b|\ba confirmar\b/i;
export const campaignSettingsFieldLabels: Record<string, string> = {
  ...configLabels, address: "Endereço da visita", contact: "Contato da campanha", dates: "Datas da campanha",
  arrivalTimes: "Horários de chegada", voucher: "Como utilizar o voucher", cancellation: "Cancelamento, reagendamento e ausência",
  conditions: "Regulamento da campanha", imageTerm: "Termo de autorização de uso de imagem", privacy: "Aviso de privacidade",
  approvedBy: "Responsável pela revisão", publication: "Orientações ao influenciador", mail: "Envio de e-mails",
};
const labels = campaignSettingsFieldLabels;
const guidance: Record<string, string> = {
  address: "Informe rua, número, bairro e cidade. Será mostrado na confirmação da visita.",
  contact: "Canal que o influenciador poderá usar para dúvidas e cancelamentos.",
  approvedBy: "Pessoa responsável por revisar as condições e os documentos.",
  voucher: "Informe onde validar o voucher, o que ele cobre e em qual visita poderá ser usado.",
  companions: "Explique se são permitidos e como o consumo deles será tratado.",
  excess: "Informe quem paga quando a conta ultrapassar o valor do voucher.",
  balance: "Explique o que acontece quando o consumo é menor que o crédito.",
  cancellation: "Informe a antecedência, o canal e as consequências previstas.",
};
const fieldId = (key: string) => `locomotiva-settings-${key === "arrivalTimes" ? "lunch" : key}`;
const sectionForField = (key: string) => sections.find((item) => item.fields.includes(key));
const focusField = (key: string) => document.getElementById(key === "tags" ? "locomotiva-settings-tag-list" : fieldId(key))?.focus();
type SettingsPayload = { operation: SettingsOperation; version: number; config?: CampaignConfig; document?: string };

export default function CampaignSettings({ dashboard, busy, onAction, initialField = "" }: {
  dashboard: Dashboard;
  busy: boolean;
  initialField?: string;
  onAction: (payload: SettingsPayload) => Promise<boolean | undefined>;
}) {
  const { config, settings, mailConfigured, registrations, canReadCpf } = dashboard;
  const saved = settings?.draft ?? config;
  const [edits, setEdits] = useState<{ base: number; draft: CampaignConfig }>();
  const version = settings?.version ?? 0;
  const draft = edits?.base === version ? edits.draft : saved;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const [selected, setSelected] = useState(() => sectionForField(initialField)?.id ?? "restaurant");
  useEffect(() => {
    if (sectionForField(initialField)) focusField(initialField);
  }, [initialField]);
  const [confirmation, setConfirmation] = useState<"publish" | "close" | null>(null);
  const contact = String(draft.contact ?? "");
  const contactParts = /^(WhatsApp|Telefone|E-mail):\s*([\s\S]*)$/.exec(contact);
  const contactChannel = contactParts?.[1] ?? "";
  const [tag, setTag] = useState("");
  const [tagError, setTagError] = useState("");
  const section = sections.find((item) => item.id === selected) ?? sections[0];
  const update = (key: string, value: string | string[] | number) => setEdits({ base: version, draft: { ...draft, [key]: value } });
  const execute = (operation: SettingsOperation, document?: string) => onAction({ operation, version, document, ...(operation === "save" ? { config: draft } : {}) });
  const missing = (key: string) => {
    if (key === "arrivalTimes") return !draft.lunch.length && !draft.dinner.length;
    if (key === "dates") return !draft.dates.length;
    if (key === "mail") return !mailConfigured;
    if (key === "contact") return !(contactParts?.[2] ?? contact).trim();
    if (key === "imagePromotion" && String(draft[key]).trim() === "Anúncios pagos: Permitido conforme condições específicas") return true;
    return !String(draft[key] ?? "").trim();
  };
  const rulesChanged = Object.keys(draft).some((key) => key !== "approvedBy" &&
    JSON.stringify(draft[key]) !== JSON.stringify(saved[key]));
  const needsReview = (key: string) => requiredDocumentApprovals.includes(key) &&
    (rulesChanged || settings?.reviews[key]?.status !== "approved" || notes.test(String(draft[key] ?? "")));
  const pending = sections.flatMap((item) => item.fields.filter((key) => missing(key) || needsReview(key)));
  function jump(key: string) {
    const target = sectionForField(key);
    if (!target) return;
    setSelected(target.id);
    requestAnimationFrame(() => focusField(key));
  }
  function field(key: string, short = false) {
    const control = { id: fieldId(key), value: String(draft[key] ?? ""), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, event.target.value) };
    return <label key={key}>{labels[key]} · obrigatório
      {short ? <input {...control} /> : <textarea {...control} rows={documents.includes(key) ? 12 : 4} />}
      {guidance[key] && <small>{guidance[key]}</small>}
    </label>;
  }
  return <section id="locomotiva-settings" className={styles.workspace}>
    <header>
      <h2>Configurações da Campanha Locomotiva</h2>
      <p role="status">{config.published ? "Inscrições abertas" : "Inscrições fechadas"} · {dirty ? "Alterações não salvas" : "Alterações salvas"}</p>
      <p>Versão pública {config.revision || "—"} · Última atualização {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleString("pt-BR") : "não registrada"}</p>
      <div className={styles.actions}>
        <a href="https://locomotiva-six.vercel.app/campanha-locomotiva/" target="_blank" rel="noreferrer"><LuExternalLink /> Visualizar página pública</a>
        <button id="locomotiva-settings-review-publication" type="button" onClick={() => { setSelected("publication"); setConfirmation("publish"); }}><LuSend /> {config.published ? "Revisar e publicar atualização" : "Revisar e abrir inscrições"}</button>
      </div>
      <details>
        <summary>{pending.length ? `Faltam ${pending.length} configurações para abrir as inscrições.` : "Configurações prontas para publicação."}</summary>
        <ul>{pending.map((key) => <li key={key}><button type="button" onClick={() => jump(key)}>{labels[key]}{!missing(key) ? " · precisa de revisão" : ""}</button></li>)}</ul>
      </details>
    </header>
    <div className={styles.layout}>
      <nav aria-label="Seções de configuração" className={styles.navigation}>
        {sections.map((item) => <button key={item.id} type="button" aria-current={item.id === selected ? "true" : undefined} onClick={() => { setSelected(item.id); setConfirmation(null); }}>
          {item.title}<small>{item.fields.some(missing) ? "Pendente" : item.fields.some(needsReview) ? "Precisa de revisão" : "Preenchida"}</small>
        </button>)}
      </nav>
      <label className={styles.sectionPicker}>Seção de configuração
        <select id="locomotiva-settings-section" value={selected} onChange={(event) => { setSelected(event.target.value); setConfirmation(null); }}>
          {sections.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.fields.some(missing) ? "Pendente" : item.fields.some(needsReview) ? "Precisa de revisão" : "Preenchida"}</option>)}
        </select>
      </label>
      <section key={section.id} id={`locomotiva-settings-section-${section.id}`} className={styles.section}>
        <h3>{section.title}</h3>
        {section.id === "restaurant" && <>
          {field("address", true)}
          <label>Canal de atendimento <select id="locomotiva-settings-contact-channel" value={contactChannel} onChange={(event) => {
            const value = contactParts?.[2] ?? contact;
            update("contact", event.target.value ? `${event.target.value}: ${value}` : value);
          }}><option value="">Selecionar canal</option>{["WhatsApp", "Telefone", "E-mail"].map((channel) => <option key={channel}>{channel}</option>)}</select></label>
          <label>{labels.contact} · obrigatório
            <input id={fieldId("contact")} inputMode={contactChannel === "E-mail" ? "email" : contactChannel ? "tel" : "text"} value={contactParts?.[2] ?? contact} onChange={(event) => update("contact", contactChannel ? `${contactChannel}: ${event.target.value}` : event.target.value)} />
            <small>{guidance.contact} Identifique o canal no texto se houver mais de um.</small>
          </label>
        </>}
        {section.id === "schedule" && <CampaignSchedule draft={draft} registrations={registrations} update={update} />}
        {section.id === "voucher" && <>
          <CampaignRuleFields field="voucher" text={String(draft.voucher ?? "")} onChange={(value) => update("voucher", value)} rules={[{ label: "Valor do voucher (R$)", type: "number", step: "0.01", hint: "Crédito total concedido para a visita aprovada. Confira a regra existente antes de informar um valor." }]} />
          {section.fields.map((key) => field(key))}
        </>}
        {section.id === "content" && <>
          <p>Modalidades disponíveis: 4 Stories ou 1 Reels de 60 segundos.</p>
          <div className={styles.shortFields}>
            <CampaignRuleFields field="publication" text={String(draft.publication ?? "")} onChange={(value) => update("publication", value)} rules={[
              { label: "Prazo para publicar após a visita (horas)", type: "number" },
              { label: "Permanência dos Stories (horas)", type: "number" },
              { label: "Permanência do Reels (dias)", type: "number" },
              { label: "Prazo para enviar comprovantes (horas)", type: "number" },
            ]} />
          </div>
          <small>Confira os prazos no texto existente antes de definir novos valores. O texto completo será mostrado ao influenciador.</small>
          {field("publication")}
          <fieldset id="locomotiva-settings-tag-list" tabIndex={-1}>
            <legend>Perfis que devem ser marcados · obrigatório</legend>
            <p>Orientação atual: {String(draft.tags || "nenhuma")}</p>
            <label>Adicionar perfil<input id="locomotiva-settings-profile" value={tag} onChange={(event) => setTag(event.target.value)} placeholder="@perfil" /></label>
            <button type="button" onClick={() => {
              const profile = tag.replace(/^@/, "").trim().toLowerCase();
              if (!/^[a-z0-9._]{1,30}$/.test(profile) || String(draft.tags).toLowerCase().match(/@[a-z0-9._]+/g)?.includes(`@${profile}`)) {
                setTagError("Informe um perfil válido que ainda não esteja na lista.");
                return;
              }
              update("tags", [draft.tags, `@${profile}`].filter(Boolean).join("\n"));
              setTag("");
              setTagError("");
            }}>Adicionar perfil</button>
            {tagError && <p role="alert">{tagError}</p>}
            {String(draft.tags ?? "").split("\n").filter((line) => /^@[a-z0-9._]+$/i.test(line)).map((line, index) => <button key={`${line}-${index}`} type="button" aria-label={`Remover ${line}`} onClick={() => update("tags", String(draft.tags).split("\n").filter((item) => item !== line).join("\n"))}>{line} ×</button>)}
            <details><summary>Revisar orientação original de marcação</summary>{field("tags", false)}</details>
          </fieldset>
          <details><summary>Assim o influenciador verá esta orientação</summary><div className={styles.preview}>{String(draft.publication ?? "")}{"\n"}{String(draft.tags ?? "")}</div></details>
        </>}
        {section.id === "image" && <>
          <CampaignRuleFields field="imageChannels" text={String(draft.imageChannels ?? "")} onChange={(value) => update("imageChannels", value)} rules={[
            { label: "Canal autorizado", options: ["Instagram orgânico", "Facebook orgânico", "Site oficial"] },
            { label: "Perfil autorizado" },
          ]} />
          <CampaignRuleFields field="imageDuration" text={String(draft.imageDuration ?? "")} onChange={(value) => update("imageDuration", value)} rules={[{ label: "Data de término da autorização", type: "date" }]} />
          <CampaignRuleFields field="imagePromotion" text={String(draft.imagePromotion ?? "")} onChange={(value) => update("imagePromotion", value)} rules={[{ label: "Anúncios pagos", options: ["Não permitido", "Permitido conforme condições específicas"] }]} />
          <small>Confira os limites no termo vigente. Se houver permissão específica para anúncios, descreva as condições no campo abaixo.</small>
          {section.fields.map((key) => field(key))}
          <button type="button" onClick={() => jump("imageTerm")}>Revisar termo completo</button>
        </>}
        {section.id === "documents" && <>
          {field("approvedBy", true)}
          {documents.map((key) => {
            const review = settings?.reviews[key];
            const status = rulesChanged ? "draft" : review?.status ?? "draft";
            const hasNotes = notes.test(String(draft[key] ?? ""));
            return <article key={key} className={styles.document}>
              <p>{({ draft: "Rascunho", review: "Em revisão", approved: "Aprovado" })[status]} · Versão {review?.version ?? "—"}</p>
              {status === "approved" && review?.at && <p>Aprovação por {review.by} em {new Date(review.at).toLocaleString("pt-BR")}</p>}
              {key === "conditions" && <p>A aprovação do regulamento é opcional para publicar. O texto salvo será exibido aos participantes.</p>}
              {hasNotes && <p role="status">Há possíveis notas internas. Revise o texto antes de aprovar.</p>}
              {field(key)}
              <details><summary>Pré-visualizar {labels[key].toLowerCase()}</summary><div className={styles.preview}>{String(draft[key] ?? "")}</div></details>
              <button type="button" disabled={busy || dirty || missing(key) || status !== "draft"} onClick={() => void execute("review", key)}>Enviar para revisão</button>
              <button type="button" disabled={busy || dirty || missing("approvedBy") || status !== "review" || hasNotes} onClick={() => void execute("approve", key)}>Aprovar documento</button>
            </article>;
          })}
        </>}
        {section.id === "publication" && <>
          <div id={fieldId("mail")} tabIndex={-1}>
            <p>Envio de e-mails: {mailConfigured ? "configuração presente" : "configuração pendente"}.</p>
            {!mailConfigured && <p>As confirmações por e-mail ainda não podem ser enviadas. Solicite a configuração ao administrador técnico.</p>}
            {canReadCpf && <details><summary>Detalhes técnicos</summary><p>Este indicador verifica a presença da configuração SMTP e do remetente. A entrega depende do provedor.</p></details>}
          </div>
          {config.published && <button type="button" onClick={() => setConfirmation("close")}>Fechar inscrições</button>}
          {confirmation && <div role="group" aria-label="Confirmar publicação" className={styles.document}>
            <p>{confirmation === "close" ? "Novos cadastros serão bloqueados. As solicitações existentes serão preservadas." : `A configuração salva será publicada com ${draft.dates.length} datas e ${draft.lunch.length + draft.dinner.length} horários. O regulamento salvo será exibido com o termo de imagem e o aviso de privacidade aprovados.`}</p>
            {confirmation === "publish" && pending.length > 0 && <p role="status">Resolva as pendências do resumo para continuar.</p>}
            {confirmation === "publish" && dirty && <p role="status">Salve as alterações antes de publicar.</p>}
            <button type="button" disabled={busy || (confirmation === "publish" && (dirty || pending.length > 0))} onClick={async () => {
              if (await execute(confirmation)) {
                if (confirmation === "close" && dirty) setEdits({ base: version + 1, draft });
                setConfirmation(null);
              }
            }}>{confirmation === "close" ? "Confirmar fechamento" : config.published ? "Confirmar publicação" : "Confirmar abertura"}</button>
            <button type="button" onClick={() => setConfirmation(null)}>Voltar</button>
          </div>}
        </>}
      </section>
    </div>
    <footer className={styles.actionBar}>
      <span>{dirty ? "Alterações não salvas" : "Alterações salvas"}</span>
      <button id="locomotiva-settings-save" type="button" disabled={busy || !dirty} onClick={() => void execute("save")}><LuSave /> Salvar alterações</button>
    </footer>
  </section>;
}
