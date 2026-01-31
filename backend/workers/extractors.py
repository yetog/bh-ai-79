import json
import csv
from io import StringIO
from typing import Dict, List
import pypdf
import markdown
from pathlib import Path

class FileExtractor:
    """Extract text from various file formats"""
    
    @staticmethod
    def extract_text(file_path: str, mime_type: str) -> Dict:
        """Extract text based on mime type"""
        try:
            if mime_type == 'application/pdf':
                return FileExtractor._extract_pdf(file_path)
            elif mime_type == 'text/plain':
                return FileExtractor._extract_txt(file_path)
            elif mime_type == 'application/json':
                return FileExtractor._extract_json(file_path)
            elif mime_type == 'text/csv':
                return FileExtractor._extract_csv(file_path)
            elif mime_type in ['text/markdown', 'text/x-markdown']:
                return FileExtractor._extract_markdown(file_path)
            else:
                raise ValueError(f"Unsupported mime type: {mime_type}")
        except Exception as e:
            raise Exception(f"Failed to extract text: {str(e)}")
    
    @staticmethod
    def _extract_pdf(file_path: str) -> Dict:
        """Extract text from PDF"""
        pages = []
        with open(file_path, 'rb') as f:
            reader = pypdf.PdfReader(f)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text.strip():
                    pages.append({
                        'page': i + 1,
                        'text': text,
                        'metadata': {'page_number': i + 1}
                    })
        
        return {
            'pages': pages,
            'total_pages': len(pages),
            'full_text': '\n\n'.join(p['text'] for p in pages)
        }
    
    @staticmethod
    def _extract_txt(file_path: str) -> Dict:
        """Extract text from plain text file"""
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        return {
            'pages': [{'page': 1, 'text': text, 'metadata': {}}],
            'total_pages': 1,
            'full_text': text
        }
    
    @staticmethod
    def _extract_json(file_path: str) -> Dict:
        """Extract and flatten JSON data"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        def flatten_json(obj, prefix=''):
            """Flatten nested JSON with dotted keys"""
            items = []
            if isinstance(obj, dict):
                for k, v in obj.items():
                    new_key = f"{prefix}.{k}" if prefix else k
                    if isinstance(v, (dict, list)):
                        items.extend(flatten_json(v, new_key))
                    else:
                        items.append(f"{new_key}: {v}")
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    new_key = f"{prefix}[{i}]"
                    if isinstance(item, (dict, list)):
                        items.extend(flatten_json(item, new_key))
                    else:
                        items.append(f"{new_key}: {item}")
            return items
        
        flattened = flatten_json(data)
        text = '\n'.join(flattened)
        
        return {
            'pages': [{'page': 1, 'text': text, 'metadata': {'json_path': 'root'}}],
            'total_pages': 1,
            'full_text': text,
            'structured_data': data
        }
    
    @staticmethod
    def _extract_csv(file_path: str) -> Dict:
        """Extract text from CSV with headers"""
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = []
            for i, row in enumerate(reader):
                row_text = ' | '.join(f"{k}: {v}" for k, v in row.items())
                rows.append({
                    'page': i + 1,
                    'text': row_text,
                    'metadata': {'row_number': i + 1}
                })
        
        return {
            'pages': rows,
            'total_pages': len(rows),
            'full_text': '\n'.join(r['text'] for r in rows)
        }
    
    @staticmethod
    def _extract_markdown(file_path: str) -> Dict:
        """Extract text from Markdown"""
        with open(file_path, 'r', encoding='utf-8') as f:
            md_text = f.read()
        
        # Convert to HTML then extract text
        html = markdown.markdown(md_text)
        # Simple HTML tag removal
        import re
        text = re.sub('<[^<]+?>', '', html)
        
        return {
            'pages': [{'page': 1, 'text': text, 'metadata': {'format': 'markdown'}}],
            'total_pages': 1,
            'full_text': text,
            'raw_markdown': md_text
        }
