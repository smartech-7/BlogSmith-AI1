
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
import { optimizeForSeo } from '@/ai/flows/optimize-for-seo';
import { Loader2, Copy, Download, FileText, Sparkles, Search, Edit3, ImageIcon, CalendarDays, Share2, MessageSquare, Wand2, ListChecks, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { socialMediaPlatforms, SocialMediaPlatformSchema } from '@/ai/schemas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuggestHeadingsTool } from '@/components/suggest-headings-tool';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


const blogFormSchema = z.object({
  mainKeyword: z.string().min(3, { message: "Main keyword must be at least 3 characters." }).max(100, { message: "Main keyword must be at most 100 characters." }),
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
  const blogContentRef = useRef<HTMLDivElement>(null); 

  const blogForm = useForm<BlogFormData>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: { mainKeyword: '', tone: 'friendly and helpful', numPictures: 1, wordCount: 700, seoKeywords: '' },
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
      let blogPostResult = await generateBlogPost({
        mainKeyword: data.mainKeyword,
        tone: data.tone,
        numPictures: data.numPictures,
        wordCount: data.wordCount,
      });

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
      // Convert **bold** to plain text for copying, and remove images.
      let textToCopy = text.replace(/\*\*(.*?)\*\*/g, '$1'); 
      textToCopy = textToCopy.replace(/<br\s*\/?>/gi, '\n').replace(/<figure.*?<\/figure>/gi, '');
      
      const tempEl = document.createElement('div');
      tempEl.innerHTML = textToCopy; // Use innerHTML to decode any HTML entities if present
      navigator.clipboard.writeText(tempEl.textContent || tempEl.innerText || "");
      toast({ title: "Copied!", description: "Text content copied to clipboard." });
    }
  };
  
  const handleExport = (title: string | undefined, content: string | undefined, type: "Blog Post" | "Social Media Post") => {
     if (content) {
      // Convert **bold** to plain text for export, and remove images.
      let textContentToExport = content.replace(/\*\*(.*?)\*\*/g, '$1');
      textContentToExport = textContentToExport.replace(/<br\s*\/?>/gi, '\n').replace(/<figure.*?<\/figure>/gi, '');

      const tempEl = document.createElement('div');
      tempEl.innerHTML = textContentToExport;
      const plainTextContent = tempEl.textContent || tempEl.innerText || "";
      
      const textToExport = type === "Blog Post" && title ? `Title: ${title}\n\n${plainTextContent}` : plainTextContent;
      
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
    
    const originalBg = document.body.style.backgroundColor;
    const originalColor = input.style.color;
    document.body.style.backgroundColor = 'white'; 
    input.style.backgroundColor = 'white';
    input.style.color = 'black'; 


    try {
      const images = Array.from(input.getElementsByTagName('img'));
      await Promise.all(images.map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        if (img.src.startsWith('data:')) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = resolve;
                image.onerror = () => {
                    console.warn("Image (data URI) failed to load for PDF export:", img.alt);
                    resolve(null); 
                };
                image.src = img.src;
            });
        }
        return new Promise(resolve => {
          img.onload = img.onerror = () => {
            if(img.naturalHeight === 0) console.warn("Image failed to load for PDF export or has zero height:", img.src, img.alt);
            resolve(null); 
          };
        });
      }));
      
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff', 
        onclone: (document) => { 
          const clonedContent = document.getElementById(input.id);
          if(clonedContent) {
            clonedContent.style.backgroundColor = 'white';
            clonedContent.style.color = 'black';
            Array.from(clonedContent.getElementsByTagName('*')).forEach((el: any) => {
                // Reset color for all elements to ensure black text on white PDF
                if (el.style) el.style.color = 'black';
            });
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20; 
      const pdfHeight = pdf.internal.pageSize.getHeight() - 20; 

      const canvasWidth = imgProps.width;
      const canvasHeight = imgProps.height;
      
      const ratio = canvasWidth / pdfWidth;
      
      let positionOnCanvas = 0; 
      let pageCount = 0;
      
      while (positionOnCanvas < canvasHeight) {
        pageCount++;
        if (pageCount > 1) { 
          pdf.addPage();
        }
        const sourceChunkHeightPx = Math.min(
          canvasHeight - positionOnCanvas, 
          pdfHeight * ratio 
        );
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = sourceChunkHeightPx;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCtx.fillStyle = 'white'; 
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(canvas, 0, positionOnCanvas, canvasWidth, sourceChunkHeightPx, 0, 0, canvasWidth, sourceChunkHeightPx);
          const pageImgData = tempCanvas.toDataURL('image/png');

          pdf.addImage(pageImgData, 'PNG', 10, 10, pdfWidth, sourceChunkHeightPx / ratio ); 
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
      document.body.style.backgroundColor = originalBg;
      if(input) {
        input.style.backgroundColor = ''; 
        input.style.color = originalColor;
      }
      setIsLoading(false);
    }
  };

  const renderBlogContent = (blogPost: GenerateBlogPostOutput) => {
    let processedContent = blogPost.content;

    // Convert markdown bold **text** to <strong>text</strong>
    processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert newlines to <br /> tags
    processedContent = processedContent.replace(/\n\n+/g, '<br /><br />').replace(/\n/g, '<br />');

    if (blogPost.imageUrls && blogPost.imageUrls.length > 0) {
      processedContent = processedContent.replace(/\[IMAGE_PLACEHOLDER_(\d+)\]/g, (match, p1) => {
        const imageIndex = parseInt(p1, 10) - 1;
        
        if (imageIndex >= 0 && imageIndex < blogPost.imageUrls!.length) {
          const imageUrl = blogPost.imageUrls![imageIndex];
          const altText = blogPost.title || blogForm.getValues('mainKeyword') || `Generated blog image ${imageIndex + 1}`;
          // Ensure URL is correctly formed, especially for data URIs or external links
          const finalImageUrl = imageUrl.startsWith('data:image') || imageUrl.startsWith('http') ? imageUrl : `https://placehold.co/600x400.png`; 
          return `<figure class="my-6 flex justify-center"><img src="${finalImageUrl}" alt="${altText} - illustration ${imageIndex + 1}" class="max-w-full h-auto rounded-lg shadow-lg border border-border" data-ai-hint="blog illustration" /></figure>`;
        }
        return ''; 
      });
    } else {
      // Remove any placeholders if no images were generated or requested
      processedContent = processedContent.replace(/\[IMAGE_PLACEHOLDER_(\d+)\]/g, "");
    }
    return { __html: processedContent };
  };


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
          <Card key={index} className="hover:shadow-xl transition-shadow duration-300 flex flex-col bg-card border border-border/50">
            <CardHeader className="items-center pt-6 pb-3">
              {feature.icon}
              <CardTitle className="text-xl text-center font-semibold">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow pt-2 pb-6">
              <p className="text-sm text-muted-foreground text-center">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Tabs defaultValue="blog" onValueChange={(value) => setActiveTab(value as "blog" | "social" | "headings")} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted shadow-inner">
              <TabsTrigger value="blog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><Sparkles className="mr-2 h-5 w-5" />Blog Post</TabsTrigger>
              <TabsTrigger value="social" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><MessageSquare className="mr-2 h-5 w-5" />Social Media</TabsTrigger>
              <TabsTrigger value="headings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"><ListChecks className="mr-2 h-5 w-5" />Suggest Headings</TabsTrigger>
            </TabsList>
            <TabsContent value="blog">
              <Card className="shadow-xl transition-shadow duration-300 border border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl flex items-center font-semibold"><Sparkles className="mr-2 h-6 w-6 text-primary" />Create Your Blog Post</CardTitle>
                  <CardDescription className="text-muted-foreground">Craft compelling, SEO-optimized blog articles. Input your keywords, tone, and length.</CardDescription>
                </CardHeader>
                <Form {...blogForm}>
                  <form onSubmit={blogForm.handleSubmit(onBlogSubmit)}>
                    <CardContent className="space-y-5 pt-2">
                      <FormField control={blogForm.control} name="mainKeyword" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground">Main Keyword</FormLabel>
                          <FormControl><Input aria-label="Blog post main keyword" placeholder="e.g., Sustainable Gardening" {...field} className="bg-input shadow-inset focus:ring-primary" /></FormControl>
                          <FormDescription className="text-xs text-muted-foreground">The primary keyword for your article.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={blogForm.control} name="tone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground">How should it sound? (Tone)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger aria-label="Select blog post tone" className="bg-input shadow-inset focus:ring-primary"><SelectValue placeholder="Select a tone" /></SelectTrigger></FormControl>
                            <SelectContent className="bg-popover border-border shadow-lg">{toneOptions.map(o => <SelectItem key={o.value} value={o.value} className="focus:bg-accent focus:text-accent-foreground">{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                           <FormDescription className="text-xs text-muted-foreground">The AI aims for "friendly and helpful" by default.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={blogForm.control} name="wordCount" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground">How long should it be? (Words 700-3000)</FormLabel>
                          <FormControl><Input aria-label="Blog post word count" type="number" min="700" max="3000" placeholder="e.g., 700" {...field} className="bg-input shadow-inset focus:ring-primary" /></FormControl>
                          <FormDescription className="text-xs text-muted-foreground">Minimum 700 words for better SEO.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={blogForm.control} name="numPictures" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground">How many pictures? (0-5)</FormLabel>
                          <FormControl><Input aria-label="Number of pictures for blog post" type="number" min="0" max="5" placeholder="e.g., 2" {...field} className="bg-input shadow-inset focus:ring-primary" /></FormControl>
                          <FormDescription className="text-xs text-muted-foreground">AI will place images where appropriate. The first is the thumbnail.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField control={blogForm.control} name="seoKeywords" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground">SEO Keywords (Optional)</FormLabel>
                          <FormControl><Input aria-label="SEO keywords for optimization" placeholder="e.g., home gardening tips" {...field} className="bg-input shadow-inset focus:ring-primary" /></FormControl>
                          <FormDescription className="text-xs text-muted-foreground">Comma-separated keywords to further optimize the content.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                    <CardFooter className="pt-6">
                      <Button type="submit" disabled={isLoading && activeTab === 'blog'} className="w-full text-lg py-6 shadow-button hover:shadow-button-hover active:translate-y-px transition-all">
                        {isLoading && activeTab === 'blog' ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating Blog...</> : <><Sparkles className="mr-2 h-5 w-5" />Generate Blog Post</>}
                      </Button>
                    </CardFooter>
                  </form>
                </Form>
              </Card>
            </TabsContent>
            <TabsContent value="social">
               <Card className="shadow-xl transition-shadow duration-300 border border-border bg-card">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl flex items-center font-semibold"><MessageSquare className="mr-2 h-6 w-6 text-primary" />Create Social Media Post</CardTitle>
                  <CardDescription className="text-muted-foreground">Generate engaging posts for your social media platforms.</CardDescription>
                </CardHeader>
                <Form {...socialMediaForm}>
                  <form onSubmit={socialMediaForm.handleSubmit(onSocialMediaSubmit)}>
                    <CardContent className="space-y-5 pt-2">
                      <FormField control={socialMediaForm.control} name="topic" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground">Topic/Content Idea</FormLabel>
                          <FormControl><Textarea aria-label="Social media post topic" placeholder="e.g., Announcing our new product feature..." {...field} className="bg-input shadow-inset focus:ring-primary" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={socialMediaForm.control} name="platform" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground">Platform</FormLabel>
                           <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger aria-label="Select social media platform" className="bg-input shadow-inset focus:ring-primary"><SelectValue placeholder="Select a platform" /></SelectTrigger></FormControl>
                            <SelectContent className="bg-popover border-border shadow-lg">
                              {socialMediaPlatforms.map(platform => (
                                <SelectItem key={platform} value={platform} className="focus:bg-accent focus:text-accent-foreground">{platform}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={socialMediaForm.control} name="instructions" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground">Optional Instructions</FormLabel>
                          <FormControl><Textarea aria-label="Optional instructions for social media post" placeholder="e.g., Include a question, use 2 hashtags..." {...field} className="bg-input shadow-inset focus:ring-primary" /></FormControl>
                           <FormDescription className="text-xs text-muted-foreground">Specific guidelines for tone, length, or style.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                       <FormField control={socialMediaForm.control} name="seoKeywords" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground">SEO Keywords (Optional)</FormLabel>
                          <FormControl><Input aria-label="SEO keywords for social media post optimization" placeholder="e.g., tech innovation, social media trends" {...field} className="bg-input shadow-inset focus:ring-primary" /></FormControl>
                          <FormDescription className="text-xs text-muted-foreground">Comma-separated keywords to optimize the post.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </CardContent>
                    <CardFooter className="pt-6">
                      <Button type="submit" disabled={isLoading && activeTab === 'social'} className="w-full text-lg py-6 shadow-button hover:shadow-button-hover active:translate-y-px transition-all">
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
          <Card className="sticky top-6 h-[calc(100vh-5rem)] flex flex-col border-border/70 shadow-xl bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-2xl flex items-center font-semibold"><CalendarDays className="mr-2 h-6 w-6 text-primary" />Generated Content</CardTitle>
              <CardDescription className="text-muted-foreground text-sm">
                {activeTab === 'headings' ? 'Switch to Blog Post or Social Media tab to see generated content.' : 'Your AI-generated content will appear below. Review, copy, or export it.'}
              </CardDescription>
            </CardHeader>
            <CardContent id={blogContentContainerId} ref={blogContentRef} className="flex-grow overflow-y-auto p-6 bg-muted/20 rounded-b-md space-y-4">
              {isLoading && (activeTab === 'blog' || activeTab === 'social') && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-semibold text-foreground">Crafting Brilliance...</p>
                  <p className="text-muted-foreground">Your AI assistant is hard at work. Please wait a moment.</p>
                </div>
              )}
              {!isLoading && !generatedBlogPost && !generatedSocialMediaPost && activeTab !== 'headings' && (
                <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg text-muted-foreground">Your generated content will appear here.</p>
                  <p className="text-sm text-muted-foreground/70">Fill the form on the left and let the magic happen!</p>
                  </div>
              )}
              {activeTab === 'headings' && !isLoading && (
                 <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <ListChecks className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg text-muted-foreground">Heading suggestions appear in the left panel.</p>
                  <p className="text-sm text-muted-foreground/70">This area is for final blog or social media content.</p>
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
                  <h3 className="text-2xl font-semibold mb-4 border-b border-border/50 pb-2 text-foreground">{generatedBlogPost.title}</h3>
                  <div dangerouslySetInnerHTML={renderBlogContent(generatedBlogPost)} className="text-foreground leading-relaxed" />
                </article>
              )}

              {generatedSocialMediaPost && activeTab === "social" && (
                 <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none text-foreground">
                  <h3 className="text-xl font-semibold mb-2 border-b border-border/50 pb-2 text-foreground">{socialMediaForm.getValues('platform')} Post</h3>
                   <div dangerouslySetInnerHTML={{ __html: generatedSocialMediaPost.postContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} className="text-foreground leading-relaxed"/>
                   {generatedSocialMediaPost.hashtags && generatedSocialMediaPost.hashtags.length > 0 && (
                     <p className="mt-4 text-sm text-primary">
                       <strong>Hashtags:</strong> {generatedSocialMediaPost.hashtags.join(' ')}
                     </p>
                   )}
                 </article>
              )}
            </CardContent>
            {((generatedBlogPost && activeTab === "blog") || (generatedSocialMediaPost && activeTab === "social")) && !isLoading ? (
              <CardFooter className="flex justify-end space-x-2 pt-4 border-t border-border/50 bg-card rounded-b-lg shadow-inner">
                <Button variant="outline" onClick={() => handleCopy(activeTab === "blog" ? generatedBlogPost?.content : generatedSocialMediaPost?.postContent)} className="shadow-button hover:shadow-button-hover active:translate-y-px transition-all">
                  <Copy className="mr-2 h-4 w-4" />Copy Text
                </Button>
                {generatedBlogPost && activeTab === "blog" && (
                  <Button variant="outline" onClick={handleExportPdf} disabled={isLoading} className="shadow-button hover:shadow-button-hover active:translate-y-px transition-all">
                    <Printer className="mr-2 h-4 w-4" />Export PDF
                  </Button>
                )}
                <Button variant="default" onClick={() => handleExport(
                  activeTab === "blog" ? generatedBlogPost?.title : socialMediaForm.getValues('platform'),
                  activeTab === "blog" ? generatedBlogPost?.content : generatedSocialMediaPost?.postContent,
                  activeTab === "blog" ? "Blog Post" : "Social Media Post"
                )} className="shadow-button hover:shadow-button-hover active:translate-y-px transition-all">
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

