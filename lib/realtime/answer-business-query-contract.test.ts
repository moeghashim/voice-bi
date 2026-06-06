import { describe, expect, it } from "vitest";

import { answerBusinessQueryInputSchema } from "./answer-business-query-contract";

describe("answerBusinessQueryInputSchema", () => {
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
});
