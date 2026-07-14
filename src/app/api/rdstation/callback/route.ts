import {
  createOAuthStateCookie,
  getRdStationOAuthConfig,
  jsonNoStore,
  RD_STATION_OAUTH_STATE_COOKIE,
  readCookie,
  requestRdStationOAuthToken,
} from "../_utils";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");
  const storedState = readCookie(request, RD_STATION_OAUTH_STATE_COOKIE);
  const clearStateCookie = createOAuthStateCookie("", request.url, 0);

  if (!state || !storedState || state !== storedState) {
    return callbackResponse(
      {
        error: "Estado OAuth invalido.",
        message: "Inicie novamente a autorizacao pelo endpoint do aplicativo.",
      },
      400,
      clearStateCookie
    );
  }

  if (error) {
    return callbackResponse(
      {
        error: "RD Station recusou a autorizacao.",
        message: "RD Station recusou a autorizacao.",
        details: {
          error,
          description: url.searchParams.get("error_description"),
        },
      },
      400,
      clearStateCookie
    );
  }

  if (!code) {
    return callbackResponse(
      {
        error: "Callback do RD Station sem code.",
        message: "Callback do RD Station sem code.",
      },
      400,
      clearStateCookie
    );
  }

  const { authTokenUrl, clientId, clientSecret, callbackUrl } =
    getRdStationOAuthConfig();

  if (!clientId || !clientSecret || !callbackUrl) {
    return callbackResponse(
      {
        error: "Configuracao OAuth incompleta.",
        message:
          "Defina RD_STATION_CLIENT_ID, RD_STATION_CLIENT_SECRET e RD_STATION_CALLBACK_URL no ambiente.",
      },
      503,
      clearStateCookie
    );
  }

  const { response, payload } = await requestRdStationOAuthToken(
    authTokenUrl,
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }
  );

  if (!response.ok) {
    return callbackResponse(
      {
        error: "Nao foi possivel trocar o code por tokens do RD Station.",
        message: "Nao foi possivel trocar o code por tokens do RD Station.",
        details: payload,
      },
      response.status,
      clearStateCookie
    );
  }

  const accessToken = readTokenValue(payload, "access_token");
  const refreshToken = readTokenValue(payload, "refresh_token");

  if (!accessToken || !refreshToken) {
    return callbackResponse(
      {
        error: "Resposta de token incompleta.",
        message: "A RD Station nao retornou access_token e refresh_token.",
        details: payload,
      },
      502,
      clearStateCookie
    );
  }

  return callbackResponse(
    {
      message:
        "Tokens gerados. Salve os dois valores no ambiente da Vercel e faca um novo deploy.",
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: readTokenValue(payload, "expires_in"),
        token_type: readTokenValue(payload, "token_type"),
      },
      env: {
        RD_STATION_ACCESS_TOKEN: accessToken,
        RD_STATION_REFRESH_TOKEN: refreshToken,
      },
    },
    200,
    clearStateCookie
  );
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

function callbackResponse(body: unknown, status: number, stateCookie: string) {
  return jsonNoStore(body, {
    status,
    headers: {
      "Set-Cookie": stateCookie,
    },
  });
}
