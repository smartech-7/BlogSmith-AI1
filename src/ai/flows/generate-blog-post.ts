// src/ai/flows/generate-blog-post.ts
'use server';
/**
 * @fileOverview A blog post generator AI agent.
 *
 * - generateBlogPost - A function that handles the blog post generation process.
 * - GenerateBlogPostInput - The input type for the generateBlogPost function.
 * - GenerateBlogPostOutput - The return type for the generateBlogPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBlogPostInputSchema = z.object({
  topic: z.string().describe('The topic of the blog post.'),
  keywords: z.string().describe('Keywords to guide the content generation.'),
});
export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('The title of the blog post.'),
  content: z.string().describe('The generated blog post content.'),
  imageUrl: z.string().optional().describe('An optional URL for an image related to the blog post.'),
});
export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

const blogPostPrompt = ai.definePrompt({
  name: 'blogPostPrompt',
  input: {schema: GenerateBlogPostInputSchema},
  output: {schema: GenerateBlogPostOutputSchema},
  prompt: `You are an expert content writer specializing in blog posts.

You will generate a blog post based on the provided topic and keywords. The blog post should have a title and multiple sections with appropriate headings. The AI tool decides on headings to incorporate in the generated output.

Topic: {{{topic}}}
Keywords: {{{keywords}}}

Ensure the content is SEO optimized.

Output the blog post in a structured format with a title and content sections.`, 
});

const imageGenerationPrompt = ai.definePrompt({
  name: 'imageGenerationPrompt',
  input: {schema: GenerateBlogPostInputSchema},
  output: {schema: z.object({imageUrl: z.string()})},
  prompt: `Generate a DALL-E image prompt that can be used to generate an image related to the following blog post topic and keywords:

Topic: {{{topic}}}
Keywords: {{{keywords}}}

The image prompt should be descriptive and specific, so that the generated image is highly relevant to the blog post. The image should be of high quality and visually appealing.

Only output the image prompt. Do not include any other text.`,
});

const generateBlogPostFlow = ai.defineFlow(
  {
    name: 'generateBlogPostFlow',
    inputSchema: GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async input => {
    const {output} = await blogPostPrompt(input);

    // Generate an image URL in parallel
    let imageUrl: string | undefined = undefined;
    try {
      const imagePromptResponse = await imageGenerationPrompt(input);
      const imagePrompt = imagePromptResponse.output?.imageUrl;
      if (imagePrompt) {
        const imageResponse = await ai.generate({
          // IMPORTANT: ONLY the googleai/gemini-2.0-flash-exp model is able to generate images. You MUST use exactly this model to generate images.
          model: 'googleai/gemini-2.0-flash-exp',
          prompt: imagePrompt,
          config: {
            responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE, IMAGE only won't work
          },
        });
        imageUrl = imageResponse.media?.url;
      }
    } catch (e) {
      console.error('Error generating image:', e);
      // Don't throw, just log the error and continue without an image.
    }

    return {
      ...output!,
      imageUrl,
    };
  }
);
