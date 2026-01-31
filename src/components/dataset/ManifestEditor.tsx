import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Save, Download, Upload, FileText } from 'lucide-react';
import { DatasetManifest } from '@/types/dataset';
import { DatasetManifestSchema } from '@/lib/validation';
import { toast } from '@/hooks/use-toast';

interface ManifestEditorProps {
  manifest?: DatasetManifest;
  onSave: (manifest: DatasetManifest) => void;
  onClose?: () => void;
}

export function ManifestEditor({ manifest, onSave, onClose }: ManifestEditorProps) {
  const [currentManifest, setCurrentManifest] = useState<DatasetManifest>(
    manifest || {
      dataset_id: '',
      tenant_id: 'default',
      display_name: '',
      sources: [],
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
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateManifest = () => {
    try {
      DatasetManifestSchema.parse(currentManifest);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof Error) {
        const zodError = JSON.parse(error.message);
        const newErrors: Record<string, string> = {};
        zodError.forEach((err: any) => {
          newErrors[err.path.join('.')] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = () => {
    if (validateManifest()) {
      onSave(currentManifest);
      toast({
        title: 'Manifest Saved',
        description: 'Dataset manifest has been saved successfully.',
      });
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving.',
        variant: 'destructive',
      });
    }
  };

  const addSource = () => {
    setCurrentManifest(prev => ({
      ...prev,
      sources: [...prev.sources, { type: 'upload', path: '', tags: [] }],
    }));
  };

  const removeSource = (index: number) => {
    setCurrentManifest(prev => ({
      ...prev,
      sources: prev.sources.filter((_, i) => i !== index),
    }));
  };

  const updateSource = (index: number, field: string, value: any) => {
    setCurrentManifest(prev => ({
      ...prev,
      sources: prev.sources.map((source, i) =>
        i === index ? { ...source, [field]: value } : source
      ),
    }));
  };

  const addTag = (sourceIndex: number, tag: string) => {
    if (!tag.trim()) return;
    updateSource(sourceIndex, 'tags', [
      ...currentManifest.sources[sourceIndex].tags,
      tag.trim(),
    ]);
  };

  const removeTag = (sourceIndex: number, tagIndex: number) => {
    updateSource(
      sourceIndex,
      'tags',
      currentManifest.sources[sourceIndex].tags.filter((_, i) => i !== tagIndex)
    );
  };

  const exportManifest = () => {
    const blob = new Blob([JSON.stringify(currentManifest, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentManifest.dataset_id || 'manifest'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dataset Manifest Editor</h2>
          <p className="text-muted-foreground">
            Configure your dataset ingestion, processing, and security settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportManifest}>
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Manifest
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="prompt">AI Prompt</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dataset_id">Dataset ID</Label>
                <Input
                  id="dataset_id"
                  value={currentManifest.dataset_id}
                  onChange={(e) =>
                    setCurrentManifest(prev => ({ ...prev, dataset_id: e.target.value }))
                  }
                  placeholder="e.g., company-docs"
                />
                {errors['dataset_id'] && (
                  <p className="text-sm text-destructive mt-1">{errors['dataset_id']}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={currentManifest.display_name}
                  onChange={(e) =>
                    setCurrentManifest(prev => ({ ...prev, display_name: e.target.value }))
                  }
                  placeholder="e.g., Company Documentation"
                />
              </div>

              <div>
                <Label htmlFor="tenant_id">Tenant ID</Label>
                <Input
                  id="tenant_id"
                  value={currentManifest.tenant_id}
                  onChange={(e) =>
                    setCurrentManifest(prev => ({ ...prev, tenant_id: e.target.value }))
                  }
                  placeholder="e.g., acme-corp"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <Button onClick={addSource} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Source
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentManifest.sources.map((source, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Source {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSource(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div>
                    <Label>Source Type</Label>
                    <Select
                      value={source.type}
                      onValueChange={(value) => updateSource(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upload">File Upload</SelectItem>
                        <SelectItem value="s3">S3 Path</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>
                      {source.type === 'upload' ? 'Path' : source.type === 's3' ? 'S3 URI' : 'URL'}
                    </Label>
                    <Input
                      value={source.path || source.uri || ''}
                      onChange={(e) =>
                        updateSource(
                          index,
                          source.type === 'upload' ? 'path' : 'uri',
                          e.target.value
                        )
                      }
                      placeholder={
                        source.type === 'upload'
                          ? 'local:upload/file.pdf'
                          : source.type === 's3'
                          ? 's3://bucket/path/*.pdf'
                          : 'https://example.com/doc.pdf'
                      }
                    />
                  </div>

                  <div>
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {source.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="secondary">
                          {tag}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 ml-1"
                            onClick={() => removeTag(index, tagIndex)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                      <Input
                        className="w-auto"
                        placeholder="Add tag..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addTag(index, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Processing Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chunk_size">Chunk Size</Label>
                  <Input
                    id="chunk_size"
                    type="number"
                    value={currentManifest.preprocess.chunk_size}
                    onChange={(e) =>
                      setCurrentManifest(prev => ({
                        ...prev,
                        preprocess: {
                          ...prev.preprocess,
                          chunk_size: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
                
                <div>
                  <Label htmlFor="chunk_overlap">Chunk Overlap</Label>
                  <Input
                    id="chunk_overlap"
                    type="number"
                    value={currentManifest.preprocess.chunk_overlap}
                    onChange={(e) =>
                      setCurrentManifest(prev => ({
                        ...prev,
                        preprocess: {
                          ...prev.preprocess,
                          chunk_overlap: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Text Splitter</Label>
                <Select
                  value={currentManifest.preprocess.splitter}
                  onValueChange={(value) =>
                    setCurrentManifest(prev => ({
                      ...prev,
                      preprocess: {
                        ...prev.preprocess,
                        splitter: value as any,
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recursive">Recursive</SelectItem>
                    <SelectItem value="semantic">Semantic</SelectItem>
                    <SelectItem value="character">Character</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="remove_code"
                  checked={currentManifest.preprocess.remove_code_blocks}
                  onCheckedChange={(checked) =>
                    setCurrentManifest(prev => ({
                      ...prev,
                      preprocess: {
                        ...prev.preprocess,
                        remove_code_blocks: checked,
                      },
                    }))
                  }
                />
                <Label htmlFor="remove_code">Remove Code Blocks</Label>
              </div>

              <Separator />

              <div>
                <Label>Metadata Extraction</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="infer_title"
                      checked={currentManifest.metadata_rules.infer_title}
                      onCheckedChange={(checked) =>
                        setCurrentManifest(prev => ({
                          ...prev,
                          metadata_rules: {
                            ...prev.metadata_rules,
                            infer_title: checked,
                          },
                        }))
                      }
                    />
                    <Label htmlFor="infer_title">Infer Document Titles</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security & Access Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Visibility</Label>
                <Select
                  value={currentManifest.security.visibility}
                  onValueChange={(value) =>
                    setCurrentManifest(prev => ({
                      ...prev,
                      security: {
                        ...prev.security,
                        visibility: value as any,
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt">
          <Card>
            <CardHeader>
              <CardTitle>AI Prompt Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="system_prompt">System Prompt</Label>
                <Textarea
                  id="system_prompt"
                  value={currentManifest.prompt.system}
                  onChange={(e) =>
                    setCurrentManifest(prev => ({
                      ...prev,
                      prompt: {
                        ...prev.prompt,
                        system: e.target.value,
                      },
                    }))
                  }
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Response Style</Label>
                  <Select
                    value={currentManifest.prompt.style}
                    onValueChange={(value) =>
                      setCurrentManifest(prev => ({
                        ...prev,
                        prompt: {
                          ...prev.prompt,
                          style: value as any,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="max_chunks">Max Context Chunks</Label>
                  <Input
                    id="max_chunks"
                    type="number"
                    value={currentManifest.prompt.max_context_chunks}
                    onChange={(e) =>
                      setCurrentManifest(prev => ({
                        ...prev,
                        prompt: {
                          ...prev.prompt,
                          max_context_chunks: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}