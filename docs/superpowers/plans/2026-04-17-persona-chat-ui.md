# Persona Chat UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `/agents` page where users pick a persona (Software Developer, Data Scientist, etc.) and chat with an AI agent that answers using that persona's ingested conversation history plus a shared reference library.

**Architecture:** New FastAPI router (`agents.py`) adds `POST /api/agents/chat` — auth-free for v1 since the frontend has no login flow. It queries the persona's dataset + `reference-library` by `dataset_id`, feeds chunks into LLaMA 3.1, and returns answer + citations. The React frontend adds an `/agents` route with a persona grid home screen and a chat window, accessed via a new hero CTA button on the existing Index page.

**Tech Stack:** FastAPI, SQLAlchemy/pgvector, Python `requests`, React 18, TypeScript, shadcn/ui, TailwindCSS

---

## Context

**Repo:** `C:/Users/iyoungburke/Desktop/yetog-bh-ai-79`  
**Live API base:** `https://zaylegend.com/bh-ai/api` — `API_V1_PREFIX = "/api"` so all endpoints are `/api/...`  
**Frontend API base:** Read from `localStorage.getItem("BLACKHOLE_API_BASE_URL")` defaulting to `http://localhost:8000`  
**IONOS LLM:** `meta-llama/llama-3.1-8b-instruct` via `settings.IONOS_BASE_URL + "/chat/completions"`

**Dataset ID mapping (persona slug → dataset ID):**
```
software-developer       → chat-software-developer
data-scientist           → chat-data-scientist
professional-salesperson → chat-professional-salesperson
marketing-expert         → chat-marketing-expert
language-tutor           → chat-language-tutor
life-hacker              → chat-life-hacker
mindfulness-coach        → chat-mindfulness-coach
general                  → chat-general
(always also query)      → reference-library
```

---

## Task 1: Add AgentChat schemas to `backend/schemas.py`

**Files:**
- Modify: `backend/schemas.py`

- [ ] **Step 1: Append the two new schemas at the end of `backend/schemas.py`**

```python
# Agent Chat Schemas
class ConversationTurn(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class AgentChatRequest(BaseModel):
    persona: str = Field(pattern="^[a-z-]+$", description="Persona slug e.g. software-developer")
    message: str = Field(min_length=1, max_length=2000)
    conversation_history: List[ConversationTurn] = Field(default_factory=list, max_length=20)

class AgentChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    processing_time: float
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add backend/schemas.py
git commit -m "feat: add AgentChatRequest/AgentChatResponse schemas"
```

---

## Task 2: Build `backend/routers/agents.py`

**Files:**
- Create: `backend/routers/agents.py`

- [ ] **Step 1: Create the file**

```python
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


def _vector_search(db: Session, dataset_ids: list[str], embedding: list[float], top_k: int = 6) -> list:
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
    system_prompt += "\n\nAnswer using [N] citation format when referencing sources. If context is insufficient, say so."

    messages = [{"role": "system", "content": system_prompt}]
    for turn in history[-6:]:  # last 3 exchanges
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
```

- [ ] **Step 2: Register the router in `backend/main.py`**

Add after line 10 (`from routers import auth, datasets, uploads, query, processing, stats`):
```python
from routers import auth, datasets, uploads, query, processing, stats, agents
```

Add after line 162 (`app.include_router(stats.router, ...)`):
```python
app.include_router(agents.router, prefix=settings.API_V1_PREFIX, tags=["agents"])
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add backend/routers/agents.py backend/main.py
git commit -m "feat: add POST /api/agents/chat endpoint"
```

---

## Task 3: Add `agentChat()` to `src/lib/api.ts`

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add types and function at the end of `src/lib/api.ts`**

```typescript
// Agent Chat
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentCitation {
  document_id: string;
  filename: string;
  page: number;
  chunk_text: string;
  score: number;
}

export interface AgentChatResponse {
  answer: string;
  citations: AgentCitation[];
  processing_time: number;
}

export async function agentChat(
  persona: string,
  message: string,
  conversationHistory: ConversationTurn[]
): Promise<AgentChatResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/agents/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify({
      persona,
      message,
      conversation_history: conversationHistory,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Agent chat failed with ${res.status}`);
  }
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add src/lib/api.ts
git commit -m "feat: add agentChat() to frontend API client"
```

---

## Task 4: Build `PersonaCard` component

**Files:**
- Create: `src/components/agents/PersonaCard.tsx`

- [ ] **Step 1: Create the file**

```bash
mkdir -p C:/Users/iyoungburke/Desktop/yetog-bh-ai-79/src/components/agents
```

```typescript
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Persona {
  slug: string;
  name: string;
  description: string;
  icon: string;
  gradient: string;
}

