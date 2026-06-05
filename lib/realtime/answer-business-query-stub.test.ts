import { describe, expect, it } from "vitest";

import {
  answerBusinessQueryInputSchema,
  answerBusinessQueryStub,
} from "./answer-business-query-stub";

describe("answerBusinessQueryStub", () => {
  it("accepts a non-empty query", () => {
    expect(
      answerBusinessQueryInputSchema.safeParse({ query: "How much stock?" })
        .success,
    ).toBe(true);
  });

  it("rejects an empty query", () => {
    expect(answerBusinessQueryInputSchema.safeParse({ query: " " }).success).toBe(
      false,
    );
  });

  it("returns a spoken summary without a UI spec for M1", () => {
    const output = answerBusinessQueryStub({ query: "revenue today" });

    expect(output.spoken_summary).toContain("revenue today");
    expect(output.ui_spec).toBeNull();
    expect(output.spec_id).toBeNull();
  });

  it("mentions loaded normalized data when the session has data", () => {
    const output = answerBusinessQueryStub(
      { query: "sales last month" },
      {
        columns: [
          { name: "Product", type: "string" },
          { name: "Sales", type: "number" },
        ],
        rows: [
          { Product: "Coffee", Sales: 1200 },
          { Product: "Tea", Sales: 800 },
        ],
      },
    );

    expect(output.spoken_summary).toContain(
      "I have 2 rows across 2 columns loaded",
    );
    expect(output.ui_spec).toBeNull();
    expect(output.spec_id).toBeNull();
  });
});
