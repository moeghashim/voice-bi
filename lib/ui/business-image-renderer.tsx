import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { renderToPng } from "@json-render/image/render";
import type { ComponentRegistry } from "@json-render/image";
import type { Spec } from "@json-render/core";
import { Children, type CSSProperties, type ReactNode } from "react";

import type { BusinessUiSpec } from "@/lib/ui/catalog";

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;
const IMAGE_FONT_PATH = join(
  process.cwd(),
  "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf",
);

let imageFontPromise:
  | Promise<
      {
        name: string;
        data: Buffer;
        weight: 400;
        style: "normal";
      }[]
    >
  | null = null;

const businessImageRegistry: ComponentRegistry = {
  Dashboard: ({ element, children }) => {
    const childNodes = Children.toArray(children);
    const metricNodes: ReactNode[] = [];
    const contentNodes: ReactNode[] = [];

    for (const [index, childId] of (element.children ?? []).entries()) {
      const childNode = childNodes[index];

      if (!childNode) {
        continue;
      }

      if (childId.startsWith("metric_")) {
        metricNodes.push(childNode);
      } else {
        contentNodes.push(childNode);
      }
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: IMAGE_WIDTH,
          height: IMAGE_HEIGHT,
          padding: 36,
          backgroundColor: "#f8fafc",
          color: "#0f172a",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={labelStyle}>Voice BI</div>
          <div style={titleStyle}>{String(element.props.title ?? "")}</div>
          {element.props.summary ? (
            <div style={summaryStyle}>{String(element.props.summary)}</div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginTop: 18,
            flex: 1,
          }}
        >
          {metricNodes.length > 0 ? (
            <div style={metricsRowStyle}>{metricNodes}</div>
          ) : null}
          {contentNodes}
        </div>
      </div>
    );
  },
  Metric: ({ element }) => {
    const sentiment = String(element.props.sentiment ?? "neutral");

    return (
      <div style={metricCardStyle}>
        <div style={metricLabelStyle}>{String(element.props.label ?? "")}</div>
        <div style={metricValueStyle}>{formatValue(element.props.value)}</div>
        {element.props.delta ? (
          <div
            style={{
              ...pillStyle,
              color: sentiment === "negative" ? "#b91c1c" : "#047857",
              backgroundColor:
                sentiment === "negative" ? "#fee2e2" : "#dcfce7",
            }}
          >
            {String(element.props.delta)}
          </div>
        ) : null}
      </div>
    );
  },
  Table: () => null,
  BarChart: ({ element }) => (
    <ChartCard title={element.props.title}>
      <BarChartImage
        data={element.props.data}
        xKey={String(element.props.xKey)}
        yKey={String(element.props.yKey)}
      />
    </ChartCard>
  ),
  LineChart: ({ element }) => (
    <ChartCard title={element.props.title}>
      <LineChartImage
        data={element.props.data}
        xKey={String(element.props.xKey)}
        yKey={String(element.props.yKey)}
      />
    </ChartCard>
  ),
  Insight: ({ element }) => (
    <div style={insightCardStyle}>
      <div style={insightTitleStyle}>{String(element.props.title ?? "")}</div>
      <div style={insightBodyStyle}>{String(element.props.body ?? "")}</div>
    </div>
  ),
};

export async function renderBusinessSpecToPng(spec: BusinessUiSpec) {
  return renderToPng(spec as Spec, {
    registry: businessImageRegistry,
    includeStandard: false,
    fonts: await getImageFonts(),
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  });
}

function ChartCard({
  title,
  children,
}: {
  title: unknown;
  children: ReactNode;
}) {
  return (
    <div style={chartCardStyle}>
      {title ? <div style={chartTitleStyle}>{String(title)}</div> : null}
      {children}
    </div>
  );
}

function BarChartImage({
  data,
  xKey,
  yKey,
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
}) {
  const points = getChartPoints(data, xKey, yKey);
  const maxValue = Math.max(...points.map((point) => point.value), 0);

  if (points.length === 0 || maxValue <= 0) {
    return <div style={emptyChartStyle}>No chart data</div>;
  }

  return (
    <div style={barChartStyle}>
      {points.slice(0, 6).map((point) => {
        const height = Math.max(8, (point.value / maxValue) * 76);

        return (
          <div key={point.label} style={barColumnStyle}>
            <div style={barValueStyle}>{formatValue(point.value)}</div>
            <div
              style={{
                ...barStyle,
                height,
              }}
            />
            <div style={barLabelStyle}>{truncate(point.label, 12)}</div>
          </div>
        );
      })}
    </div>
  );
}

