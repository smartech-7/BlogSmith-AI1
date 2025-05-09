
'use server';
/**
 * @fileOverview Defines the schema and types for social media platforms.
 *
 * - socialMediaPlatforms - A constant array of supported social media platform names.
 * - SocialMediaPlatformSchema - A Zod schema for validating social media platform names.
 * - SocialMediaPlatform - A TypeScript type inferred from SocialMediaPlatformSchema.
 */

import { z } from 'zod';

export const socialMediaPlatforms = [
  'Twitter',
  'Facebook',
  'Instagram',
  'LinkedIn',
  'Pinterest',
  'TikTok',
] as const;

export const SocialMediaPlatformSchema = z.enum(socialMediaPlatforms);

export type SocialMediaPlatform = z.infer<typeof SocialMediaPlatformSchema>;
