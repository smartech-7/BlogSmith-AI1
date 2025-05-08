
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
  tone: z.string().describe('The desired tone for the blog post (e.g., formal, casual, humorous).'),
  numPictures: z.number().int().min(0).max(5).describe('The number of pictures to generate for the blog post (0-5).'),
});
export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('The title of the blog post.'),
  content: z.string().describe('The generated blog post content.'),
  imageUrls: z.array(z.string()).optional().describe('Optional URLs for images related to the blog post.'),
});
export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

const blogPostPrompt = ai.definePrompt({
  name: 'blogPostPrompt',
  input: {schema: z.object({ topic: GenerateBlogPostInputSchema.shape.topic, tone: GenerateBlogPostInputSchema.shape.tone })}, // Only pass topic and tone to this prompt
  output: {schema: z.object({ title: GenerateBlogPostOutputSchema.shape.title, content: GenerateBlogPostOutputSchema.shape.content })},
  prompt: `You are an expert content writer specializing in blog posts.

You will generate a blog post based on the provided topic and tone. The blog post should have a title and multiple sections with appropriate headings. The AI tool decides on headings to incorporate in the generated output.

Topic: {{{topic}}}
Tone: {{{tone}}}

Ensure the content is SEO optimized and engaging. If the user requested images, consider weaving in descriptions or placeholders like "[Image suggestion: a vibrant cityscape at sunset]" where an image might fit well within the text.

Output the blog post in a structured format with a title and content sections.`, 
});

// Renamed output field for clarity
const ImageGenerationPromptOutputSchema = z.object({
  imagePromptText: z.string().describe('A DALL-E prompt text for generating an image.'),
});

const imageGenerationPrompt = ai.definePrompt({
  name: 'imageGenerationPrompt',
  input: {schema: z.object({ topic: GenerateBlogPostInputSchema.shape.topic, tone: GenerateBlogPostInputSchema.shape.tone })}, // Only pass topic and tone
  output: {schema: ImageGenerationPromptOutputSchema},
  prompt: `Generate a DALL-E image prompt that can be used to generate an image related to the following blog post topic and tone.

Topic: {{{topic}}}
Tone: {{{tone}}}

The image prompt should be descriptive and specific, so that the generated image is highly relevant to the blog post. The image should be of high quality and visually appealing.

Only output the image prompt text. Do not include any other text.`,
});

const generateBlogPostFlow = ai.defineFlow(
  {
    name: 'generateBlogPostFlow',
    inputSchema: GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async (input: GenerateBlogPostInput) => {
    const {output: blogContentOutput} = await blogPostPrompt({ topic: input.topic, tone: input.tone });

    const imageUrls: string[] = [];
    if (input.numPictures > 0) {
      for (let i = 0; i < input.numPictures; i++) {
        try {
          const imagePromptResponse = await imageGenerationPrompt({ topic: input.topic, tone: input.tone });
          const imagePromptText = imagePromptResponse.output?.imagePromptText;
          
          if (imagePromptText) {
            const imageResponse = await ai.generate({
              model: 'googleai/gemini-2.0-flash-exp',
              prompt: imagePromptText,
              config: {
                responseModalities: ['TEXT', 'IMAGE'], 
              },
            });
            if (imageResponse.media?.url) {
              imageUrls.push(imageResponse.media.url);
            }
          }
        } catch (e) {
          console.error(`Error generating image ${i + 1} of ${input.numPictures}:`, e);
          // Don't throw, just log the error and continue trying to generate other images.
        }
      }
    }

    return {
      ...blogContentOutput!,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    };
  }
);
