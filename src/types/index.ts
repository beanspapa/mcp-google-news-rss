
import { z } from "zod";

export const InputSchema = 
  z.object({
  hl: z.string(),
  gl: z.string(),
  count: z.number().default(5),
  keyword: z.string().optional(),
  });

export type Input = z.infer<typeof InputSchema>;


export const OutputSchema = 
  z.object({
    hl: z.string(),
    gl: z.string(),
    count: z.number(),
    keyword: z.string(),
    articles: z.array(z.object({
      title: z.string(),
      link: z.string().url(),
    })),
    error: z.string().optional()
  });

export type Output = z.infer<typeof OutputSchema>;