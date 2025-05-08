
'use server';
/**
 * @fileOverview A social media post generator AI agent.
 *
 * - generateSocialMediaPost - A function that handles social media post generation.
 * - GenerateSocialMediaPostInput - The input type for the generateSocialMediaPost function.
 * - GenerateSocialMediaPostOutput - The return type for the generateSocialMediaPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { SocialMediaPlatform } from '@/ai/schemas/social-media-platform';
import { SocialMediaPlatformSchema } from '@/ai/schemas/social-media-platform';


const GenerateSocialMediaPostInputSchema = z.object({
  topic: z.string().describe('The topic of the social media posts.'),
  platform: SocialMediaPlatformSchema.describe('The target social media platform.'),
  tone: z.string().describe('The desired tone for the posts (e.g., formal, casual, witty).'),
  numPosts: z.number().int().min(1).max(5).describe('The number of social media post variations to generate (1-5).'),
  maxLength: z.number().int().optional().describe('Optional maximum character length for each post (e.g., 280 for Twitter). The AI will try to adhere to this.'),
  includeHashtags: z.boolean().default(true).describe('Whether to include relevant hashtags.'),
  numImagesPerPost: z.number().int().min(0).max(3).describe('The number of images to generate for each post (0-3).'),
});
export type GenerateSocialMediaPostInput = z.infer<typeof GenerateSocialMediaPostInputSchema>;

const SocialMediaPostItemSchema = z.object({
  content: z.string().describe('The generated social media post content, potentially including image placeholders like [IMAGE_PLACEHOLDER_1].'),
  hashtags: z.array(z.string()).optional().describe('Suggested hashtags for the post.'),
  imageUrls: z.array(z.string()).optional().describe('Optional URLs for images related to the post.'),
});
export type SocialMediaPostItem = z.infer<typeof SocialMediaPostItemSchema>;

const GenerateSocialMediaPostOutputSchema = z.object({
  posts: z.array(SocialMediaPostItemSchema).describe('An array of generated social media posts.'),
});
export type GenerateSocialMediaPostOutput = z.infer<typeof GenerateSocialMediaPostOutputSchema>;

export async function generateSocialMediaPost(input: GenerateSocialMediaPostInput): Promise<GenerateSocialMediaPostOutput> {
  return generateSocialMediaPostFlow(input);
}

// Schema for the output of the text generation prompt
const SocialMediaPostsTextOutputSchema = z.object({
  posts: z.array(
    z.object({
      content: z.string().describe("The social media post content. If images are requested for this post (numImagesPerPost > 0), include exactly that many placeholders like [IMAGE_PLACEHOLDER_1], [IMAGE_PLACEHOLDER_2], etc., where they would be contextually relevant within the post text."),
      hashtags: z.array(z.string()).optional().describe("An array of suggested relevant hashtags for the post if includeHashtags is true."),
    })
  ).describe('An array of generated social media post texts and their associated hashtags.')
});


const socialMediaTextPrompt = ai.definePrompt({
  name: 'socialMediaTextPrompt',
  input: { schema: GenerateSocialMediaPostInputSchema },
  output: { schema: SocialMediaPostsTextOutputSchema },
  prompt: `You are an expert social media content creator.

Generate {{{numPosts}}} social media post(s) based on the provided details.
Topic: {{{topic}}}
Platform: {{{platform}}}
Tone: {{{tone}}}
{{#if maxLength}}Attempt to keep each post under: {{{maxLength}}} characters.{{/if}}
Include hashtags: {{{includeHashtags}}}
Number of images to prepare placeholders for per post: {{{numImagesPerPost}}}

For each post:
- Craft engaging content tailored to the specified platform and tone.
- If numImagesPerPost > 0, you MUST include exactly {{{numImagesPerPost}}} placeholders in the generated content for each post where images would be most appropriate. Use placeholders like "[IMAGE_PLACEHOLDER_1]", "[IMAGE_PLACEHOLDER_2]", etc.
- If includeHashtags is true, suggest relevant hashtags.

Output a JSON object matching the output schema.
`,
});

const ImageGenerationPromptOutputSchema = z.object({
  imagePromptText: z.string().describe('A DALL-E prompt text for generating an image for a social media post.'),
});

const imageGenerationPrompt = ai.definePrompt({
  name: 'socialMediaImageGenerationPrompt',
  input: {schema: z.object({
    topic: GenerateSocialMediaPostInputSchema.shape.topic,
    platform: GenerateSocialMediaPostInputSchema.shape.platform,
    tone: GenerateSocialMediaPostInputSchema.shape.tone,
    imageContext: z.string().optional().describe("Optional context from the social media post where an image placeholder appears, to make the image more relevant.")
  })},
  output: {schema: ImageGenerationPromptOutputSchema},
  prompt: `Generate a DALL-E image prompt for a social media post. The image should be visually appealing and suitable for the {{{platform}}} platform.
{{#if imageContext}}
The image should be suitable for the following context within the post: "{{imageContext}}"
{{/if}}
Topic: {{{topic}}}
Tone: {{{tone}}}

The image prompt should be descriptive and specific. Only output the image prompt text.`,
});


const generateSocialMediaPostFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaPostFlow',
    inputSchema: GenerateSocialMediaPostInputSchema,
    outputSchema: GenerateSocialMediaPostOutputSchema,
  },
  async (input: GenerateSocialMediaPostInput): Promise<GenerateSocialMediaPostOutput> => {
    const { output: textGenerationOutput } = await socialMediaTextPrompt(input);

    if (!textGenerationOutput || !textGenerationOutput.posts) {
      throw new Error('Failed to generate social media post text content.');
    }

    const finalGeneratedPosts: SocialMediaPostItem[] = [];

    for (const rawPost of textGenerationOutput.posts) {
      const imageUrls: string[] = [];
      let currentPostContent = rawPost.content;

      if (input.numImagesPerPost > 0) {
        for (let i = 0; i < input.numImagesPerPost; i++) {
          const placeholder = `[IMAGE_PLACEHOLDER_${i + 1}]`;
          let imageContext: string | undefined = undefined;
          
          const placeholderIndex = currentPostContent.indexOf(placeholder);
          if (placeholderIndex !== -1) {
            const contextStart = Math.max(0, placeholderIndex - 100); // 100 chars before
            const contextEnd = Math.min(currentPostContent.length, placeholderIndex + placeholder.length + 100); // 100 chars after
            imageContext = currentPostContent.substring(contextStart, contextEnd);
          }

          try {
            const imagePromptResponse = await imageGenerationPrompt({
              topic: input.topic,
              platform: input.platform,
              tone: input.tone,
              imageContext: imageContext,
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
                imageUrls.push(`https://picsum.photos/seed/socialplaceholder${i+1}/400/400`);
                console.warn(`Social media image ${i + 1} for post on "${input.topic}" could not be generated, using placeholder. Prompt was: ${imagePromptText}`);
              }
            } else {
              imageUrls.push(`https://picsum.photos/seed/socialpromptfail${i+1}/400/400`);
              console.warn(`Social media image prompt for image ${i + 1} for post on "${input.topic}" could not be generated, using placeholder.`);
            }
          } catch (e) {
            console.error(`Error generating social media image ${i + 1} for post on "${input.topic}":`, e);
            imageUrls.push(`https://picsum.photos/seed/socialerror${i+1}/400/400`);
          }
        }
      }
      finalGeneratedPosts.push({
        content: currentPostContent,
        hashtags: rawPost.hashtags,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
    }
    return { posts: finalGeneratedPosts };
  }
);
