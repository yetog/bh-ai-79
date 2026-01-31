from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from database import get_db
from schemas import QueryRequest, QueryResponse, Citation, TokenData
from auth import get_current_user
from models import Chunk, Document, Query as QueryLog
from workers.embedding import EmbeddingService
from config import get_settings
import time
import requests
import re
from datetime import datetime

router = APIRouter()
settings = get_settings()

def generate_answer(context: str, query: str, citations_count: int) -> str:
    """Generate answer using IONOS Model Hub LLM"""
    
    system_prompt = """You are a helpful AI assistant. Answer questions based ONLY on the provided context.
If the context doesn't contain enough information, say so clearly.
Always cite your sources using the format [N] where N is the citation number."""
    
    user_prompt = f"""Context with citations:
{context}

Question: {query}

Provide a clear, concise answer based on the context above. Use [N] to cite sources."""
    
    try:
        url = f"{settings.IONOS_BASE_URL}/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.IONOS_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": settings.IONOS_CHAT_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 800
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        answer = data['choices'][0]['message']['content']
        
        return answer
        
    except Exception as e:
        print(f"LLM generation error: {e}")
        return f"I found {citations_count} relevant sources in your documents, but encountered an error generating the answer. Please try again."

@router.post("/query", response_model=QueryResponse)
async def query_rag(
    request: QueryRequest,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    start_time = time.time()
    
    try:
        # Generate query embedding
        embedding_service = EmbeddingService()
        query_embedding = embedding_service.generate_embedding(request.query)
        
        if not query_embedding:
            raise HTTPException(status_code=500, detail="Failed to generate query embedding")
        
        # Vector similarity search using pgvector
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        
        similarity_query = text(f"""
            SELECT 
                c.id, c.text, c.page, c.dataset_id,
                d.id as doc_id, d.filename, d.source_uri,
                1 - (c.embedding <=> '{embedding_str}'::vector) as similarity
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE c.tenant_id = :tenant_id
            {'AND c.dataset_id = ANY(:dataset_ids)' if request.dataset_ids else ''}
            ORDER BY c.embedding <=> '{embedding_str}'::vector
            LIMIT :top_k
        """)
        
        params = {
            "tenant_id": current_user.tenant_id,
            "top_k": request.top_k
        }
        if request.dataset_ids:
            params["dataset_ids"] = request.dataset_ids
        
        results = db.execute(similarity_query, params).fetchall()
        
        # Build context and citations
        citations = []
        context_parts = []
        
        for i, row in enumerate(results, 1):
            citations.append(Citation(
                document_id=str(row.doc_id),
                filename=row.filename,
                page=row.page or 0,
                chunk_text=row.text[:200] + "..." if len(row.text) > 200 else row.text,
                score=float(row.similarity)
            ))
            context_parts.append(f"[{i}] {row.text}")
        
        context = "\n\n".join(context_parts)
        
        # Generate answer using LLM if we have context
        if citations:
            answer = generate_answer(context, request.query, len(citations))
        else:
            answer = "I couldn't find any relevant information in your documents to answer this question."
        
        processing_time = time.time() - start_time
        
        # Log the query
        query_log = QueryLog(
            tenant_id=current_user.tenant_id,
            user_id=current_user.user_id,
            query_text=request.query,
            results_count=len(citations),
            processing_time=processing_time,
            created_at=datetime.utcnow()
        )
        db.add(query_log)
        db.commit()
        
        return QueryResponse(
            answer=answer,
            citations=citations,
            processing_time=processing_time
        )
        
    except Exception as e:
        print(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")
