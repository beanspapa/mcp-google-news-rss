import { z } from "zod";
export declare const InputSchema: z.ZodObject<{
    hl: z.ZodString;
    gl: z.ZodString;
    count: z.ZodDefault<z.ZodNumber>;
    keyword: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    hl: string;
    gl: string;
    count: number;
    keyword?: string | undefined;
}, {
    hl: string;
    gl: string;
    count?: number | undefined;
    keyword?: string | undefined;
}>;
export type Input = z.infer<typeof InputSchema>;
export declare const SuccessOutputSchema: z.ZodArray<z.ZodObject<{
    title: z.ZodString;
    link: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    link: string;
}, {
    title: string;
    link: string;
}>, "many">;
export declare const ErrorOutputSchema: z.ZodObject<{
    error: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error: string;
}, {
    error: string;
}>;
export declare const OutputSchema: z.ZodUnion<[z.ZodArray<z.ZodObject<{
    title: z.ZodString;
    link: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    link: string;
}, {
    title: string;
    link: string;
}>, "many">, z.ZodObject<{
    error: z.ZodString;
}, "strip", z.ZodTypeAny, {
    error: string;
}, {
    error: string;
}>]>;
export type Output = z.infer<typeof OutputSchema>;
//# sourceMappingURL=index.d.ts.map