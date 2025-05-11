
// src/components/suggest-headings-tool.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { suggestBlogHeadings, type SuggestBlogHeadingsOutput } from '@/ai/flows/suggest-blog-headings';
import { Loader2, ListChecks, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const suggestHeadingsFormSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters." }).max(200, { message: "Topic must be at most 200 characters." }),
});
type SuggestHeadingsFormData = z.infer<typeof suggestHeadingsFormSchema>;

export function SuggestHeadingsTool() {
  const [suggestedHeadings, setSuggestedHeadings] = useState<SuggestBlogHeadingsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SuggestHeadingsFormData>({
    resolver: zodResolver(suggestHeadingsFormSchema),
    defaultValues: { topic: '' },
  });

  const onSubmit = async (data: SuggestHeadingsFormData) => {
    setIsLoading(true);
    setSuggestedHeadings(null);
    try {
      const result = await suggestBlogHeadings(data);
      setSuggestedHeadings(result);
      toast({
        title: "Headings Suggested!",
        description: "SEO-friendly headings have been generated for your topic.",
      });
    } catch (error) {
      console.error("Error suggesting blog headings:", error);
      let errorMessage = "Failed to suggest blog headings. Please try again.";
      if (error instanceof Error && error.message) {
        if (error.message.includes('blocked') || error.message.includes('safety settings')) {
             errorMessage = "Content generation was blocked due to safety settings. Please revise your input or try a different topic.";
        } else {
             errorMessage = `Failed to suggest blog headings: ${error.message}. Please try again.`;
        }
      }
      toast({
        title: "Error Suggesting Headings",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl rounded-lg border-primary/20 border bg-card">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary" />Suggest SEO Headings</CardTitle>
        <CardDescription>Get AI-powered heading suggestions to structure your content for better readability and SEO.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blog Post Topic</FormLabel>
                  <FormControl>
                    <Input aria-label="Topic for heading suggestions" placeholder="e.g., The future of AI in marketing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isLoading && (
              <div className="flex items-center justify-center p-6 text-center">
                <div>
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
                  <span className="text-muted-foreground">Generating headings...</span>
                </div>
              </div>
            )}
            {suggestedHeadings && suggestedHeadings.headings.length > 0 && !isLoading && (
              <div className="mt-6 space-y-3">
                <h4 className="text-lg font-semibold flex items-center text-foreground">
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  Suggested Headings:
                </h4>
                <ul className="list-disc list-inside pl-4 space-y-1 text-muted-foreground bg-muted/30 p-4 rounded-md border">
                  {suggestedHeadings.headings.map((heading, index) => (
                    <li key={index} className="text-sm">{heading}</li>
                  ))}
                </ul>
              </div>
            )}
            {suggestedHeadings && suggestedHeadings.headings.length === 0 && !isLoading && (
                <div className="mt-6 flex items-center text-muted-foreground p-4 bg-muted/30 rounded-md border">
                    <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" />
                    No headings were suggested for this topic. Try refining your topic.
                </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full text-lg py-6">
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Suggesting...</>
              ) : (
                <><ListChecks className="mr-2 h-5 w-5" />Suggest Headings</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    