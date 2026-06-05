import { z } from "zod";

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
): AnswerBusinessQueryOutput {
  return {
    spoken_summary: `I can see this is a data question about "${input.query}". The live data tool is connected, and the full business answer engine comes in the next milestones.`,
    ui_spec: null,
    spec_id: null,
  };
}
