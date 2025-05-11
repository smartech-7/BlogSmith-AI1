'use server';
/**
 * @fileOverview SEO content optimization AI agent.
 *
 * - optimizeForSeo - A function that handles the SEO optimization process for given content.
 * - OptimizeForSeoInput - The input type for the optimizeForSeo function.
 * - OptimizeForSeoOutput - The return type for the optimizeForSeo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeForSeoInputSchema = z.object({
  content: z.string().describe('The content to be optimized for SEO.'),
  keywords: z.string().describe('A comma-separated list of keywords to optimize for.'),
});
export type OptimizeForSeoInput = z.infer<typeof OptimizeForSeoInputSchema>;

const OptimizeForSeoOutputSchema = z.object({
  optimizedContent: z.string().describe('The SEO-optimized content.'),
});
export type OptimizeForSeoOutput = z.infer<typeof OptimizeForSeoOutputSchema>;

export async function optimizeForSeo(input: OptimizeForSeoInput): Promise<OptimizeForSeoOutput> {
  return optimizeForSeoFlow(input);
}

const seoOptimizationPrompt = ai.definePrompt({
  name: 'seoOptimizationPrompt',
  input: {schema: OptimizeForSeoInputSchema},
  output: {schema: OptimizeForSeoOutputSchema},
  prompt: `You are an SEO expert. Optimize the following content based on the provided keywords.
Ensure the content remains readable, natural, and retains its original meaning.
Integrate the keywords naturally into the text. If the content includes subheadings, try to incorporate keywords into them where appropriate.
Do not add any new sections or drastically change the structure. Focus on subtle improvements.
The output should be only the optimized content.

Original Content:
{{{content}}}

Keywords to optimize for: {{{keywords}}}

Important: The optimized content must be plain text suitable for direct pasting into platforms like Google Blogger.
Do not use any special characters or symbols other than standard punctuation such as periods, commas, question marks, exclamation marks, apostrophes, hyphens, and parentheses.
Avoid any markdown formatting (e.g., no heading markers like '###', no horizontal rules like '***', no triple backticks \`\`\`).
Specifically, do NOT use \`**\` for bolding.
Do NOT use HTML heading tags like \`<h1>\`, \`<h2>\`, \`<h3>\`. If subheadings are present in the original content and you modify them, they must remain plain text.
Do NOT use bullet points or numbered lists (e.g., no \`*\`, \`-\`, \`1.\`, \`2.\`) unless they were present in the original content and are preserved naturally.
Output only the 'optimizedContent' as a single string.
`,
});

const optimizeForSeoFlow = ai.defineFlow(
  {
    name: 'optimizeForSeoFlow',
    inputSchema: OptimizeForSeoInputSchema,
    outputSchema: OptimizeForSeoOutputSchema,
  },
  async (input: OptimizeForSeoInput) => {
    const {output} = await seoOptimizationPrompt(input);
    if (!output || !output.optimizedContent) {
      throw new Error('Failed to optimize content for SEO. The AI model did not return optimized content.');
    }
    return output;
  }
);

