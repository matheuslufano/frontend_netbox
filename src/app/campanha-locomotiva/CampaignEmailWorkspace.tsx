import { useState } from "react";
import { LuMail, LuSave, LuSend } from "react-icons/lu";
import api, { getApiErrorMessage } from "@/lib/api";
import CampaignDialog from "./CampaignDialog";
import type { Dashboard } from "./types";
import styles from "./CampaignWorkspace.module.css";

const templates = {
  RECEIVED: "Solicitação recebida",
  CONFIRMED: "Reserva aprovada",
  REJECTED: "Solicitação recusada",
  UPDATED: "Reagendamento",
  CANCELLED: "Cancelamento",
};
const examples = {
  nome: "Ana Costa",
  data: "23/11/2026",
  horario: "12:00",
  endereco: "Endereço de exemplo",
  voucher: "R$ 200,00",
  link: "https://locomotiva-six.vercel.app/campanha-locomotiva/",
};
const render = (value: string) =>
  value.replace(/\{\{([^{}]+)\}\}/g, (token, key: string) =>
    Object.hasOwn(examples, key)
      ? examples[key as keyof typeof examples]
      : token,
  );

export default function CampaignEmailWorkspace({
  dashboard,
  busy,
  onSave,
  onDirtyChange,
}: {
  dashboard: Dashboard;
  busy: boolean;
  onSave: (action: {
    operation: "save-mail-template";
    version: number;
    event: keyof typeof templates;
    subject: string;
    body: string;
  }) => Promise<boolean | undefined>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [event, setEvent] = useState<keyof typeof templates>("CONFIRMED");
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [device, setDevice] = useState("desktop");
  const [showTest, setShowTest] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState("");
  const draft = dashboard.settings?.draft ?? dashboard.config;
  const defaults = dashboard.mailTemplates?.[event];
  const bodyKey = `message${event}`;
  const subjectKey = `messageSubject${event}`;
  const body =
    changes[bodyKey] ?? (String(draft[bodyKey] ?? "") || defaults?.body || "");
  const subject =
    changes[subjectKey] ??
    (String(draft[subjectKey] ?? "") || defaults?.subject || "");
  const eventDirty = bodyKey in changes || subjectKey in changes;
  const unknown = [...(subject + "\n" + body).matchAll(/\{\{([^{}]+)\}\}/g)]
    .map((match) => match[1])
    .filter((key) => !Object.hasOwn(examples, key));
  const canTest =
    dashboard.mailConfigured &&
    dashboard.canReadCpf &&
    !dashboard.localTestEnabled;
  function update(key: string, value: string) {
    if (busy) return;
    setChanges((previous) => ({ ...previous, [key]: value }));
    onDirtyChange(true);
  }
  async function save() {
    if (
      await onSave({
        operation: "save-mail-template",
        version: dashboard.settings?.version ?? 0,
        event,
        subject,
        body,
      })
    ) {
      const remaining = { ...changes };
      delete remaining[bodyKey];
      delete remaining[subjectKey];
      setChanges(remaining);
      onDirtyChange(Object.keys(remaining).length > 0);
    }
  }
  async function sendTest() {
    setTestBusy(true);
    setTestResult("");
    try {
      await api.post("/admin/locomotiva/mail/test", {
        recipient,
        subject: render(
          subject.trim() || defaults?.subject || templates[event],
        ),
        text: render(body.trim() || defaults?.body || ""),
      });
      setTestResult(
        "Mensagem de teste aceita pelo provedor. A entrega depende do destinatário.",
      );
    } catch (error) {
      setTestResult(
        getApiErrorMessage(error, "O provedor não confirmou o envio."),
      );
    } finally {
      setTestBusy(false);
    }
  }
  return (
    <section
      id="locomotiva-email-editor"
      aria-labelledby="locomotiva-email-title"
    >
      <header className={styles.heading}>
        <h2 id="locomotiva-email-title" className={styles.title}>
          Edição do e-mail
        </h2>
        <div className={styles.row}>
          <button
            type="button"
            onClick={() => {
              setTestResult("");
              setShowTest(true);
            }}
          >
            <LuSend /> Enviar teste
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={!eventDirty || busy || !!unknown.length || !defaults}
            onClick={() => void save()}
          >
            <LuSave /> Salvar modelo
          </button>
        </div>
      </header>
      <div className={styles.mailGrid}>
        <nav
          className={`${styles.card} ${styles.stack}`}
          aria-label="Modelos de e-mail"
        >
          <strong>Modelos de e-mail</strong>
          {Object.entries(templates).map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={event === key}
              disabled={busy}
              onClick={() => setEvent(key as keyof typeof templates)}
            >
              <LuMail /> {label}
              {(`message${key}` in changes ||
                `messageSubject${key}` in changes) && <small>Não salvo</small>}
            </button>
          ))}
        </nav>
        <div className={`${styles.card} ${styles.stack}`}>
          <p role="status">
            {dashboard.mailConfigured
              ? "Canal de e-mail configurado"
              : "Envio não configurado. Solicite ao administrador técnico a configuração do SMTP."}
          </p>
          <label>
            Assunto
            <input
              id="locomotiva-email-subject"
              maxLength={160}
              value={subject}
              placeholder={templates[event]}
              onChange={(change) => update(subjectKey, change.target.value)}
            />
          </label>
          <div>
            <strong>Variáveis disponíveis</strong>
            <div className={styles.row}>
              {Object.keys(examples).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    update(bodyKey, `${body}{{${key}}}`.slice(0, 4000))
                  }
                >{`{{${key}}}`}</button>
              ))}
            </div>
          </div>
          <label>
            Corpo do e-mail
            <textarea
              id="locomotiva-email-body"
              rows={12}
              maxLength={4000}
              value={body}
              onChange={(change) => update(bodyKey, change.target.value)}
            />
          </label>
          {!!unknown.length && (
            <p role="alert">
              Variáveis desconhecidas: {[...new Set(unknown)].join(", ")}.
            </p>
          )}
          <button
            type="button"
            disabled={!defaults || busy}
            onClick={() => {
              update(bodyKey, defaults?.body ?? "");
              update(subjectKey, defaults?.subject ?? "");
            }}
          >
            Restaurar padrão
          </button>
          <p>
            Salvar aplica o modelo selecionado às próximas notificações desse
            evento.
          </p>
        </div>
        <div className={`${styles.card} ${styles.stack}`}>
          <h3>Pré-visualização do e-mail</h3>
          <div className={styles.row}>
            {["desktop", "mobile"].map((option) => (
              <button
                type="button"
                key={option}
                aria-pressed={device === option}
                onClick={() => setDevice(option)}
              >
                {option === "desktop" ? "Desktop" : "Celular"}
              </button>
            ))}
          </div>
          <div className={styles.mailPreview} data-device={device}>
            <header>Locomotiva Restaurante</header>
            <article>
              <strong>
                {render(
                  subject.trim() || defaults?.subject || templates[event],
                )}
              </strong>
              <p>{render(body.trim() || defaults?.body || "")}</p>
              <small>
                O e-mail oficial inclui os dados da solicitação abaixo da
                mensagem.
              </small>
            </article>
          </div>
        </div>
      </div>
      {showTest && (
        <CampaignDialog
          id="locomotiva-email-test"
          title="Testar este modelo"
          busy={testBusy}
          onClose={() => setShowTest(false)}
        >
          <form
            className={styles.stack}
            onSubmit={(submission) => {
              submission.preventDefault();
              if (canTest && !testBusy && !unknown.length) void sendTest();
            }}
          >
            <p>
              Modelo: <strong>{templates[event]}</strong>. O teste usa dados de
              exemplo e não altera reservas.
            </p>
            <label>
              E-mail destinatário
              <input
                id="locomotiva-email-test-address"
                type="email"
                maxLength={254}
                required
                value={recipient}
                onChange={(change) => setRecipient(change.target.value)}
              />
            </label>
            {!canTest && (
              <p>
                {!dashboard.mailConfigured
                  ? "Envio não configurado."
                  : "Envio de teste indisponível neste ambiente ou perfil."}
              </p>
            )}
            {testResult && <p role="status">{testResult}</p>}
            <button
              type="submit"
              className={styles.primary}
              disabled={!canTest || testBusy || !!unknown.length}
            >
              Enviar teste
            </button>
          </form>
        </CampaignDialog>
      )}
    </section>
  );
}
