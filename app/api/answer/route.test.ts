import { describe, expect, it } from "vitest";

import { setNormalizedDataForSession } from "@/lib/data/session-store";

import { POST } from "./route";

describe("/api/answer", () => {
  it("makes normalized session data available to the tool stub", async () => {
    setNormalizedDataForSession("answer-route-session", {
      columns: [
        { name: "Product", type: "string" },
        { name: "Sales", type: "number" },
      ],
      rows: [
        { Product: "Coffee", Sales: 1200 },
        { Product: "Tea", Sales: 800 },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/answer", {
        method: "POST",
        body: JSON.stringify({
          query: "What were sales last month?",
          data_session_id: "answer-route-session",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.spoken_summary).toContain(
      "I have 2 rows across 2 columns loaded",
    );
    expect(body.ui_spec).toBeNull();
    expect(body.spec_id).toBeNull();
  });
});
