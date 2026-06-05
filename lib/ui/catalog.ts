import { defineCatalog } from "@json-render/core";
import { schema as reactSchema } from "@json-render/react/schema";
import { z } from "zod";

const textOrNumberSchema = z.union([z.string(), z.number()]);
const chartDatumSchema = z.record(z.string(), textOrNumberSchema);

const dashboardPropsSchema = z
  .object({
    title: z.string(),
    summary: z.string().optional(),
  })
  .strict();

const metricPropsSchema = z
  .object({
    label: z.string(),
    value: textOrNumberSchema,
    delta: z.string().optional(),
    sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
  })
  .strict();

const tablePropsSchema = z
  .object({
    title: z.string().optional(),
    columns: z.array(z.string()),
    rows: z.array(z.array(textOrNumberSchema)),
  })
  .strict();

const chartPropsSchema = z
  .object({
    title: z.string().optional(),
    xKey: z.string(),
    yKey: z.string(),
    data: z.array(chartDatumSchema),
  })
  .strict();

const insightPropsSchema = z
  .object({
    title: z.string(),
    body: z.string(),
    severity: z.enum(["info", "warning", "critical"]).optional(),
  })
  .strict();

export const businessCatalog = defineCatalog(reactSchema, {
  components: {
    Dashboard: {
      props: dashboardPropsSchema,
      slots: ["default"],
      description:
        "Root dashboard container for a concise business answer. Use children for metrics, charts, tables, and insights.",
    },
    Metric: {
      props: metricPropsSchema,
      description:
        "Single business KPI with optional delta and sentiment. Values must come from the provided data or simple derivations.",
    },
    Table: {
      props: tablePropsSchema,
      description:
        "Compact table for comparing rows from the owner data. Keep row counts small and relevant.",
    },
    BarChart: {
      props: chartPropsSchema,
      description:
        "Bar chart for category comparisons. xKey and yKey must match fields in each data object.",
    },
    LineChart: {
      props: chartPropsSchema,
      description:
        "Line chart for trend data. xKey and yKey must match fields in each data object.",
    },
    Insight: {
      props: insightPropsSchema,
      description:
        "Brief insight or recommendation. Use critical only for urgent business risks supported by the data.",
    },
  },
  actions: {},
});

const visibilitySchema = z.union([
  z.boolean(),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

const elementBaseSchema = z.object({
  children: z.array(z.string()),
  visible: visibilitySchema,
});

const businessUiElementSchema = z.discriminatedUnion("type", [
  elementBaseSchema.extend({
    type: z.literal("Dashboard"),
    props: dashboardPropsSchema,
  }),
  elementBaseSchema.extend({
    type: z.literal("Metric"),
    props: metricPropsSchema,
  }),
  elementBaseSchema.extend({
    type: z.literal("Table"),
    props: tablePropsSchema,
  }),
  elementBaseSchema.extend({
    type: z.literal("BarChart"),
    props: chartPropsSchema,
  }),
  elementBaseSchema.extend({
    type: z.literal("LineChart"),
    props: chartPropsSchema,
  }),
  elementBaseSchema.extend({
    type: z.literal("Insight"),
    props: insightPropsSchema,
  }),
]);

export const businessCatalogSchema = z
  .object({
    root: z.string(),
    elements: z.record(z.string(), businessUiElementSchema),
  })
  .strict()
  .superRefine((spec, ctx) => {
    if (!spec.elements[spec.root]) {
      ctx.addIssue({
        code: "custom",
        path: ["root"],
        message: "Root element must exist in elements.",
      });
    }

    for (const [elementId, element] of Object.entries(spec.elements)) {
      for (const childId of element.children) {
        if (!spec.elements[childId]) {
          ctx.addIssue({
            code: "custom",
            path: ["elements", elementId, "children"],
            message: `Child element '${childId}' is not defined.`,
          });
        }
      }
    }
  });

export type BusinessUiSpec = z.infer<typeof businessCatalogSchema>;

export const businessCatalogPrompt = businessCatalog.prompt({
  system:
    "You create concise, data-grounded business UI specs for micro-business owners.",
});
