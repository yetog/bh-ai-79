import React, { useState } from 'react';
import { Search, Filter, Brain, Sparkles, Calendar, Tag } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
  type: 'chat' | 'note' | 'document' | 'image';
  timestamp: string;
  relevance: number;
  tags: string[];
}

interface SearchInterfaceProps {
  className?: string;
}

const mockResults: SearchResult[] = [
  {
    id: '1',
    title: 'Project Planning Discussion',
    excerpt: 'We discussed the timeline for the new feature and decided to prioritize user experience over quick delivery...',
    type: 'chat',
    timestamp: '2024-01-15T10:30:00Z',
    relevance: 0.95,
    tags: ['planning', 'timeline', 'ux']
  },
  {
    id: '2',
    title: 'AI Research Notes',
    excerpt: 'Key insights about transformer architectures and their applications in personal knowledge management systems...',
    type: 'note',
    timestamp: '2024-01-14T14:20:00Z',
    relevance: 0.88,
    tags: ['ai', 'research', 'transformers']
  },
  {
    id: '3',
    title: 'Technical Specification Document',
    excerpt: 'Detailed requirements for the semantic search implementation using vector embeddings and similarity matching...',
    type: 'document',
    timestamp: '2024-01-13T09:15:00Z',
    relevance: 0.82,
    tags: ['technical', 'specification', 'search']
  }
];

const SearchInterface: React.FC<SearchInterfaceProps> = ({ className }) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setResults(mockResults.filter(result => 
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.excerpt.toLowerCase().includes(query.toLowerCase())
      ));
      setIsSearching(false);
    }, 800);
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'chat':
        return <div className="w-2 h-2 rounded-full bg-accent" />;
      case 'note':
        return <div className="w-2 h-2 rounded-full bg-primary" />;
      case 'document':
        return <div className="w-2 h-2 rounded-full bg-secondary" />;
      case 'image':
        return <div className="w-2 h-2 rounded-full bg-destructive" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-muted" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-primary animate-pulse-accent" />
          <div>
            <h2 className="text-2xl font-bold text-foreground">Semantic Search</h2>
            <p className="text-muted-foreground">Find insights across all your knowledge</p>
          </div>
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <div className="relative flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Ask anything about your knowledge..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 h-12 bg-muted/50 border-border hover:border-primary/50 focus:border-primary"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!query.trim() || isSearching}
              className="h-12 px-6 bg-gradient-event-horizon hover:cosmic-glow"
            >
              {isSearching ? (
                <Sparkles className="w-5 h-5 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 px-4"
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <Card className="absolute top-full mt-2 w-full z-10 bg-card/95 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">
                    <Calendar className="w-3 h-3 mr-1" />
                    Last 7 days
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">
                    <Tag className="w-3 h-3 mr-1" />
                    Chats
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">
                    <Tag className="w-3 h-3 mr-1" />
                    Notes
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/20">
                    <Tag className="w-3 h-3 mr-1" />
                    Documents
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">
              Found {results.length} results
            </h3>
            <div className="text-sm text-muted-foreground">
              Sorted by relevance
            </div>
          </div>
          
          <div className="space-y-3">
            {results.map((result) => (
              <Card
                key={result.id}
                className="p-4 hover:bg-card/80 cosmic-transition cursor-pointer group hover:cosmic-glow"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {getTypeIcon(result.type)}
                      <div>
                        <h4 className="font-medium text-foreground group-hover:text-primary cosmic-transition">
                          {result.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span className="capitalize">{result.type}</span>
                          <span>•</span>
                          <span>{formatTimestamp(result.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-muted-foreground">
                        {Math.round(result.relevance * 100)}% match
                      </div>
                      <div className={cn(
                        "w-2 h-8 rounded-full",
                        result.relevance > 0.9 ? "bg-accent" :
                        result.relevance > 0.8 ? "bg-primary" :
                        "bg-secondary"
                      )} />
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {result.excerpt}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {result.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs bg-muted/50 hover:bg-primary/20 cosmic-transition"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {query && results.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
          <p className="text-muted-foreground">
            Try different keywords or upload more content to expand your knowledge base.
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchInterface;