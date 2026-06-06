import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearBusinessUiSpecStoreForTest,
  setBusinessUiSpec,
} from "@/lib/brain/spec-store";
import type { BusinessUiSpec } from "@/lib/ui/catalog";

import StoredSpecPage from "./page";

const storedSpec: BusinessUiSpec = {
  root: "dashboard",
  elements: {
    dashboard: {
      type: "Dashboard",
      props: {
        title: "Stored sales answer",
        summary: "Sales were 2000.",
      },
      children: ["metric", "insight"],
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

describe("/r/[specId]", () => {
  beforeEach(() => {
    clearBusinessUiSpecStoreForTest();
  });

  it("renders stored spec content", async () => {
    setBusinessUiSpec("spec-page", storedSpec);

    const page = await StoredSpecPage({
      params: Promise.resolve({ specId: "spec-page" }),
    });
    const markup = renderToStaticMarkup(createElement(() => page));

    expect(markup).toContain("Interactive business view");
    expect(markup).toContain("Stored sales answer");
    expect(markup).toContain("Sales");
    expect(markup).toContain("2,000");
    expect(markup).toContain("Keep Coffee visible.");
  });

  it("404s for an unknown spec id", async () => {
    await expect(
      StoredSpecPage({
        params: Promise.resolve({ specId: "missing-spec" }),
      }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
