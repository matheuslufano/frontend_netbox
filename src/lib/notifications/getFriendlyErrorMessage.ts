import axios from "axios";

const technicalPattern = /(?:ECONN|Prisma|TypeError|stack|status code|Failed to fetch|\bat\s+\w+\s*\(|<!doctype|<html)/i;

function safeServerMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!text || text.length > 220 || technicalPattern.test(text)) return null;
  return text;
}

export function getFriendlyErrorMessage(error: unknown, fallback = "Não foi possível concluir a ação.") {
  if (!axios.isAxiosError(error)) return fallback;
  const status = error.response?.status;
  const payload = error.response?.data;
  const serverMessage = payload && typeof payload === "object"
    ? safeServerMessage((payload as { message?: unknown; error?: unknown }).message)
      || safeServerMessage((payload as { message?: unknown; error?: unknown }).error)
    : safeServerMessage(payload);

  if (status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
  if (status === 403) return "Você não possui permissão para realizar esta ação.";
  if (status === 404) return "O item solicitado não está mais disponível.";
  if (status === 409 || status === 422 || status === 400) return serverMessage || "Revise os dados informados e tente novamente.";
  if (status && status >= 500) return `${fallback} O serviço está temporariamente indisponível.`;
  if (!error.response) return `${fallback} Verifique sua conexão e tente novamente.`;
  return serverMessage || fallback;
}
