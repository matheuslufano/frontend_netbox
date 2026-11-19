import { useState } from "react";
import { LuCalendarCheck, LuCirclePause, LuSave, LuSettings } from "react-icons/lu";
import { CampaignDateCalendar } from "./CampaignSchedule";
import { campaignSettingsFieldLabels } from "./CampaignSettings";
import { requiredDocumentApprovals, type CampaignConfig, type Dashboard } from "./types";
import styles from "./CampaignSettings.module.css";

export type CampaignActivationAction =
  | { operation: "save"; version: number; config: CampaignConfig }
  | { operation: "publish-local"; version: number; dates: string[] }
  | { operation: "publish" | "close"; version: number };

const settingsFieldLink = (field: string) => `?secao=settings&campo=${encodeURIComponent(field)}`;

export default function CampaignActivation({ dashboard, busy, onAction, openSettings }: {
  dashboard: Dashboard;
  busy: boolean;
  onAction: (action: CampaignActivationAction) => Promise<boolean | undefined>;
  openSettings: () => void;
}) {
  const { config, settings, registrations, missing, mailConfigured, localTestEnabled } = dashboard;
  const draft = settings?.draft ?? config;
  const version = settings?.version ?? 0;
  const [editedDates, setEditedDates] = useState<{ version: number; dates: string[] }>();
  const [confirmation, setConfirmation] = useState<"publish" | "close" | null>(null);
  const savedDates = localTestEnabled && config.localTest ? config.dates : draft.dates;
  const dates = editedDates?.version === version ? editedDates.dates : savedDates;
  const changed = dates.length !== savedDates.length || dates.some((date) => !savedDates.includes(date));
  const hasApprovedDocuments = requiredDocumentApprovals.every(
    (key) => settings?.reviews[key]?.status === "approved",
  );
  const canPublish = dates.length > 0 && (localTestEnabled || (!changed && !missing.length && hasApprovedDocuments && mailConfigured));

  async function confirm() {
    if (!confirmation) return;
    const result = await onAction(confirmation === "publish" && localTestEnabled
      ? { operation: "publish-local", version, dates }
      : { operation: confirmation, version });
    if (result) {
      if (confirmation === "close" && changed) setEditedDates({ version: version + 1, dates });
      setConfirmation(null);
    }
  }

  return (
    <section id="locomotiva-activation" className={styles.workspace} aria-labelledby="locomotiva-activation-title">
      <header>
        <h2 id="locomotiva-activation-title">Ativação da campanha</h2>
        <p role="status">{config.published ? `Inscrições abertas · ${config.dates.length} datas na configuração publicada` : "Inscrições fechadas"}</p>
      </header>
      <div className={styles.section}>
        <h3>Datas disponíveis para visitas</h3>
        <p>Marque os dias que poderão ser escolhidos no formulário. O calendário mostra a seleção do rascunho e sinaliza os dias ocupados.</p>
        <CampaignDateCalendar id="locomotiva-activation-calendar" selectedDates={dates} registrations={registrations} disabled={busy} onChange={(selection) => {
          setEditedDates({ version, dates: selection });
          setConfirmation(null);
        }} />
        <div className={styles.actions}>
          <button id="locomotiva-activation-save-dates" type="button" disabled={!changed || busy} onClick={() => void onAction({ operation: "save", version, config: { ...draft, dates } })}><LuSave aria-hidden="true" /> Salvar datas</button>
          <span>{changed ? "Seleção ainda não salva" : "Seleção salva no rascunho"}</span>
        </div>
      </div>
      <div className={styles.section}>
        <h3>Inscrições</h3>
        {localTestEnabled && <p className={styles.pendingSettings}>Modo de teste local. Selecione ao menos uma data futura e confirme a ativação. Sem horários cadastrados, o sistema usa 11h30. Use dados fictícios. Nenhum e-mail será enviado para reservas de teste.</p>}
        {!localTestEnabled && changed && <p>Salve as datas para publicar a nova seleção.</p>}
        {!localTestEnabled && !hasApprovedDocuments && <p>Aprove o termo de uso de imagem e o aviso de privacidade em Configurações.</p>}
        {!localTestEnabled && missing.length > 0 && <div id="locomotiva-activation-pending" className={styles.pendingSettings}>
          <strong><a href={settingsFieldLink(missing[0])}>{missing.length === 1 ? "Há 1 configuração pendente." : `Há ${missing.length} configurações pendentes.`}</a></strong>
          <ul>{missing.map((field) => (
            <li key={field}><a id={`locomotiva-activation-pending-${field}`} href={settingsFieldLink(field)}>{campaignSettingsFieldLabels[field] ?? field}</a></li>
          ))}</ul>
        </div>}
        {!localTestEnabled && !mailConfigured && <p>O envio de e-mails precisa ser configurado pelo administrador técnico.</p>}
        <div className={styles.actions}>
          <button id="locomotiva-activation-toggle" className={styles.activationButton} type="button" disabled={busy || (!config.published && !canPublish)} onClick={() => setConfirmation(config.published ? "close" : "publish")}>
            {config.published ? <LuCirclePause aria-hidden="true" /> : <LuCalendarCheck aria-hidden="true" />}
            {config.published ? "Desativar campanha" : localTestEnabled ? "Ativar teste local" : "Ativar campanha"}
          </button>
          {config.published && <button id="locomotiva-activation-publish" type="button" disabled={busy || !canPublish} onClick={() => setConfirmation("publish")}>Publicar alterações</button>}
          <button id="locomotiva-activation-settings" type="button" onClick={openSettings}><LuSettings aria-hidden="true" /> Ver configurações</button>
        </div>
        {confirmation && <div id="locomotiva-activation-confirmation" className={styles.document} role="group" aria-label="Confirmar alteração nas inscrições">
          <p>{confirmation === "close" ? "O fechamento bloqueia novos cadastros e preserva as reservas existentes." : localTestEnabled ? `Liberar o formulário de teste com ${dates.length} datas selecionadas?` : `A configuração salva, incluindo ${dates.length} datas selecionadas, ficará disponível no formulário público.`}</p>
          <div className={styles.actions}>
            <button id="locomotiva-activation-confirm" type="button" disabled={busy || (confirmation === "publish" && !canPublish)} onClick={() => void confirm()}>Confirmar {confirmation === "close" ? "fechamento" : "publicação"}</button>
            <button type="button" disabled={busy} onClick={() => setConfirmation(null)}>Cancelar</button>
          </div>
        </div>}
      </div>
    </section>
  );
}
