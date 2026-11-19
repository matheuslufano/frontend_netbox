"use client";
import { useState } from "react";
import { LuSave } from "react-icons/lu";
import type { CampaignConfig } from "./types";
import { configLabels } from "./types";
import styles from "./campaign.module.css";
export default function CampaignSettings({
  config,
  busy,
  missing,
  mailConfigured,
  onSave,
}: {
  config: CampaignConfig;
  busy: boolean;
  missing: string[];
  mailConfigured: boolean;
  onSave: (config: CampaignConfig) => Promise<void>;
}) {
  const [draft, setDraft] = useState(config);
  const set = (key: string, value: string | number | boolean | string[]) =>
    setDraft((c) => ({ ...c, [key]: value }));
  const groups = [
    { id: "restaurant", title: "Restaurante e responsáveis", keys: ["address", "contact", "approvedBy"] },
    { id: "conditions", title: "Etapa 1 · Condições, voucher e privacidade", keys: ["voucher", "companions", "excess", "balance", "cancellation", "conditions", "privacy"] },
    { id: "image", title: "Etapa 1 · Autorização de uso de imagem", keys: ["imageTerm", "imageChannels", "imagePurpose", "imageDuration", "imageEditing", "imagePromotion"] },
    { id: "content", title: "Etapa 3 · Produção e publicação de conteúdo", keys: ["publication", "tags"] },
  ];
  return (
    <form
      id="locomotiva-settings-form"
      className={styles.panel}
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(draft);
      }}
    >
      <h2>Configurações e documentos aprovados</h2>
      <p>
        Preencha somente condições aprovadas pelos responsáveis. Cada salvamento
        gera uma versão: participantes precisam aceitar novamente antes do
        envio. Não há horários de chegada presumidos.
      </p>
      <p id="locomotiva-settings-status" role="status">Estado salvo: {config.published ? "inscrições abertas" : "inscrições fechadas"} · versão {config.revision}.</p>
      {missing.length > 0 && <p className={styles.alert}>Pendências da versão salva: {missing.map(key => configLabels[key] || (key === "arrivalTimes" ? "Horários de chegada" : key)).join("; ")}. Preencha os campos e salve antes de abrir as inscrições.</p>}
      <p>E-mail do servidor: {mailConfigured ? "configurado" : "pendente de SMTP e remetente no backend"}. Credenciais são configuradas somente no ambiente do servidor.</p>
      <h3>Etapa 3 · Datas e horários da visita</h3>
      <p>A campanha atual permite datas entre 21 e 30 de novembro de 2026, com um influenciador por dia. Informe horários no formato HH:MM, separados por vírgula.</p>
      <div className={styles.fields}>
        <label>
          Datas oferecidas (separadas por vírgula)
          <input
            id="locomotiva-settings-dates"
            value={draft.dates.join(", ")}
            onChange={(e) =>
              set(
                "dates",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </label>
        {(["lunch", "dinner"] as const).map((period) => (
          <label key={period}>
            {period === "lunch"
              ? "Chegadas no almoço (11h até antes das 15h)"
              : "Chegadas no jantar (18h até antes das 23h)"}
            <input
              id={`locomotiva-settings-${period}`}
              placeholder="HH:MM, HH:MM"
              value={draft[period].join(", ")}
              onChange={(e) =>
                set(
                  period,
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
        ))}
        <label>
          Antecedência mínima em horas
          <input
            id="locomotiva-settings-minimum-hours"
            type="number"
            min="0"
            max="720"
            value={draft.minimumHours}
            onChange={(e) => set("minimumHours", Number(e.target.value))}
          />
        </label>
      </div>
      {groups.map((group) => <details key={group.id} id={`locomotiva-settings-group-${group.id}`} open>
        <summary>{group.title}</summary>
        <div className={styles.fields}>
        {group.keys.map((key) => (
          <label key={key}>
            {configLabels[key]}
            <textarea
              id={`locomotiva-settings-${key}`}
              rows={
                ["conditions", "imageTerm", "privacy"].includes(key) ? 8 : 3
              }
              value={String(draft[key] || "")}
              onChange={(e) => set(key, e.target.value)}
            />
            {!draft[key] && <small>Pendente de definição / aprovação</small>}
          </label>
        ))}
        </div>
      </details>)}
      <p>Etapa 2: nome, CPF, e-mail e confirmação, WhatsApp, cidade/UF e perfil do Instagram seguem a validação obrigatória do cadastro. Etapa final: o recebimento da solicitação mantém a participação em análise; a confirmação depende de aprovação por e-mail.</p>
      <label className={styles.check}>
        <input
          id="locomotiva-settings-published"
          type="checkbox"
          checked={draft.published}
          onChange={(e) => set("published", e.target.checked)}
        />
        Abrir inscrições com estes documentos e condições aprovados
      </label>
      <button id="locomotiva-settings-save" disabled={busy} type="submit">
        <LuSave />
        Salvar configurações
      </button>
    </form>
  );
}
