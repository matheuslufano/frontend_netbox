import {
  getRdStationAccessToken,
  getRdStationBaseUrl,
  getRdStationOAuthConfig,
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

export async function GET() {
  const accessToken = getRdStationAccessToken();
  const {
    authDialogUrl,
    authTokenUrl,
    callbackUrl,
    clientId,
    clientSecret,
    refreshToken,
  } = getRdStationOAuthConfig();
  const authorizationUrl =
    clientId && callbackUrl
      ? (() => {
          const url = new URL(authDialogUrl);

          url.searchParams.set("client_id", clientId);
          url.searchParams.set("redirect_uri", callbackUrl);
          url.searchParams.set("state", "afiliados-netbox-rdstation");

          return url.toString();
        })()
      : "";

  return Response.json({
    readyToAuthorize:
      hasValue(clientId) && hasValue(clientSecret) && hasValue(callbackUrl),
    readyToUseApi: hasValue(accessToken),
    config: {
      apiBaseUrl: getRdStationBaseUrl(),
      authDialogUrl,
      authTokenUrl,
      callbackUrl,
      clientId: mask(clientId),
      hasClientSecret: hasValue(clientSecret),
      hasAccessToken: hasValue(accessToken),
      hasRefreshToken: hasValue(refreshToken),
      hasPipelineId: hasValue(process.env.RD_STATION_PIPELINE_ID || ""),
      hasDefaultStageId: hasValue(process.env.RD_STATION_DEFAULT_STAGE_ID || ""),
    },
    authorizationUrl,
    nextSteps: [
      "A URL de callback precisa estar cadastrada exatamente igual no aplicativo da RD.",
      "Se voce alterou a callback no portal da RD agora, aguarde ate 1 hora antes de testar novamente.",
      "Depois de autorizar, copie RD_STATION_ACCESS_TOKEN e RD_STATION_REFRESH_TOKEN retornados no callback para o .env.local e reinicie o servidor.",
    ],
  });
}
