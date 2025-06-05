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
    pubDate: z.string().optional(),
  })
);

export const ExtractedNewsOutputSchema = z.array(
  z.object({
    title: z.string(),
    link: z.string().url(),
    content: z.string().optional(),
    author: z.string().optional(),
    publishDate: z.string().optional(),
    description: z.string().optional(),
  })
);

export const ErrorOutputSchema = z.object({
  error: z.string(),
});

export const OutputSchema = z.union([SuccessOutputSchema, ErrorOutputSchema]);
export const ExtractedOutputSchema = z.union([ExtractedNewsOutputSchema, ErrorOutputSchema]);

export type Output = z.infer<typeof OutputSchema>;
export type ExtractedOutput = z.infer<typeof ExtractedOutputSchema>;
