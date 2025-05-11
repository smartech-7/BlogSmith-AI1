
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
  wordCount: z.number().int().min(50).max(2000).describe('The desired approximate word count for the blog post (50-2000).'),
});
export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('The title of the blog post.'),
  content: z.string().describe('The generated blog post content, potentially including image placeholders like [IMAGE_PLACEHOLDER_1].'),
  imageUrls: z.array(z.string()).optional().describe('Optional URLs for images related to the blog post.'),
});
export type GenerateBlogPostOutput = z.infer<typeof GenerateBlogPostOutputSchema>;

export async function generateBlogPost(input: GenerateBlogPostInput): Promise<GenerateBlogPostOutput> {
  return generateBlogPostFlow(input);
}

const blogPostPrompt = ai.definePrompt({
  name: 'blogPostPrompt',
  input: {
    schema: z.object({
      topic: GenerateBlogPostInputSchema.shape.topic,
      tone: GenerateBlogPostInputSchema.shape.tone,
      wordCount: GenerateBlogPostInputSchema.shape.wordCount,
      numPictures: GenerateBlogPostInputSchema.shape.numPictures,
    })
  },
  output: {schema: z.object({ title: GenerateBlogPostOutputSchema.shape.title, content: GenerateBlogPostOutputSchema.shape.content })},
  prompt: `You are an expert content writer specializing in blog posts.

You will generate a blog post based on the provided topic, tone, desired word count, and number of images. The blog post should have a title and multiple sections with appropriate headings.

Topic: {{{topic}}}
Tone: {{{tone}}}
Approximate Word Count: {{{wordCount}}} words. Please try to generate content close to this length.
Number of images requested: {{{numPictures}}}

If images are requested (number of images > 0), you MUST include exactly {{{numPictures}}} placeholders in the generated content where images would be most appropriate and contextually relevant. Use placeholders in the format "[IMAGE_PLACEHOLDER_1]", "[IMAGE_PLACEHOLDER_2]", etc., directly within the text. These placeholders will be replaced by actual images later. Ensure these placeholders are naturally integrated into the flow of the content. For example, if numPictures is 2, include "[IMAGE_PLACEHOLDER_1]" and "[IMAGE_PLACEHOLDER_2]".

Ensure the content is SEO optimized and engaging.
Output the blog post in a structured format with a title and content sections. The content should be a single string, potentially containing the image placeholders.

Important: The generated title and content must be plain text. Do not use any special characters or symbols (except for standard punctuation such as periods, commas, question marks, exclamation marks, apostrophes, hyphens, and parentheses). Avoid any markdown formatting, especially triple backticks (\`\`\`).
`,
});

const ImageGenerationPromptOutputSchema = z.object({
  imagePromptText: z.string().describe('A DALL-E prompt text for generating an image.'),
});

const imageGenerationPrompt = ai.definePrompt({
  name: 'imageGenerationPrompt',
  input: {schema: z.object({ topic: GenerateBlogPostInputSchema.shape.topic, tone: GenerateBlogPostInputSchema.shape.tone, imageContext: z.string().optional().describe("Optional context from the blog post where an image placeholder appears, to make the image more relevant.") })},
  output: {schema: ImageGenerationPromptOutputSchema},
  prompt: `Generate a DALL-E image prompt that can be used to generate an image related to the following blog post topic and tone.
{{#if imageContext}}
The image should be suitable for the following context within the blog post: "{{imageContext}}"
{{/if}}
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
    const {output: blogContentOutput} = await blogPostPrompt({
      topic: input.topic,
      tone: input.tone,
      wordCount: input.wordCount,
      numPictures: input.numPictures,
    });

    const imageUrls: string[] = [];
    if (input.numPictures > 0 && blogContentOutput?.content) {
      const content = blogContentOutput.content;
      
      for (let i = 0; i < input.numPictures; i++) {
        const placeholder = `[IMAGE_PLACEHOLDER_${i + 1}]`;
        let imageContext: string | undefined = undefined;
        
        // Try to get some context around the placeholder for better image generation
        const placeholderIndex = content.indexOf(placeholder);
        if (placeholderIndex !== -1) {
          const contextStart = Math.max(0, placeholderIndex - 100);
          const contextEnd = Math.min(content.length, placeholderIndex + placeholder.length + 100);
          imageContext = content.substring(contextStart, contextEnd);
        }

        try {
          const imagePromptResponse = await imageGenerationPrompt({ 
            topic: input.topic, 
            tone: input.tone,
            imageContext: imageContext 
          });
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
            } else {
              // Add a placeholder URL if image generation fails for a specific image
              imageUrls.push(`https://picsum.photos/seed/placeholder${i+1}/600/400`);
               console.warn(`Image ${i+1} could not be generated, using placeholder. Prompt was: ${imagePromptText}`);
            }
          } else {
             imageUrls.push(`https://picsum.photos/seed/placeholder${i+1}/600/400`);
             console.warn(`Image prompt for image ${i+1} could not be generated, using placeholder.`);
          }
        } catch (e) {
          console.error(`Error generating image ${i + 1} of ${input.numPictures}:`, e);
          // Don't throw, just log the error and add a placeholder image URL.
          imageUrls.push(`https://picsum.photos/seed/error${i+1}/600/400`);
        }
      }
    }

    return {
      ...blogContentOutput!,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    };
  }
);

