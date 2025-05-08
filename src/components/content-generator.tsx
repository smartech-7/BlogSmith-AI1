
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
import { optimizeForSeo } from '@/ai/flows/optimize-for-seo';
import { Loader2, Copy, Download, FileText, Sparkles, Search, Edit3, ImageIcon, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const blogFormSchema = z.object({
  topic: z.string().min(5, { message: "Topic must be at least 5 characters." }).max(100, { message: "Topic must be at most 100 characters." }),
  tone: z.string().min(1, { message: "Please select a tone." }),
  numPictures: z.coerce.number().int().min(0, { message: "Number of pictures must be 0 or more." }).max(5, { message: "Number of pictures can be at most 5." }),
  wordCount: z.coerce.number().int().min(50, { message: "Word count must be at least 50." }).max(2000, { message: "Word count must be at most 2000." }),
});
type BlogFormData = z.infer<typeof blogFormSchema>;

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
    title: "Create Original Content",
    description: "Generate high-quality, unique articles in minutes. Overcome writer's block and keep your audience engaged with fresh content.",
  },
  {
    icon: <Search className="h-8 w-8 text-primary mb-3" />,
    title: "Boost Your SEO",
    description: "Optimize your content for search engines with integrated keyword suggestions. Improve visibility and attract more organic traffic.",
  },
  {
    icon: <ImageIcon className="h-8 w-8 text-primary mb-3" />,
    title: "Visually Appealing",
    description: "Automatically add relevant, AI-generated images to make your content more engaging and shareable.",
  },
   {
    icon: <Sparkles className="h-8 w-8 text-primary mb-3" />,
    title: "Effortless Workflow",
    description: "Streamline your content creation process from idea to published post with an intuitive and efficient interface.",
  }
];


export function ContentGenerator() {
  const [generatedBlogPost, setGeneratedBlogPost] = useState<GenerateBlogPostOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [seoKeywords, setSeoKeywords] = useState('');
  const { toast } = useToast();

  const blogForm = useForm<BlogFormData>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: { topic: '', tone: '', numPictures: 1, wordCount: 500 },
  });

  const onBlogSubmit = async (data: BlogFormData) => {
    setIsLoading(true);
    setGeneratedBlogPost(null);
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
      toast({ title: "Error", description: "Failed to generate blog post. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string | undefined) => {
    if (text) {
      const textToCopy = text.replace(/<br\s*\/?>/gi, '\n');
      navigator.clipboard.writeText(textToCopy);
      toast({ title: "Copied!", description: "Content copied to clipboard." });
    }
  };
  
  const handleExportBlogPost = () => {
    if (generatedBlogPost) {
      const textToExport = `Title: ${generatedBlogPost.title}\n\n${generatedBlogPost.content.replace(/<br\s*\/?>/gi, '\n')}`;
      const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${generatedBlogPost.title.replace(/\s+/g, '_') || 'blog_post'}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Exported!", description: "Blog post exported as a .txt file." });
    }
  };


  return (
    <>
      <section className="mb-12 text-center">
        <h2 className="text-3xl font-bold mb-4 text-foreground">Supercharge Your Content Creation</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          BlogSmith AI helps you effortlessly generate high-quality blog posts, optimize for SEO, and enhance with visuals.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {featureCards.map((feature, index) => (
          <Card key={index} className="shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-300">
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
    
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="col-span-1 md:col-span-1">
          <Card className="shadow-xl rounded-lg border-primary/20 border">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center"><Sparkles className="mr-2 h-6 w-6 text-primary" />Create Your Blog Post</CardTitle>
              <CardDescription>Craft compelling blog articles. Input your topic, tone, and length, and let AI do the rest. Optionally add SEO keywords for better reach.</CardDescription>
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
        </div>

        <div className="md:col-span-1">
          <Card className="shadow-xl rounded-lg border-primary/10 border sticky top-20">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center"><CalendarDays className="mr-2 h-6 w-6 text-primary" />Generated Content</CardTitle>
              <CardDescription>
                Your AI-generated blog post will appear below. Images are illustrative.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px] max-h-[calc(100vh-400px)] overflow-y-auto p-6 bg-muted/30 rounded-md space-y-4">
              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-semibold text-foreground">Crafting Brilliance...</p>
                  <p className="text-muted-foreground">Your AI assistant is hard at work. Please wait a moment.</p>
                </div>
              )}
              {!isLoading && !generatedBlogPost && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Your generated blog post will appear here.</p>
                  <p className="text-sm text-muted-foreground/80">Fill the form and let the magic happen!</p>
                  </div>
              )}

              {generatedBlogPost && (
                <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none">
                  <h3 className="text-xl font-semibold mb-2 border-b pb-2">{generatedBlogPost.title}</h3>
                  {generatedBlogPost.imageUrls && generatedBlogPost.imageUrls.length > 0 && (
                    <div className="my-4 space-y-4">
                      <p className="text-sm font-medium text-muted-foreground">Content-related images (AI Generated):</p>
                      <div className={`grid grid-cols-${Math.min(generatedBlogPost.imageUrls.length, 3)} gap-4`}>
                        {generatedBlogPost.imageUrls.map((url, index) => (
                          <div key={`blog-img-${index}`} className="rounded-md overflow-hidden shadow-md aspect-video">
                            <Image src={url} alt={`${generatedBlogPost.title || "Generated blog image"} ${index + 1}`} width={300} height={200} className="w-full h-full object-cover" data-ai-hint="blog illustration" priority={index === 0} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: generatedBlogPost.content.replace(/\[IMAGE_PLACEHOLDER_(\d+)\]/g, (match, p1) => {
                      const imgIndex = parseInt(p1) - 1;
                      if(generatedBlogPost.imageUrls && generatedBlogPost.imageUrls[imgIndex]) {
                          // This part won't render actual images here due to dangerouslySetInnerHTML limitations with complex components.
                          // Actual image display is handled above. This just removes the placeholder text.
                          return ""; 
                      }
                      return ""; // remove placeholder if no image
                    }).replace(/\n/g, '<br />') }} />
                </article>
              )}
            </CardContent>
            {generatedBlogPost && (
              <CardFooter className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => handleCopy(generatedBlogPost.content)}><Copy className="mr-2 h-4 w-4" />Copy Blog Text</Button>
                <Button variant="default" onClick={handleExportBlogPost}><Download className="mr-2 h-4 w-4" />Export Blog</Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