export const PERSONAS: Persona[] = [
  { slug: 'software-developer',       name: 'Software Developer',       description: 'Code, architecture, debugging, best practices',       icon: '💻', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { slug: 'data-scientist',           name: 'Data Scientist',           description: 'ML, analytics, statistics, Python, data pipelines',   icon: '📊', gradient: 'from-purple-500/20 to-pink-500/20' },
  { slug: 'professional-salesperson', name: 'Professional Salesperson', description: 'Sales strategy, objection handling, qualification',    icon: '🤝', gradient: 'from-green-500/20 to-emerald-500/20' },
  { slug: 'marketing-expert',         name: 'Marketing Expert',         description: 'Campaigns, copywriting, brand, growth tactics',       icon: '📣', gradient: 'from-orange-500/20 to-yellow-500/20' },
  { slug: 'language-tutor',           name: 'Language Tutor',           description: 'Grammar, vocabulary, writing, language learning',     icon: '🌍', gradient: 'from-teal-500/20 to-blue-500/20' },
  { slug: 'life-hacker',              name: 'Life Hacker',              description: 'Productivity, habits, tools, efficiency hacks',       icon: '⚡', gradient: 'from-yellow-500/20 to-orange-500/20' },
  { slug: 'mindfulness-coach',        name: 'Mindfulness Coach',        description: 'Meditation, stress, focus, mental wellness',          icon: '🧘', gradient: 'from-violet-500/20 to-purple-500/20' },
  { slug: 'general',                  name: 'General Assistant',        description: 'All-purpose help across any topic',                   icon: '🌟', gradient: 'from-slate-500/20 to-gray-500/20' },
];

interface PersonaCardProps {
  persona: Persona;
  onClick: (persona: Persona) => void;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ persona, onClick }) => (
  <Card
    onClick={() => onClick(persona)}
    className={cn(
      'cursor-pointer border border-border bg-gradient-void hover:cosmic-glow cosmic-transition group',
      'hover:border-primary/50 hover:scale-[1.02]'
    )}
  >
    <CardContent className={cn('p-6 bg-gradient-to-br rounded-lg h-full', persona.gradient)}>
      <div className="text-4xl mb-4">{persona.icon}</div>
      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary cosmic-transition mb-2">
        {persona.name}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{persona.description}</p>
    </CardContent>
  </Card>
);

export default PersonaCard;
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add src/components/agents/PersonaCard.tsx
git commit -m "feat: add PersonaCard component"
```

---

## Task 5: Build `PersonaGrid` component

**Files:**
- Create: `src/components/agents/PersonaGrid.tsx`

- [ ] **Step 1: Create the file**

```typescript
import React from 'react';
import { Brain } from 'lucide-react';
import PersonaCard, { Persona, PERSONAS } from './PersonaCard';

interface PersonaGridProps {
  onSelect: (persona: Persona) => void;
}

const PersonaGrid: React.FC<PersonaGridProps> = ({ onSelect }) => (
  <div className="min-h-screen bg-gradient-cosmic">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12 space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <Brain className="w-10 h-10 text-primary cosmic-glow" />
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Your Agents
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Each agent is trained on your real conversations. Pick one and start chatting.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {PERSONAS.map((persona) => (
          <PersonaCard key={persona.slug} persona={persona} onClick={onSelect} />
        ))}
      </div>
    </div>
  </div>
);

export default PersonaGrid;
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add src/components/agents/PersonaGrid.tsx
git commit -m "feat: add PersonaGrid component"
```

---

## Task 6: Build `PersonaChat` component

**Files:**
- Create: `src/components/agents/PersonaChat.tsx`

- [ ] **Step 1: Create the file**

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Persona } from './PersonaCard';
import { agentChat, ConversationTurn, AgentCitation } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: AgentCitation[];
}

interface PersonaChatProps {
  persona: Persona;
  onBack: () => void;
}

const CitationChip: React.FC<{ citation: AgentCitation; index: number }> = ({ citation, index }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="inline-block mr-2 mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs bg-primary/20 text-primary border border-primary/30 rounded px-2 py-0.5 hover:bg-primary/30 cosmic-transition"
      >
        [{index + 1}] {citation.filename.split('/').pop()}
      </button>
      {open && (
        <div className="mt-1 p-2 bg-muted/80 border border-border rounded text-xs text-muted-foreground max-w-xs">
          <div className="font-medium mb-1">Score: {(citation.score * 100).toFixed(0)}%</div>
          {citation.chunk_text}
        </div>
      )}
    </div>
  );
};

const PersonaChat: React.FC<PersonaChatProps> = ({ persona, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hi! I'm your ${persona.name} agent. I'm trained on real conversations — ask me anything.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    const history: ConversationTurn[] = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await agentChat(persona.slug, text, history);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: resp.answer,
        citations: resp.citations,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-cosmic">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-2xl">{persona.icon}</span>
        <div>
          <div className="font-semibold text-foreground">{persona.name}</div>
          <div className="text-xs text-muted-foreground">{persona.description}</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted/60 text-foreground border border-border rounded-bl-sm'
            )}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/40">
                  {msg.citations.map((c, ci) => (
                    <CitationChip key={ci} citation={c} index={ci} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted/60 border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-muted/20 backdrop-blur-sm">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask your ${persona.name}...`}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="rounded-xl h-10 w-10">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export default PersonaChat;
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add src/components/agents/PersonaChat.tsx
git commit -m "feat: add PersonaChat component with citations"
```

---

## Task 7: Build `AgentsPage` routing component

**Files:**
- Create: `src/pages/AgentsPage.tsx`

- [ ] **Step 1: Create the file**

```typescript
import React, { useState } from 'react';
import PersonaGrid from '@/components/agents/PersonaGrid';
import PersonaChat from '@/components/agents/PersonaChat';
import { Persona } from '@/components/agents/PersonaCard';

