import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

describe("/api/realtime/session", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails closed when OPENAI_API_KEY is missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    const response = await POST();
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(500);
    expect(body.error).toBe("OPENAI_API_KEY is not configured.");
  });

  it("mints an ephemeral realtime client secret without returning the raw key", async () => {
    const apiKey = "sk-test-secret";
    vi.stubEnv("OPENAI_API_KEY", apiKey);

    const fetchMock = vi.fn(async () =>
      Response.json({
        value: "ek_test_client_secret",
        expires_at: 1_796_000_000,
        session: { id: "sess_test" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST();
    const responseBody = await response.json();
    const [, requestInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    const requestBody = JSON.parse(String(requestInit.body)) as {
      expires_after: { seconds: number };
      session: {
        model: string;
        reasoning: { effort: string };
        audio: { input: { turnDetection: { type: string } } };
      };
    };

    expect(response.status).toBe(200);
    expect(requestInit.headers).toMatchObject({
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    });
    expect(requestBody.expires_after.seconds).toBeLessThanOrEqual(600);
    expect(requestBody.session.model).toBe("gpt-realtime-2");
    expect(requestBody.session.reasoning.effort).toBe("low");
    expect(requestBody.session.audio.input.turnDetection.type).toBe(
      "server_vad",
    );
    expect(JSON.stringify(responseBody)).not.toContain(apiKey);
    expect(responseBody).toEqual({
      client_secret: {
        value: "ek_test_client_secret",
        expires_at: 1_796_000_000,
      },
      session_id: "sess_test",
      model: "gpt-realtime-2",
    });
  });

  it("forwards upstream realtime secret creation failures", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "bad key" }, { status: 401 })),
    );

    const response = await POST();
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(401);
    expect(body.error).toBe("Failed to create realtime client secret.");
  });
});
