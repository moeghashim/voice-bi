import { NextResponse } from "next/server";

import {
  answerBusinessQueryInputSchema,
  answerBusinessQueryStub,
} from "@/lib/realtime/answer-business-query-stub";
import { getNormalizedDataForSession } from "@/lib/data/session-store";

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
    answerBusinessQueryStub(parsed.data, normalizedData),
  );
}
