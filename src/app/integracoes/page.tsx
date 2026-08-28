"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiArrowLeft,
  FiClock,
  FiCode,
  FiDatabase,
  FiInbox,
  FiMessageCircle,
  FiRefreshCw,
  FiSearch,
  FiShare2,
  FiTag,
  FiUser,
} from "react-icons/fi";
import {
  buscarMensagensAtendimentoChatmix,
  ChatmixAttendanceMessagesResponse,
  ChatmixWebhookLogResponse,
  getApiErrorMessage,
  listarChatmixWebhookLogs,
} from "@/lib/api";
import { useRealtimeEvents } from "@/lib/useRealtimeEvents";
import styles from "./integracoes.module.css";

type Integration = "chatmix" | "sgp" | null;
type ChatmixTab = "webhooks" | "attendance";
type RealtimeStatus = "connecting" | "connected" | "error";

type RealtimeChatmixMessage = {
  payload?: {
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
  emittedAt?: string;
};

type DisplayMessage = {
  id: string;
  text: string;
  sender: string;
  senderRole: "customer" | "automation" | "attendant" | "system" | "unknown";
  timestamp: string | null;
  type: string;
  direction: string;
  status: string;
  mediaUrls: string[];
  raw: unknown;
};

const chatmixRealtimeEvents: ["chatmix-webhook"] = ["chatmix-webhook"];

export default function IntegracoesPage() {
  const [integration, setIntegration] = useState<Integration>(null);
  const [activeTab, setActiveTab] = useState<ChatmixTab>("webhooks");
  const [webhookLogs, setWebhookLogs] = useState<ChatmixWebhookLogResponse[]>(
    [],
  );
  const [webhookLimit, setWebhookLimit] = useState(50);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);
  const [refreshingWebhooks, setRefreshingWebhooks] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connecting");
  const [attendanceId, setAttendanceId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [attendanceResult, setAttendanceResult] =
    useState<ChatmixAttendanceMessagesResponse | null>(null);

  const loadWebhookLogs = useCallback(
    async (manual = false) => {
      if (manual) {
        setRefreshingWebhooks(true);
      } else {
        setLoadingWebhooks(true);
      }

      setWebhookError(null);

      try {
        const logs = await listarChatmixWebhookLogs(webhookLimit);
        setWebhookLogs(logs);
      } catch (error) {
        setWebhookError(
          getApiErrorMessage(
            error,
            "Não foi possível carregar os webhooks do Chatmix.",
          ),
        );
      } finally {
        setLoadingWebhooks(false);
        setRefreshingWebhooks(false);
      }
    },
    [webhookLimit],
  );

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadWebhookLogs();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadWebhookLogs]);

  const handleRealtimeWebhook = useCallback(
    (event: MessageEvent<string>) => {
      try {
        const message = JSON.parse(event.data) as RealtimeChatmixMessage;
        const payload = message.payload;

        if (!payload) return;

        const incoming: ChatmixWebhookLogResponse = {
          id: payload.id ?? -Date.now(),
          receivedAt:
            payload.receivedAt || message.emittedAt || new Date().toISOString(),
          attendanceId: payload.attendanceId || null,
          channel: {
            name: payload.channel?.name || null,
            type: payload.channel?.type || null,
          },
          raw: payload.raw,
          query: isRecord(payload.query) ? payload.query : {},
          result: isRecord(payload.result) ? payload.result : {},
        };

        setWebhookLogs((current) => {
          const withoutDuplicate = current.filter(
            (log) => log.id !== incoming.id,
          );
          return [incoming, ...withoutDuplicate].slice(0, webhookLimit);
        });
      } catch {
        // Eventos inválidos não substituem o histórico confirmado pelo backend.
      }
    },
    [webhookLimit],
  );

  useRealtimeEvents(
    handleRealtimeWebhook,
    chatmixRealtimeEvents,
    setRealtimeStatus,
  );

  async function searchAttendance(rawAttendanceId: string) {
    const normalizedId = rawAttendanceId.trim();

    if (!normalizedId) {
      setSearchError("Informe o attendance_id recebido no webhook.");
      setAttendanceResult(null);
      return;
    }

    setAttendanceId(normalizedId);
    setSearching(true);
    setSearchError(null);
    setAttendanceResult(null);

    try {
      const result = await buscarMensagensAtendimentoChatmix(normalizedId);
      setAttendanceResult(result);
    } catch (error) {
      setSearchError(
        getApiErrorMessage(
          error,
          "Não foi possível buscar esse atendimento no Chatmix.",
        ),
      );
    } finally {
      setSearching(false);
    }
  }

  function handleAttendanceSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void searchAttendance(attendanceId);
  }

  function openAttendanceFromWebhook(selectedAttendanceId: string) {
    const normalizedId = selectedAttendanceId.trim();
    if (!normalizedId) return;

    setActiveTab("attendance");
    void searchAttendance(normalizedId);
  }

  function openIntegration(nextIntegration: Exclude<Integration, null>) {
    setIntegration(nextIntegration);
    if (nextIntegration === "chatmix") setActiveTab("webhooks");
  }

  function returnToIntegrations() {
    setIntegration(null);
    setSearchError(null);
  }

  if (!integration) {
    return (
      <main className={styles.page}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Central de conexões</span>
          <h1>Integrações</h1>
          <p>
            Acompanhe os sistemas que participam da jornada do afiliado e
            consulte os dados recebidos em cada etapa.
          </p>
        </header>

        <section
          className={styles.integrationGrid}
          aria-label="Integrações disponíveis"
        >
          <IntegrationCard
            icon={<FiMessageCircle aria-hidden="true" />}
            name="Chatmix"
            description="Monitore webhooks e consulte as mensagens de um atendimento."
            status="Disponível"
            available
            onOpen={() => openIntegration("chatmix")}
          />
          <IntegrationCard
            icon={<FiDatabase aria-hidden="true" />}
            name="SGP"
            description="Conecte os dados comerciais e a ativação dos contratos."
            status="Em preparação"
            onOpen={() => openIntegration("sgp")}
          />
        </section>
      </main>
    );
  }

  if (integration === "sgp") {
    return (
      <main className={styles.page}>
        <button
          type="button"
          className={styles.backButton}
          onClick={returnToIntegrations}
        >
          <FiArrowLeft aria-hidden="true" /> Voltar para Integrações
        </button>
        <section className={styles.comingSoon}>
          <span>
            <FiDatabase aria-hidden="true" />
          </span>
          <p>Integração SGP</p>
          <h1>Em breve</h1>
          <p>Esta conexão está sendo preparada para uma próxima etapa.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.integrationHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={returnToIntegrations}
        >
          <FiArrowLeft aria-hidden="true" /> Voltar
        </button>
        <div className={styles.integrationTitle}>
          <span>
            <FiMessageCircle aria-hidden="true" />
          </span>
          <div>
            <p>Integração</p>
            <h1>Chatmix</h1>
          </div>
        </div>
      </header>

      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Recursos do Chatmix"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "webhooks"}
          className={activeTab === "webhooks" ? styles.activeTab : ""}
          onClick={() => setActiveTab("webhooks")}
        >
          <FiActivity aria-hidden="true" /> Webhooks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "attendance"}
          className={activeTab === "attendance" ? styles.activeTab : ""}
          onClick={() => setActiveTab("attendance")}
        >
          <FiSearch aria-hidden="true" /> Buscar atendimento
        </button>
      </div>

      {activeTab === "webhooks" ? (
        <WebhookPanel
          logs={webhookLogs}
          loading={loadingWebhooks}
          refreshing={refreshingWebhooks}
          error={webhookError}
          limit={webhookLimit}
          realtimeStatus={realtimeStatus}
          onLimitChange={setWebhookLimit}
          onRefresh={() => void loadWebhookLogs(true)}
          onOpenAttendance={openAttendanceFromWebhook}
        />
      ) : (
        <AttendancePanel
          attendanceId={attendanceId}
          searching={searching}
          error={searchError}
          result={attendanceResult}
          onAttendanceIdChange={setAttendanceId}
          onSubmit={handleAttendanceSearch}
          onReset={() => {
            setAttendanceId("");
            setAttendanceResult(null);
            setSearchError(null);
          }}
        />
      )}
    </main>
  );
}

