import { parse, type HTMLElement } from "node-html-parser";

export const MAX_NORMALIZED_COLUMNS = 50;
export const MAX_NORMALIZED_ROWS = 2_000;
export const NORMALIZED_PREVIEW_ROWS = 10;

export type ColumnType = "string" | "number" | "date";

export interface NormalizedColumn {
  name: string;
  type: ColumnType;
}

export interface NormalizedData {
  columns: NormalizedColumn[];
  rows: Array<Record<string, string | number>>;
}

export type NormalizedPreview = NormalizedData;

export type NormalizationResult = {
  normalizedData: NormalizedData;
  preview: NormalizedPreview;
  warnings: string[];
};

export class DataNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataNormalizationError";
  }
}

type ParsedRow = {
  cells: string[];
  hasHeaderCells: boolean;
};

type NormalizeOptions = {
  maxColumns?: number;
  maxRows?: number;
  previewRows?: number;
};

export function normalizeTableHtml(
  html: string,
  options: NormalizeOptions = {},
): NormalizationResult {
  const maxColumns = options.maxColumns ?? MAX_NORMALIZED_COLUMNS;
  const maxRows = options.maxRows ?? MAX_NORMALIZED_ROWS;
  const previewRows = options.previewRows ?? NORMALIZED_PREVIEW_ROWS;
  const root = parse(html);
  const table = root.querySelector("table");

  if (!table) {
    throw new DataNormalizationError("HTML table is required.");
  }

  const parsedRows = table
    .querySelectorAll("tr")
    .map(parseRow)
    .filter((row) => row.cells.length > 0);

  if (parsedRows.length === 0) {
    throw new DataNormalizationError("Table must contain at least one row.");
  }

  const headerIndex = parsedRows.findIndex((row) => row.hasHeaderCells);
  const effectiveHeaderIndex = headerIndex >= 0 ? headerIndex : 0;
  const headerCells = parsedRows[effectiveHeaderIndex].cells;
  const bodyRows = parsedRows.slice(effectiveHeaderIndex + 1);

  if (headerCells.length === 0) {
    throw new DataNormalizationError("Table must contain column headers.");
  }

  const warnings: string[] = [];
  if (headerCells.length > maxColumns) {
    warnings.push(
      `Column cap exceeded: kept first ${maxColumns} of ${headerCells.length} columns.`,
    );
  }

  if (bodyRows.length > maxRows) {
    warnings.push(
      `Row cap exceeded: kept first ${maxRows} of ${bodyRows.length} rows.`,
    );
  }

  const columnNames = makeUniqueColumnNames(
    headerCells.slice(0, maxColumns).map((cell, index) =>
      cell.length > 0 ? cell : `Column ${index + 1}`,
    ),
  );
  const rawRows = bodyRows
    .slice(0, maxRows)
    .map((row) => normalizeRowCells(row.cells, columnNames.length));
  const columnTypes = inferColumnTypes(rawRows, columnNames.length);
  const columns = columnNames.map((name, index) => ({
    name,
    type: columnTypes[index],
  }));
  const rows = rawRows.map((row) => normalizeValues(row, columns));

  return {
    normalizedData: {
      columns,
      rows,
    },
    preview: {
      columns,
      rows: rows.slice(0, previewRows),
    },
    warnings,
  };
}

function parseRow(row: HTMLElement): ParsedRow {
  const headerCells = row.querySelectorAll("th");
  const dataCells = row.querySelectorAll("td");
  const cells = (headerCells.length > 0 ? headerCells : dataCells).map(
    extractTextOnly,
  );

  return {
    cells,
    hasHeaderCells: headerCells.length > 0,
  };
}

function extractTextOnly(cell: HTMLElement): string {
  const clone = parse(`<cell>${cell.innerHTML}</cell>`);
  clone.querySelectorAll("script, style").forEach((node) => node.remove());
  return normalizeWhitespace(clone.textContent);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function makeUniqueColumnNames(names: string[]): string[] {
  const seen = new Map<string, number>();

  return names.map((name, index) => {
    const trimmedName = name.trim() || `Column ${index + 1}`;
    const count = seen.get(trimmedName) ?? 0;
    seen.set(trimmedName, count + 1);
    return count === 0 ? trimmedName : `${trimmedName} ${count + 1}`;
  });
}

function normalizeRowCells(cells: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => cells[index] ?? "");
}

function inferColumnTypes(rows: string[][], columnCount: number): ColumnType[] {
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const nonEmptyCells = rows
      .map((row) => row[columnIndex])
      .filter((cell) => cell.length > 0);

    if (nonEmptyCells.length === 0) {
      return "string";
    }

    if (nonEmptyCells.every(isNumericCell)) {
      return "number";
    }

    if (nonEmptyCells.every(isDateCell)) {
      return "date";
    }

    return "string";
  });
}

function normalizeValues(
  row: string[],
  columns: NormalizedColumn[],
): Record<string, string | number> {
  return columns.reduce<Record<string, string | number>>(
    (record, column, index) => {
      const value = row[index] ?? "";
      record[column.name] =
        column.type === "number" && value.length > 0
          ? Number(value.replace(/,/g, ""))
          : value;
      return record;
    },
    {},
  );
}

function isNumericCell(value: string): boolean {
  const normalized = value.replace(/,/g, "");
  return normalized.trim().length > 0 && Number.isFinite(Number(normalized));
}

function isDateCell(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}
