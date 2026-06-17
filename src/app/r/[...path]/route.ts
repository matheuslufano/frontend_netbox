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