function IntegrationCard({
  icon,
  name,
  description,
  status,
  available = false,
  onOpen,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: string;
  available?: boolean;
  onOpen: () => void;
}) {
  return (
    <article className={styles.integrationCard}>
      <div className={styles.cardTopline}>
        <span className={styles.integrationIcon}>{icon}</span>
        <span className={available ? styles.availableBadge : styles.soonBadge}>
          {status}
        </span>
      </div>
      <h2>{name}</h2>
      <p>{description}</p>
      <button type="button" onClick={onOpen}>
        Abrir integração <FiShare2 aria-hidden="true" />
      </button>
    </article>
  );
}

function WebhookPanel({
  logs,
  loading,
  refreshing,
  error,
  limit,
  realtimeStatus,
  onLimitChange,
  onRefresh,
  onOpenAttendance,
}: {
  logs: ChatmixWebhookLogResponse[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  limit: number;
  realtimeStatus: RealtimeStatus;
  onLimitChange: (limit: number) => void;
  onRefresh: () => void;
  onOpenAttendance: (attendanceId: string) => void;
}) {
  return (
    <section className={styles.panel} role="tabpanel">
      <div className={styles.panelHeader}>
        <div>
          <p className={styles.sectionLabel}>Monitoramento</p>
          <h2>Webhooks recebidos</h2>
          <span>
            Eventos confirmados pelo backend e atualizados em tempo real.
          </span>
        </div>
        <div className={styles.webhookControls}>
          <span
            className={`${styles.connectionBadge} ${styles[realtimeStatus]}`}
          >
            <i aria-hidden="true" /> {realtimeLabel(realtimeStatus)}
          </span>
          <label>
            Mostrar
            <select
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
            >
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onRefresh} disabled={refreshing}>
            <FiRefreshCw
              className={refreshing ? styles.spinning : ""}
              aria-hidden="true"
            />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.errorState} role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <StatusState
          icon={<FiRefreshCw className={styles.spinning} />}
          title="Carregando webhooks"
        />
      ) : logs.length === 0 ? (
        <StatusState
          icon={<FiInbox />}
          title="Nenhum webhook recebido"
          description="Os próximos eventos do Chatmix aparecerão aqui automaticamente."
        />
      ) : (
        <div className={styles.webhookList}>
          {logs.map((log) => (
            <WebhookCard
              key={log.id}
              log={log}
              onOpenAttendance={onOpenAttendance}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WebhookCard({
  log,
  onOpenAttendance,
}: {
  log: ChatmixWebhookLogResponse;
  onOpenAttendance: (attendanceId: string) => void;
}) {
  const status = stringValue(log.result.status) || "recebido";
  const metadataEntries: Array<[string, unknown]> = [
    [
      "Código do afiliado",
      stringValue(log.result.shortCode) || "Não identificado",
    ],
    ["Afiliado vinculado", log.result.affiliateName],
    ["Campanha", log.result.campaignName],
    ["conversionId", log.result.conversionId],
    ["linkId", log.result.linkId],
  ];
  const metadata = metadataEntries.filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <article className={styles.webhookCard}>
      <div className={styles.webhookCardHeader}>
        <div>
          <span className={styles.statusPill}>{status}</span>
          {log.attendanceId ? (
            <h3>
              <button
                type="button"
                className={styles.attendanceLink}
                onClick={() => onOpenAttendance(log.attendanceId as string)}
                aria-label={`Buscar mensagens do atendimento ${log.attendanceId}`}
              >
                <span>Atendimento {log.attendanceId}</span>
                <FiSearch aria-hidden="true" />
              </button>
            </h3>
          ) : (
            <h3>Webhook sem attendance_id</h3>
          )}
        </div>
        <time dateTime={log.receivedAt}>
          <FiClock aria-hidden="true" /> {formatDateTime(log.receivedAt)}
        </time>
      </div>
      <dl className={styles.webhookMetadata}>
        <div>
          <dt>Canal</dt>
          <dd>{log.channel.name || "Chatmix"}</dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{log.channel.type || "Não informado"}</dd>
        </div>
        {metadata.map(([label, value]) => (
          <div key={String(label)}>
            <dt>{label}</dt>
            <dd>{stringValue(value)}</dd>
          </div>
        ))}
      </dl>
      <details className={styles.jsonDetails}>
        <summary>
          <FiCode aria-hidden="true" /> Visualizar JSON completo
        </summary>
        <pre>
          {JSON.stringify(
            { raw: log.raw, query: log.query, result: log.result },
            null,
            2,
          )}
        </pre>
      </details>
    </article>
  );
}

function AttendancePanel({
  attendanceId,
  searching,
  error,
  result,
  onAttendanceIdChange,
  onSubmit,
  onReset,
}: {
  attendanceId: string;
  searching: boolean;
  error: string | null;
  result: ChatmixAttendanceMessagesResponse | null;
  onAttendanceIdChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
}) {
  const messages = useMemo(
    () =>
      sortMessagesChronologically(result?.messages.map(normalizeMessage) || []),
    [result],
  );
  const firstCustomerMessage =
    messages.find((message) => message.senderRole === "customer") ||
    messages.find((message) => message.direction === "Recebida") ||
    messages[0];
  const affiliateCode = extractAffiliateCode(
    messages.map((message) => message.text),
  );

  return (
    <section className={styles.panel} role="tabpanel">
      <div className={styles.searchIntro}>
        <p className={styles.sectionLabel}>Consulta direta</p>
        <h2>Buscar atendimento</h2>
        <p>
          Use o <strong>attendance_id</strong> disponibilizado pelo webhook para
          visualizar toda a conversa, desde a primeira mensagem do cliente.
        </p>
      </div>
      <form className={styles.searchForm} onSubmit={onSubmit} noValidate>
        <label htmlFor="chatmix-attendance-id">attendance_id</label>
        <div className={styles.searchInputRow}>
          <div className={styles.searchInput}>
            <FiSearch aria-hidden="true" />
            <input
              id="chatmix-attendance-id"
              value={attendanceId}
              onChange={(event) => onAttendanceIdChange(event.target.value)}
              placeholder="Cole o ID do atendimento"
              autoComplete="off"
              aria-describedby={error ? "attendance-search-error" : undefined}
            />
          </div>
          <button type="submit" disabled={searching}>
            {searching ? (
              <FiRefreshCw className={styles.spinning} />
            ) : (
              <FiSearch />
            )}
            {searching ? "Buscando..." : "Buscar atendimento"}
          </button>
          {(result || error) && (
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={onReset}
            >
              Nova busca
            </button>
          )}
        </div>
      </form>

      {error && (
        <div
          id="attendance-search-error"
          className={styles.errorState}
          role="alert"
        >
          {error}
        </div>
      )}
      {searching && (
        <StatusState
          icon={<FiRefreshCw className={styles.spinning} />}
          title="Consultando o Chatmix"
          description="Aguarde enquanto buscamos as mensagens do atendimento."
        />
      )}
      {!searching && result && (
        <div className={styles.attendanceResult}>
          <div className={styles.resultHeader}>
            <div>
              <span>Atendimento</span>
              <strong>{result.attendanceId}</strong>
            </div>
            <span>
              {result.count} {result.count === 1 ? "mensagem" : "mensagens"}
            </span>
          </div>

          {messages.length === 0 ? (
            <>
              <StatusState
                icon={<FiInbox />}
                title="Nenhuma mensagem encontrada"
                description="A API respondeu, mas não foi possível localizar uma lista de mensagens no retorno."
              />
              <section
                className={styles.rawJsonPanel}
                aria-label="JSON bruto retornado pelo Chatmix"
              >
                <div className={styles.rawJsonPanelHeader}>
                  <strong>JSON bruto</strong>
                  <span>Resposta original do Chatmix</span>
                </div>
                <pre className={styles.rawJson}>
                  {JSON.stringify(result.raw, null, 2)}
                </pre>
              </section>
            </>
          ) : (
            <>
              {firstCustomerMessage && (
                <section
                  className={styles.firstCustomerMessage}
                  aria-label="Primeira mensagem do cliente"
                >
                  <div>
                    <span>
                      <FiMessageCircle aria-hidden="true" />
                    </span>
                    <div>
                      <p>Início do atendimento</p>
                      <h3>Primeira mensagem do cliente</h3>
                    </div>
                  </div>
                  <blockquote>{firstCustomerMessage.text}</blockquote>
                  <small>
                    {firstCustomerMessage.sender}
                    {firstCustomerMessage.timestamp
                      ? ` • ${formatDateTime(firstCustomerMessage.timestamp)}`
                      : ""}
                  </small>
                  <div className={styles.affiliateCodeHighlight}>
                    <div className={styles.affiliateCodeLabel}>
                      <span className={styles.affiliateCodeIcon}>
                        <FiTag aria-hidden="true" />
                      </span>
                      <div>
                        <span>Código do afiliado</span>
                        <small>Identificado na conversa</small>
                      </div>
                    </div>
                    <strong
                      className={
                        affiliateCode ? undefined : styles.affiliateCodeMissing
                      }
                    >
                      {affiliateCode || "Não identificado"}
                    </strong>
                  </div>
                </section>
              )}

              <div className={styles.attendanceViews}>
                <section
                  className={styles.whatsappPanel}
                  aria-label="Conversa simulada no WhatsApp"
                >
                  <div className={styles.whatsappTopbar}>
                    <div className={styles.whatsappContact}>
                      <span className={styles.whatsappAvatar}>
                        <FiUser aria-hidden="true" />
                      </span>
                      <div>
                        <strong>Atendimento {result.attendanceId}</strong>
                        <small>
                          Conversa simulada • mais antiga → mais recente
                        </small>
                      </div>
                    </div>
                    <span className={styles.whatsappCount}>
                      {messages.length}
                    </span>
                  </div>

                  <div className={styles.whatsappConversation}>
                    {messages.map((message) => {
                      const isFirst = message.id === firstCustomerMessage?.id;

                      const bubbleClass =
                        message.senderRole === "customer"
                          ? styles.customerBubble
                          : message.senderRole === "automation"
                            ? styles.automationBubble
                            : message.senderRole === "attendant"
                              ? styles.attendantBubble
                              : message.senderRole === "system"
                                ? styles.systemBubble
                                : styles.unknownBubble;

                      return (
                        <article
                          key={message.id}
                          className={`${styles.whatsappBubble} ${bubbleClass} ${
                            isFirst ? styles.firstWhatsAppMessage : ""
                          }`}
                        >
                          {isFirst && (
                            <span className={styles.firstWhatsappLabel}>
                              Primeira mensagem do cliente
                            </span>
                          )}

                          <div className={styles.whatsappSenderRow}>
                            <strong className={styles.whatsappSender}>
                              {message.sender}
                            </strong>
                            <span
                              className={`${styles.senderBadge} ${
                                message.senderRole === "customer"
                                  ? styles.customerBadge
                                  : message.senderRole === "automation"
                                    ? styles.automationBadge
                                    : message.senderRole === "attendant"
                                      ? styles.attendantBadge
                                      : message.senderRole === "system"
                                        ? styles.systemBadge
                                        : styles.unknownBadge
                              }`}
                            >
                              {message.senderRole === "customer"
                                ? "Cliente"
                                : message.senderRole === "automation"
                                  ? "Automação"
                                  : message.senderRole === "attendant"
                                    ? "Atendente"
                                    : message.senderRole === "system"
                                      ? "Sistema"
                                      : "Desconhecido"}
                            </span>
                          </div>

                          <p className={styles.whatsappText}>{message.text}</p>

                          <div className={styles.whatsappFooter}>
                            <span className={styles.whatsappDirection}>
                              {message.direction}
                            </span>
                            <time className={styles.whatsappTime}>
                              {message.timestamp
                                ? formatDateTime(message.timestamp)
                                : "Horário não informado"}
                            </time>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section
                  className={styles.rawJsonPanel}
                  aria-label="JSON bruto retornado pelo Chatmix"
                >
                  <div className={styles.rawJsonPanelHeader}>
                    <strong>JSON bruto</strong>
                    <span>Resposta original do Chatmix</span>
                  </div>
                  <pre className={styles.rawJson}>
                    {JSON.stringify(result.raw, null, 2)}
                  </pre>
                </section>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function MessageCard({
  message,
  isFirstCustomerMessage = false,
}: {
  message: DisplayMessage;
  isFirstCustomerMessage?: boolean;
}) {
  return (
    <article
      className={`${styles.messageCard} ${message.direction === "Enviada" ? styles.outgoing : ""} ${isFirstCustomerMessage ? styles.firstMessageCard : ""}`}
    >
      {isFirstCustomerMessage && (
        <span className={styles.firstMessageBadge}>
          Primeira mensagem do cliente
        </span>
      )}
      <div className={styles.messageMeta}>
        <span>
          <FiUser aria-hidden="true" /> {message.sender}
        </span>
        {message.timestamp && (
          <time dateTime={message.timestamp}>
            <FiClock aria-hidden="true" /> {formatDateTime(message.timestamp)}
          </time>
        )}
      </div>
      <p className={styles.messageText}>{message.text}</p>
      <div className={styles.messageTags}>
        <span>{message.direction}</span>
        <span>{message.type}</span>
        <span>{message.status}</span>
      </div>
      {message.mediaUrls.length > 0 && (
        <div className={styles.mediaLinks}>
          {message.mediaUrls.map((url, index) => (
            <a
              key={`${url}-${index}`}
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              Abrir mídia {index + 1}
            </a>
          ))}
        </div>
      )}
      <details className={styles.messageJson}>
        <summary>Dados técnicos</summary>
        <pre>{JSON.stringify(message.raw, null, 2)}</pre>
      </details>
    </article>
  );
}

function StatusState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className={styles.statusState}>
      <span>{icon}</span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  );
}

function normalizeMessage(value: unknown, index: number): DisplayMessage {
  const record = isRecord(value) ? value : {};
  const data = isRecord(record.data) ? record.data : {};
  const content = isRecord(record.content) ? record.content : {};
  const senderRecord = isRecord(record.sender)
    ? record.sender
    : isRecord(record.user)
      ? record.user
      : {};

  const chatmixType = firstString(record, ["type"]).toLowerCase();
  const origin = firstString(record, ["origin"]).toLowerCase();
  const submittedByUser = record.submitted_by_user;

  let senderRole: DisplayMessage["senderRole"] = "unknown";
  let sender = "Desconhecido";
  let direction = "Não informada";

  if (origin === "internal") {
    senderRole = "system";
    sender = "Sistema";
    direction = "Interna";
  } else if (chatmixType === "received") {
    senderRole = "customer";
    sender =
      firstString(senderRecord, ["name", "displayName", "phone", "number"]) ||
      firstString(record, ["senderName", "contactName", "clientName"]) ||
      "Cliente";
    direction = "Recebida";
  } else if (chatmixType === "sent" && origin === "automation") {
    senderRole = "automation";
    sender = "Automação";
    direction = "Enviada";
  } else if (chatmixType === "sent" && submittedByUser) {
    senderRole = "attendant";
    sender =
      firstString(senderRecord, ["name", "displayName"]) ||
      firstString(record, ["submittedByName", "userName", "author"]) ||
      "Atendente";
    direction = "Enviada";
  } else if (chatmixType === "sent") {
    senderRole = "attendant";
    sender = "Atendente";
    direction = "Enviada";
  } else {
    const fromMe =
      record.fromMe ??
      record.isFromMe ??
      record.from_me ??
      record.is_from_me ??
      data.fromMe ??
      data.from_me;

    direction = normalizeDirection(
      fromMe,
      firstString(record, [
        "direction",
        "side",
        "origin",
        "senderType",
        "sender_type",
        "authorType",
      ]) || firstString(senderRecord, ["type", "role", "kind"]),
    );

    if (direction === "Recebida") {
      senderRole = "customer";
      sender = "Cliente";
    } else if (direction === "Enviada") {
      senderRole = "attendant";
      sender = "Atendente";
    }
  }

  const contentType = firstString(content, ["type"]).toLowerCase();

  let text =
    firstString(content, ["content", "message", "text", "body", "caption"]) ||
    firstString(record, ["message", "text", "body", "caption"]) ||
    firstString(data, ["content", "message", "text", "body", "caption"]);

  if (!text && contentType === "buttons") {
    const buttons = isRecord(content.buttons) ? content.buttons : {};
    const buttonLabels = Object.values(buttons)
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim() !== "",
      )
      .map((item) => `• ${item.trim()}`);

    text = [
      firstString(content, ["title"]),
      ...buttonLabels,
      firstString(content, ["footer"]),
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (!text) {
    text = firstString(content, ["title"]) || "Mensagem sem conteúdo textual";
  }

  const id =
    firstString(record, ["id", "messageId", "uuid", "key"]) ||
    `message-${index}`;

  const timestamp =
    firstString(record, [
      "createdAt",
      "created_at",
      "sentAt",
      "sent_at",
      "timestamp",
      "date",
      "utcDhMessageSent",
    ]) ||
    firstString(data, [
      "createdAt",
      "created_at",
      "sentAt",
      "sent_at",
      "timestamp",
      "date",
    ]) ||
    null;

  const mediaUrls = collectMediaUrls(record, content, data);

  return {
    id: `${id}-${index}`,
    text,
    sender,
    senderRole,
    timestamp,
    type: contentType || chatmixType || "mensagem",
    direction,
    status:
      firstString(record, ["status", "deliveryStatus", "state"]) ||
      (record.ack !== undefined ? `ACK ${String(record.ack)}` : "sem status"),
    mediaUrls,
    raw: value,
  };
}

function extractAffiliateCode(texts: string[]) {
  const codePattern = "[a-f0-9]{8}";
  const patterns = [
    new RegExp(
      `(?:codigo\\s+(?:do\\s+)?afiliado|c[oó]digo\\s+(?:do\\s+)?afiliado|codigo|c[oó]digo|ref(?:erencia)?)\\D{0,30}(${codePattern})`,
      "i",
    ),
    new RegExp(`/r/(${codePattern})(?:[/?#\\s]|$)`, "i"),
    new RegExp(`/links/(${codePattern})/whatsapp(?:[/?#\\s]|$)`, "i"),
  ];

  for (const text of texts) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].toLowerCase();
    }
  }

  return null;
}

function normalizeDirection(fromMe: unknown, rawDirection: string) {
  if (typeof fromMe === "boolean") {
    return fromMe ? "Enviada" : "Recebida";
  }

  if (
    fromMe === 1 ||
    fromMe === "1" ||
    String(fromMe).toLowerCase() === "true"
  ) {
    return "Enviada";
  }

  if (
    fromMe === 0 ||
    fromMe === "0" ||
    String(fromMe).toLowerCase() === "false"
  ) {
    return "Recebida";
  }

  const normalized = rawDirection.toLowerCase();
  if (
    /outgoing|outbound|sent|send|enviad|agent|operator|attendant|user/.test(
      normalized,
    )
  ) {
    return "Enviada";
  }
  if (
    /incoming|inbound|received|recebid|client|customer|contact/.test(normalized)
  ) {
    return "Recebida";
  }

  return rawDirection || "Não informada";
}

function sortMessagesChronologically(messages: DisplayMessage[]) {
  return messages
    .map((message, originalIndex) => ({
      message,
      originalIndex,
      timestamp: timestampValue(message.timestamp),
    }))
    .sort((first, second) => {
      if (first.timestamp === null && second.timestamp === null) {
        return first.originalIndex - second.originalIndex;
      }
      if (first.timestamp === null) return 1;
      if (second.timestamp === null) return -1;
      return first.timestamp - second.timestamp;
    })
    .map(({ message }) => message);
}

function timestampValue(value: string | null) {
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    const numeric = Number(value);
    const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    return Number.isFinite(milliseconds) ? milliseconds : null;
  }

  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function collectMediaUrls(...records: Record<string, unknown>[]) {
  const urls = new Set<string>();
  const keys = ["url", "mediaUrl", "fileUrl", "downloadUrl", "attachmentUrl"];

  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && /^https?:\/\//i.test(value))
        urls.add(value);
    }
    for (const key of ["media", "attachment", "file"]) {
      const nested = isRecord(record[key]) ? record[key] : {};
      for (const nestedKey of keys) {
        const value = nested[nestedKey];
        if (typeof value === "string" && /^https?:\/\//i.test(value))
          urls.add(value);
      }
    }
  }

  return [...urls];
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  return "";
}

function realtimeLabel(status: RealtimeStatus) {
  if (status === "connected") return "Tempo real conectado";
  if (status === "error") return "Tempo real indisponível";
  return "Conectando";
}

function formatDateTime(value: string) {
  const timestamp = timestampValue(value);
  if (timestamp === null) return value;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}
