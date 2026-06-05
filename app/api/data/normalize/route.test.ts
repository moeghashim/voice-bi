import { describe, expect, it } from "vitest";

import { getNormalizedDataForSession } from "@/lib/data/session-store";

import { POST } from "./route";

describe("/api/data/normalize", () => {
  it("returns normalized data, preview, warnings, and stores by session id", async () => {
    const response = await POST(
      new Request("http://localhost/api/data/normalize", {
        method: "POST",
        body: JSON.stringify({
          session_id: "test-data-session",
          html: `
            <table>
              <tr><th>Product</th><th>Sales</th></tr>
              <tr><td>Coffee</td><td>1200</td></tr>
              <tr><td>Tea</td><td>800</td></tr>
            </table>
          `,
        }),
      }),
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.warning).toBeNull();
    expect(body.session_id).toBe("test-data-session");
    expect(body.normalized_data.columns).toEqual([
      { name: "Product", type: "string" },
      { name: "Sales", type: "number" },
    ]);
    expect(body.preview.rows).toEqual([
      { Product: "Coffee", Sales: 1200 },
      { Product: "Tea", Sales: 800 },
    ]);
    expect(getNormalizedDataForSession("test-data-session")).toEqual(
      body.normalized_data,
    );
  });
});
