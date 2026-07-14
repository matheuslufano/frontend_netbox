import {
  getRdStationAccessToken,
  getRdStationBaseUrl,
  getRdStationOAuthConfig,
  jsonNoStore,
} from "../_utils";

function hasValue(value: string) {
  return value.trim().length > 0;
}

function mask(value: string) {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}...`;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function GET(request: Request) {
  const accessToken = getRdStationAccessToken();
  const {
    authDialogUrl,
    authTokenUrl,
    callbackUrl,
    clientId,
    clientSecret,
    refreshToken,
  } = getRdStationOAuthConfig();
  const callbackIsHttps = isHttpsUrl(callbackUrl);
  const readyToAuthorize =
    hasValue(clientId) &&
    hasValue(clientSecret) &&
    hasValue(callbackUrl) &&
    callbackIsHttps;
  const authorizationUrl = readyToAuthorize
    ? new URL("/api/rdstation/oauth/authorize", request.url).toString()
    : "";
  const setupSecret = process.env.RD_STATION_SETUP_SECRET || "";

  return jsonNoStore({
    readyToAuthorize,
    readyToUseApi: hasValue(accessToken),
    readyToRefresh:
      hasValue(clientId) &&
      hasValue(clientSecret) &&
      hasValue(refreshToken) &&
      hasValue(setupSecret),
    config: {
      apiBaseUrl: getRdStationBaseUrl(),
      authDialogUrl,
      authTokenUrl,
      callbackUrl,
      clientId: mask(clientId),
      hasClientSecret: hasValue(clientSecret),
      hasAccessToken: hasValue(accessToken),
      hasRefreshToken: hasValue(refreshToken),
      hasSetupSecret: hasValue(setupSecret),
      hasPipelineId: hasValue(process.env.RD_STATION_PIPELINE_ID || ""),
      hasDefaultStageId: hasValue(process.env.RD_STATION_DEFAULT_STAGE_ID || ""),
    },
    authorizationUrl,
    issues: [
      !clientId ? "RD_STATION_CLIENT_ID nao definido." : "",
      !clientSecret ? "RD_STATION_CLIENT_SECRET nao definido." : "",
      !callbackUrl ? "RD_STATION_CALLBACK_URL nao definida." : "",
      callbackUrl && !callbackIsHttps
        ? "RD_STATION_CALLBACK_URL precisa usar HTTPS."
        : "",
      !setupSecret ? "RD_STATION_SETUP_SECRET nao definido." : "",
    ].filter(Boolean),
    nextSteps: [
      "A URL de callback precisa estar cadastrada exatamente igual no aplicativo da RD.",
      "Abra authorizationUrl para iniciar a autorizacao com state protegido.",
      "Depois de autorizar, salve RD_STATION_ACCESS_TOKEN e RD_STATION_REFRESH_TOKEN retornados no callback e faca um novo deploy.",
    ],
  });
}

function isHttpsUrl(value: string) {
  if (!value) {
    return false;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
