import { z } from "zod";

export const InputSchema = z.object({
  hl: z.string(),
  gl: z.string(),
  count: z.number().optional(),
  keyword: z.string().optional(),
});

export type Input = z.infer<typeof InputSchema>;

export const SuccessOutputSchema = z.array(
  z.object({
    title: z.string(),
    link: z.string().url(),
  })
);

export const ErrorOutputSchema = z.object({
  error: z.string(),
});

export const OutputSchema = z.union([SuccessOutputSchema, ErrorOutputSchema]);

export type Output = z.infer<typeof OutputSchema>;
