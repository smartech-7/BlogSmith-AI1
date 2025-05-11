// src/ai/flows/suggest-blog-headings.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow that suggests blog headings based on a given topic.
 *
 * - suggestBlogHeadings - A function that uses the suggestBlogHeadingsFlow to generate blog headings.
 * - SuggestBlogHeadingsInput - The input type for the suggestBlogHeadings function.
 * - SuggestBlogHeadingsOutput - The output type for the suggestBlogHeadings function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestBlogHeadingsInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate blog headings.'),
});
export type SuggestBlogHeadingsInput = z.infer<typeof SuggestBlogHeadingsInputSchema>;

const SuggestBlogHeadingsOutputSchema = z.object({
  headings: z.array(z.string()).describe('An array of suggested blog headings.'),
});
export type SuggestBlogHeadingsOutput = z.infer<typeof SuggestBlogHeadingsOutputSchema>;

export async function suggestBlogHeadings(input: SuggestBlogHeadingsInput): Promise<SuggestBlogHeadingsOutput> {
  return suggestBlogHeadingsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBlogHeadingsPrompt',
  input: {schema: SuggestBlogHeadingsInputSchema},
  output: {schema: SuggestBlogHeadingsOutputSchema},
  prompt: `You are an expert in blog content creation and SEO optimization.
  Based on the given topic, suggest a list of relevant and engaging blog headings.
  The headings should be suitable for attracting readers and improving search engine rankings.
  Topic: {{{topic}}}
  Please provide the headings as a JSON array of strings.

  Important: Each heading in the JSON array must be plain text. Do not use any special characters or symbols (except for standard punctuation such as periods, commas, question marks, exclamation marks, apostrophes, hyphens, and parentheses). Avoid any markdown formatting, especially triple backticks (\`\`\`). Ensure the output remains a valid JSON array of strings.
  `,
});

const suggestBlogHeadingsFlow = ai.defineFlow(
  {
    name: 'suggestBlogHeadingsFlow',
    inputSchema: SuggestBlogHeadingsInputSchema,
    outputSchema: SuggestBlogHeadingsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

