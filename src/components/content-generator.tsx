
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { generateBlogPost, type GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { generateSocialMediaPost, type GenerateSocialMediaPostOutput } from '@/ai/flows/generate-social-media-post-flow';
import { optimizeForSeo } from '@/ai/flows/optimize-for-seo';
import { Loader2, Copy, Download, FileText, Sparkles, Search, Edit3, ImageIcon, CalendarDays, Share2, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { socialMediaPlatforms, SocialMediaPlatformSchema, type SocialMediaPlatform } from '@/ai/schemas/social-media-platform-schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const blogFormSchema = z.object({
  topic: z.string().min(5, { message: "Topic must be at least 5 characters." }).max(100, { message: "Topic must be at most 100 characters." }),
  tone: z.string().min(1, { message: "Please select a tone." }),
  numPictures: z.coerce.number().int().min(0, { message: "Number of pictures must be 0 or more." }).max(5, { message: "Number of pictures can be at most 5." }),
  wordCount: z.coerce.number().int().min(50, { message: "Word count must be at least 50." }).max(2000, { message: "Word count must be at most 2000." }),
});
type BlogFormData = z.infer<typeof blogFormSchema>;

const socialMediaFormSchema = z.object({
  topic: z.string().min(5, "Topic must be at least 5 characters.").max(200, "Topic must be at most 200 characters."),
  platform: SocialMediaPlatformSchema,
  instructions: z.string().optional(),
});
type SocialMediaFormData = z.infer<typeof socialMediaFormSchema>;


const toneOptions = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "humorous", label: "Humorous" },
  { value: "professional", label: "Professional" },
  { value: "informative", label: "Informative" },
  { value: "engaging", label: "Engaging" },
  { value: "witty", label: "Witty" },
  { value: "inspirational", label: "Inspirational" },
];

const featureCards = [
  {
    icon: <Edit3 className="h-8 w-8 text-primary mb-3" />,
    title: "Create Good Content",
    description: "Generate high-quality, unique articles and posts. Overcome writer's block and keep your audience engaged.",
  },
  {
    icon: <Search className="h-8 w-8 text-primary mb-3" />,
    title: "Help People Discover It",
    description: "Optimize your content for search engines. Improve visibility and attract more organic traffic.",
  },
  {
    icon: <ImageIcon className="h-8 w-8 text-primary mb-3" />,
    title: "Modern & Visual",
    description: "Automatically add AI-generated images to make your blog content more engaging and shareable.",
  },
   {
    icon: <Share2 className="h-8 w-8 text-primary mb-3" />,
    title: "Cross-Platform Ready",
    description: "Craft posts tailored for different social media platforms, maximizing your reach and impact online.",
  }
];


