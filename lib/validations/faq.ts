import * as z from "zod";

export const faqSearchSchema = z.object({
  query: z.string(),
  category: z.string().optional(),
});

export type FaqSearchValues = z.infer<typeof faqSearchSchema>;