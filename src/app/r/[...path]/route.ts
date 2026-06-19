import { NextRequest } from "next/server";

const backendUrl =
  process.env.BACKEND_URL ||
  "http://72.62.8.85:3001";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { path = [] } = await context.params;
  const baseUrl = backendUrl.replace(/\/+$/, "");
  const pathname = path.map(encodeURIComponent).join("/");
  const destination = `${baseUrl}/r/${pathname}${request.nextUrl.search}`;

  const response = await fetch(destination, {
    headers: {
      "user-agent": request.headers.get("user-agent") || "",
      "referer": request.headers.get("referer") || "",
      "accept-language":
        request.headers.get("accept-language") || "",
      "sec-ch-ua": request.headers.get("sec-ch-ua") || "",
      "sec-ch-ua-mobile":
        request.headers.get("sec-ch-ua-mobile") || "",
      "sec-ch-ua-platform":
        request.headers.get("sec-ch-ua-platform") || "",
      "x-vercel-ip-country":
        request.headers.get("x-vercel-ip-country") || "",
      "x-vercel-ip-country-region":
        request.headers.get("x-vercel-ip-country-region") || "",
      "x-vercel-ip-city":
        request.headers.get("x-vercel-ip-city") || "",
      "x-vercel-ip-timezone":
        request.headers.get("x-vercel-ip-timezone") || "",
      "x-forwarded-for":
        request.headers.get("x-forwarded-for") || "",
      "x-forwarded-proto": "https",
    },
    redirect: "manual",
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
