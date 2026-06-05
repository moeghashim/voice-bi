import { NextResponse } from "next/server";

import {
  answerBusinessQueryInputSchema,
  answerBusinessQueryStub,
} from "@/lib/realtime/answer-business-query-stub";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = answerBusinessQueryInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 400 },
    );
  }

  return NextResponse.json(answerBusinessQueryStub(parsed.data));
}
