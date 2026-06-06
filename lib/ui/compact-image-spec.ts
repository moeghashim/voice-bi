import { businessCatalogSchema, type BusinessUiSpec } from "@/lib/ui/catalog";

const MAX_COMPACT_METRICS = 3;

export function createCompactImageBusinessSpec(
  fullSpec: BusinessUiSpec,
): BusinessUiSpec {
  const rootElement = fullSpec.elements[fullSpec.root];
  const orderedElements = getOrderedVisibleElements(fullSpec);
  const metricEntries = orderedElements
    .filter(([, element]) => element.type === "Metric")
    .slice(0, MAX_COMPACT_METRICS);
  const chartEntry = orderedElements.find(
    ([, element]) => element.type === "BarChart" || element.type === "LineChart",
  );
  const insightEntry =
    orderedElements.find(([, element]) => element.type === "Insight") ??
    createFallbackInsightEntry(rootElement);
  const children: string[] = [];
  const elements: BusinessUiSpec["elements"] = {
    compact_dashboard: {
      type: "Dashboard",
      props: {
        title:
          rootElement?.type === "Dashboard"
            ? rootElement.props.title
            : "Business answer",
        summary:
          rootElement?.type === "Dashboard" ? rootElement.props.summary : undefined,
      },
      children,
      visible: true,
    },
  };

  for (const [index, [, element]] of metricEntries.entries()) {
    const elementId = `metric_${index + 1}`;

    children.push(elementId);
    elements[elementId] = {
      ...element,
      children: [],
      visible: true,
    };
  }

  if (chartEntry) {
    const [, element] = chartEntry;

    children.push("summary_chart");
    elements.summary_chart = {
      ...element,
      children: [],
      visible: true,
    };
  }

  const [, insightElement] = insightEntry;
  children.push("recommendation");
  elements.recommendation = {
    ...insightElement,
    children: [],
    visible: true,
  };

  const compactSpec = {
    root: "compact_dashboard",
    elements,
  };
  const parsed = businessCatalogSchema.parse(compactSpec);

  return parsed;
}

function getOrderedVisibleElements(spec: BusinessUiSpec) {
  const rootElement = spec.elements[spec.root];
  const rootChildIds = rootElement?.children ?? [];
  const seen = new Set<string>();
  const orderedIds = [
    ...rootChildIds,
    ...Object.keys(spec.elements).filter((elementId) => elementId !== spec.root),
  ].filter((elementId) => {
    if (seen.has(elementId)) {
      return false;
    }

    seen.add(elementId);
    return true;
  });

  return orderedIds
    .map((elementId) => [elementId, spec.elements[elementId]] as const)
    .filter(([, element]) => element && element.visible !== false);
}

function createFallbackInsightEntry(
  rootElement: BusinessUiSpec["elements"][string] | undefined,
) {
  return [
    "fallback_recommendation",
    {
      type: "Insight",
      props: {
        title: "Recommendation",
        body:
          rootElement?.type === "Dashboard" && rootElement.props.summary
            ? rootElement.props.summary
            : "Review the summarized business answer before taking action.",
        severity: "info",
      },
      children: [],
      visible: true,
    },
  ] as const;
}
