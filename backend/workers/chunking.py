from typing import List, Dict
import re

class TextChunker:
    """Split text into chunks with overlap"""
    
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 120, min_length: int = 40):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_length = min_length
    
    def chunk_text(self, text: str, metadata: Dict = None) -> List[Dict]:
        """Split text into overlapping chunks"""
        if not text or len(text.strip()) < self.min_length:
            return []
        
        chunks = []
        sentences = self._split_sentences(text)
        
        current_chunk = []
        current_length = 0
        chunk_index = 0
        
        for sentence in sentences:
            sentence_length = len(sentence)
            
            if current_length + sentence_length > self.chunk_size and current_chunk:
                # Save current chunk
                chunk_text = ' '.join(current_chunk)
                chunks.append({
                    'index': chunk_index,
                    'text': chunk_text,
                    'length': len(chunk_text),
                    'metadata': metadata or {}
                })
                chunk_index += 1
                
                # Start new chunk with overlap
                overlap_text = chunk_text[-self.chunk_overlap:] if len(chunk_text) > self.chunk_overlap else chunk_text
                current_chunk = [overlap_text, sentence]
                current_length = len(overlap_text) + sentence_length
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        
        # Add final chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            if len(chunk_text) >= self.min_length:
                chunks.append({
                    'index': chunk_index,
                    'text': chunk_text,
                    'length': len(chunk_text),
                    'metadata': metadata or {}
                })
        
        return chunks
    
    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences"""
        # Simple sentence splitting on periods, question marks, exclamation points
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def chunk_pages(self, pages: List[Dict], metadata: Dict = None) -> List[Dict]:
        """Chunk multiple pages with page metadata"""
        all_chunks = []
        
        for page in pages:
            page_text = page.get('text', '')
            page_num = page.get('page', 1)
            page_meta = page.get('metadata', {})
            
            # Merge metadata
            chunk_meta = {**(metadata or {}), **page_meta, 'page': page_num}
            
            page_chunks = self.chunk_text(page_text, chunk_meta)
            all_chunks.extend(page_chunks)
        
        return all_chunks
