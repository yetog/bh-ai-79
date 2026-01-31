import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FileUpload from '@/components/ui/file-upload';
import { ManifestEditor } from './ManifestEditor';
import { JSONAnalyzer } from './JSONAnalyzer';
import { CheckCircle, Circle, ArrowRight, ArrowLeft, Wand2 } from 'lucide-react';
import { DatasetManifest } from '@/types/dataset';
import { toast } from '@/hooks/use-toast';

interface DatasetWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (dataset: { manifest: DatasetManifest; files: File[] }) => void;
}

type WizardStep = 'basic' | 'files' | 'manifest' | 'review';

const steps: { key: WizardStep; title: string; description: string }[] = [
  {
    key: 'basic',
    title: 'Basic Information',
    description: 'Set up your dataset name and description',
  },
  {
    key: 'files',
    title: 'Upload Files',
    description: 'Add documents to your dataset',
  },
  {
    key: 'manifest',
    title: 'Configuration',
    description: 'Configure processing and AI settings',
  },
  {
    key: 'review',
    title: 'Review & Create',
    description: 'Review your settings and create the dataset',
  },
];

export function DatasetWizard({ open, onOpenChange, onComplete }: DatasetWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [datasetName, setDatasetName] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [manifest, setManifest] = useState<DatasetManifest | null>(null);
  const [isAnalyzingFiles, setIsAnalyzingFiles] = useState(false);

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const generateDatasetId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  };

  const handleNameChange = (name: string) => {
    setDatasetName(name);
    setDatasetId(generateDatasetId(name));
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
    toast({
      title: 'Files Added',
      description: `Added ${files.length} file(s) to the dataset.`,
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeFiles = async () => {
    setIsAnalyzingFiles(true);
    
    // Simulate file analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a basic manifest based on files
    const generatedManifest: DatasetManifest = {
      dataset_id: datasetId,
      tenant_id: 'default',
      display_name: datasetName,
      sources: selectedFiles.map(file => ({
        type: 'upload' as const,
        path: `local:upload/${file.name}`,
        tags: [file.type.split('/')[0] || 'document'],
      })),
      preprocess: {
        chunk_size: 800,
        chunk_overlap: 120,
        splitter: 'recursive',
        min_text_length: 40,
        remove_code_blocks: false,
      },
      metadata_rules: {
        infer_title: true,
        extract: ['h1', 'h2', 'filename', 'page'],
      },
      security: {
        visibility: 'private',
        allow: [],
        deny: [],
      },
      prompt: {
        system: 'You are a helpful assistant. Answer using provided context only; cite sources.',
        style: 'concise',
        max_context_chunks: 8,
      },
      version: 1,
    };

    setManifest(generatedManifest);
    setIsAnalyzingFiles(false);
    
    toast({
      title: 'Analysis Complete',
      description: 'Generated configuration based on your files.',
    });
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const handlePrevious = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  const handleComplete = () => {
    if (manifest && selectedFiles.length > 0) {
      onComplete?.({ manifest, files: selectedFiles });
      onOpenChange(false);
      toast({
        title: 'Dataset Created',
        description: `Successfully created dataset "${datasetName}".`,
      });
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'basic':
        return datasetName.trim() && datasetId.trim();
      case 'files':
        return selectedFiles.length > 0;
      case 'manifest':
        return manifest !== null;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Create New Dataset</DialogTitle>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div
                  key={step.key}
                  className={`flex items-center space-x-2 ${
                    index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span className="text-sm">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {currentStep === 'basic' && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="dataset-name">Dataset Name</Label>
                  <Input
                    id="dataset-name"
                    value={datasetName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., Company Documentation"
                  />
                </div>
                <div>
                  <Label htmlFor="dataset-id">Dataset ID</Label>
                  <Input
                    id="dataset-id"
                    value={datasetId}
                    onChange={(e) => setDatasetId(e.target.value)}
                    placeholder="company-documentation"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Auto-generated from name. Must be lowercase, alphanumeric with hyphens only.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'files' && (
            <div className="space-y-4">
              <FileUpload onFilesSelected={handleFilesSelected} />
              
              {selectedFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Files ({selectedFiles.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <span className="text-sm">{file.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {currentStep === 'manifest' && (
            <div className="space-y-4">
              {!manifest ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Generate Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Let us analyze your files and generate an optimal configuration.
                    </p>
                    <Button
                      onClick={analyzeFiles}
                      disabled={isAnalyzingFiles}
                      className="w-full"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      {isAnalyzingFiles ? 'Analyzing Files...' : 'Generate Configuration'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <ManifestEditor
                  manifest={manifest}
                  onSave={setManifest}
                />
              )}
            </div>
          )}

          {currentStep === 'review' && manifest && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dataset Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Dataset Name</Label>
                    <p className="text-sm">{manifest.display_name}</p>
                  </div>
                  <div>
                    <Label>Files to Process</Label>
                    <p className="text-sm">{selectedFiles.length} files</p>
                  </div>
                  <div>
                    <Label>Configuration</Label>
                    <div className="text-sm space-y-1">
                      <p>• Chunk Size: {manifest.preprocess.chunk_size}</p>
                      <p>• Splitter: {manifest.preprocess.splitter}</p>
                      <p>• Response Style: {manifest.prompt.style}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentStep === 'review' ? (
              <Button onClick={handleComplete} disabled={!canProceed()}>
                Create Dataset
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}