function LineChartImage({
  data,
  xKey,
  yKey,
}: {
  data: Array<Record<string, string | number>>;
  xKey: string;
  yKey: string;
}) {
  const points = getChartPoints(data, xKey, yKey);
  const maxValue = Math.max(...points.map((point) => point.value), 0);

  if (points.length === 0 || maxValue <= 0) {
    return <div style={emptyChartStyle}>No chart data</div>;
  }

  return (
    <div style={barChartStyle}>
      {points.slice(0, 6).map((point) => {
        const height = Math.max(8, (point.value / maxValue) * 76);

        return (
          <div key={point.label} style={barColumnStyle}>
            <div style={barValueStyle}>{formatValue(point.value)}</div>
            <div
              style={{
                ...linePointStyle,
                marginTop: 76 - height,
              }}
            />
            <div style={barLabelStyle}>{truncate(point.label, 12)}</div>
          </div>
        );
      })}
    </div>
  );
}

function getChartPoints(
  data: Array<Record<string, string | number>>,
  xKey: string,
  yKey: string,
) {
  return data.map((datum) => ({
    label: String(datum[xKey] ?? ""),
    value: getNumericValue(datum[yKey]),
  }));
}

async function getImageFonts() {
  imageFontPromise ??= readFile(IMAGE_FONT_PATH).then((data) => [
    {
      name: "Geist",
      data,
      weight: 400,
      style: "normal",
    } as const,
  ]);

  return imageFontPromise;
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

function formatValue(value: unknown) {
  return typeof value === "number" ? value.toLocaleString("en-US") : String(value);
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

const labelStyle: CSSProperties = {
  display: "flex",
  fontSize: 16,
  fontWeight: 700,
  color: "#2563eb",
  textTransform: "uppercase",
};

const titleStyle: CSSProperties = {
  display: "flex",
  marginTop: 8,
  fontSize: 36,
  fontWeight: 700,
  lineHeight: 1.12,
};

const summaryStyle: CSSProperties = {
  display: "flex",
  marginTop: 8,
  fontSize: 20,
  lineHeight: 1.35,
  color: "#475569",
};

const metricsRowStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  gap: 14,
};

const metricCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  padding: 16,
  borderRadius: 18,
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
};

const metricLabelStyle: CSSProperties = {
  display: "flex",
  fontSize: 18,
  color: "#475569",
};

const metricValueStyle: CSSProperties = {
  display: "flex",
  marginTop: 6,
  fontSize: 34,
  fontWeight: 700,
};

const pillStyle: CSSProperties = {
  display: "flex",
  alignSelf: "flex-start",
  marginTop: 8,
  padding: "5px 10px",
  borderRadius: 999,
  fontSize: 16,
  fontWeight: 700,
};

const chartCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: 16,
  borderRadius: 18,
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
};

const chartTitleStyle: CSSProperties = {
  display: "flex",
  fontSize: 20,
  fontWeight: 700,
};

const barChartStyle: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-end",
  gap: 16,
  height: 122,
  marginTop: 8,
};

const barColumnStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-end",
  width: 110,
  height: 116,
};

const barStyle: CSSProperties = {
  display: "flex",
  width: 62,
  borderRadius: "10px 10px 3px 3px",
  backgroundColor: "#2563eb",
};

const linePointStyle: CSSProperties = {
  display: "flex",
  width: 22,
  height: 22,
  borderRadius: 999,
  backgroundColor: "#2563eb",
};

const barValueStyle: CSSProperties = {
  display: "flex",
  marginBottom: 6,
  fontSize: 14,
  color: "#334155",
};

const barLabelStyle: CSSProperties = {
  display: "flex",
  marginTop: 6,
  fontSize: 14,
  color: "#64748b",
};

const emptyChartStyle: CSSProperties = {
  display: "flex",
  marginTop: 16,
  padding: 24,
  borderRadius: 14,
  backgroundColor: "#f1f5f9",
  color: "#64748b",
  fontSize: 20,
};

const insightCardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  padding: 16,
  borderRadius: 18,
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
};

const insightTitleStyle: CSSProperties = {
  display: "flex",
  fontSize: 20,
  fontWeight: 700,
  color: "#1d4ed8",
};

const insightBodyStyle: CSSProperties = {
  display: "flex",
  marginTop: 8,
  fontSize: 17,
  lineHeight: 1.35,
  color: "#1e3a8a",
};
