import { NextResponse } from "next/server";

import {
  getBusinessUiSpecIdsForSession,
  setTranscriptForSession,
} from "@/lib/brain/spec-store";
import { transcribeAudioWithOpenAI } from "@/lib/transcript/openai-transcription";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json(
      { error: "multipart form data is required." },
      { status: 400 },
    );
  }

  const sessionId = formData.get("session_id");
  const audio = formData.get("audio");

  if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
    return NextResponse.json(
      { error: "session_id is required." },
      { status: 400 },
    );
  }

  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { error: "audio blob is required." },
      { status: 400 },
    );
  }

  try {
    const text = await transcribeAudioWithOpenAI(audio);
    const transcript = setTranscriptForSession(sessionId, text);

    return NextResponse.json({
      session_id: sessionId,
      text: transcript.text,
      spec_ids: getBusinessUiSpecIdsForSession(sessionId),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to transcribe session audio." },
      { status: 500 },
    );
  }
}
