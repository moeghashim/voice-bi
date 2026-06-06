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

  it("accepts Table, BarChart, and LineChart props", () => {
    const validSpec = {
      root: "dashboard",
      elements: {
        dashboard: {
          type: "Dashboard",
          props: {
            title: "Sales snapshot",
          },
          children: ["table", "bar", "line"],
          visible: true,
        },
        table: {
          type: "Table",
          props: {
            title: "Product sales",
            columns: ["Product", "Sales"],
            rows: [
              ["Coffee", 1200],
              ["Tea", 800],
            ],
          },
          children: [],
          visible: true,
        },
        bar: {
          type: "BarChart",
          props: {
            title: "Sales by product",
            xKey: "Product",
            yKey: "Sales",
            data: [
              { Product: "Coffee", Sales: 1200 },
              { Product: "Tea", Sales: 800 },
            ],
          },
          children: [],
          visible: true,
        },
        line: {
          type: "LineChart",
          props: {
            title: "Sales trend",
            xKey: "Month",
            yKey: "Sales",
            data: [
              { Month: "2026-04", Sales: 1600 },
              { Month: "2026-05", Sales: 2000 },
            ],
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

  it("rejects invalid Table and chart props", () => {
    const invalidTableSpec = {
      root: "table",
      elements: {
        table: {
          type: "Table",
          props: {
            columns: ["Product", "Sales"],
            rows: [{ Product: "Coffee", Sales: 1200 }],
          },
          children: [],
          visible: true,
        },
      },
    };
    const invalidChartSpec = {
      root: "chart",
      elements: {
        chart: {
          type: "BarChart",
          props: {
            xKey: "Product",
            yKey: "Sales",
            data: [{ Product: "Coffee", Sales: { amount: 1200 } }],
          },
          children: [],
          visible: true,
        },
      },
    };

    expect(businessCatalogSchema.safeParse(invalidTableSpec).success).toBe(
      false,
    );
    expect(businessCatalogSchema.safeParse(invalidChartSpec).success).toBe(
      false,
    );
  });

  it("rejects specs with a missing root or dangling child reference", () => {
    const missingRootSpec = {
      root: "missing",
      elements: {
        metric: {
          type: "Metric",
          props: {
            label: "Revenue",
            value: 12450,
          },
          children: [],
          visible: true,
        },
      },
    };
    const danglingChildSpec = {
      root: "dashboard",
      elements: {
        dashboard: {
          type: "Dashboard",
          props: {
            title: "Sales snapshot",
          },
          children: ["missing_metric"],
          visible: true,
        },
      },
    };

    expect(businessCatalogSchema.safeParse(missingRootSpec).success).toBe(false);
    expect(businessCatalogSchema.safeParse(danglingChildSpec).success).toBe(
      false,
    );
  });
});
