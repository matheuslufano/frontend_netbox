import { NextRequest, NextResponse } from "next/server";

function extractMessages(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.messages,
    record.data,
    record.result,
    record.items,
    record.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      for (const key of ["messages", "items", "rows", "data"]) {
        if (Array.isArray(nested[key])) return nested[key] as unknown[];
      }
    }
  }

  return [];
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const attendanceId = id?.trim();

  if (!attendanceId) {
    return NextResponse.json(
      { message: "attendance_id não informado." },
      { status: 400 },
    );
  }

  const token = process.env.CHATMIX_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { message: "CHATMIX_API_TOKEN não configurado no servidor." },
      { status: 500 },
    );
  }

  const chatmixUrl = `https://srv2.chatmix.com.br/api-v2/public-api/attendances/${encodeURIComponent(attendanceId)}/messages`;

  try {
    const response = await fetch(chatmixUrl, {
      method: "GET",
      headers: {
        "X-auth": token,
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; AfiliadosNetbox/1.0)",
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const raw = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        response.status === 403
          ? "Chatmix bloqueou o acesso (HTTP 403), possivelmente pelo Cloudflare."
          : `Chatmix respondeu com HTTP ${response.status}.`;

      return NextResponse.json(
        {
          message,
          attendanceId,
          raw,
        },
        { status: response.status },
      );
    }

    const messages = extractMessages(raw);

    return NextResponse.json({
      attendanceId,
      count: messages.length,
      messages,
      raw,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Falha ao conectar com a API do Chatmix.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
