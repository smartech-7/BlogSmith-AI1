import { z } from 'genkit';

export const SocialMediaPlatformSchema = z.enum([
  "Twitter",
  "LinkedIn",
  "Facebook",
  "Instagram",
  "Generic",
]);
export type SocialMediaPlatform = z.infer<typeof SocialMediaPlatformSchema>;
