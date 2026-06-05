import { z } from "zod";

import type { NormalizedData } from "@/lib/data/normalize";

export const answerBusinessQueryInputSchema = z.object({
  query: z.string().trim().min(1, "query is required"),
});

export type AnswerBusinessQueryInput = z.infer<
  typeof answerBusinessQueryInputSchema
>;

export type AnswerBusinessQueryOutput = {
  spoken_summary: string;
  ui_spec: null;
  spec_id: null;
};

export function answerBusinessQueryStub(
  input: AnswerBusinessQueryInput,
  normalizedData?: NormalizedData | null,
): AnswerBusinessQueryOutput {
  const dataSummary = normalizedData
    ? ` I have ${normalizedData.rows.length} rows across ${normalizedData.columns.length} columns loaded for this session.`
    : " The live data tool is connected.";

  return {
    spoken_summary: `I can see this is a data question about "${input.query}".${dataSummary} The full business answer engine comes in the next milestones.`,
    ui_spec: null,
    spec_id: null,
  };
}
