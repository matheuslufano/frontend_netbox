import { getRdStationOAuthConfig, jsonError, readJson } from "../../_utils";

export async function POST() {
  const { authTokenUrl, clientId, clientSecret, refreshToken } =
    getRdStationOAuthConfig();

  if (!clientId || !clientSecret || !refreshToken) {
    return jsonError(
      "Defina RD_STATION_CLIENT_ID, RD_STATION_CLIENT_SECRET e RD_STATION_REFRESH_TOKEN no ambiente.",
      503
    );
  }

  const response = await fetch(authTokenUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    return jsonError(
      "Nao foi possivel renovar o token do RD Station.",
      response.status,
      payload
    );
  }

  return Response.json({
    message:
      "Token renovado. Atualize RD_STATION_ACCESS_TOKEN e RD_STATION_REFRESH_TOKEN no ambiente.",
    tokens: payload,
  });
}