const AgentsPage: React.FC = () => {
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);

  if (selectedPersona) {
    return (
      <PersonaChat
        persona={selectedPersona}
        onBack={() => setSelectedPersona(null)}
      />
    );
  }

  return <PersonaGrid onSelect={setSelectedPersona} />;
};

export default AgentsPage;
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add src/pages/AgentsPage.tsx
git commit -m "feat: add AgentsPage with persona routing"
```

---

## Task 8: Wire `/agents` route into the app

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/Index.tsx`

- [ ] **Step 1: Add the `/agents` route to `src/App.tsx`**

Replace:
```typescript
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
```
With:
```typescript
import Index from "./pages/Index";
import AgentsPage from "./pages/AgentsPage";
import NotFound from "./pages/NotFound";
```

Replace:
```typescript
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
```
With:
```typescript
          <Route path="/" element={<Index />} />
          <Route path="/agents" element={<AgentsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
```

- [ ] **Step 2: Add "Meet Your Agents" CTA button to `src/pages/Index.tsx`**

In `Index.tsx`, find the import for `useNavigate` — it doesn't exist yet, so add it. Find:
```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";
```
That's in `App.tsx`. In `Index.tsx`, add the import at the top with the existing router-dom import. Find the top imports block and add:
```typescript
import { useNavigate } from 'react-router-dom';
```

Inside the `Index` component body, add after `const mainInterfaceRef`:
```typescript
  const navigate = useNavigate();
```

Find the existing CTA buttons block in `Index.tsx`:
```typescript
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
              <Button
                size="lg"
                className="bg-gradient-event-horizon hover:cosmic-glow text-lg px-8 py-4 h-auto"
                onClick={scrollToMainInterface}
              >
                Start Uploading Knowledge
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-4 h-auto border-primary/50 text-primary hover:bg-primary/10"
                onClick={() => setActiveTab('search')}
              >
                Explore Search
                <Search className="w-5 h-5 ml-2" />
              </Button>
            </div>
```

Replace with:
```typescript
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
              <Button
                size="lg"
                className="bg-gradient-event-horizon hover:cosmic-glow text-lg px-8 py-4 h-auto"
                onClick={scrollToMainInterface}
              >
                Start Uploading Knowledge
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <Button
                size="lg"
                className="bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 cosmic-glow text-lg px-8 py-4 h-auto"
                onClick={() => navigate('/agents')}
              >
                <Users className="w-5 h-5 mr-2" />
                Meet Your Agents
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-4 h-auto border-primary/50 text-primary hover:bg-primary/10"
                onClick={() => setActiveTab('search')}
              >
                Explore Search
                <Search className="w-5 h-5 ml-2" />
              </Button>
            </div>
```

Note: `Users` is already imported in `Index.tsx` (line 2: `import { Brain, Search, Upload, Lightbulb, ArrowRight, Zap, Star, Users } from 'lucide-react'`).

- [ ] **Step 3: Commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add src/App.tsx src/pages/Index.tsx
git commit -m "feat: wire /agents route and add hero CTA button"
```

---

## Task 9: Deploy and end-to-end test

- [ ] **Step 1: Push to trigger CI/CD**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git push origin main
```

Wait ~2 minutes for the deploy pipeline to complete.

- [ ] **Step 2: Verify the backend endpoint is live**

```bash
curl -s -X POST https://zaylegend.com/bh-ai/api/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"persona":"software-developer","message":"What is FastAPI?","conversation_history":[]}'
```

Expected: `200` with `{"answer":"...","citations":[...],"processing_time":...}`

If `404`: the agents router wasn't registered — check `backend/main.py` import.
If `500`: check `docker logs bh-ai-api` on the server.

- [ ] **Step 3: Test the UI**

Open `https://zaylegend.com/bh-ai/` in a browser.

1. Click "Meet Your Agents" button → should navigate to `/agents`
2. You should see 8 persona cards in a grid
3. Click "Software Developer" → chat window opens with greeting message
4. Type "How do I structure a FastAPI project?" → hit Enter
5. Expected: answer appears with citation chips below it
6. Click a citation chip → it expands to show the source chunk text

- [ ] **Step 4: Check that the API base URL is configured in localStorage**

In the browser console (F12 → Console):
```javascript
localStorage.getItem("BLACKHOLE_API_BASE_URL")
```

If `null`, the agents call will go to `localhost:8000` and fail. Set it:
```javascript
localStorage.setItem("BLACKHOLE_API_BASE_URL", "https://zaylegend.com/bh-ai/api")
```

Then reload and retry the chat.

- [ ] **Step 5: Final commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add -A
git commit -m "feat: persona chat UI complete — /agents route live"
```
