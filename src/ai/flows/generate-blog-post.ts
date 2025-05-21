
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
import {z}from 'genkit';

const GenerateBlogPostInputSchema = z.object({
  mainKeyword: z.string().min(3, { message: "Main keyword must be at least 3 characters." }).max(100, { message: "Main keyword must be at most 100 characters." }).describe('The main keyword for the blog post.'),
  userProvidedTitle: z.string().optional().describe('An optional user-provided title. If provided, use this title for the blog post. Otherwise, a title will be generated.'),
  tone: z.string().describe('The desired tone. The core prompt emphasizes "friendly and helpful".'),
  numPictures: z.coerce.number().int().min(0).max(5).describe('The number of pictures to generate for the blog post (0-5).'),
  wordCount: z.coerce.number().int().min(700).max(3000).describe('The desired approximate word count (minimum 700 words).'),
});
export type GenerateBlogPostInput = z.infer<typeof GenerateBlogPostInputSchema>;

const GenerateBlogPostOutputSchema = z.object({
  title: z.string().describe('The plain text title of the blog post.'),
  content: z.string().describe('The generated blog post content, potentially including bolded H2/H3-style subheadings and image placeholders like [IMAGE_PLACEHOLDER_1]. The content itself should start with the introduction.'),
  imageUrls: z.array(z.string()).optional().describe('Optional URLs for images related to the blog post.'),
  thumbnailUrl: z.string().optional().describe('Optional URL for the primary thumbnail image of the blog post.'),
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
  prompt: `You are an AI content writer. Generate a 100% original, SEO-optimized blog article in English.
The article should be easy for a 6th-grade student to read.
The total word count of the 'content' field (including intro, body, conclusion) should be at least {{{wordCount}}} words (minimum 700 words).

Main Keyword for the article: "{{{mainKeyword}}}"
Desired Tone: "{{{tone}}}" (The overall approach should be friendly and helpful)
Number of images requested: {{{numPictures}}}
{{#if userProvidedTitle}}
User-Provided Title: "{{{userProvidedTitle}}}"
{{/if}}

Your output MUST be a JSON object with two fields: "title" and "content".

{{#if userProvidedTitle}}
Instructions for the "title" field (JSON string):
- This field MUST contain the exact user-provided title: "{{{userProvidedTitle}}}".
- Ensure it is PLAIN TEXT. Do NOT use any HTML tags, markdown syntax (like '#'), or any bolding (like '**') in this "title" field.
{{else}}
Instructions for the "title" field (JSON string):
- This field should contain the main title of the blog post as PLAIN TEXT, generated based on the main keyword: "{{{mainKeyword}}}".
- The title must include the main keyword: "{{{mainKeyword}}}".
- Make it interesting, clear, and concise.
- Do NOT use any HTML tags, markdown syntax (like '#'), or any bolding (like '**') in this "title" field.
{{/if}}

Instructions for the "content" field (JSON string):
The "content" field should be a single string containing the full article, structured as follows, STARTING DIRECTLY WITH THE INTRODUCTION:
1.  Introduction:
    - 3-4 simple sentences explaining what the article is about.
    - Use the main keyword "{{{mainKeyword}}}" once within the introduction.
    - Use short sentences and simple vocabulary.
2.  Body:
    - Composed of short paragraphs (3-4 lines each).
    - Use the main keyword "{{{mainKeyword}}}" at least 2-3 more times within the body.
    - Maintain a friendly, helpful tone and simple vocabulary.
    - Subheadings (H2/H3 Style): To structure the body and improve readability/SEO, use subheadings.
        - These subheadings MUST be BOLD by enclosing them in double asterisks (e.g., \`**My Subheading**\`).
        - Apart from the bolding asterisks, subheadings must be plain text.
        - Do NOT use any HTML tags (e.g., \`<h2>\`, \`<h3>\`) or markdown heading markers (e.g., \`##\`, \`###\`) for subheadings.
        - Integrate relevant keywords (derived from the main keyword and topic) into these bolded plain text subheadings.
        - Place each subheading on its own line, optionally followed by a blank line.
    - Lists: Do NOT use markdown bullet points or numbered lists (e.g., no \`*\`, \`-\`, \`1.\`, \`2.\`). If a list is essential for clarity, represent it in plain text (e.g., "Key benefits include: first, improved health; second, more energy...").
3.  Conclusion:
    - 3-4 simple sentences summarizing the article.
    - Encourage the reader to take action (e.g., sharing, learning more).
    - Maintain simple language.

General SEO Guidelines for the "content" field:
- Use short sentences and simple vocabulary throughout.
- Write in an active voice.
- Avoid fluff or overly complicated words.
- Ensure the main keyword "{{{mainKeyword}}}" appears within the first 100 words of the article (this counts from the start of the Introduction).

Image Placeholders (if {{{numPictures}}} > 0):
- If images are requested (i.e., {{{numPictures}}} is greater than 0), you MUST include exactly {{{numPictures}}} placeholders in the "content" string.
- Place these where images would be most contextually relevant.
- Use the format "[IMAGE_PLACEHOLDER_1]", "[IMAGE_PLACEHOLDER_2]", etc.
- Integrate these placeholders naturally within the text flow. For example, if numPictures is 2, include "[IMAGE_PLACEHOLDER_1]" and "[IMAGE_PLACEHOLDER_2]".

Crucial Formatting Constraints for the "content" field:
- The entire "content" string must be suitable for direct pasting into platforms like Google Blogger.
- Other than standard punctuation (periods, commas, etc.) and the specified use of \`**\` for bolding subheadings (H2/H3 style) within the Body section, do not use other special characters or symbols.
- Avoid any complex markdown formatting (e.g., no heading markers like '###', no horizontal rules like '***', no triple backticks \`\`\`).
- Bolding with \`**\` is ONLY permitted for subheadings (H2/H3 style) within the Body section, as instructed above. Do NOT bold regular paragraph text.
- Absolutely NO HTML tags (e.g., \`<h1>\`, \`<h2>\`, \`<h3>\`, \`<p>\`, \`<b>\`, \`<strong>\`).
`,
});

