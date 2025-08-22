import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, FileText, Database, Search } from 'lucide-react';
import { useSystemStats } from '@/hooks/useSystemStats';

const TrendIcon = ({ change }: { change: number }) => {
  if (change > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
  if (change < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

const TrendBadge = ({ change }: { change: number }) => {
  const variant = change > 0 ? 'default' : change < 0 ? 'destructive' : 'secondary';
  const text = change > 0 ? `+${change}%` : change < 0 ? `${change}%` : '0%';
  
  return (
    <Badge variant={variant} className="ml-2 text-xs">
      <TrendIcon change={change} />
      <span className="ml-1">{text}</span>
    </Badge>
  );
};

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  isLoading 
}: { 
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  isLoading: boolean;
}) => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="flex items-center">
        {isLoading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            {trend !== undefined && <TrendBadge change={trend} />}
          </>
        )}
      </div>
    </CardContent>
  </Card>
);

export function StatsCards() {
  const { data: stats, isLoading, error } = useSystemStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Total Files"
        value={stats?.totalFiles ?? 0}
        icon={FileText}
        trend={stats?.trends.filesChange}
        isLoading={isLoading}
      />
      <StatCard
        title="Knowledge Chunks"
        value={stats?.totalChunks ?? 0}
        icon={Database}
        trend={stats?.trends.chunksChange}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Queries"
        value={stats?.totalQueries ?? 0}
        icon={Search}
        trend={stats?.trends.queriesChange}
        isLoading={isLoading}
      />
    </div>
  );
}