export function ContentGenerator() {
  const [generatedBlogPost, setGeneratedBlogPost] = useState<GenerateBlogPostOutput | null>(null);
  const [generatedSocialMediaPost, setGeneratedSocialMediaPost] = useState<GenerateSocialMediaPostOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"blog" | "social">("blog");
  const [seoKeywords, setSeoKeywords] = useState('');
  const { toast } = useToast();

  const blogForm = useForm<BlogFormData>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: { topic: '', tone: '', numPictures: 1, wordCount: 500 },
  });

  const socialMediaForm = useForm<SocialMediaFormData>({
    resolver: zodResolver(socialMediaFormSchema),
    defaultValues: { topic: "", platform: "Twitter", instructions: "" },
  });

  const onBlogSubmit = async (data: BlogFormData) => {
    setIsLoading(true);
    setGeneratedBlogPost(null);
    setGeneratedSocialMediaPost(null); 
    try {
      let blogPostResult = await generateBlogPost(data);
      if (seoKeywords.trim()) {
        toast({ title: "Optimizing Blog for SEO...", description: "Applying SEO keywords to your blog content." });
        const seoResult = await optimizeForSeo({ content: blogPostResult.content, keywords: seoKeywords });
        blogPostResult = { ...blogPostResult, content: seoResult.optimizedContent };
      }
      setGeneratedBlogPost(blogPostResult);
      toast({ title: "Blog Post Generated!", description: "Your blog post has been successfully generated." });
    } catch (error) {
      console.error("Error generating blog post:", error);
      let errorMessage = "Failed to generate blog post. Please try again.";
      if (error instanceof Error && error.message) {
        errorMessage = `Failed to generate blog post: ${error.message}. Please try again.`;
      }
      toast({ title: "Error Generating Blog Post", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const onSocialMediaSubmit = async (data: SocialMediaFormData) => {
    setIsLoading(true);
    setGeneratedSocialMediaPost(null);
    setGeneratedBlogPost(null);
    try {
      const result = await generateSocialMediaPost(data);
      setGeneratedSocialMediaPost(result);
      toast({ title: "Social Media Post Generated!", description: `Your ${data.platform} post is ready.` });
    } catch (error) {
      console.error("Error generating social media post:", error);
      let errorMessage = "Failed to generate social media post. Please try again.";
      if (error instanceof Error && error.message) {
        errorMessage = `Failed to generate social media post: ${error.message}. Please try again.`;
      }
      toast({ title: "Error Generating Social Media Post", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };


  const handleCopy = (text: string | undefined) => {
    if (text) {
      const tempEl = document.createElement('div');
      tempEl.innerHTML = text.replace(/<br\s*\/?>/gi, '\n').replace(/<figure.*?<\/figure>/gi, '');
      const textToCopy = tempEl.textContent || tempEl.innerText || "";
      navigator.clipboard.writeText(textToCopy);
      toast({ title: "Copied!", description: "Text content copied to clipboard." });
    }
  };
  
  const handleExport = (title: string | undefined, content: string | undefined, type: "Blog Post" | "Social Media Post") => {
     if (content) {
      const tempEl = document.createElement('div');
      tempEl.innerHTML = content.replace(/<br\s*\/?>/gi, '\n').replace(/<figure.*?<\/figure>/gi, '');
      const textContentToExport = tempEl.textContent || tempEl.innerText || "";
      
      const textToExport = type === "Blog Post" && title ? `Title: ${title}\n\n${textContentToExport}` : textContentToExport;
      
      const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${(title || type).replace(/\s+/g, '_').toLowerCase()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Exported!", description: `${type} (text only) exported as a .txt file.` });
    }
  };

  const renderBlogContent = (blogPost: GenerateBlogPostOutput) => {
    let processedContent = blogPost.content.replace(/\n/g, '<br />');

    if (blogPost.imageUrls && blogPost.imageUrls.length > 0) {
      processedContent = processedContent.replace(/\[IMAGE_PLACEHOLDER_(\d+)\]/g, (match, p1) => {
        const imageIndex = parseInt(p1, 10) - 1;
        if (blogPost.imageUrls && imageIndex >= 0 && imageIndex < blogPost.imageUrls.length) {
          const imageUrl = blogPost.imageUrls[imageIndex];
          // Using a data-ai-hint with relevant keywords for potential image search/curation
          return `<figure class="my-6 flex justify-center"><img src="${imageUrl}" alt="${blogPost.title || "Generated blog image"} ${imageIndex + 1}" class="max-w-full h-auto rounded-lg shadow-lg border border-border" data-ai-hint="blog illustration" /></figure>`;
        }
        return ''; 
      });
    } else {
      processedContent = processedContent.replace(/\[IMAGE_PLACEHOLDER_(\d+)\]/g, "");
    }
    return { __html: processedContent };
  };


  return (
    <>
      <section className="mb-12 text-center">
        <h2 className="text-3xl font-bold mb-4 text-foreground">Supercharge Your Content Creation</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          BlogSmith AI helps you effortlessly generate high-quality blog posts, social media updates, optimize for SEO, and enhance with visuals.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {featureCards.map((feature, index) => (
          <Card key={index} className="shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300 bg-card">
            <CardHeader className="items-center">
              {feature.icon}
              <CardTitle className="text-xl text-center">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Tabs defaultValue="blog" onValueChange={(value) => setActiveTab(value as "blog" | "social")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="blog"><Sparkles className="mr-2 h-5 w-5" />Blog Post</TabsTrigger>
              <TabsTrigger value="social"><MessageSquare className="mr-2 h-5 w-5" />Social Media</TabsTrigger>
            </TabsList>
            <TabsContent value="blog">
              <Card className="shadow-xl rounded-lg border-primary/20 border">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center"><Sparkles className="mr-2 h-6 w-6 text-primary" />Create Your Blog Post</CardTitle>
                  <CardDescription>Craft compelling blog articles. Input your topic, tone, and length. Optionally add SEO keywords.</CardDescription>
                </CardHeader>
                <Form {...blogForm}>
                  <form onSubmit={blogForm.handleSubmit(onBlogSubmit)}>
                    <CardContent className="space-y-6">
                      <FormField control={blogForm.control} name="topic" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topic</FormLabel>
                          <FormControl><Input aria-label="Blog post topic" placeholder="e.g., The Future of Renewable Energy" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={blogForm.control} name="tone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>How should it sound? (Tone)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger aria-label="Select blog post tone"><SelectValue placeholder="Select a tone" /></SelectTrigger></FormControl>
                            <SelectContent>{toneOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={blogForm.control} name="wordCount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>How long should it be? (Words 50-2000)</FormLabel>
                          <FormControl><Input aria-label="Blog post word count" type="number" min="50" max="2000" placeholder="e.g., 500" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={blogForm.control} name="numPictures" render={({ field }) => (
                        <FormItem>
                          <FormLabel>How many pictures? (0-5)</FormLabel>
                          <FormControl><Input aria-label="Number of pictures for blog post" type="number" min="0" max="5" placeholder="e.g., 2" {...field} /></FormControl>
                          <FormDescription>AI will place images where appropriate in the content.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormItem>
                        <FormLabel>SEO Keywords (optional, comma-separated)</FormLabel>
                        <FormControl><Input aria-label="SEO keywords for blog post" placeholder="e.g., sustainable gardening, organic soil" value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} /></FormControl>
                        <FormDescription>Enter keywords to optimize the blog post for search engines.</FormDescription>
                      </FormItem>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" disabled={isLoading} className="w-full text-lg py-6">
                        {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Blog...</> : <><Sparkles className="mr-2 h-5 w-5" />Generate Blog Post</>}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </TabsContent>
            <TabsContent value="social">
               <Card className="shadow-xl rounded-lg border-primary/20 border">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center"><MessageSquare className="mr-2 h-6 w-6 text-primary" />Create Social Media Post</CardTitle>
                  <CardDescription>Generate engaging posts for your social media platforms. Provide a topic and choose your platform.</CardDescription>
                </CardHeader>
                <Form {...socialMediaForm}>
                  <form onSubmit={socialMediaForm.handleSubmit(onSocialMediaSubmit)}>
                    <CardContent className="space-y-6">
                      <FormField control={socialMediaForm.control} name="topic" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Topic/Content Idea</FormLabel>
                          <FormControl><Textarea aria-label="Social media post topic" placeholder="e.g., Announcing our new product feature that solves..." {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={socialMediaForm.control} name="platform" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Platform</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger aria-label="Select social media platform"><SelectValue placeholder="Select a platform" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {socialMediaPlatforms.map(platform => (
                                <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={socialMediaForm.control} name="instructions" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Optional Instructions</FormLabel>
                          <FormControl><Textarea aria-label="Optional instructions for social media post" placeholder="e.g., Include a question, use 2 relevant hashtags, make it exciting." {...field} /></FormControl>
                           <FormDescription>Any specific guidelines for the post tone, length, or style.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" disabled={isLoading} className="w-full text-lg py-6">
                        {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Post...</> : <><MessageSquare className="mr-2 h-5 w-5" />Generate Social Post</>}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2">
          <Card className="shadow-xl rounded-lg border-primary/10 border sticky top-6 h-[calc(100vh-3rem)] flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center"><CalendarDays className="mr-2 h-6 w-6 text-primary" />Generated Content</CardTitle>
              <CardDescription>
                Your AI-generated content will appear below. Review, copy, or export it.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto p-6 bg-muted/30 rounded-b-md space-y-4">
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-semibold text-foreground">Crafting Brilliance...</p>
                  <p className="text-muted-foreground">Your AI assistant is hard at work. Please wait a moment.</p>
                </div>
              )}
              {!isLoading && !generatedBlogPost && !generatedSocialMediaPost && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-lg text-muted-foreground">Your generated content will appear here.</p>
                  <p className="text-sm text-muted-foreground/80">Fill the form on the left and let the magic happen!</p>
                  </div>
              )}

              {generatedBlogPost && activeTab === "blog" && (
                <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none">
                  <h3 className="text-xl font-semibold mb-4 border-b pb-2">{generatedBlogPost.title}</h3>
                  <div dangerouslySetInnerHTML={renderBlogContent(generatedBlogPost)} />
                </article>
              )}

              {generatedSocialMediaPost && activeTab === "social" && (
                 <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none">
                  <h3 className="text-xl font-semibold mb-2 border-b pb-2">{socialMediaForm.getValues('platform')} Post</h3>
                   <div dangerouslySetInnerHTML={{ __html: generatedSocialMediaPost.postContent.replace(/\n/g, '<br />') }} />
                   {generatedSocialMediaPost.hashtags && generatedSocialMediaPost.hashtags.length > 0 && (
                     <p className="mt-4 text-sm text-primary">
                       <strong>Hashtags:</strong> {generatedSocialMediaPost.hashtags.join(' ')}
                     </p>
                   )}
                 </article>
              )}
            </CardContent>
            {((generatedBlogPost && activeTab === "blog") || (generatedSocialMediaPost && activeTab === "social")) && !isLoading ? (
              <CardFooter className="flex justify-end space-x-2 pt-4 border-t bg-background rounded-b-lg">
                <Button variant="outline" onClick={() => handleCopy(activeTab === "blog" ? generatedBlogPost?.content : generatedSocialMediaPost?.postContent)}>
                  <Copy className="mr-2 h-4 w-4" />Copy Text
                </Button>
                <Button variant="default" onClick={() => handleExport(
                  activeTab === "blog" ? generatedBlogPost?.title : socialMediaForm.getValues('platform'),
                  activeTab === "blog" ? generatedBlogPost?.content : generatedSocialMediaPost?.postContent,
                  activeTab === "blog" ? "Blog Post" : "Social Media Post"
                )}>
                  <Download className="mr-2 h-4 w-4" />Export
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}


    