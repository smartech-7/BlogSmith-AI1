
"use client";

import React, { useState, useEffect } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  topic: z.string().min(5, { message: "Topic must be at least 5 characters." }).max(100, { message: "Topic must be at most 100 characters." }),
  tone: z.string().min(1, { message: "Please select a tone." }),
  numPictures: z.coerce.number().int().min(0, { message: "Number of pictures must be 0 or more." }).max(5, { message: "Number of pictures can be at most 5." }),
  wordCount: z.coerce.number().int().min(50, { message: "Word count must be at least 50." }).max(2000, { message: "Word count must be at most 2000." }),
});

type FormData = z.infer<typeof formSchema>;

const toneOptions = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "humorous", label: "Humorous" },
  { value: "professional", label: "Professional" },
  { value: "informative", label: "Informative" },
  { value: "engaging", label: "Engaging" },
];

export function ContentGenerator() {
  const [generatedContent, setGeneratedContent] = useState<GenerateBlogPostOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      tone: '',
      numPictures: 1,
      wordCount: 500,
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
      // Preserve line breaks for copying plain text
      const textToCopy = generatedContent.content.replace(/<br\s*\/?>/gi, '\n');
      navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard.",
      });
    }
  };

  const handleExport = () => {
    if (generatedContent) {
       // Preserve line breaks for export
      const textToExport = `Title: ${generatedContent.title}\n\n${generatedContent.content.replace(/<br\s*\/?>/gi, '\n')}`;
      const blob = new Blob([textToExport], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${generatedContent.title.replace(/\s+/g, '_') || 'blog_post'}.txt`;
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
          <CardDescription>Enter a topic, select a tone, specify word count, and number of pictures to generate AI-powered content.</CardDescription>
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
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How should it sound? (Tone)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {toneOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="wordCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How long should it be? (Word Count 50-2000)</FormLabel>
                    <FormControl>
                      <Input type="number" min="50" max="2000" placeholder="e.g., 500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numPictures"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How many pictures? (0-5)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="5" placeholder="e.g., 2" {...field} />
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
          <CardDescription>IMAGE content that may include placeholders</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] max-h-[calc(100vh-300px)] overflow-y-auto p-6 bg-muted/30 rounded-md">
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
              {generatedContent.imageUrls && generatedContent.imageUrls.length > 0 && (
                <div className="my-4 space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">Content related images, consider placing auto:</p>
                  {generatedContent.imageUrls.map((url, index) => (
                    <div key={index} className="rounded-md overflow-hidden shadow-md">
                      <Image 
                        src={url} 
                        alt={`${generatedContent.title || "Generated blog image"} ${index + 1}`} 
                        width={600} 
                        height={400}
                        className="w-full h-auto object-cover"
                        data-ai-hint="blog illustration"
                        priority={index === 0} 
                      />
                    </div>
                  ))}
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

