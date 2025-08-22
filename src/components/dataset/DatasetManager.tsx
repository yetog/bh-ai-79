import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DatasetWizard } from './DatasetWizard';
import { ManifestEditor } from './ManifestEditor';
import { Plus, Search, Settings, Trash2, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Dataset, DatasetManifest } from '@/types/dataset';
import { toast } from '@/hooks/use-toast';

interface DatasetManagerProps {
  datasets?: Dataset[];
  onCreateDataset?: (dataset: { manifest: DatasetManifest; files: File[] }) => void;
  onEditDataset?: (datasetId: string, manifest: DatasetManifest) => void;
  onDeleteDataset?: (datasetId: string) => void;
  className?: string;
}

export function DatasetManager({
  datasets = [],
  onCreateDataset,
  onEditDataset,
  onDeleteDataset,
  className
}: DatasetManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);

  const filteredDatasets = datasets.filter(dataset =>
    dataset.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dataset.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    onCreateDataset?.(data);
    setShowWizard(false);
  };

  const handleEditDataset = (manifest: DatasetManifest) => {
    if (editingDataset) {
      onEditDataset?.(editingDataset.id, manifest);
      setEditingDataset(null);
    }
  };

  const handleDeleteDataset = (datasetId: string) => {
    if (confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      onDeleteDataset?.(datasetId);
      toast({
        title: 'Dataset Deleted',
        description: 'The dataset has been permanently removed.',
      });
    }
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDatasets.map((dataset) => (
          <Card key={dataset.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{dataset.display_name}</CardTitle>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(dataset.index_status)}
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
    </div>
  );
}