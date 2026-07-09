import { getRdStationOAuthConfig, jsonError, readJson } from "../_utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return jsonError("RD Station recusou a autorizacao.", 400, {
      error,
      description: url.searchParams.get("error_description"),
    });
  }

  if (!code) {
    return jsonError("Callback do RD Station sem code.", 400);
  }

  const { authTokenUrl, clientId, clientSecret, callbackUrl } =
    getRdStationOAuthConfig();

  if (!clientId || !clientSecret || !callbackUrl) {
    return jsonError(
      "Defina RD_STATION_CLIENT_ID, RD_STATION_CLIENT_SECRET e RD_STATION_CALLBACK_URL no ambiente.",
      503
    );
  }

  const tokenUrl = new URL(authTokenUrl);
  tokenUrl.searchParams.set("token_by", "code");
  const response = await fetch(tokenUrl, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });
  const payload = await readJson(response);

  if (!response.ok) {
    return jsonError(
      "Nao foi possivel trocar o code por tokens do RD Station.",
      response.status,
      payload
    );
  }

  return Response.json({
    message:
      "Tokens gerados. Copie access_token e refresh_token para o ambiente do servidor.",
    tokens: payload,
    env: {
      RD_STATION_ACCESS_TOKEN:
        payload && typeof payload === "object" && "access_token" in payload
          ? String((payload as Record<string, unknown>).access_token)
          : "",
      RD_STATION_REFRESH_TOKEN:
        payload && typeof payload === "object" && "refresh_token" in payload
          ? String((payload as Record<string, unknown>).refresh_token)
          : "",
    },
  });
}
