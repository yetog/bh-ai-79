import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  FileText, 
  Image, 
  Music, 
  Video,
  X,
  Clock,
  Star
} from 'lucide-react';
import { queryRag, RagResponse } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-states';

interface SearchFilters {
  fileType?: string;
  dateRange?: { from: Date; to?: Date };
  tags?: string[];
  minScore?: number;
  sortBy?: 'relevance' | 'date' | 'score';
}

interface SearchResult extends RagResponse {
  searchTime: number;
  totalResults: number;
}

const FILE_TYPES = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'txt', label: 'Text', icon: FileText },
  { value: 'md', label: 'Markdown', icon: FileText },
  { value: 'json', label: 'JSON', icon: FileText },
  { value: 'csv', label: 'CSV', icon: FileText },
];

const RECENT_SEARCHES = [
  'How to implement authentication?',
  'Database design patterns',
  'React best practices',
  'API security considerations',
];

export function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const response = await queryRag(query, 8);
      const searchTime = Date.now() - startTime;
      
      setResults({
        ...response,
        searchTime,
        totalResults: response.citations.length,
      });
      
      // Add to search history
      setSearchHistory(prev => 
        [query, ...prev.filter(q => q !== query)].slice(0, 5)
      );
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilter = (filterType: keyof SearchFilters) => {
    setFilters(prev => ({ ...prev, [filterType]: undefined }));
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search your knowledge base..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
              {isLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {/* Recent Searches */}
          {searchHistory.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Recent Searches
              </div>
              <div className="flex gap-2 flex-wrap">
                {searchHistory.map((search, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => setQuery(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* File Type Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">File Type</label>
                <Select
                  value={filters.fileType}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, fileType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any type</SelectItem>
                    {FILE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center">
                          <type.icon className="h-4 w-4 mr-2" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                            {format(filters.dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(filters.dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={filters.dateRange}
                      onSelect={(range) => setFilters(prev => ({ ...prev, dateRange: range }))}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Minimum Score Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Min Relevance</label>
                <Select
                  value={filters.minScore?.toString()}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, minScore: parseFloat(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any score" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any score</SelectItem>
                    <SelectItem value="0.7">High (70%+)</SelectItem>
                    <SelectItem value="0.5">Medium (50%+)</SelectItem>
                    <SelectItem value="0.3">Low (30%+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: 'relevance' | 'date' | 'score') => 
                    setFilters(prev => ({ ...prev, sortBy: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Relevance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="score">Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters */}
            {Object.keys(filters).some(key => filters[key as keyof SearchFilters]) && (
              <div>
                <label className="text-sm font-medium mb-2 block">Active Filters</label>
                <div className="flex gap-2 flex-wrap">
                  {filters.fileType && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Type: {filters.fileType}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => clearFilter('fileType')}
                      />
                    </Badge>
                  )}
                  {filters.dateRange && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Date Range
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => clearFilter('dateRange')}
                      />
                    </Badge>
                  )}
                  {filters.minScore && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Min Score: {filters.minScore}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => clearFilter('minScore')}
                      />
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle>Search Results</CardTitle>
              <div className="text-sm text-muted-foreground">
                {results.totalResults} results in {results.searchTime}ms
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Answer */}
            {results.answer && (
              <div className="prose max-w-none">
                <h3 className="font-semibold mb-2">Answer</h3>
                <p className="text-sm leading-relaxed">{results.answer}</p>
              </div>
            )}

            <Separator />

            {/* Citations */}
            <div>
              <h3 className="font-semibold mb-4">Sources ({results.citations.length})</h3>
              <div className="space-y-4">
                {results.citations.map((citation, index) => (
                  <Card key={index} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm">{citation.title}</div>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {Math.round(citation.score * 100)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{citation.source_uri}</p>
                      <p className="text-sm leading-relaxed">{citation.content}</p>
                      {citation.timestamp && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(citation.timestamp).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}