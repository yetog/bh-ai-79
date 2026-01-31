import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Bell, Activity, AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { useProcessingMetrics } from '@/hooks/useSystemStats';

interface LiveUpdate {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  progress?: number;
}

export function RealTimeUpdates() {
  const [isConnected, setIsConnected] = useState(true);
  const [notifications, setNotifications] = useState<LiveUpdate[]>([]);
  const { data: metrics, isLoading } = useProcessingMetrics();

  // Simulate real-time updates (replace with WebSocket in production)
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate occasional updates
      if (Math.random() > 0.8) {
        const updateTypes = ['success', 'warning', 'error', 'info'] as const;
        const type = updateTypes[Math.floor(Math.random() * updateTypes.length)];
        
        const messages = {
          success: { title: 'File Processed', message: 'document.pdf has been successfully indexed' },
          warning: { title: 'Slow Processing', message: 'Large file taking longer than expected' },
          error: { title: 'Processing Failed', message: 'Unable to extract text from corrupted file' },
          info: { title: 'System Update', message: 'Background maintenance completed' },
        };

        const newUpdate: LiveUpdate = {
          id: Date.now().toString(),
          type,
          ...messages[type],
          timestamp: new Date(),
          progress: type === 'info' ? Math.floor(Math.random() * 100) : undefined,
        };

        setNotifications(prev => [newUpdate, ...prev.slice(0, 4)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: LiveUpdate['type']) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertCircle;
      case 'error': return AlertCircle;
      case 'info': return Bell;
    }
  };

  const getVariant = (type: LiveUpdate['type']) => {
    switch (type) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      case 'info': return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-600" />
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Connected
                  </Badge>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-600" />
                  <Badge variant="destructive">Disconnected</Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {metrics && !isLoading && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Success Rate</div>
                <div className="font-semibold">{metrics.successRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Processing</div>
                <div className="font-semibold">{metrics.avgProcessingTime.toFixed(1)}s</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Updates
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNotifications([])}
              disabled={notifications.length === 0}
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {notifications.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 border rounded-lg transition-colors hover:bg-muted/50"
                  >
                    <Icon className={`h-4 w-4 mt-0.5 ${
                      notification.type === 'success' ? 'text-green-600' :
                      notification.type === 'warning' ? 'text-yellow-600' :
                      notification.type === 'error' ? 'text-red-600' :
                      'text-blue-600'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">{notification.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {notification.message}
                          </div>
                        </div>
                        <Badge variant={getVariant(notification.type)} className="shrink-0">
                          {notification.type}
                        </Badge>
                      </div>
                      {notification.progress !== undefined && (
                        <div className="mt-2">
                          <Progress value={notification.progress} className="h-1" />
                          <div className="text-xs text-muted-foreground mt-1">
                            {notification.progress}% complete
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        {notification.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}