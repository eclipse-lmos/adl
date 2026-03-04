import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Zap, BarChart, Sparkles, MessageSquare, ShieldCheck } from 'lucide-react';
import AppHeader from '@/components/header';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function ProductPage() {
  const features = [
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: 'Advanced Prompt Authoring',
      description: 'Craft and manage complex prompts with a powerful, structured editor designed for clarity and control.',
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: 'Automated Testing',
      description: 'Define test cases and run them against your prompts to ensure consistent and reliable behavior.',
    },
    {
      icon: <BarChart className="h-8 w-8 text-primary" />,
      title: 'Performance Analytics',
      description: 'Get detailed performance metrics and scores for your prompts to identify areas for improvement.',
    },
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: 'AI-Powered Suggestions',
      description: 'Leverage AI to get suggestions for improving your prompts and generating new test cases automatically.',
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: 'Interactive Chat Playground',
      description: 'Test your prompts in a real-time chat interface to see how they perform in a conversational context.',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Contract-Based Reliability',
      description: 'Enforce critical tests as contracts to ensure your most important use cases never break at runtime.',
    },
  ];

  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-abstract');
  const editorScreenshot = PlaceHolderImages.find(p => p.id === 'screenshot-editor');
  const analyticsScreenshot = PlaceHolderImages.find(p => p.id === 'screenshot-analytics');

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-gradient-to-b from-background to-muted/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Build Reliable AI with ADL Studio
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    An advanced platform for authoring, testing, and optimizing your large language model prompts. Ship with confidence.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/dashboard">
                    <Button size="lg">Go to Dashboard</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need to Build Better Prompts</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From authoring and testing to AI-powered optimization, ADL Studio provides a comprehensive suite of tools for prompt engineering.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              {features.map((feature, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center gap-4">
                    {feature.icon}
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>    
    </div>
  );
}
