import React, { useState } from 'react';
import { Brain, Search, Upload, Lightbulb, ArrowRight, Zap, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUpload from '@/components/ui/file-upload';
import SearchInterface from '@/components/ui/search-interface';
import InsightsDashboard from '@/components/ui/insights-dashboard';
import blackHoleHero from '@/assets/black-hole-hero.jpg';
import { cn } from '@/lib/utils';

const Index = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const features = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Universal Ingestion",
      description: "Upload chats, notes, documents, and media from any platform",
      color: "text-accent"
    },
    {
      icon: <Search className="w-6 h-6" />,
      title: "Semantic Search",
      description: "Find information by meaning, not just keywords",
      color: "text-primary"
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI Insights",
      description: "Discover patterns and connections across your knowledge",
      color: "text-secondary"
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: "Reflection Agent",
      description: "Weekly summaries and personal growth insights",
      color: "text-destructive"
    }
  ];

  const stats = [
    { label: "Knowledge Items", value: "2,847", icon: <Brain className="w-4 h-4" /> },
    { label: "Insights Generated", value: "156", icon: <Lightbulb className="w-4 h-4" /> },
    { label: "Patterns Found", value: "89", icon: <Star className="w-4 h-4" /> },
    { label: "Connections Made", value: "1,243", icon: <Users className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-cosmic">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center space-y-8">
            {/* Hero Image */}
            <div className="relative mx-auto w-32 h-32 mb-8">
              <img
                src={blackHoleHero}
                alt="Black Hole AI"
                className="w-full h-full object-cover rounded-full cosmic-glow animate-float"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-glow opacity-50" />
            </div>

            {/* Title & Description */}
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3 mb-6">
                <Brain className="w-12 h-12 text-primary cosmic-glow" />
                <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  Black Hole AI
                </h1>
              </div>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                Your personal knowledge gravitational center. Feed it everything - chats, notes, ideas - 
                and watch AI transform scattered thoughts into actionable insights.
              </p>
              
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                  <Zap className="w-3 h-3 mr-1" />
                  AI-Powered Analysis
                </Badge>
                <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">
                  <Brain className="w-3 h-3 mr-1" />
                  Semantic Search
                </Badge>
                <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30">
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Weekly Insights
                </Badge>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
              <Button
                size="lg"
                className="bg-gradient-event-horizon hover:cosmic-glow text-lg px-8 py-4 h-auto"
                onClick={() => setActiveTab('upload')}
              >
                Start Uploading Knowledge
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-4 h-auto border-primary/50 text-primary hover:bg-primary/10"
                onClick={() => setActiveTab('search')}
              >
                Explore Search
                <Search className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center p-6 bg-gradient-void border-border hover:cosmic-glow cosmic-transition">
              <CardContent className="space-y-2">
                <div className="flex justify-center text-primary">
                  {stat.icon}
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Transform Chaos into Knowledge
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Like a black hole's gravitational pull, we draw in all your scattered information 
            and compress it into dense, valuable insights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 bg-gradient-void border-border hover:cosmic-glow cosmic-transition group cursor-pointer"
            >
              <CardContent className="space-y-4 text-center">
                <div className={cn("mx-auto w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center group-hover:cosmic-glow cosmic-transition", feature.color)}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary cosmic-transition">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Interface */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Search className="w-4 h-4 mr-2" />
              Search
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Brain className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="text-center space-y-4 mb-8">
              <h3 className="text-2xl font-bold text-foreground">Feed the Black Hole</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Upload your chats, notes, documents, and any digital content. 
                Our AI will analyze and organize everything for intelligent retrieval.
              </p>
            </div>
            <FileUpload onFilesSelected={handleFilesSelected} />
            
            {uploadedFiles.length > 0 && (
              <Card className="p-6 bg-gradient-void border-border">
                <h4 className="text-lg font-semibold text-foreground mb-4">
                  Recently Uploaded ({uploadedFiles.length} files)
                </h4>
                <div className="space-y-2">
                  {uploadedFiles.slice(-5).map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                          <Upload className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{file.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">Processing</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="search">
            <div className="text-center space-y-4 mb-8">
              <h3 className="text-2xl font-bold text-foreground">Semantic Discovery</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Search by meaning, not just keywords. Ask questions and find connections 
                across all your uploaded knowledge.
              </p>
            </div>
            <SearchInterface />
          </TabsContent>

          <TabsContent value="insights">
            <div className="text-center space-y-4 mb-8">
              <h3 className="text-2xl font-bold text-foreground">AI-Generated Insights</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Discover patterns, trends, and connections in your knowledge that you might have missed. 
                Get weekly reflection reports powered by advanced AI analysis.
              </p>
            </div>
            <InsightsDashboard />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Brain className="w-6 h-6 text-primary" />
              <span className="text-lg font-semibold text-foreground">Black Hole AI</span>
            </div>
            <p className="text-muted-foreground">
              Your personal knowledge management system powered by AI
            </p>
            <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
              <span>Built with React & AI</span>
              <span>•</span>
              <span>Secure & Private</span>
              <span>•</span>
              <span>Open Source</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;