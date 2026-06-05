"use client";

import { FormEvent, useState } from "react";

import type { NormalizedData, NormalizedPreview } from "@/lib/data/normalize";

type NormalizeResponse = {
  session_id: string;
  normalized_data: NormalizedData;
  preview: NormalizedPreview;
  warning: string | null;
  warnings: string[];
};

type DataIngestionProps = {
  onDataReady: (sessionId: string) => void;
};

const DATA_SESSION_STORAGE_KEY = "voice-bi-data-session-id";

function getNormalizeError(body: unknown): string | null {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;
    return typeof error === "string" ? error : "Unable to parse table.";
  }

  return null;
}

function isNormalizeResponse(body: unknown): body is NormalizeResponse {
  return (
    body !== null &&
    typeof body === "object" &&
    "session_id" in body &&
    "normalized_data" in body &&
    "preview" in body
  );
}

function getOrCreateDataSessionId() {
  const existing = window.sessionStorage.getItem(DATA_SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.sessionStorage.setItem(DATA_SESSION_STORAGE_KEY, next);
  return next;
}

export function DataIngestion({ onDataReady }: DataIngestionProps) {
  const [html, setHtml] = useState("");
  const [preview, setPreview] = useState<NormalizedPreview | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setWarning(null);
    setIsParsing(true);

    try {
      const sessionId = getOrCreateDataSessionId();
      const response = await fetch("/api/data/normalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html,
          session_id: sessionId,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | NormalizeResponse
        | { error?: string }
        | null;
      const responseError = getNormalizeError(body);

      if (!response.ok || !isNormalizeResponse(body) || responseError) {
        throw new Error(responseError ?? "Unable to parse table.");
      }

      setPreview(body.preview);
      setWarning(body.warning);
      onDataReady(body.session_id);
    } catch (parseError) {
      setPreview(null);
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Unable to parse table.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Business data</h2>
          <p className="mt-1 text-sm text-slate-600">
            Paste an HTML table and confirm the typed preview.
          </p>
        </div>
        {preview ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Data loaded
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label
          htmlFor="business-table-html"
          className="text-sm font-medium text-slate-700"
        >
          HTML table
        </label>
        <textarea
          id="business-table-html"
          value={html}
          onChange={(event) => setHtml(event.target.value)}
          rows={7}
          className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none"
          placeholder="<table><tr><th>Product</th><th>Sales</th></tr><tr><td>Coffee</td><td>1200</td></tr></table>"
        />
        <button
          type="submit"
          disabled={isParsing}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isParsing ? "Parsing" : "Parse table"}
        </button>
      </form>

      {warning ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warning}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {preview ? <DataPreview preview={preview} /> : null}
    </section>
  );
}

function DataPreview({ preview }: { preview: NormalizedPreview }) {
  return (
    <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {preview.columns.map((column) => (
                <th
                  key={column.name}
                  scope="col"
                  className="px-3 py-2 text-left font-semibold text-slate-700"
                >
                  <span>{column.name}</span>
                  <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                    {column.type}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {preview.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={preview.columns.length}
                  className="px-3 py-3 text-slate-500"
                >
                  No rows to preview.
                </td>
              </tr>
            ) : (
              preview.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {preview.columns.map((column) => (
                    <td
                      key={column.name}
                      className="px-3 py-2 text-slate-700"
                    >
                      {String(row[column.name] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
