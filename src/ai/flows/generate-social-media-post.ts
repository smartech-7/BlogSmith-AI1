// src/ai/flows/generate-social-media-post.ts
'use server';
/**
 * @fileOverview A social media post generator AI agent.
 *
 * - generateSocialMediaPost - A function that handles the social media post generation process.
 * - GenerateSocialMediaPostInput - The input type for the generateSocialMediaPost function.
 * - GenerateSocialMediaPostOutput - The return type for the generateSocialMediaPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { SocialMediaPlatformSchema } from '@/ai/schemas/social-media-platform';

const GenerateSocialMediaPostInputSchema = z.object({
  topic: z.string().min(5).max(200).describe('The topic or content idea for the social media post.'),
  platform: SocialMediaPlatformSchema.describe('The target social media platform.'),
  instructions: z.string().optional().describe('Optional specific instructions for the post (e.g., tone, call to action, length constraints).'),
});
export type GenerateSocialMediaPostInput = z.infer<typeof GenerateSocialMediaPostInputSchema>;

const GenerateSocialMediaPostOutputSchema = z.object({
  postContent: z.string().describe('The generated social media post content.'),
  hashtags: z.array(z.string()).optional().describe('A list of suggested relevant hashtags for the post.'),
});
export type GenerateSocialMediaPostOutput = z.infer<typeof GenerateSocialMediaPostOutputSchema>;

export async function generateSocialMediaPost(input: GenerateSocialMediaPostInput): Promise<GenerateSocialMediaPostOutput> {
  return generateSocialMediaPostFlow(input);
}

const socialMediaPostPrompt = ai.definePrompt({
  name: 'socialMediaPostPrompt',
  input: {schema: GenerateSocialMediaPostInputSchema},
  output: {schema: GenerateSocialMediaPostOutputSchema},
  prompt: `You are an expert social media manager.
Generate an engaging social media post for the platform: {{{platform}}}.

Topic/Idea: {{{topic}}}

{{#if instructions}}
Specific Instructions: {{{instructions}}}
{{else}}
General Instructions: Make the post engaging, concise, and appropriate for the platform. Include a call to action if relevant. Suggest 2-5 relevant hashtags.
{{/if}}

Your output should be a JSON object with 'postContent' (the text of the social media post) and an optional 'hashtags' (an array of strings).
Do not include the platform name in the postContent unless it's natural to do so.
Ensure the post content is well-formatted for the platform. For example, for Twitter, keep it concise. For Instagram, it can be longer and more visual.
Suggest relevant hashtags.

Important: The \`postContent\` and each hashtag in the \`hashtags\` array must be plain text.
For \`postContent\`, do not use any special characters or symbols other than standard punctuation (periods, commas, question marks, exclamation marks, apostrophes, hyphens, parentheses) and platform-specific symbols like '@' for mentions and '#' for hashtags.
For \`hashtags\`, ensure they only contain alphanumeric characters after the initial '#' symbol (e.g., "#example", "#myTag123").
Avoid any markdown formatting, especially triple backticks (\`\`\`), in both \`postContent\` and \`hashtags\`.
`,
});

const generateSocialMediaPostFlow = ai.defineFlow(
  {
    name: 'generateSocialMediaPostFlow',
    inputSchema: GenerateSocialMediaPostInputSchema,
    outputSchema: GenerateSocialMediaPostOutputSchema,
  },
  async (input: GenerateSocialMediaPostInput) => {
    const {output} = await socialMediaPostPrompt(input);
    if (!output) {
        throw new Error("Failed to generate social media post content.");
    }
    // Ensure hashtags are an array, even if the LLM returns a single string or null/undefined
    let hashtags = output.hashtags;
    if (hashtags && !Array.isArray(hashtags)) {
      // Attempt to parse if it's a comma-separated string or similar, or just wrap it
      if (typeof hashtags === 'string') {
        hashtags = hashtags.split(/[,#\s]+/).filter(h => h.length > 0).map(h => `#${h.replace(/^#/, '')}`);
      } else {
        hashtags = undefined; // Or handle as an error/warning
      }
    } else if (Array.isArray(hashtags)) {
        hashtags = hashtags.map(h => h.startsWith('#') ? h : `#${h}`);
    }


    return {
        postContent: output.postContent,
        hashtags: hashtags || [],
    };
  }
);

