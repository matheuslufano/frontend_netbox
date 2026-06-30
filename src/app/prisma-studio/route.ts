import { NextRequest, NextResponse } from "next/server";

const prismaStudioUrl =
  process.env.PRISMA_STUDIO_URL || "http://72.62.8.85:3001/prisma-studio/";

export function GET(request: NextRequest) {
  const destination = new URL(prismaStudioUrl);
  destination.search = request.nextUrl.search;

  return NextResponse.redirect(destination);
}
