import {
  getRdStationOAuthConfig,
  jsonError,
  jsonNoStore,
  requestRdStationOAuthToken,
} from "../../_utils";

export async function POST(request: Request) {
  const setupSecret = process.env.RD_STATION_SETUP_SECRET || "";

  if (!setupSecret) {
    return jsonError(
      "Defina RD_STATION_SETUP_SECRET para proteger a renovacao manual.",
      503
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${setupSecret}`) {
    return jsonError("Nao autorizado.", 401);
  }

  const { authTokenUrl, clientId, clientSecret, refreshToken } =
    getRdStationOAuthConfig();

  if (!clientId || !clientSecret || !refreshToken) {
    return jsonError(
      "Defina RD_STATION_CLIENT_ID, RD_STATION_CLIENT_SECRET e RD_STATION_REFRESH_TOKEN no ambiente.",
      503
    );
  }

  const { response, payload } = await requestRdStationOAuthToken(
    authTokenUrl,
    {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }
  );

  if (!response.ok) {
    return jsonError(
      "Nao foi possivel renovar o token do RD Station.",
      response.status,
      payload
    );
  }

  const accessToken = readTokenValue(payload, "access_token");
  const newRefreshToken = readTokenValue(payload, "refresh_token");

  if (!accessToken || !newRefreshToken) {
    return jsonError(
      "A RD Station retornou uma resposta de renovacao incompleta.",
      502,
      payload
    );
  }

  return jsonNoStore({
    message:
      "Token renovado. Atualize os dois tokens na Vercel imediatamente; o refresh_token anterior nao funciona mais.",
    tokens: {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: readTokenValue(payload, "expires_in"),
      token_type: readTokenValue(payload, "token_type"),
    },
    env: {
      RD_STATION_ACCESS_TOKEN: accessToken,
      RD_STATION_REFRESH_TOKEN: newRefreshToken,
    },
  });
}

function readTokenValue(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }

  const value = (payload as Record<string, unknown>)[key];

  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}
