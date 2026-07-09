import { getRdStationOAuthConfig, jsonError } from "../../_utils";

export async function GET() {
  const { authDialogUrl, clientId, callbackUrl } = getRdStationOAuthConfig();

  if (!clientId || !callbackUrl) {
    return jsonError(
      "Defina RD_STATION_CLIENT_ID e RD_STATION_CALLBACK_URL no ambiente.",
      503
    );
  }

  const url = new URL(authDialogUrl);

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("state", "afiliados-netbox-rdstation");

  return Response.json({
    authorizationUrl: url.toString(),
    callbackUrl,
  });
}
