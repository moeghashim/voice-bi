import { describe, expect, it } from "vitest";

import {
  businessCatalog,
  businessCatalogPrompt,
  businessCatalogSchema,
} from "./catalog";

describe("businessCatalog", () => {
  it("generates a non-empty prompt", () => {
    expect(businessCatalog.prompt().trim().length).toBeGreaterThan(0);
    expect(businessCatalogPrompt.trim().length).toBeGreaterThan(0);
  });

  it("accepts a valid business UI spec", () => {
    const validSpec = {
      root: "dashboard",
      elements: {
        dashboard: {
          type: "Dashboard",
          props: {
            title: "Sales snapshot",
            summary: "Revenue is up this week.",
          },
          children: ["revenue", "insight"],
          visible: true,
        },
        revenue: {
          type: "Metric",
          props: {
            label: "Revenue",
            value: 12450,
            delta: "+8%",
            sentiment: "positive",
          },
          children: [],
          visible: true,
        },
        insight: {
          type: "Insight",
          props: {
            title: "Restock fast movers",
            body: "Two products are selling faster than the rest.",
            severity: "info",
          },
          children: [],
          visible: true,
        },
      },
    };

    expect(businessCatalogSchema.safeParse(validSpec).success).toBe(true);
  });

  it("rejects a spec with an off-catalog component", () => {
    const invalidSpec = {
      root: "unsafe",
      elements: {
        unsafe: {
          type: "Html",
          props: {
            html: "<script>alert('nope')</script>",
          },
          children: [],
          visible: true,
        },
      },
    };

    expect(businessCatalogSchema.safeParse(invalidSpec).success).toBe(false);
  });

  it("rejects invalid props for catalog components", () => {
    const invalidSpec = {
      root: "metric",
      elements: {
        metric: {
          type: "Metric",
          props: {
            label: "Revenue",
            value: { amount: 12450 },
          },
          children: [],
          visible: true,
        },
      },
    };

    expect(businessCatalogSchema.safeParse(invalidSpec).success).toBe(false);
  });
});
