import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DatasetWizard } from './DatasetWizard';
import { ManifestEditor } from './ManifestEditor';
import { DatasetHealthMetrics } from './DatasetHealthMetrics';
import { Plus, Search, Settings, Trash2, FileText, Clock, CheckCircle, AlertCircle, Copy, History, TrendingUp, Filter, Calendar } from 'lucide-react';
import { Dataset, DatasetManifest } from '@/types/dataset';
import { DatasetHealthMetrics as HealthMetrics, DatasetVersion } from '@/types/processing';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatasets, createDataset, updateDataset, deleteDataset, cloneDataset } from '@/lib/api';

interface DatasetManagerProps {
  className?: string;
}

export function DatasetManager({ className }: DatasetManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showWizard, setShowWizard] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [viewingHealthMetrics, setViewingHealthMetrics] = useState<string | null>(null);
  const [viewingVersions, setViewingVersions] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  
  // Fetch datasets
  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ['datasets', { status: statusFilter, query: searchQuery }],
    queryFn: () => getDatasets({ status: statusFilter !== 'all' ? statusFilter : undefined, query: searchQuery }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ manifest, files }: { manifest: DatasetManifest; files: File[] }) => 
      createDataset(manifest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({ title: 'Dataset Created', description: 'New dataset has been created successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Creation Failed', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ datasetId, manifest }: { datasetId: string; manifest: DatasetManifest }) =>
      updateDataset(datasetId, manifest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({ title: 'Dataset Updated', description: 'Dataset configuration has been updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({ title: 'Dataset Deleted', description: 'Dataset has been permanently removed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Deletion Failed', description: error.message, variant: 'destructive' });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: cloneDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      toast({ title: 'Dataset Cloned', description: 'A copy of the dataset has been created.' });
    },
    onError: (error: any) => {
      toast({ title: 'Clone Failed', description: error.message, variant: 'destructive' });
    },
  });

  const filteredDatasets = datasets.filter(dataset => {
    const matchesSearch = dataset.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dataset.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || dataset.index_status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || (() => {
      const datasetDate = new Date(dataset.created_at);
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          return datasetDate.toDateString() === now.toDateString();
        case 'week':
          return (now.getTime() - datasetDate.getTime()) <= (7 * 24 * 60 * 60 * 1000);
        case 'month':
          return (now.getTime() - datasetDate.getTime()) <= (30 * 24 * 60 * 60 * 1000);
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'complete':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  const handleCreateDataset = (data: { manifest: DatasetManifest; files: File[] }) => {
    createMutation.mutate(data);
    setShowWizard(false);
  };

  const handleEditDataset = (manifest: DatasetManifest) => {
    if (editingDataset) {
      updateMutation.mutate({ datasetId: editingDataset.id, manifest });
      setEditingDataset(null);
    }
  };

  const handleDeleteDataset = (datasetId: string) => {
    if (confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      deleteMutation.mutate(datasetId);
    }
  };

  const handleCloneDataset = (datasetId: string) => {
    cloneMutation.mutate(datasetId);
  };

  const handleViewVersions = (datasetId: string) => {
    setViewingVersions(datasetId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getHealthBadge = (dataset: Dataset) => {
    // Mock health status based on index status and document count
    const hasIssues = dataset.index_status === 'error' || (dataset.document_count === 0);
    const variant = dataset.index_status === 'complete' && !hasIssues ? 'default' : 
                   dataset.index_status === 'processing' ? 'secondary' : 'destructive';
    
    const status = dataset.index_status === 'complete' && !hasIssues ? 'healthy' : 
                   dataset.index_status === 'processing' ? 'processing' : 'issues';
    
    return (
      <Badge variant={variant} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dataset Management</h2>
          <p className="text-muted-foreground">
            Manage your knowledge datasets and configurations
          </p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Dataset
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDatasets.map((dataset) => (
          <Card key={dataset.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{dataset.display_name}</CardTitle>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(dataset.index_status)}
                  {getHealthBadge(dataset)}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{dataset.id}</span>
                <Badge variant="outline">
                  {getStatusText(dataset.index_status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span>{dataset.document_count || 0} documents</span>
                </div>
                <span className="text-muted-foreground">
                  {new Date(dataset.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {dataset.manifest.sources.slice(0, 3).map((source, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {source.type}
                  </Badge>
                ))}
                {dataset.manifest.sources.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{dataset.manifest.sources.length - 3}
                  </Badge>
                )}
              </div>

              <div className="flex justify-between">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingDataset(dataset)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configure
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCloneDataset(dataset.id)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Clone
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewVersions(dataset.id)}
                  >
                    <History className="h-4 w-4 mr-1" />
                    Versions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingHealthMetrics(dataset.id)}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Health
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteDataset(dataset.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredDatasets.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No datasets found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'No datasets match your search criteria.'
                  : 'Get started by creating your first dataset.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowWizard(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dataset
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <DatasetWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={handleCreateDataset}
      />

      <Dialog open={!!editingDataset} onOpenChange={() => setEditingDataset(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Dataset: {editingDataset?.display_name}
            </DialogTitle>
          </DialogHeader>
          {editingDataset && (
            <ManifestEditor
              manifest={editingDataset.manifest}
              onSave={handleEditDataset}
              onClose={() => setEditingDataset(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Health Metrics Dialog */}
      <Dialog open={!!viewingHealthMetrics} onOpenChange={() => setViewingHealthMetrics(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Dataset Health: {datasets.find(d => d.id === viewingHealthMetrics)?.display_name}
            </DialogTitle>
          </DialogHeader>
          {viewingHealthMetrics && (
            <DatasetHealthMetrics 
              metrics={{
                datasetId: viewingHealthMetrics,
                totalDocuments: datasets.find(d => d.id === viewingHealthMetrics)?.document_count || 0,
                totalChunks: 0, // Would be fetched from API
                totalEmbeddings: 0, // Would be fetched from API
                indexingStatus: datasets.find(d => d.id === viewingHealthMetrics)?.index_status === 'complete' ? 'healthy' : 'unhealthy',
                lastProcessed: datasets.find(d => d.id === viewingHealthMetrics)?.created_at || new Date().toISOString(),
                processingErrors: 0, // Would be fetched from API
                averageChunkSize: 0, // Would be fetched from API
                storageUsed: 0, // Would be fetched from API
                searchAccuracy: 0.95 // Would be fetched from API
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Versions Dialog */}
      <Dialog open={!!viewingVersions} onOpenChange={() => setViewingVersions(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Dataset Versions: {datasets.find(d => d.id === viewingVersions)?.display_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">Version management coming soon...</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}