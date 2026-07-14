import {
  createOAuthStateCookie,
  getRdStationOAuthConfig,
  jsonError,
} from "../../_utils";

export async function GET(request: Request) {
  const { authDialogUrl, clientId, callbackUrl } = getRdStationOAuthConfig();

  if (!clientId || !callbackUrl) {
    return jsonError(
      "Defina RD_STATION_CLIENT_ID e RD_STATION_CALLBACK_URL no ambiente.",
      503
    );
  }

  if (!isValidHttpsUrl(callbackUrl)) {
    return jsonError(
      "RD_STATION_CALLBACK_URL precisa ser uma URL HTTPS valida.",
      503
    );
  }

  const url = new URL(authDialogUrl);
  const state = crypto.randomUUID();

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": createOAuthStateCookie(state, request.url),
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function isValidHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
