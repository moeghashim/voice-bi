import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BusinessUiRenderer } from "@/components/BusinessUiRenderer";
import type { BusinessUiSpec } from "@/lib/ui/catalog";

const chartSpec: BusinessUiSpec = {
  root: "dashboard",
  elements: {
    dashboard: {
      type: "Dashboard",
      props: {
        title: "Sales dashboard",
        summary: "The latest answer is mirrored on screen.",
      },
      children: ["metric", "table", "bar", "line", "insight"],
      visible: true,
    },
    metric: {
      type: "Metric",
      props: {
        label: "Total sales",
        value: "$2,000",
        delta: "+25%",
        sentiment: "positive",
      },
      children: [],
      visible: true,
    },
    table: {
      type: "Table",
      props: {
        title: "Sales rows",
        columns: ["Product", "Sales"],
        rows: [
          ["Coffee", "$1,200"],
          ["Tea", "$800"],
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
    insight: {
      type: "Insight",
      props: {
        title: "Coffee leads",
        body: "Coffee generated more sales than Tea.",
        severity: "info",
      },
      children: [],
      visible: true,
    },
  },
};

describe("BusinessUiRenderer", () => {
  it("renders a valid catalog spec with dashboard, metric, table, charts, and insight", () => {
    const markup = renderToStaticMarkup(
      createElement(BusinessUiRenderer, { spec: chartSpec }),
    );

    expect(markup).toContain("Sales dashboard");
    expect(markup).toContain("Total sales");
    expect(markup).toContain("$2,000");
    expect(markup).toContain("Sales rows");
    expect(markup).toContain("Coffee");
    expect(markup).toContain("Sales by product");
    expect(markup).toContain("Sales trend");
    expect(markup).toContain("Coffee leads");
  });
});
