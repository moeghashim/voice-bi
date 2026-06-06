import { NextResponse } from "next/server";

import { answerBusinessQuery } from "@/lib/brain/answer-business-query";
import { getNormalizedDataForSession } from "@/lib/data/session-store";
import { answerBusinessQueryInputSchema } from "@/lib/realtime/answer-business-query-contract";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = answerBusinessQueryInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 400 },
    );
  }

  const dataSessionId =
    body && typeof body.data_session_id === "string"
      ? body.data_session_id
      : null;
  const normalizedData = getNormalizedDataForSession(dataSessionId);

  return NextResponse.json(
    await answerBusinessQuery(parsed.data, normalizedData),
  );
}
