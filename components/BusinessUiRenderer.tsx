"use client";

import {
  JSONUIProvider,
  Renderer,
  defineRegistry,
} from "@json-render/react";
import type { ReactNode } from "react";

import {
  businessCatalog,
  businessCatalogSchema,
  type BusinessUiSpec,
} from "@/lib/ui/catalog";

type BusinessUiAnswer = {
  specId: string;
  spokenSummary: string;
  uiSpec: BusinessUiSpec;
};

type BusinessUiPanelProps = {
  answer: BusinessUiAnswer | null;
};

const { registry: businessUiRegistry } = defineRegistry(businessCatalog, {
  components: {
    Dashboard: ({ props, children }) => (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            {props.title}
          </h2>
          {props.summary ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {props.summary}
            </p>
          ) : null}
        </div>
        <div className="mt-5 grid gap-4">{children}</div>
      </section>
    ),
    Metric: ({ props }) => (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-600">{props.label}</p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <p className="text-3xl font-semibold tracking-normal text-slate-950">
            {formatValue(props.value)}
          </p>
          {props.delta ? (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${sentimentClass(
                props.sentiment,
              )}`}
            >
              {props.delta}
            </span>
          ) : null}
        </div>
      </div>
    ),
    Table: ({ props }) => (
      <div className="overflow-hidden rounded-md border border-slate-200">
        {props.title ? (
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            {props.title}
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-white">
              <tr>
                {props.columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="px-3 py-2 text-left font-semibold text-slate-700"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {props.rows.map((row, rowIndex) => (
                <tr key={`business-row-${rowIndex}`}>
                  {props.columns.map((column, columnIndex) => (
                    <td
                      key={`${column}-${columnIndex}`}
                      className="px-3 py-2 text-slate-700"
                    >
                      {formatValue(row[columnIndex] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
    BarChart: ({ props }) => (
      <ChartFrame title={props.title}>
        <BarChartSvg data={props.data} xKey={props.xKey} yKey={props.yKey} />
      </ChartFrame>
    ),
    LineChart: ({ props }) => (
      <ChartFrame title={props.title}>
        <LineChartSvg data={props.data} xKey={props.xKey} yKey={props.yKey} />
      </ChartFrame>
    ),
    Insight: ({ props }) => (
      <div
        className={`rounded-md border p-4 ${insightClass(props.severity)}`}
      >
        <h3 className="text-sm font-semibold">{props.title}</h3>
        <p className="mt-2 text-sm leading-6">{props.body}</p>
      </div>
    ),
  },
});

export function BusinessUiPanel({ answer }: BusinessUiPanelProps) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Visual answer</h2>
          <p className="mt-1 text-sm text-slate-600">
            {answer ? "Mirrored from the latest data answer." : "No answer yet."}
          </p>
        </div>
        {answer ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-600">
            {answer.specId}
          </span>
        ) : null}
      </div>

      {answer ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Spoken summary
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {answer.spokenSummary}
            </p>
          </div>
          <BusinessUiRenderer key={answer.specId} spec={answer.uiSpec} />
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Ask a question about loaded business data to render the answer here.
        </div>
      )}
    </aside>
  );
}

export function BusinessUiRenderer({ spec }: { spec: BusinessUiSpec }) {
  const parsed = businessCatalogSchema.safeParse(spec);

  if (!parsed.success) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        The generated visual answer did not pass the approved catalog.
      </div>
    );
  }

  return (
    <JSONUIProvider registry={businessUiRegistry}>
      <Renderer spec={parsed.data} registry={businessUiRegistry} />
    </JSONUIProvider>
  );
}

function ChartFrame({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      {title ? (
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      ) : null}
      <div className={title ? "mt-3" : ""}>{children}</div>
    </div>
  );
}

function BarChartSvg({
  data,
  xKey,
  yKey,
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
}) {
  const points = data.map((datum) => ({
    label: String(datum[xKey] ?? ""),
    value: getNumericValue(datum[yKey]),
  }));
  const maxValue = Math.max(...points.map((point) => point.value), 0);

  if (points.length === 0 || maxValue <= 0) {
    return <EmptyChart />;
  }

  const chartWidth = 360;
  const chartHeight = 180;
  const padding = 28;
  const barGap = 12;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;
  const barWidth = Math.max(
    12,
    (plotWidth - barGap * (points.length - 1)) / points.length,
  );

  return (
    <svg
      role="img"
      aria-label={`${xKey} by ${yKey}`}
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="h-48 w-full"
    >
      <line
        x1={padding}
        y1={chartHeight - padding}
        x2={chartWidth - padding}
        y2={chartHeight - padding}
        stroke="#cbd5e1"
      />
      {points.map((point, index) => {
        const barHeight = (point.value / maxValue) * plotHeight;
        const x = padding + index * (barWidth + barGap);
        const y = chartHeight - padding - barHeight;

        return (
          <g key={`${point.label}-${index}`}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx="4"
              fill="#2563eb"
            />
            <text
              x={x + barWidth / 2}
              y={Math.max(14, y - 6)}
              textAnchor="middle"
              className="fill-slate-700 text-[10px] font-semibold"
            >
              {formatValue(point.value)}
            </text>
            <text
              x={x + barWidth / 2}
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-slate-500 text-[10px]"
            >
              {truncateLabel(point.label)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChartSvg({
  data,
  xKey,
  yKey,
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
}) {
  const points = data.map((datum) => ({
    label: String(datum[xKey] ?? ""),
    value: getNumericValue(datum[yKey]),
  }));
  const maxValue = Math.max(...points.map((point) => point.value), 0);

  if (points.length === 0 || maxValue <= 0) {
    return <EmptyChart />;
  }

  const chartWidth = 360;
  const chartHeight = 180;
  const padding = 28;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padding + index * step,
    y: chartHeight - padding - (point.value / maxValue) * plotHeight,
  }));
  const polylinePoints = coordinates
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <svg
      role="img"
      aria-label={`${yKey} trend by ${xKey}`}
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      className="h-48 w-full"
    >
      <line
        x1={padding}
        y1={chartHeight - padding}
        x2={chartWidth - padding}
        y2={chartHeight - padding}
        stroke="#cbd5e1"
      />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke="#2563eb"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      {coordinates.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <circle cx={point.x} cy={point.y} r="4" fill="#2563eb" />
          <text
            x={point.x}
            y={Math.max(14, point.y - 8)}
            textAnchor="middle"
            className="fill-slate-700 text-[10px] font-semibold"
          >
            {formatValue(point.value)}
          </text>
          <text
            x={point.x}
            y={chartHeight - 8}
            textAnchor="middle"
            className="fill-slate-500 text-[10px]"
          >
            {truncateLabel(point.label)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function EmptyChart() {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      No chart data.
    </div>
  );
}

function getNumericValue(value: string | number | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatValue(value: string | number) {
  return typeof value === "number" ? value.toLocaleString("en-US") : value;
}

function truncateLabel(label: string) {
  return label.length > 12 ? `${label.slice(0, 11)}...` : label;
}

function sentimentClass(sentiment?: "positive" | "negative" | "neutral") {
  if (sentiment === "positive") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (sentiment === "negative") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-200 text-slate-700";
}

function insightClass(severity?: "info" | "warning" | "critical") {
  if (severity === "critical") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  return "border-blue-200 bg-blue-50 text-blue-900";
}