const ImageGenerationPromptOutputSchema = z.object({
  imagePromptText: z.string().describe('A DALL-E prompt text for generating an image.'),
});

const imageGenerationPrompt = ai.definePrompt({
  name: 'imageGenerationPrompt',
  input: {schema: z.object({ mainKeyword: GenerateBlogPostInputSchema.shape.mainKeyword, tone: GenerateBlogPostInputSchema.shape.tone, imageContext: z.string().optional().describe("Optional context from the blog post where an image placeholder appears, to make the image more relevant.") })},
  output: {schema: ImageGenerationPromptOutputSchema},
  prompt: `Generate a DALL-E image prompt for an image relevant to a blog post.
The blog post's main keyword is "{{{mainKeyword}}}".
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
      userProvidedTitle: input.userProvidedTitle,
      tone: input.tone,
      wordCount: input.wordCount,
      numPictures: input.numPictures,
    });

    if (!blogContentOutput || !blogContentOutput.title || !blogContentOutput.content) {
       let detailedError = "The AI model did not return the expected title or content.";
        if (!blogContentOutput) {
            detailedError = "The AI model returned no output.";
        } else if (!blogContentOutput.title && !blogContentOutput.content) {
            detailedError = "The AI model returned neither title nor content.";
        } else if (!blogContentOutput.title) {
            detailedError = "The AI model did not return a title.";
        } else if (!blogContentOutput.content) {
            detailedError = "The AI model did not return content.";
        }
      throw new Error(`Failed to generate blog post: ${detailedError} This might be due to the complexity of the request, an internal issue with the AI, or safety filters blocking the content. Please try simplifying your keywords or topic, ensure it complies with content policies, or try again later.`);
    }

    const imageUrls: string[] = [];
    if (input.numPictures > 0 && blogContentOutput?.content) {
      const content = blogContentOutput.content;
      
      for (let i = 0; i < input.numPictures; i++) {
        const placeholder = `[IMAGE_PLACEHOLDER_${i + 1}]`;
        let imageContext: string | undefined = undefined;
        
        const placeholderIndex = content.indexOf(placeholder);
        if (placeholderIndex !== -1) {
          const contextStart = Math.max(0, placeholderIndex - 150); 
          const contextEnd = Math.min(content.length, placeholderIndex + placeholder.length + 150); 
          imageContext = content.substring(contextStart, contextEnd);
        }

        try {
          const imagePromptResponse = await imageGenerationPrompt({ 
            mainKeyword: input.mainKeyword,
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
              imageUrls.push(`https://placehold.co/600x400.png`);
               console.warn(`Image ${i+1} could not be generated (no media URL), using placeholder. Prompt was: ${imagePromptText}`);
            }
          } else {
             imageUrls.push(`https://placehold.co/600x400.png`);
             console.warn(`Image prompt for image ${i+1} could not be generated, using placeholder.`);
          }
        } catch (e: any) {
          console.error(`Error generating image ${i + 1} of ${input.numPictures}:`, e.message);
          imageUrls.push(`https://placehold.co/600x400.png`);
        }
      }
    }
    
    let finalThumbnailUrl: string | undefined = undefined;
    if (imageUrls.length > 0) {
      finalThumbnailUrl = imageUrls[0]; // First generated image is the thumbnail
    } else if (input.numPictures > 0) {
      // If pictures were requested but none generated, use a placeholder for thumbnail
      finalThumbnailUrl = `https://placehold.co/800x400.png`; 
    }


    return {
      ...blogContentOutput,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      thumbnailUrl: finalThumbnailUrl,
    };
  }
);
