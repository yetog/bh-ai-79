from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from schemas import AgentChatRequest, AgentChatResponse, Citation
from workers.embedding import EmbeddingService
from config import get_settings
import time
import requests as http_requests

router = APIRouter()
settings = get_settings()

PERSONA_DATASET = {
    "software-developer":       "chat-software-developer",
    "data-scientist":           "chat-data-scientist",
    "professional-salesperson": "chat-professional-salesperson",
    "marketing-expert":         "chat-marketing-expert",
    "language-tutor":           "chat-language-tutor",
    "life-hacker":              "chat-life-hacker",
    "mindfulness-coach":        "chat-mindfulness-coach",
    "general":                  "chat-general",
}

PERSONA_SYSTEM_PROMPT = {
    "software-developer":       "You are an expert Software Developer. Answer based on the provided context from real conversations and reference materials.",
    "data-scientist":           "You are an expert Data Scientist. Answer based on the provided context from real conversations and reference materials.",
    "professional-salesperson": "You are a Professional Salesperson. Answer based on the provided context from real conversations and reference materials.",
    "marketing-expert":         "You are a Marketing Expert. Answer based on the provided context from real conversations and reference materials.",
    "language-tutor":           "You are a Language Tutor. Answer based on the provided context from real conversations and reference materials.",
    "life-hacker":              "You are a Life Hacker who gives practical productivity tips. Answer based on the provided context from real conversations and reference materials.",
    "mindfulness-coach":        "You are a Mindfulness Coach. Answer based on the provided context from real conversations and reference materials.",
    "general":                  "You are a helpful AI assistant. Answer based on the provided context from real conversations and reference materials.",
}


def _vector_search(db: Session, dataset_ids: list, embedding: list, top_k: int = 6) -> list:
    embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
    query = text(f"""
        SELECT
            c.id, c.text, c.page, c.dataset_id,
            d.id as doc_id, d.filename,
            1 - (c.embedding <=> '{embedding_str}'::vector) as similarity
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE c.dataset_id = ANY(:dataset_ids)
        ORDER BY c.embedding <=> '{embedding_str}'::vector
        LIMIT :top_k
    """)
    return db.execute(query, {"dataset_ids": dataset_ids, "top_k": top_k}).fetchall()


def _generate_answer(persona: str, context: str, message: str, history: list) -> str:
    system_prompt = PERSONA_SYSTEM_PROMPT.get(persona, PERSONA_SYSTEM_PROMPT["general"])
    system_prompt += "\n\nUse [N] citation format when referencing sources. If context is insufficient, say so."

    messages = [{"role": "system", "content": system_prompt}]
    for turn in history[-6:]:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": f"Context:\n{context}\n\nQuestion: {message}"})

    try:
        resp = http_requests.post(
            f"{settings.IONOS_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.IONOS_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.IONOS_CHAT_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 800,
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"I found relevant sources but encountered an error generating the answer: {e}"


@router.post("/agents/chat", response_model=AgentChatResponse)
async def agent_chat(request: AgentChatRequest, db: Session = Depends(get_db)):
    start = time.time()

    persona_dataset_id = PERSONA_DATASET.get(request.persona)
    if not persona_dataset_id:
        raise HTTPException(status_code=400, detail=f"Unknown persona: {request.persona}")

    embedding_service = EmbeddingService()
    query_embedding = embedding_service.generate_embedding(request.message)
    if not query_embedding:
        raise HTTPException(status_code=500, detail="Failed to generate embedding")

    dataset_ids = [persona_dataset_id, "reference-library"]
    rows = _vector_search(db, dataset_ids, query_embedding, top_k=6)

    citations = []
    context_parts = []
    for i, row in enumerate(rows, 1):
        citations.append(Citation(
            document_id=str(row.doc_id),
            filename=row.filename,
            page=row.page or 0,
            chunk_text=row.text[:200] + "..." if len(row.text) > 200 else row.text,
            score=float(row.similarity),
        ))
        context_parts.append(f"[{i}] {row.text}")

    context = "\n\n".join(context_parts)
    answer = _generate_answer(request.persona, context, request.message, request.conversation_history)

    return AgentChatResponse(
        answer=answer,
        citations=citations,
        processing_time=time.time() - start,
    )
