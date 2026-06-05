import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  DataNormalizationError,
  normalizeTableHtml,
} from "@/lib/data/normalize";
import { setNormalizedDataForSession } from "@/lib/data/session-store";

export const runtime = "nodejs";

const normalizeRequestSchema = z.object({
  html: z.string().trim().min(1, "html is required"),
  session_id: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = normalizeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "html is required" },
      { status: 400 },
    );
  }

  try {
    const sessionId = parsed.data.session_id ?? randomUUID();
    const result = normalizeTableHtml(parsed.data.html);
    setNormalizedDataForSession(sessionId, result.normalizedData);

    return NextResponse.json({
      session_id: sessionId,
      normalized_data: result.normalizedData,
      preview: result.preview,
      warning: result.warnings.length > 0 ? result.warnings.join(" ") : null,
      warnings: result.warnings,
    });
  } catch (error) {
    if (error instanceof DataNormalizationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
