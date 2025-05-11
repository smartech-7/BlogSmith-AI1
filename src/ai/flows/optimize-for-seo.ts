// src/ai/flows/optimize-for-seo.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow to optimize blog content for SEO based on provided keywords.
 *
 * - optimizeForSeo - A function that takes keywords and content as input and returns SEO-optimized content.
 * - OptimizeForSeoInput - The input type for the optimizeForSeo function.
 * - OptimizeForSeoOutput - The return type for the optimizeForSeo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeForSeoInputSchema = z.object({
  content: z.string().describe('The blog content to optimize.'),
  keywords: z.string().describe('Comma-separated keywords to optimize the content for.'),
});

export type OptimizeForSeoInput = z.infer<typeof OptimizeForSeoInputSchema>;

const OptimizeForSeoOutputSchema = z.object({
  optimizedContent: z.string().describe('The SEO-optimized blog content.'),
});

export type OptimizeForSeoOutput = z.infer<typeof OptimizeForSeoOutputSchema>;

export async function optimizeForSeo(input: OptimizeForSeoInput): Promise<OptimizeForSeoOutput> {
  return optimizeForSeoFlow(input);
}

const optimizeForSeoPrompt = ai.definePrompt({
  name: 'optimizeForSeoPrompt',
  input: {schema: OptimizeForSeoInputSchema},
  output: {schema: OptimizeForSeoOutputSchema},
  prompt: `You are an SEO expert. Optimize the following content for the given keywords.

Content: {{{content}}}

Keywords: {{{keywords}}}

Output the optimized content. The optimized content should be highly relevant to the keywords, and should be well written and engaging.

Important: The \`optimizedContent\` must be plain text suitable for direct pasting into platforms like Google Blogger. Do not use any special characters or symbols other than standard punctuation such as periods, commas, question marks, exclamation marks, apostrophes, hyphens, and parentheses. Avoid any markdown formatting (e.g., no '###' heading markers, no '***' horizontal rules, no triple backticks \`\`\`).
`,
});

const optimizeForSeoFlow = ai.defineFlow(
  {
    name: 'optimizeForSeoFlow',
    inputSchema: OptimizeForSeoInputSchema,
    outputSchema: OptimizeForSeoOutputSchema,
  },
  async input => {
    const {output} = await optimizeForSeoPrompt(input);
    return output!;
  }
);

