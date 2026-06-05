import { NextResponse } from "next/server";

import {
  REALTIME_CLIENT_SECRET_TTL_SECONDS,
  REALTIME_MODEL,
  REALTIME_REST_SESSION_CONFIG,
} from "@/lib/realtime/config";

export const runtime = "nodejs";

type ClientSecretResponse = {
  value: string;
  expires_at: number;
  session?: {
    id?: string;
  };
};

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const response = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: REALTIME_CLIENT_SECRET_TTL_SECONDS,
        },
        session: {
          type: "realtime",
          model: REALTIME_MODEL,
          ...REALTIME_REST_SESSION_CONFIG,
        },
      }),
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to create realtime client secret." },
      { status: response.status },
    );
  }

  const clientSecret = (await response.json()) as ClientSecretResponse;

  return NextResponse.json({
    client_secret: {
      value: clientSecret.value,
      expires_at: clientSecret.expires_at,
    },
    session_id: clientSecret.session?.id ?? null,
    model: REALTIME_MODEL,
  });
}
