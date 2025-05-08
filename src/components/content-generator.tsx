
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { generateBlogPost, type GenerateBlogPostOutput } from '@/ai/flows/generate-blog-post';
import { Loader2, Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const formSchema = z.object({
  topic: z.string().min(5, { message: "Topic must be at least 5 characters." }).max(100, { message: "Topic must be at most 100 characters." }),
  keywords: z.string().min(3, { message: "Keywords must be at least 3 characters." }).max(200, { message: "Keywords must be at most 200 characters." }),
});

type FormData = z.infer<typeof formSchema>;

export function ContentGenerator() {
  const [generatedContent, setGeneratedContent] = useState<GenerateBlogPostOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      keywords: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setGeneratedContent(null);
    try {
      const result = await generateBlogPost(data);
      setGeneratedContent(result);
      toast({
        title: "Content Generated!",
        description: "Your blog post has been successfully generated.",
      });
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedContent?.content) {
      navigator.clipboard.writeText(generatedContent.content);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard.",
      });
    }
  };

  const handleExport = () => {
    if (generatedContent) {
      const blob = new Blob([`Title: ${generatedContent.title}\n\n${generatedContent.content}`], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${generatedContent.title.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Exported!",
        description: "Content exported as a .txt file.",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Blog Post</CardTitle>
          <CardDescription>Enter a topic and keywords to generate AI-powered content.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., The Future of Renewable Energy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., solar, wind, sustainability, innovation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Content'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Generated Content</CardTitle>
          <CardDescription>Review your AI-generated blog post below.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] max-h-[600px] overflow-y-auto p-6 bg-muted/30 rounded-md">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Generating your content, please wait...</p>
            </div>
          )}
          {!isLoading && !generatedContent && (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-muted-foreground">Your generated content will appear here.</p>
            </div>
          )}
          {generatedContent && (
            <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert max-w-none">
              <h2 className="text-xl font-semibold mb-2">{generatedContent.title}</h2>
              {generatedContent.imageUrl && (
                <div className="my-4 rounded-md overflow-hidden shadow-md">
                  <Image 
                    src={generatedContent.imageUrl} 
                    alt={generatedContent.title || "Generated blog image"} 
                    width={600} 
                    height={400}
                    className="w-full h-auto object-cover"
                    data-ai-hint="blog post illustration"
                    priority={false} // Only set to true if it's LCP
                  />
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: generatedContent.content.replace(/\n/g, '<br />') }} />
            </article>
          )}
        </CardContent>
        {generatedContent && (
          <CardFooter className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleCopy} size="sm">
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" onClick={handleExport} size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
