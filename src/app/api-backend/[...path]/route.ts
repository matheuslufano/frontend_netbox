import { NextRequest } from "next/server";

const backendUrl =
  process.env.BACKEND_URL || "http://72.62.8.85:3001";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

function buildBackendUrl(path: string[] = [], search: string) {
  const baseUrl = backendUrl.replace(/\/+$/, "");
  const pathname = path.map(encodeURIComponent).join("/");

  return `${baseUrl}/${pathname}${search}`;
}

function buildHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  return headers;
}

async function proxy(request: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const destination = buildBackendUrl(path, request.nextUrl.search);
  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  const response = await fetch(destination, {
    method,
    headers: buildHeaders(request),
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
