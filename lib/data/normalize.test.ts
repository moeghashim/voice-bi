import { describe, expect, it } from "vitest";

import {
  MAX_NORMALIZED_COLUMNS,
  MAX_NORMALIZED_ROWS,
  normalizeTableHtml,
} from "./normalize";

describe("normalizeTableHtml", () => {
  it("strips script, style, and markup from cell contents", () => {
    const result = normalizeTableHtml(`
      <table>
        <tr><th>Name</th><th>Note</th></tr>
        <tr>
          <td><strong>North</strong> <span>Sales</span></td>
          <td>
            Safe text
            <script>alert("steal data")</script>
            <style>.hidden { display: none; }</style>
            <em>only</em>
          </td>
        </tr>
      </table>
    `);

    expect(result.normalizedData.rows[0]).toEqual({
      Name: "North Sales",
      Note: "Safe text only",
    });
    expect(JSON.stringify(result.normalizedData)).not.toContain("script");
    expect(JSON.stringify(result.normalizedData)).not.toContain("style");
    expect(JSON.stringify(result.normalizedData)).not.toContain("alert");
    expect(JSON.stringify(result.normalizedData)).not.toContain("display");
  });

  it("infers number, date, and string columns", () => {
    const result = normalizeTableHtml(`
      <table>
        <tr><th>Item</th><th>Revenue</th><th>Sold At</th></tr>
        <tr><td>Coffee</td><td>1250</td><td>2026-05-01</td></tr>
        <tr><td>Tea</td><td>900.50</td><td>2026-05-02</td></tr>
      </table>
    `);

    expect(result.normalizedData.columns).toEqual([
      { name: "Item", type: "string" },
      { name: "Revenue", type: "number" },
      { name: "Sold At", type: "date" },
    ]);
    expect(result.normalizedData.rows[0]).toEqual({
      Item: "Coffee",
      Revenue: 1250,
      "Sold At": "2026-05-01",
    });
  });

  it("truncates column and row caps and surfaces warnings", () => {
    const headers = Array.from(
      { length: MAX_NORMALIZED_COLUMNS + 2 },
      (_, index) => `<th>Column ${index + 1}</th>`,
    ).join("");
    const rows = Array.from(
      { length: MAX_NORMALIZED_ROWS + 3 },
      (_, rowIndex) =>
        `<tr>${Array.from(
          { length: MAX_NORMALIZED_COLUMNS + 2 },
          (_, columnIndex) => `<td>${rowIndex}-${columnIndex}</td>`,
        ).join("")}</tr>`,
    ).join("");

    const result = normalizeTableHtml(
      `<table><tr>${headers}</tr>${rows}</table>`,
    );

    expect(result.normalizedData.columns).toHaveLength(MAX_NORMALIZED_COLUMNS);
    expect(result.normalizedData.rows).toHaveLength(MAX_NORMALIZED_ROWS);
    expect(result.warnings).toEqual([
      `Column cap exceeded: kept first ${MAX_NORMALIZED_COLUMNS} of ${
        MAX_NORMALIZED_COLUMNS + 2
      } columns.`,
      `Row cap exceeded: kept first ${MAX_NORMALIZED_ROWS} of ${
        MAX_NORMALIZED_ROWS + 3
      } rows.`,
    ]);
  });
});
