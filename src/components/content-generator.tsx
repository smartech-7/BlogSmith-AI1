
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { generateBlogPost, type GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { generateSocialMediaPost, type GenerateSocialMediaPostOutput } from '@/ai/flows/generate-social-media-post';
import { Loader2, Copy, Download, FileText, Sparkles, Search, ImageIcon, CalendarDays, Share2, MessageSquare, Wand2, ListChecks, Printer, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { socialMediaPlatforms, SocialMediaPlatformSchema } from '@/ai/schemas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuggestHeadingsTool } from '@/components/suggest-headings-tool';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { optimizeForSeo } from '@/ai/flows/optimize-for-seo';


const blogFormSchema = z.object({
  mainKeyword: z.string().min(3, { message: "Main keyword must be at least 3 characters." }).max(100, { message: "Main keyword must be at most 100 characters." }),
  relatedKeywords: z.string().min(3, { message: "Related keywords must be at least 3 characters." }).max(200, { message: "Related keywords must be at most 200 characters." }),
  tone: z.string().min(1, { message: "Please select a tone." }),
  numPictures: z.coerce.number().int().min(0, { message: "Number of pictures must be 0 or more." }).max(5, { message: "Number of pictures can be at most 5." }),
  wordCount: z.coerce.number().int().min(700, { message: "Word count must be at least 700." }).max(3000, { message: "Word count must be at most 3000." }),
  seoKeywords: z.string().optional().describe("Optional comma-separated keywords for SEO optimization."),
});
type BlogFormData = z.infer<typeof blogFormSchema>;

const socialMediaFormSchema = z.object({
  topic: z.string().min(5, "Topic must be at least 5 characters.").max(200, "Topic must be at most 200 characters."),
  platform: SocialMediaPlatformSchema,
  instructions: z.string().optional(),
  seoKeywords: z.string().optional().describe("Optional comma-separated keywords for SEO optimization."),
});
type SocialMediaFormData = z.infer<typeof socialMediaFormSchema>;


const toneOptions = [
  { value: "friendly and helpful", label: "Friendly and Helpful (Recommended)" },
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
    icon: <Wand2 className="h-8 w-8 text-primary mb-3" />,
    title: "Create Good Content",
    description: "Generate unique articles. Easy for a 6th-grader to read, designed to rank well.",
  },
  {
    icon: <Search className="h-8 w-8 text-primary mb-3" />,
    title: "Help People Discover Your Content",
    description: "Uses keywords to craft content that search engines will love, improving visibility.",
  },
  {
    icon: <ImageIcon className="h-8 w-8 text-primary mb-3" />,
    title: "Visually Appealing Content",
    description: "Automatically add AI-generated images, making your posts more engaging.",
  },
   {
    icon: <Share2 className="h-8 w-8 text-primary mb-3" />,
    title: "Social Media Ready",
    description: "Craft posts tailored for different social media platforms, maximizing your reach.",
  }
];


export function ContentGenerator() {
  const [generatedBlogPost, setGeneratedBlogPost] = useState<GenerateBlogPostOutput | null>(null);
  const [generatedSocialMediaPost, setGeneratedSocialMediaPost] = useState<GenerateSocialMediaPostOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"blog" | "social" | "headings">("blog");
  const { toast } = useToast();
  const blogContentRef = useRef<HTMLElement>(null);

  const blogForm = useForm<BlogFormData>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: { mainKeyword: '', relatedKeywords: '', tone: 'friendly and helpful', numPictures: 1, wordCount: 700, seoKeywords: '' },
  });

  const socialMediaForm = useForm<SocialMediaFormData>({
    resolver: zodResolver(socialMediaFormSchema),
    defaultValues: { topic: "", platform: "Twitter", instructions: "", seoKeywords: '' },
  });

  useEffect(() => {
    if (activeTab === 'headings') {
      setGeneratedBlogPost(null);
      setGeneratedSocialMediaPost(null);
    }
  }, [activeTab]);

 const onBlogSubmit = async (data: BlogFormData) => {
    setIsLoading(true);
    setGeneratedBlogPost(null);
    setGeneratedSocialMediaPost(null);
    try {
      let blogPostResult = await generateBlogPost(data);

      if (!blogPostResult || !blogPostResult.title || !blogPostResult.content) {
        let detailedError = "The AI model did not return the expected title or content.";
        if (!blogPostResult) detailedError = "The AI model returned no output.";
        else if (!blogPostResult.title && !blogPostResult.content) detailedError = "The AI model returned neither title nor content.";
        else if (!blogPostResult.title) detailedError = "The AI model did not return a title.";
        else if (!blogPostResult.content) detailedError = "The AI model did not return content.";
        throw new Error(detailedError + " This might be due to the complexity of the request, an internal issue with the AI, or safety filters blocking the content. Please try simplifying your keywords or topic, ensure it complies with content policies, or try again later.");
      }
      
      if (data.seoKeywords && data.seoKeywords.trim() !== '') {
        try {
            const seoResult = await optimizeForSeo({ content: blogPostResult.content, keywords: data.seoKeywords });
            blogPostResult.content = seoResult.optimizedContent;
            toast({ title: "Blog Post SEO Optimized!", description: "Blog post content has been optimized for your SEO keywords." });
        } catch (seoError: any) {
            console.error("Error optimizing blog post for SEO:", seoError);
            toast({ title: "SEO Optimization Issue", description: `Could not optimize for SEO: ${seoError.message}. Displaying original content.`, variant: "destructive" });
        }
      }

      setGeneratedBlogPost(blogPostResult);
      toast({ title: "Blog Post Generated!", description: "Your blog post has been successfully generated." });
    } catch (error) {
      console.error("Error generating blog post:", error);
      let errorMessage = "Failed to generate blog post. Please try again.";
      if (error instanceof Error && error.message) {
        if (error.message.includes('blocked') || error.message.includes('safety settings')) {
             errorMessage = "Content generation was blocked due to safety settings. Please revise your input or try a different topic.";
        } else {
             errorMessage = `${error.message}`;
        }
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
      let result = await generateSocialMediaPost(data);
      
      if (data.seoKeywords && data.seoKeywords.trim() !== '') {
         try {
            const seoResult = await optimizeForSeo({ content: result.postContent, keywords: data.seoKeywords });
            result.postContent = seoResult.optimizedContent;
            toast({ title: "Social Post SEO Optimized!", description: "Social media post content has been optimized for your SEO keywords." });
        } catch (seoError: any) {
            console.error("Error optimizing social post for SEO:", seoError);
            toast({ title: "SEO Optimization Issue", description: `Could not optimize for SEO: ${seoError.message}. Displaying original content.`, variant: "destructive" });
        }
      }

      setGeneratedSocialMediaPost(result);
      toast({ title: "Social Media Post Generated!", description: `Your ${data.platform} post is ready.` });
    } catch (error) {
      console.error("Error generating social media post:", error);
      let errorMessage = "Failed to generate social media post. Please try again.";
       if (error instanceof Error && error.message) {
        if (error.message.includes('blocked') || error.message.includes('safety settings')) {
             errorMessage = "Content generation was blocked due to safety settings. Please revise your input or try a different topic.";
        } else {
             errorMessage = `Failed to generate social media post: ${error.message}. Please try again.`;
        }
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
      link.download = `${(title || type).replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Exported!", description: `${type} (text only) exported as a .txt file.` });
    }
  };

  const handleExportPdf = async () => {
    const input = blogContentRef.current;
    if (!input || !generatedBlogPost) {
      toast({ title: "Error", description: "No blog content to export as PDF.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    // Temporarily set a white background for PDF export
    const originalBg = document.body.style.backgroundColor;
    const originalColor = input.style.color;
    document.body.style.backgroundColor = 'white'; // Ensure body background is white
    input.style.backgroundColor = 'white'; // Ensure content area background is white
    input.style.color = 'black'; // Ensure text is black


    try {
      // Ensure all images are loaded before capturing
      const images = Array.from(input.getElementsByTagName('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = img.onerror = resolve;
        });
      }));
      
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true, // Important for external images
        logging: false,
        backgroundColor: 'white', 
        onclone: (document) => { // Apply styles to the cloned document for rendering
          const clonedContent = document.getElementById(input.id);
          if(clonedContent) {
            clonedContent.style.backgroundColor = 'white';
            clonedContent.style.color = 'black';
            Array.from(clonedContent.getElementsByTagName('*')).forEach((el: any) => {
                el.style.color = 'black'; // Force all text elements to be black
            });
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth(); 
      const pdfHeight = pdf.internal.pageSize.getHeight(); 

      const canvasWidth = imgProps.width;
      const canvasHeight = imgProps.height;
      
      // Calculate the height of the image in the PDF, maintaining aspect ratio
      const ratio = canvasWidth / pdfWidth;
      // let scaledImgHeight = canvasHeight / ratio; // Not used directly in loop

      let positionOnCanvas = 0; // Current y position on the source canvas
      let pageCount = 0;
      
      while (positionOnCanvas < canvasHeight) {
        pageCount++;
        if (pageCount > 1) { 
          pdf.addPage();
        }
        // Calculate how much of the canvas height can fit onto one PDF page
        const sourceChunkHeightPx = Math.min(
          canvasHeight - positionOnCanvas, // Remaining height on canvas
          pdfHeight * ratio // Max height that fits on one PDF page, scaled to canvas pixels
        );
        
        // Create a temporary canvas for the current page's chunk
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = sourceChunkHeightPx;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCtx.fillStyle = 'white'; // Ensure background of chunk is white
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          // Draw the chunk from the main canvas to the temporary canvas
          tempCtx.drawImage(canvas, 0, positionOnCanvas, canvasWidth, sourceChunkHeightPx, 0, 0, canvasWidth, sourceChunkHeightPx);
          const pageImgData = tempCanvas.toDataURL('image/png');

          // Add the image chunk to the PDF page
          // The height of the image on the PDF page is `sourceChunkHeightPx / ratio`
          pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, sourceChunkHeightPx / ratio );
          positionOnCanvas += sourceChunkHeightPx;
        } else {
          throw new Error("Could not create temporary canvas context for PDF generation.");
        }
      }

      pdf.save(`${generatedBlogPost.title?.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase() || 'blog_post'}.pdf`);
      toast({ title: "PDF Exported!", description: "Blog post exported as PDF." });

    } catch (error: any) {
      console.error("Error exporting PDF:", error);
      toast({ title: "Error Exporting PDF", description: `Failed to export blog post as PDF. ${error.message}`, variant: "destructive" });
    } finally {
      // Restore original styles
      document.body.style.backgroundColor = originalBg;
      input.style.backgroundColor = ''; // Revert to CSS-defined or inherited
      input.style.color = originalColor;
      setIsLoading(false);
    }
  };

  const renderBlogContent = (blogPost: GenerateBlogPostOutput) => {
    let processedContent = blogPost.content.replace(/\n\n+/g, '<br /><br />').replace(/\n/g, '<br />');

    if (blogPost.imageUrls && blogPost.imageUrls.length > 0) {
      processedContent = processedContent.replace(/\[IMAGE_PLACEHOLDER_(\d+)\]/g, (match, p1) => {
        const imageIndex = parseInt(p1, 10) - 1;
        
        if (imageIndex >= 0 && imageIndex < blogPost.imageUrls!.length) {
          const imageUrl = blogPost.imageUrls![imageIndex];
          const altText = blogPost.title || blogForm.getValues('mainKeyword') || `Generated blog image ${imageIndex + 1}`;
          // Ensure data URLs are used directly
          const finalImageUrl = imageUrl.startsWith('data:image') ? imageUrl : (imageUrl.startsWith('https://picsum.photos') ? imageUrl : imageUrl); 
          return `<figure class="my-6 flex justify-center"><img src="${finalImageUrl}" alt="${altText} - illustration ${imageIndex + 1}" class="max-w-full h-auto rounded-lg shadow-lg border border-border" data-ai-hint="blog illustration" /></figure>`;
        }
        return ''; 
      });
    } else {
      // Remove any placeholders if no images were generated/requested
      processedContent = processedContent.replace(/\[IMAGE_PLACEHOLDER_(\d+)\]/g, "");
    }
    return { __html: processedContent };
  };


  // Assign a unique ID to the blog content container for PDF export styling
  const blogContentContainerId = 'blogContentToPrint';
  useEffect(() => {
    if (blogContentRef.current) {
      blogContentRef.current.id = blogContentContainerId;
    }
  }, []);


  return (
    <>
      <section className="mb-12 text-center">
        <h2 className="text-3xl font-bold mb-4 text-foreground">Supercharge Your Content Creation</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          BlogSmith AI helps you effortlessly generate SEO-friendly blog posts, social media updates, and enhance them with AI-generated visuals.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {featureCards.map((feature, index) => (
          <Card key={index} className="hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardHeader className="items-center">
              {feature.icon}
              <CardTitle className="text-xl text-center">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground text-center">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Tabs defaultValue="blog" onValueChange={(value) => setActiveTab(value as "blog" | "social" | "headings")} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="blog"><Sparkles className="mr-2 h-5 w-5" />Blog Post</TabsTrigger>
              <TabsTrigger value="social"><MessageSquare className="mr-2 h-5 w-5" />Social Media</TabsTrigger>
              <TabsTrigger value="headings"><ListChecks className="mr-2 h-5 w-5" />Suggest Headings</TabsTrigger>
            </TabsList>
            <TabsContent value="blog">
              <Card className="hover:shadow-xl transition-shadow duration-300 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center"><Sparkles className="mr-2 h-6 w-6 text-primary" />Create Your Blog Post</CardTitle>
                  <CardDescription>Craft compelling, SEO-optimized blog articles. Input your keywords, tone, and length.</CardDescription>
                </CardHeader>
                <Form {...blogForm}>
                  <form onSubmit={blogForm.handleSubmit(onBlogSubmit)}>
                    <CardContent className="space-y-6">
                      <FormField control={blogForm.control} name="mainKeyword" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Main Keyword</FormLabel>
                          <FormControl><Input aria-label="Blog post main keyword" placeholder="e.g., Sustainable Gardening" {...field} /></FormControl>
                          <FormDescription>The primary keyword for your article.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField control={blogForm.control} name="relatedKeywords" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Keywords (comma-separated)</FormLabel>
                          <FormControl><Input aria-label="Blog post related keywords" placeholder="e.g., organic soil, companion planting, water conservation" {...field} /></FormControl>
                          <FormDescription>2-3 keywords related to your main topic.</FormDescription>
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
                           <FormDescription>The AI aims for "friendly and helpful" by default.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={blogForm.control} name="wordCount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>How long should it be? (Words 700-3000)</FormLabel>
                          <FormControl><Input aria-label="Blog post word count" type="number" min="700" max="3000" placeholder="e.g., 700" {...field} /></FormControl>
                          <FormDescription>Minimum 700 words for better SEO.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={blogForm.control} name="numPictures" render={({ field }) => (
                        <FormItem>
                          <FormLabel>How many pictures? (0-5)</FormLabel>
                          <FormControl><Input aria-label="Number of pictures for blog post" type="number" min="0" max="5" placeholder="e.g., 2" {...field} /></FormControl>
                          <FormDescription>AI will place images where appropriate. The first is the thumbnail.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField control={blogForm.control} name="seoKeywords" render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Keywords (Optional)</FormLabel>
                          <FormControl><Input aria-label="SEO keywords for optimization" placeholder="e.g., home gardening tips, best soil for vegetables" {...field} /></FormControl>
                          <FormDescription>Comma-separated keywords to further optimize the content.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" disabled={isLoading && activeTab === 'blog'} className="w-full text-lg py-6">
                        {isLoading && activeTab === 'blog' ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Blog...</> : <><Sparkles className="mr-2 h-5 w-5" />Generate Blog Post</>}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </TabsContent>
            <TabsContent value="social">
               <Card className="hover:shadow-xl transition-shadow duration-300 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center"><MessageSquare className="mr-2 h-6 w-6 text-primary" />Create Social Media Post</CardTitle>
                  <CardDescription>Generate engaging posts for your social media platforms.</CardDescription>
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
                       <FormField control={socialMediaForm.control} name="seoKeywords" render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Keywords (Optional)</FormLabel>
                          <FormControl><Input aria-label="SEO keywords for social media post optimization" placeholder="e.g., tech innovation, social media trends" {...field} /></FormControl>
                          <FormDescription>Comma-separated keywords to optimize the post.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" disabled={isLoading && activeTab === 'social'} className="w-full text-lg py-6">
                        {isLoading && activeTab === 'social' ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Post...</> : <><MessageSquare className="mr-2 h-5 w-5" />Generate Social Post</>}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </TabsContent>
            <TabsContent value="headings">
              <SuggestHeadingsTool />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-6 h-[calc(100vh-5rem)] flex flex-col border-primary/10 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center"><CalendarDays className="mr-2 h-6 w-6 text-primary" />Generated Content</CardTitle>
              <CardDescription>
                {activeTab === 'headings' ? 'Switch to Blog Post or Social Media tab to see generated content.' : 'Your AI-generated content will appear below. Review, copy, or export it.'}
              </CardDescription>
            </CardHeader>
            <CardContent id={blogContentContainerId} ref={blogContentRef} className="flex-grow overflow-y-auto p-6 bg-muted/30 rounded-b-md space-y-4">
              {isLoading && (activeTab === 'blog' || activeTab === 'social') && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-semibold text-foreground">Crafting Brilliance...</p>
                  <p className="text-muted-foreground">Your AI assistant is hard at work. Please wait a moment.</p>
                </div>
              )}
              {!isLoading && !generatedBlogPost && !generatedSocialMediaPost && activeTab !== 'headings' && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-lg text-muted-foreground">Your generated content will appear here.</p>
                  <p className="text-sm text-muted-foreground/80">Fill the form on the left and let the magic happen!</p>
                  </div>
              )}
              {activeTab === 'headings' && !isLoading && (
                 <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <ListChecks className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <p className="text-lg text-muted-foreground">Heading suggestions appear in the left panel.</p>
                  <p className="text-sm text-muted-foreground/80">This area is for final blog or social media content.</p>
                  </div>
              )}

              {generatedBlogPost && activeTab === "blog" && (
                <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none text-foreground">
                  {generatedBlogPost.thumbnailUrl && (
                    <figure className="mb-6">
                      <img
                        src={generatedBlogPost.thumbnailUrl}
                        alt={generatedBlogPost.title || "Blog post thumbnail"}
                        className="w-full h-auto max-h-96 object-cover rounded-lg shadow-xl border border-border"
                        data-ai-hint="blog thumbnail"
                      />
                    </figure>
                  )}
                  <h3 className="text-xl font-semibold mb-4 border-b pb-2">{generatedBlogPost.title}</h3>
                  <div dangerouslySetInnerHTML={renderBlogContent(generatedBlogPost)} />
                </article>
              )}

              {generatedSocialMediaPost && activeTab === "social" && (
                 <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none text-foreground">
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
              <CardFooter className="flex justify-end space-x-2 pt-4 border-t bg-card rounded-b-lg">
                <Button variant="outline" onClick={() => handleCopy(activeTab === "blog" ? generatedBlogPost?.content : generatedSocialMediaPost?.postContent)}>
                  <Copy className="mr-2 h-4 w-4" />Copy Text
                </Button>
                {generatedBlogPost && activeTab === "blog" && (
                  <Button variant="outline" onClick={handleExportPdf} disabled={isLoading}>
                    <Printer className="mr-2 h-4 w-4" />Export PDF
                  </Button>
                )}
                <Button variant="default" onClick={() => handleExport(
                  activeTab === "blog" ? generatedBlogPost?.title : socialMediaForm.getValues('platform'),
                  activeTab === "blog" ? generatedBlogPost?.content : generatedSocialMediaPost?.postContent,
                  activeTab === "blog" ? "Blog Post" : "Social Media Post"
                )}>
                  <Download className="mr-2 h-4 w-4" />Export Text
                </Button>
              </CardFooter>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}

