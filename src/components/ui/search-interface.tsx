import React, { useState } from 'react';
import { Search, Filter, Brain, Sparkles, Calendar, Tag } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

import { queryRag, RagCitation } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface SearchInterfaceProps {
  className?: string;
}

// Results are fetched from backend; no mock data needed

const SearchInterface: React.FC<SearchInterfaceProps> = ({ className }) => {
const [query, setQuery] = useState('');
const [isSearching, setIsSearching] = useState(false);
const [answer, setAnswer] = useState<string>('');
const [citations, setCitations] = useState<RagCitation[]>([]);
const [showFilters, setShowFilters] = useState(false);

const handleSearch = async () => {
  if (!query.trim()) return;
  try {
    setIsSearching(true);
    setAnswer('');
    setCitations([]);
    const res = await queryRag(query, 5);
    setAnswer(res.answer);
    setCitations(res.citations || []);
  } catch (e: any) {
    console.error(e);
    toast({ title: 'Search failed', description: e?.message || 'Unexpected error' });
  } finally {
    setIsSearching(false);
  }
};

// (type icons removed for MVP RAG UI)

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
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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

{/* Answer and Citations */}
{(answer || citations.length > 0) && (
  <div className="space-y-6">
    {answer && (
      <Card className="p-6 bg-gradient-void border-border cosmic-glow">
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">Answer</div>
          <div className="text-foreground leading-relaxed whitespace-pre-wrap">{answer}</div>
        </CardContent>
      </Card>
    )}

    {citations.length > 0 && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Citations ({citations.length})
          </h3>
          <div className="text-sm text-muted-foreground">Most relevant first</div>
        </div>
        {citations.map((c, idx) => (
          <Card key={`${c.documentId}-${c.chunk_index}-${idx}`} className="p-4 hover:bg-card/80 cosmic-transition">
            <CardContent className="space-y-2 p-0">
              <div className="flex items-center justify-between">
                <div className="font-medium text-foreground">{c.title || 'Untitled'}</div>
                <div className="text-xs text-muted-foreground">{Math.round((1 - c.score) * 100)}% match</div>
              </div>
              <div className="text-sm text-muted-foreground">
                <a href={c.source_uri} target="_blank" rel="noreferrer" className="underline hover:text-primary">{c.source_uri}</a>
                {c.timestamp ? <span className="ml-2">• {formatTimestamp(c.timestamp)}</span> : null}
                <span className="ml-2">• Chunk #{c.chunk_index}</span>
              </div>
              <p className="text-foreground/80 leading-relaxed">{c.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
  </div>
)}

{/* Empty State */}
{query && !answer && citations.length === 0 && !isSearching && (
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