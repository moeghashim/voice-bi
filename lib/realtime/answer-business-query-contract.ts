import { z } from "zod";

import type { BusinessUiSpec } from "@/lib/ui/catalog";

export const answerBusinessQueryInputSchema = z.object({
  query: z.string().trim().min(1, "query is required"),
});

export type AnswerBusinessQueryInput = z.infer<
  typeof answerBusinessQueryInputSchema
>;

export type AnswerBusinessQueryOutput = {
  spoken_summary: string;
  ui_spec: BusinessUiSpec;
  spec_id: string;
};
