import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Image, 
  FileVideo, 
  Music, 
  FileCode,
  Edit,
  Save,
  X,
  Download,
  Eye
} from 'lucide-react';
import { FileMetadata } from '@/types/processing';
import { toast } from '@/hooks/use-toast';

interface FileMetadataViewerProps {
  metadata: FileMetadata;
  onUpdateMetadata?: (metadata: FileMetadata) => void;
  onClose?: () => void;
  className?: string;
}

export function FileMetadataViewer({ 
  metadata, 
  onUpdateMetadata, 
  onClose,
  className 
}: FileMetadataViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState(metadata);

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('image')) return <Image className="h-5 w-5 text-blue-500" />;
    if (type.includes('video')) return <FileVideo className="h-5 w-5 text-purple-500" />;
    if (type.includes('audio')) return <Music className="h-5 w-5 text-green-500" />;
    if (type.includes('code') || type.includes('json') || type.includes('xml')) {
      return <FileCode className="h-5 w-5 text-orange-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleSave = () => {
    onUpdateMetadata?.(editedMetadata);
    setIsEditing(false);
    toast({
      title: 'Metadata Updated',
      description: 'File metadata has been successfully updated.',
    });
  };

  const handleCancel = () => {
    setEditedMetadata(metadata);
    setIsEditing(false);
  };

  const exportMetadata = () => {
    const blob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${metadata.fileName}_metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getFileIcon(metadata.fileType)}
          <div>
            <h3 className="text-lg font-semibold">{metadata.fileName}</h3>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(metadata.fileSize)} • {metadata.fileType}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={exportMetadata}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          {isEditing ? (
            <>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
          <TabsTrigger value="custom">Custom Fields</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>File Name</Label>
                  <p className="text-sm">{metadata.fileName}</p>
                </div>
                
                <div>
                  <Label>File Size</Label>
                  <p className="text-sm">{formatFileSize(metadata.fileSize)}</p>
                </div>
                
                <div>
                  <Label>File Type</Label>
                  <Badge variant="outline">{metadata.fileType}</Badge>
                </div>
                
                <div>
                  <Label>MIME Type</Label>
                  <p className="text-sm">{metadata.mimeType}</p>
                </div>
                
                <div>
                  <Label>Last Modified</Label>
                  <p className="text-sm">{formatDate(metadata.lastModified)}</p>
                </div>
                
                {metadata.language && (
                  <div>
                    <Label>Language</Label>
                    <Badge variant="secondary">{metadata.language}</Badge>
                  </div>
                )}
                
                {metadata.encoding && (
                  <div>
                    <Label>Encoding</Label>
                    <p className="text-sm">{metadata.encoding}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Content Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {metadata.wordCount !== undefined && (
                <div>
                  <Label>Word Count</Label>
                  <p className="text-sm">{metadata.wordCount.toLocaleString()} words</p>
                </div>
              )}
              
              {metadata.pageCount !== undefined && (
                <div>
                  <Label>Page Count</Label>
                  <p className="text-sm">{metadata.pageCount} pages</p>
                </div>
              )}
              
              {metadata.extractedText && (
                <div>
                  <Label>Extracted Text Preview</Label>
                  <ScrollArea className="h-48 w-full border rounded-md p-3">
                    <pre className="text-sm whitespace-pre-wrap">
                      {metadata.extractedText.substring(0, 1000)}
                      {metadata.extractedText.length > 1000 && '...'}
                    </pre>
                  </ScrollArea>
                  
                  {metadata.extractedText.length > 1000 && (
                    <Button variant="outline" size="sm" className="mt-2">
                      <Eye className="h-4 w-4 mr-1" />
                      View Full Text
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical">
          <Card>
            <CardHeader>
              <CardTitle>Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>File ID</Label>
                  <p className="text-sm font-mono">{metadata.id}</p>
                </div>
                
                <div>
                  <Label>Processing Status</Label>
                  <Badge variant="outline">Analyzed</Badge>
                </div>
              </div>

              {metadata.metadata && Object.keys(metadata.metadata).length > 0 && (
                <div>
                  <Label>System Metadata</Label>
                  <ScrollArea className="h-32 w-full border rounded-md p-3">
                    <pre className="text-sm">
                      {JSON.stringify(metadata.metadata, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Custom Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Add custom metadata fields to help with organization and search.
                  </p>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      placeholder="Enter comma-separated tags"
                      value={editedMetadata.metadata?.tags?.join(', ') || ''}
                      onChange={(e) => {
                        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                        setEditedMetadata(prev => ({
                          ...prev,
                          metadata: { ...prev.metadata, tags }
                        }));
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Add a description for this file"
                      value={editedMetadata.metadata?.description || ''}
                      onChange={(e) => 
                        setEditedMetadata(prev => ({
                          ...prev,
                          metadata: { ...prev.metadata, description: e.target.value }
                        }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      placeholder="e.g., Documentation, Meeting Notes, Report"
                      value={editedMetadata.metadata?.category || ''}
                      onChange={(e) =>
                        setEditedMetadata(prev => ({
                          ...prev,
                          metadata: { ...prev.metadata, category: e.target.value }
                        }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {metadata.metadata?.tags && metadata.metadata.tags.length > 0 && (
                    <div>
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {metadata.metadata.tags.map((tag: string, index: number) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {metadata.metadata?.description && (
                    <div>
                      <Label>Description</Label>
                      <p className="text-sm">{metadata.metadata.description}</p>
                    </div>
                  )}
                  
                  {metadata.metadata?.category && (
                    <div>
                      <Label>Category</Label>
                      <Badge variant="outline">{metadata.metadata.category}</Badge>
                    </div>
                  )}
                  
                  {(!metadata.metadata?.tags || metadata.metadata.tags.length === 0) &&
                   !metadata.metadata?.description &&
                   !metadata.metadata?.category && (
                    <p className="text-sm text-muted-foreground">
                      No custom fields defined. Click Edit to add some.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}