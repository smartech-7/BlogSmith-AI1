
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
  mainKeyword: z.string().min(3, { message: "Main keyword must be at least 3 characters." }).max(100, { message: "Main keyword must be at most 100 characters." }).describe('The main keyword for the blog post.'),
  relatedKeywords: z.string().min(3, { message: "Related keywords must be at least 3 characters." }).max(200, { message: "Related keywords must be at most 200 characters." }).describe('2-3 related keywords, comma-separated.'),
  tone: z.string().describe('The desired tone. The core prompt emphasizes "friendly and helpful".'),
  numPictures: z.coerce.number().int().min(0).max(5).describe('The number of pictures to generate for the blog post (0-5).'),
  wordCount: z.coerce.number().int().min(700).max(3000).describe('The desired approximate word count (minimum 700 words).'),
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
    schema: GenerateBlogPostInputSchema
  },
  output: {schema: z.object({ title: GenerateBlogPostOutputSchema.shape.title, content: GenerateBlogPostOutputSchema.shape.content })},
  prompt: `Write a 100% original, SEO-optimized blog article in English that is easy enough for a 6th-grade student to read.
The article should be at least {{{wordCount}}} words (minimum 700 words).

Main Keyword: {{{mainKeyword}}}
Related Keywords: {{{relatedKeywords}}}
Tone: {{{tone}}} (The overall approach should be friendly and helpful)
Number of images requested: {{{numPictures}}}

Follow this structure:

Title: Include the main keyword: "{{{mainKeyword}}}". Make it interesting.

Introduction: Write 3-4 simple sentences that explain what the article is about. Use the main keyword "{{{mainKeyword}}}" once.

Body: Use short paragraphs (3-4 lines each). Use the main keyword "{{{mainKeyword}}}" at least 2-3 more times. Add related keywords (like those in "{{{relatedKeywords}}}") naturally. Keep the tone friendly and helpful. Use bullet points or numbered lists if appropriate for clarity. Include subheadings with keywords where relevant.

Conclusion: Write 3-4 sentences that summarize the article. Encourage the reader to take action (like sharing or learning more).

SEO Tips to follow:
- Use short sentences and simple vocabulary.
- Write in an active voice.
- Avoid fluff or complicated words.
- Include subheadings with keywords naturally integrated.
- Ensure the main keyword "{{{mainKeyword}}}" appears in the first 100 words of the article.

If images are requested (number of images > 0), you MUST include exactly {{{numPictures}}} placeholders in the generated content where images would be most appropriate and contextually relevant. Use placeholders in the format "[IMAGE_PLACEHOLDER_1]", "[IMAGE_PLACEHOLDER_2]", etc., directly within the text. These placeholders will be replaced by actual images later. Ensure these placeholders are naturally integrated into the flow of the content. For example, if numPictures is 2, include "[IMAGE_PLACEHOLDER_1]" and "[IMAGE_PLACEHOLDER_2]".

Important: The generated title and content must be plain text suitable for direct pasting into platforms like Google Blogger. Do not use any special characters or symbols other than standard punctuation such as periods, commas, question marks, exclamation marks, apostrophes, hyphens, and parentheses. Avoid any markdown formatting (e.g., no '###' heading markers, no '***' horizontal rules, no triple backticks \`\`\`). Output the entire article (Introduction, Body, Conclusion) as a single string for the 'content' field.
`,
});

const ImageGenerationPromptOutputSchema = z.object({
  imagePromptText: z.string().describe('A DALL-E prompt text for generating an image.'),
});

const imageGenerationPrompt = ai.definePrompt({
  name: 'imageGenerationPrompt',
  input: {schema: z.object({ mainKeyword: GenerateBlogPostInputSchema.shape.mainKeyword, relatedKeywords: GenerateBlogPostInputSchema.shape.relatedKeywords, tone: GenerateBlogPostInputSchema.shape.tone, imageContext: z.string().optional().describe("Optional context from the blog post where an image placeholder appears, to make the image more relevant.") })},
  output: {schema: ImageGenerationPromptOutputSchema},
  prompt: `Generate a DALL-E image prompt for an image relevant to a blog post.
The blog post's main keyword is "{{{mainKeyword}}}" and it also discusses related topics like "{{{relatedKeywords}}}".
The tone of the blog post is "{{{tone}}}", generally friendly and helpful.
{{#if imageContext}}
The image should be particularly suitable for the following context within the blog post: "{{imageContext}}"
{{/if}}
The image prompt should be descriptive and specific, aiming for a high-quality, visually appealing, and highly relevant image.

Only output the image prompt text. Do not include any other text or quotation marks around the prompt.`,
});

const generateBlogPostFlow = ai.defineFlow(
  {
    name: 'generateBlogPostFlow',
    inputSchema: GenerateBlogPostInputSchema,
    outputSchema: GenerateBlogPostOutputSchema,
  },
  async (input: GenerateBlogPostInput) => {
    const {output: blogContentOutput} = await blogPostPrompt({
      mainKeyword: input.mainKeyword,
      relatedKeywords: input.relatedKeywords,
      tone: input.tone,
      wordCount: input.wordCount,
      numPictures: input.numPictures,
    });

    if (!blogContentOutput || !blogContentOutput.title || !blogContentOutput.content) {
      throw new Error("Failed to generate blog post title or content from the AI model. The response might have been empty or incomplete.");
    }

    const imageUrls: string[] = [];
    if (input.numPictures > 0 && blogContentOutput?.content) {
      const content = blogContentOutput.content;
      
      for (let i = 0; i < input.numPictures; i++) {
        const placeholder = `[IMAGE_PLACEHOLDER_${i + 1}]`;
        let imageContext: string | undefined = undefined;
        
        const placeholderIndex = content.indexOf(placeholder);
        if (placeholderIndex !== -1) {
          const contextStart = Math.max(0, placeholderIndex - 150); // Increased context window
          const contextEnd = Math.min(content.length, placeholderIndex + placeholder.length + 150); // Increased context window
          imageContext = content.substring(contextStart, contextEnd);
        }

        try {
          const imagePromptResponse = await imageGenerationPrompt({ 
            mainKeyword: input.mainKeyword,
            relatedKeywords: input.relatedKeywords,
            tone: input.tone,
            imageContext: imageContext 
          });
          const imagePromptText = imagePromptResponse.output?.imagePromptText;
          
          if (imagePromptText) {
            const imageResponse = await ai.generate({
              model: 'googleai/gemini-2.0-flash-exp', // Ensure this model supports image generation
              prompt: imagePromptText,
              config: {
                responseModalities: ['TEXT', 'IMAGE'], 
              },
            });
            if (imageResponse.media?.url) {
              imageUrls.push(imageResponse.media.url);
            } else {
              imageUrls.push(`https://picsum.photos/seed/placeholder${i+1}/600/400`);
               console.warn(`Image ${i+1} could not be generated (no media URL), using placeholder. Prompt was: ${imagePromptText}`);
            }
          } else {
             imageUrls.push(`https://picsum.photos/seed/placeholder${i+1}/600/400`);
             console.warn(`Image prompt for image ${i+1} could not be generated, using placeholder.`);
          }
        } catch (e: any) {
          console.error(`Error generating image ${i + 1} of ${input.numPictures}:`, e.message);
          imageUrls.push(`https://picsum.photos/seed/error${i+1}/600/400`);
        }
      }
    }

    return {
      ...blogContentOutput,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    };
  }
);

