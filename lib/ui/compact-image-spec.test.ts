import { describe, expect, it } from "vitest";

import {
  businessCatalogSchema,
  type BusinessUiSpec,
} from "@/lib/ui/catalog";

import { createCompactImageBusinessSpec } from "./compact-image-spec";

const fullDashboardSpec: BusinessUiSpec = {
  root: "dashboard",
  elements: {
    dashboard: {
      type: "Dashboard",
      props: {
        title: "May sales",
        summary: "Coffee led the month.",
      },
      children: [
        "metric_1",
        "metric_2",
        "metric_3",
        "metric_4",
        "table",
        "bar_chart",
        "line_chart",
        "insight",
      ],
      visible: true,
    },
    metric_1: {
      type: "Metric",
      props: { label: "Sales", value: 2000 },
      children: [],
      visible: true,
    },
    metric_2: {
      type: "Metric",
      props: { label: "Orders", value: 12 },
      children: [],
      visible: true,
    },
    metric_3: {
      type: "Metric",
      props: { label: "Average", value: 167 },
      children: [],
      visible: true,
    },
    metric_4: {
      type: "Metric",
      props: { label: "Extra", value: 99 },
      children: [],
      visible: true,
    },
    table: {
      type: "Table",
      props: {
        title: "Rows",
        columns: ["Product", "Sales"],
        rows: [["Coffee", 1200]],
      },
      children: [],
      visible: true,
    },
    bar_chart: {
      type: "BarChart",
      props: {
        title: "Sales by product",
        xKey: "label",
        yKey: "value",
        data: [{ label: "Coffee", value: 1200 }],
      },
      children: [],
      visible: true,
    },
    line_chart: {
      type: "LineChart",
      props: {
        title: "Sales trend",
        xKey: "label",
        yKey: "value",
        data: [{ label: "May", value: 2000 }],
      },
      children: [],
      visible: true,
    },
    insight: {
      type: "Insight",
      props: {
        title: "Recommendation",
        body: "Keep the Coffee offer visible.",
        severity: "info",
      },
      children: [],
      visible: true,
    },
  },
};

describe("createCompactImageBusinessSpec", () => {
  it("keeps a few metrics, one chart, and one recommendation while staying catalog-valid", () => {
    const compactSpec = createCompactImageBusinessSpec(fullDashboardSpec);
    const compactChildren =
      compactSpec.elements.compact_dashboard.children;

    expect(businessCatalogSchema.safeParse(compactSpec).success).toBe(true);
    expect(compactChildren).toEqual([
      "metric_1",
      "metric_2",
      "metric_3",
      "summary_chart",
      "recommendation",
    ]);
    expect(compactSpec.elements.metric_1.type).toBe("Metric");
    expect(compactSpec.elements.metric_2.type).toBe("Metric");
    expect(compactSpec.elements.metric_3.type).toBe("Metric");
    expect(compactSpec.elements.summary_chart.type).toBe("BarChart");
    expect(compactSpec.elements.recommendation.type).toBe("Insight");
    expect(compactSpec.elements).not.toHaveProperty("table");
    expect(compactSpec.elements).not.toHaveProperty("line_chart");
    expect(compactSpec.elements).not.toHaveProperty("metric_4");
  });
});
