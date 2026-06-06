import { beforeEach, describe, expect, it, vi } from "vitest";

import { answerBusinessQuery } from "@/lib/brain/answer-business-query";
import { setNormalizedDataForSession } from "@/lib/data/session-store";

import { POST } from "./route";

vi.mock("@/lib/brain/answer-business-query", () => ({
  answerBusinessQuery: vi.fn(),
}));

const mockedAnswerBusinessQuery = vi.mocked(answerBusinessQuery);

describe("/api/answer", () => {
  beforeEach(() => {
    mockedAnswerBusinessQuery.mockReset();
  });

  it("makes normalized session data available to the answer tool", async () => {
    const normalizedData = {
      columns: [
        { name: "Product", type: "string" },
        { name: "Sales", type: "number" },
      ],
      rows: [
        { Product: "Coffee", Sales: 1200 },
        { Product: "Tea", Sales: 800 },
      ],
    } as const;
    const uiSpec = {
      root: "metric",
      elements: {
        metric: {
          type: "Metric",
          props: {
            label: "Sales",
            value: 2000,
          },
          children: [],
          visible: true,
        },
      },
    };

    mockedAnswerBusinessQuery.mockResolvedValue({
      spoken_summary: "Sales were 2000 last month.",
      ui_spec: uiSpec,
      spec_id: "spec-route",
    });
    setNormalizedDataForSession("answer-route-session", normalizedData);

    const response = await POST(
      new Request("http://localhost/api/answer", {
        method: "POST",
        body: JSON.stringify({
          query: "What were sales last month?",
          data_session_id: "answer-route-session",
          session_id: "voice-route-session",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      spoken_summary: "Sales were 2000 last month.",
      ui_spec: uiSpec,
      spec_id: "spec-route",
    });
    expect(mockedAnswerBusinessQuery).toHaveBeenCalledWith(
      { query: "What were sales last month?" },
      normalizedData,
      { sessionId: "voice-route-session" },
    );
  });
});
