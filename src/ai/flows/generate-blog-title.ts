
// src/ai/flows/generate-blog-title.ts
'use server';
/**
 * @fileOverview A blog post title generator AI agent.
 *
 * - generateBlogTitle - A function that handles the blog title generation process.
 * - GenerateBlogTitleInput - The input type for the generateBlogTitle function.
 * - GenerateBlogTitleOutput - The return type for the generateBlogTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBlogTitleInputSchema = z.object({
  mainKeyword: z.string().min(3, { message: "Main keyword must be at least 3 characters." }).max(100, { message: "Main keyword must be at most 100 characters." }).describe('The main keyword for the blog post.'),
});
export type GenerateBlogTitleInput = z.infer<typeof GenerateBlogTitleInputSchema>;

const GenerateBlogTitleOutputSchema = z.object({
  title: z.string().describe('The generated blog post title.'),
});
export type GenerateBlogTitleOutput = z.infer<typeof GenerateBlogTitleOutputSchema>;

export async function generateBlogTitle(input: GenerateBlogTitleInput): Promise<GenerateBlogTitleOutput> {
  return generateBlogTitleFlow(input);
}

const titleGenerationPrompt = ai.definePrompt({
  name: 'titleGenerationPrompt',
  input: {schema: GenerateBlogTitleInputSchema},
  output: {schema: GenerateBlogTitleOutputSchema},
  prompt: `You are an expert SEO copywriter specializing in creating blog post titles that rank well on Google.
Generate one highly SEO-optimized, catchy, and engaging blog post title based on the provided main keyword.

The title MUST:
1.  Include the main keyword: "{{{mainKeyword}}}".
2.  Be highly relevant to the main keyword.
3.  Be clear, specific, and accurately reflect potential content.
4.  Be written to entice clicks (high Click-Through Rate potential).
5.  Be concise and impactful. Aim for a length that is generally effective for search engine display.
6.  Place the main keyword "{{{mainKeyword}}}" prominently, ideally towards the beginning of the title if it sounds natural.

The title should be PLAIN TEXT. Do NOT use any HTML tags, markdown syntax (like '#'), or any bolding (like '**').
Output only the title itself as a string within the 'title' field of the JSON response.

Main Keyword: "{{{mainKeyword}}}"
`,
});

const generateBlogTitleFlow = ai.defineFlow(
  {
    name: 'generateBlogTitleFlow',
    inputSchema: GenerateBlogTitleInputSchema,
    outputSchema: GenerateBlogTitleOutputSchema,
  },
  async (input: GenerateBlogTitleInput) => {
    const {output} = await titleGenerationPrompt(input);
    if (!output || !output.title) {
      throw new Error('Failed to generate blog title. The AI model did not return a title.');
    }
    return output;
  }
);

