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

export const businessComponentPropSchemas = {
  Dashboard: dashboardPropsSchema,
  Metric: metricPropsSchema,
  Table: tablePropsSchema,
  BarChart: chartPropsSchema,
  LineChart: chartPropsSchema,
  Insight: insightPropsSchema,
};

const businessComponentDefinitions = {
  Dashboard: {
    props: businessComponentPropSchemas.Dashboard,
    slots: ["default"],
    description:
      "Root dashboard container for a concise business answer. Use children for metrics, charts, tables, and insights.",
  },
  Metric: {
    props: businessComponentPropSchemas.Metric,
    description:
      "Single business KPI with optional delta and sentiment. Values must come from the provided data or simple derivations.",
  },
  Table: {
    props: businessComponentPropSchemas.Table,
    description:
      "Compact table for comparing rows from the owner data. Keep row counts small and relevant.",
  },
  BarChart: {
    props: businessComponentPropSchemas.BarChart,
    description:
      "Bar chart for category comparisons. xKey and yKey must match fields in each data object.",
  },
  LineChart: {
    props: businessComponentPropSchemas.LineChart,
    description:
      "Line chart for trend data. xKey and yKey must match fields in each data object.",
  },
  Insight: {
    props: businessComponentPropSchemas.Insight,
    description:
      "Brief insight or recommendation. Use critical only for urgent business risks supported by the data.",
  },
};

export const businessCatalog = defineCatalog(reactSchema, {
  components: businessComponentDefinitions,
  actions: {},
});

const elementBaseSchema = z.object({
  children: z.array(z.string()),
  visible: z.boolean(),
});

export const businessCatalogElementSchema = z.discriminatedUnion("type", [
  elementBaseSchema.extend({
    type: z.literal("Dashboard"),
    props: businessComponentPropSchemas.Dashboard,
  }),
  elementBaseSchema.extend({
    type: z.literal("Metric"),
    props: businessComponentPropSchemas.Metric,
  }),
  elementBaseSchema.extend({
    type: z.literal("Table"),
    props: businessComponentPropSchemas.Table,
  }),
  elementBaseSchema.extend({
    type: z.literal("BarChart"),
    props: businessComponentPropSchemas.BarChart,
  }),
  elementBaseSchema.extend({
    type: z.literal("LineChart"),
    props: businessComponentPropSchemas.LineChart,
  }),
  elementBaseSchema.extend({
    type: z.literal("Insight"),
    props: businessComponentPropSchemas.Insight,
  }),
]);

const businessCatalogStructureSchema = z
  .object({
    root: z.string(),
    elements: z.record(z.string(), businessCatalogElementSchema),
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

export const businessCatalogSchema = businessCatalog
  .zodSchema()
  .pipe(businessCatalogStructureSchema);

export type BusinessUiSpec = z.infer<typeof businessCatalogStructureSchema>;

export const businessCatalogPrompt = businessCatalog.prompt({
  system:
    "You create concise, data-grounded business UI specs for micro-business owners.",
});
