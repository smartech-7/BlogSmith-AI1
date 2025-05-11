
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-blog-post.ts';
// import '@/ai/flows/optimize-for-seo.ts'; // Removed as functionality is integrated
import '@/ai/flows/suggest-blog-headings.ts';
import '@/ai/flows/generate-social-media-post-flow.ts';
