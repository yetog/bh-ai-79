import React, { useState } from 'react';
import { Brain, TrendingUp, Clock, Users, Lightbulb, Calendar, Zap, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Progress } from './progress';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  type: 'pattern' | 'trend' | 'connection' | 'highlight';
  title: string;
  description: string;
  confidence: number;
  relatedItems: number;
  timestamp: string;
}

interface InsightsDashboardProps {
  className?: string;
}

const mockInsights: Insight[] = [
  {
    id: '1',
    type: 'pattern',
    title: 'Weekly AI Research Pattern',
    description: 'You consistently engage with AI research content on Wednesdays and Fridays, showing a 78% increase in technical discussions during these periods.',
    confidence: 0.89,
    relatedItems: 24,
    timestamp: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    type: 'connection',
    title: 'Project-Team Correlation',
    description: 'Strong connection detected between "product design" discussions and team collaboration patterns. These conversations lead to 65% higher productivity metrics.',
    confidence: 0.94,
    relatedItems: 18,
    timestamp: '2024-01-14T15:30:00Z'
  },
  {
    id: '3',
    type: 'trend',
    title: 'Knowledge Acquisition Trend',
    description: 'Your learning velocity has increased 45% over the past month, with particular growth in technical documentation and strategic planning topics.',
    confidence: 0.82,
    relatedItems: 31,
    timestamp: '2024-01-13T09:15:00Z'
  }
];

const weeklyStats = {
  totalProcessed: 847,
  newInsights: 12,
  topicsIdentified: 28,
  connectionsFound: 156
};

const InsightsDashboard: React.FC<InsightsDashboardProps> = ({ className }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');

  const getInsightIcon = (type: Insight['type']) => {
    switch (type) {
      case 'pattern':
        return <TrendingUp className="w-5 h-5 text-primary" />;
      case 'trend':
        return <Zap className="w-5 h-5 text-accent" />;
      case 'connection':
        return <Users className="w-5 h-5 text-secondary" />;
      case 'highlight':
        return <Star className="w-5 h-5 text-destructive" />;
    }
  };

  const getInsightBadgeVariant = (type: Insight['type']) => {
    switch (type) {
      case 'pattern':
        return 'default';
      case 'trend':
        return 'secondary';
      case 'connection':
        return 'outline';
      case 'highlight':
        return 'destructive';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-primary cosmic-glow" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">AI Insights</h2>
            <p className="text-muted-foreground">Patterns and discoveries from your knowledge</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {(['week', 'month', 'quarter'] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                "capitalize",
                selectedPeriod === period && "cosmic-glow"
              )}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-void border-border hover:cosmic-glow cosmic-transition">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Items Processed</p>
                <p className="text-2xl font-bold text-foreground">{weeklyStats.totalProcessed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-void border-border hover:cosmic-glow cosmic-transition">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <Lightbulb className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">New Insights</p>
                <p className="text-2xl font-bold text-foreground">{weeklyStats.newInsights}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-void border-border hover:cosmic-glow cosmic-transition">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-secondary/20">
                <TrendingUp className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Topics Found</p>
                <p className="text-2xl font-bold text-foreground">{weeklyStats.topicsIdentified}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-void border-border hover:cosmic-glow cosmic-transition">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <Users className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connections</p>
                <p className="text-2xl font-bold text-foreground">{weeklyStats.connectionsFound}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Insights</h3>
          <Button variant="outline" size="sm">
            <Calendar className="w-4 h-4 mr-2" />
            Generate Weekly Report
          </Button>
        </div>

        <div className="space-y-4">
          {mockInsights.map((insight) => (
            <Card
              key={insight.id}
              className="p-6 hover:bg-card/80 cosmic-transition cursor-pointer group hover:cosmic-glow"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getInsightIcon(insight.type)}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-foreground group-hover:text-primary cosmic-transition">
                          {insight.title}
                        </h4>
                        <Badge variant={getInsightBadgeVariant(insight.type)} className="text-xs">
                          {insight.type}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(insight.timestamp).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{insight.relatedItems} related items</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div className="text-sm font-medium text-foreground">
                      {Math.round(insight.confidence * 100)}% confidence
                    </div>
                    <Progress 
                      value={insight.confidence * 100} 
                      className="w-20 h-2"
                    />
                  </div>
                </div>
                
                <p className="text-muted-foreground leading-relaxed">
                  {insight.description}
                </p>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/20">
                      Explore Related
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      Save Insight
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Details →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Weekly Reflection Prompt */}
      <Card className="bg-gradient-event-horizon border-primary/50 cosmic-glow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-foreground">
            <Zap className="w-5 h-5" />
            <span>Weekly Reflection Ready</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/80 mb-4">
            Your AI assistant has analyzed this week's conversations and notes. Ready to generate your personal reflection report?
          </p>
          <Button className="bg-background text-primary hover:bg-background/80">
            Generate Reflection Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsDashboard;