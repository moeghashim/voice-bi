import { describe, expect, it } from "vitest";

import {
  REALTIME_AGENT_INSTRUCTIONS,
  REALTIME_CLIENT_SECRET_TTL_SECONDS,
  REALTIME_MODEL,
  REALTIME_SESSION_CONFIG,
} from "./config";

describe("realtime config", () => {
  it("uses the PRD realtime model and low reasoning effort", () => {
    expect(REALTIME_MODEL).toBe("gpt-realtime-2");
    expect(REALTIME_SESSION_CONFIG.reasoning.effort).toBe("low");
  });

  it("enables server VAD and preamble/tool guidance", () => {
    expect(REALTIME_SESSION_CONFIG.audio.input.turnDetection.type).toBe(
      "server_vad",
    );
    expect(REALTIME_SESSION_CONFIG.audio.input.turnDetection.createResponse).toBe(
      true,
    );
    expect(REALTIME_AGENT_INSTRUCTIONS).toContain("brief preamble");
    expect(REALTIME_AGENT_INSTRUCTIONS).toContain("answer_business_query");
  });

  it("uses a short-lived client secret TTL", () => {
    expect(REALTIME_CLIENT_SECRET_TTL_SECONDS).toBeLessThanOrEqual(600);
  });
});
