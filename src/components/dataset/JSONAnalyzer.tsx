import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, ChevronDown, FileText, Hash, Type, Calendar, Tag } from 'lucide-react';

interface JSONField {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  value?: any;
  sampleValues?: any[];
  selected?: boolean;
}

interface JSONAnalyzerProps {
  jsonData?: any;
  onJsonChange?: (data: any) => void;
  onFieldSelectionChange?: (selectedFields: JSONField[]) => void;
  className?: string;
}

export function JSONAnalyzer({ 
  jsonData, 
  onJsonChange, 
  onFieldSelectionChange,
  className 
}: JSONAnalyzerProps) {
  const [rawJson, setRawJson] = useState(
    jsonData ? JSON.stringify(jsonData, null, 2) : ''
  );
  const [parsedData, setParsedData] = useState(jsonData);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['']));

  const flattenJSON = (obj: any, prefix = ''): JSONField[] => {
    const fields: JSONField[] = [];
    
    if (obj === null) {
      fields.push({ path: prefix, type: 'null', value: null });
      return fields;
    }

    if (Array.isArray(obj)) {
      fields.push({ path: prefix, type: 'array', value: obj });
      
      // Sample first few items
      obj.slice(0, 3).forEach((item, index) => {
        const itemFields = flattenJSON(item, `${prefix}[${index}]`);
        fields.push(...itemFields);
      });

      if (obj.length > 3) {
        fields.push({
          path: `${prefix}[...]`,
          type: 'object',
          value: `... ${obj.length - 3} more items`,
        });
      }
    } else if (typeof obj === 'object') {
      fields.push({ path: prefix, type: 'object', value: obj });
      
      Object.entries(obj).forEach(([key, value]) => {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        const childFields = flattenJSON(value, newPrefix);
        fields.push(...childFields);
      });
    } else {
      const objType = typeof obj;
      const fieldType = objType === 'bigint' ? 'number' : objType as 'string' | 'number' | 'boolean';
      fields.push({
        path: prefix,
        type: fieldType,
        value: obj,
      });
    }

    return fields;
  };

  const jsonFields = useMemo(() => {
    if (!parsedData) return [];
    return flattenJSON(parsedData);
  }, [parsedData]);

  const handleJsonInput = (value: string) => {
    setRawJson(value);
    try {
      const parsed = JSON.parse(value);
      setParsedData(parsed);
      onJsonChange?.(parsed);
    } catch (error) {
      // Invalid JSON, keep the raw input but don't parse
    }
  };

  const toggleFieldSelection = (fieldPath: string) => {
    const newSelection = new Set(selectedFields);
    if (newSelection.has(fieldPath)) {
      newSelection.delete(fieldPath);
    } else {
      newSelection.add(fieldPath);
    }
    setSelectedFields(newSelection);

    const selectedFieldObjects = jsonFields
      .filter(field => newSelection.has(field.path))
      .map(field => ({ ...field, selected: true }));
    
    onFieldSelectionChange?.(selectedFieldObjects);
  };

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'string': return <Type className="h-4 w-4 text-blue-500" />;
      case 'number': return <Hash className="h-4 w-4 text-green-500" />;
      case 'boolean': return <Checkbox className="h-4 w-4 text-purple-500" />;
      case 'array': return <Tag className="h-4 w-4 text-orange-500" />;
      case 'object': return <FileText className="h-4 w-4 text-gray-500" />;
      default: return <Type className="h-4 w-4 text-gray-400" />;
    }
  };

  const getIndentLevel = (path: string) => {
    return path.split(/[.\\[\\]]/).filter(Boolean).length - 1;
  };

  const renderTreeItem = (field: JSONField) => {
    const indentLevel = getIndentLevel(field.path);
    const hasChildren = jsonFields.some(f => 
      f.path.startsWith(field.path + '.') || 
      f.path.startsWith(field.path + '[')
    );
    const isExpanded = expandedPaths.has(field.path);
    
    return (
      <div
        key={field.path}
        className={`flex items-center space-x-2 py-1 px-2 rounded hover:bg-muted/50`}
        style={{ marginLeft: `${indentLevel * 20}px` }}
      >
        <div className="flex items-center space-x-1 flex-1">
          {hasChildren && (field.type === 'object' || field.type === 'array') ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => toggleExpanded(field.path)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}
          
          <Checkbox
            checked={selectedFields.has(field.path)}
            onCheckedChange={() => toggleFieldSelection(field.path)}
            disabled={field.type === 'object' && field.path !== ''}
          />
          
          {getFieldIcon(field.type)}
          
          <span className="font-mono text-sm">
            {field.path.split(/[.\\[\\]]/).pop() || 'root'}
          </span>
          
          <Badge variant="outline" className="text-xs">
            {field.type}
          </Badge>
        </div>
        
        {field.type !== 'object' && field.type !== 'array' && field.value !== undefined && (
          <span className="text-xs text-muted-foreground max-w-32 truncate">
            {String(field.value)}
          </span>
        )}
      </div>
    );
  };

  const visibleFields = jsonFields.filter(field => {
    const pathParts = field.path.split(/[.\\[\\]]/);
    let currentPath = '';
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (pathParts[i]) {
        currentPath += (currentPath ? '.' : '') + pathParts[i];
        if (!expandedPaths.has(currentPath)) {
          return false;
        }
      }
    }
    
    return true;
  });

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>JSON Analyzer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="json-input">JSON Data</Label>
            <Textarea
              id="json-input"
              value={rawJson}
              onChange={(e) => handleJsonInput(e.target.value)}
              placeholder="Paste your JSON data here..."
              className="font-mono"
              rows={8}
            />
          </div>
          
          {parsedData && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Field Explorer</Label>
                <Badge variant="secondary">
                  {selectedFields.size} selected
                </Badge>
              </div>
              
              <div className="border rounded-md p-2 max-h-64 overflow-auto bg-muted/20">
                <div className="space-y-1">
                  {visibleFields.map(field => renderTreeItem(field))}
                </div>
              </div>
            </div>
          )}

          {selectedFields.size > 0 && (
            <div>
              <Label>Selected Fields for Indexing</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {Array.from(selectedFields).map(fieldPath => {
                  const field = jsonFields.find(f => f.path === fieldPath);
                  return (
                    <Badge key={fieldPath} variant="default">
                      {fieldPath} ({field?.type})
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => toggleFieldSelection(fieldPath)}
                      >
                        ×
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
