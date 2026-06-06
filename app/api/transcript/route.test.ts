import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearBusinessUiSpecStoreForTest,
  getTranscriptForSession,
  setBusinessUiSpec,
} from "@/lib/brain/spec-store";
import { transcribeAudioWithOpenAI } from "@/lib/transcript/openai-transcription";
import type { BusinessUiSpec } from "@/lib/ui/catalog";

import { POST } from "./route";

vi.mock("@/lib/transcript/openai-transcription", () => ({
  transcribeAudioWithOpenAI: vi.fn(),
}));

const mockedTranscribeAudioWithOpenAI = vi.mocked(transcribeAudioWithOpenAI);

const storedSpec: BusinessUiSpec = {
  root: "insight",
  elements: {
    insight: {
      type: "Insight",
      props: {
        title: "Answer",
        body: "Sales were 2000.",
      },
      children: [],
      visible: true,
    },
  },
};

describe("/api/transcript", () => {
  beforeEach(() => {
    clearBusinessUiSpecStoreForTest();
    mockedTranscribeAudioWithOpenAI.mockReset();
  });

  it("transcribes uploaded audio and stores text with the session's spec ids", async () => {
    mockedTranscribeAudioWithOpenAI.mockResolvedValue(
      "What were sales last month? Sales were 2000.",
    );
    setBusinessUiSpec("spec-transcript", storedSpec, {
      sessionId: "voice-session",
    });
    const formData = new FormData();
    formData.append("session_id", "voice-session");
    formData.append("audio", new Blob(["audio"], { type: "audio/webm" }));

    const response = await POST(
      new Request("http://localhost/api/transcript", {
        method: "POST",
        body: formData,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockedTranscribeAudioWithOpenAI).toHaveBeenCalledWith(
      expect.any(Blob),
    );
    expect(body).toEqual({
      session_id: "voice-session",
      text: "What were sales last month? Sales were 2000.",
      spec_ids: ["spec-transcript"],
    });
    expect(getTranscriptForSession("voice-session")).toEqual({
      text: "What were sales last month? Sales were 2000.",
      specIds: ["spec-transcript"],
    });
  });

  it("rejects missing audio", async () => {
    const formData = new FormData();
    formData.append("session_id", "voice-session");

    const response = await POST(
      new Request("http://localhost/api/transcript", {
        method: "POST",
        body: formData,
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("audio blob is required.");
    expect(mockedTranscribeAudioWithOpenAI).not.toHaveBeenCalled();
  });
});
