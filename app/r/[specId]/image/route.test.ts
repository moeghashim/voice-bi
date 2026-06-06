import { beforeEach, describe, expect, it } from "vitest";

import {
  clearBusinessUiSpecStoreForTest,
  setBusinessUiSpec,
} from "@/lib/brain/spec-store";
import type { BusinessUiSpec } from "@/lib/ui/catalog";

import { GET } from "./route";

const storedSpec: BusinessUiSpec = {
  root: "dashboard",
  elements: {
    dashboard: {
      type: "Dashboard",
      props: {
        title: "Image sales answer",
        summary: "Coffee led the month.",
      },
      children: ["metric", "chart", "insight"],
      visible: true,
    },
    metric: {
      type: "Metric",
      props: {
        label: "Sales",
        value: 2000,
      },
      children: [],
      visible: true,
    },
    chart: {
      type: "BarChart",
      props: {
        title: "Sales by product",
        xKey: "label",
        yKey: "value",
        data: [
          { label: "Coffee", value: 1200 },
          { label: "Tea", value: 800 },
        ],
      },
      children: [],
      visible: true,
    },
    insight: {
      type: "Insight",
      props: {
        title: "Recommendation",
        body: "Keep Coffee visible.",
      },
      children: [],
      visible: true,
    },
  },
};

describe("/r/[specId]/image", () => {
  beforeEach(() => {
    clearBusinessUiSpecStoreForTest();
  });

  it("returns a PNG for a stored spec", async () => {
    setBusinessUiSpec("spec-image", storedSpec);

    const response = await GET(new Request("http://localhost/r/spec-image/image"), {
      params: Promise.resolve({ specId: "spec-image" }),
    });
    const body = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(body.byteLength).toBeGreaterThan(100);
    expect([...body.slice(0, 8)]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });

  it("404s for an unknown spec id", async () => {
    const response = await GET(new Request("http://localhost/r/missing/image"), {
      params: Promise.resolve({ specId: "missing" }),
    });
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(404);
    expect(body.error).toBe("Spec not found.");
  });
});
