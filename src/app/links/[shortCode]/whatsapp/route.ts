import type { NextRequest } from "next/server";

const fallbackBackendUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001"
    : "https://afiliadosbackend-production.up.railway.app";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await context.params;
  const backendUrl = String(
    process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      fallbackBackendUrl,
  ).replace(/\/+$/, "");
  const destination = new URL(
    `${backendUrl}/links/${encodeURIComponent(shortCode)}/whatsapp`,
  );
  request.nextUrl.searchParams.forEach((value, key) =>
    destination.searchParams.append(key, value),
  );

  const response = await fetch(destination, {
    headers: {
      "user-agent": request.headers.get("user-agent") || "",
      "referer": request.headers.get("referer") || "",
      "x-forwarded-for": request.headers.get("x-forwarded-for") || "",
      "x-forwarded-proto": "https",
    },
    redirect: "manual",
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}
