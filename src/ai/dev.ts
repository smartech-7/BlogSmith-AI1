
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-blog-post.ts';
import '@/ai/flows/optimize-for-seo.ts';
import '@/ai/flows/suggest-blog-headings.ts';
import '@/ai/flows/generate-social-media-post.ts';
import '@/ai/flows/generate-blog-title.ts'; // Added new flow
