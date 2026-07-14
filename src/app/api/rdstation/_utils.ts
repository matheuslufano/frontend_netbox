const DEFAULT_RD_STATION_BASE_URL = "https://api.rd.services/crm/v2";
const DEFAULT_RD_STATION_AUTH_DIALOG_URL =
  "https://accounts.rdstation.com/oauth/authorize";
const DEFAULT_RD_STATION_AUTH_TOKEN_URL =
  "https://api.rd.services/oauth2/token";

export const RD_STATION_OAUTH_STATE_COOKIE = "rdstation_oauth_state";

export type RdRecord = Record<string, unknown>;

export function getRdStationAccessToken() {
  return (
    process.env.RD_STATION_ACCESS_TOKEN ||
    process.env.RD_STATION_API_TOKEN ||
    ""
  );
}

export function getRdStationBaseUrl() {
  return (
    process.env.RD_STATION_API_BASE_URL || DEFAULT_RD_STATION_BASE_URL
  ).replace(/\/+$/, "");
}

export function isRdStationCrmV1() {
  return getRdStationBaseUrl().includes("crm.rdstation.com/api/v1");
}

export function getRdStationOAuthConfig() {
  return {
    clientId: process.env.RD_STATION_CLIENT_ID || "",
    clientSecret: process.env.RD_STATION_CLIENT_SECRET || "",
    callbackUrl: process.env.RD_STATION_CALLBACK_URL || "",
    refreshToken: process.env.RD_STATION_REFRESH_TOKEN || "",
    authDialogUrl:
      process.env.RD_STATION_AUTH_DIALOG_URL ||
      DEFAULT_RD_STATION_AUTH_DIALOG_URL,
    authTokenUrl:
      process.env.RD_STATION_AUTH_TOKEN_URL ||
      DEFAULT_RD_STATION_AUTH_TOKEN_URL,
  };
}

export function jsonError(message: string, status = 500, details?: unknown) {
  return jsonNoStore(
    {
      error: message,
      message,
      details,
    },
    {
      status,
    }
  );
}

export function jsonNoStore(
  body: unknown,
  init: ResponseInit = {}
) {
  const headers = new Headers(init.headers);

  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Referrer-Policy", "no-referrer");

  return Response.json(body, {
    ...init,
    headers,
  });
}

export async function requestRdStationOAuthToken(
  authTokenUrl: string,
  values: Record<string, string>
) {
  const response = await fetch(authTokenUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(values),
  });
  const payload = await readJson(response);

  return {
    response,
    payload,
  };
}

export function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return "";
  }

  for (const item of cookieHeader.split(";")) {
    const [key, ...valueParts] = item.trim().split("=");

    if (key === name) {
      try {
        return decodeURIComponent(valueParts.join("="));
      } catch {
        return "";
      }
    }
  }

  return "";
}

export function createOAuthStateCookie(
  state: string,
  requestUrl: string,
  maxAge = 600
) {
  const secure = new URL(requestUrl).protocol === "https:" ? "; Secure" : "";

  return [
    `${RD_STATION_OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}`,
    "Path=/api/rdstation",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ") + secure;
}

export async function readJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {
      raw: text,
    };
  }
}

export async function rdRequest(
  path: string,
  options: RequestInit = {}
) {
  const accessToken = getRdStationAccessToken();

  if (!accessToken) {
    return {
      configured: false as const,
      response: null,
      body: null,
    };
  }

  const url = new URL(`${getRdStationBaseUrl()}${path}`);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (isRdStationCrmV1()) {
    url.searchParams.set("token", accessToken);
  } else {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      ...headers,
      ...options.headers,
    },
  });
  const body = await readJson(response);

  return {
    configured: true as const,
    response,
    body,
  };
}

export function getListPayload(body: unknown) {
  if (Array.isArray(body)) {
    return body.filter(isRecord);
  }

  if (!isRecord(body)) {
    return [];
  }

  const candidates = [
    body.data,
    body.deals,
    body.items,
    body.results,
    body.pipelines,
    body.deal_pipelines,
    body.stages,
    body.deal_stages,
    body.contacts,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }

    if (isRecord(candidate)) {
      const nested = getListPayload(candidate);

      if (nested.length > 0) {
        return nested;
      }
    }
  }

  return [];
}

export function isRecord(value: unknown): value is RdRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readString(record: RdRecord, keys: string[]) {
  for (const key of keys) {
    const value = readValue(record, key);

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

export function readNumber(record: RdRecord, keys: string[]) {
  for (const key of keys) {
    const value = readValue(record, key);

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

export function readBoolean(record: RdRecord, keys: string[]) {
  for (const key of keys) {
    const value = readValue(record, key);

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (["true", "1", "yes", "sim"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no", "nao", "não"].includes(normalized)) {
        return false;
      }
    }
  }

  return false;
}

export function readRecord(record: RdRecord, keys: string[]) {
  for (const key of keys) {
    const value = readValue(record, key);

    if (isRecord(value)) {
      return value;
    }
  }

  return null;
}

export function readRecordArray(record: RdRecord, keys: string[]) {
  for (const key of keys) {
    const value = readValue(record, key);

    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
}

export function addQueryParam(
  params: URLSearchParams,
  key: string,
  value: string | null
) {
  if (value && value.trim()) {
    params.set(key, value.trim());
  }
}

function readValue(record: RdRecord, key: string) {
  if (!key.includes(".")) {
    return record[key];
  }

  return key.split(".").reduce<unknown>((current, part) => {
    if (Array.isArray(current)) {
      const index = Number(part);

      return Number.isInteger(index) ? current[index] : undefined;
    }

    if (!isRecord(current)) {
      return undefined;
    }

    return current[part];
  }, record);
}
