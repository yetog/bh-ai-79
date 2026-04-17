# Black Hole AI — Persona Agent Pipeline Design

**Date:** 2026-04-17  
**Scope:** Data migration + PDF/CSV ingestion + Persona chat UI  
**Approach:** Two parallel sub-agents, then integration pass

---

## Overview

Get all training data into the live Black Hole AI platform and build a standalone persona-based chat interface on top of it. The platform is already running at `zaylegend.com/bh-ai/`. The migration script and Dexie extractor are already built. This sprint completes the user-facing product.

---

## Architecture

Two sub-agents run in parallel. Sub-agent 1 owns the data pipeline. Sub-agent 2 owns the UI and new backend endpoint. Both use the same deterministic dataset IDs, so neither blocks the other.

After both finish, a short integration pass wires the frontend route and runs end-to-end tests on the live deployment.

---

## Dataset IDs (shared contract between sub-agents)

| Persona | Dataset ID |
|---|---|
| Software Developer | `chat-software-developer` |
| Data Scientist | `chat-data-scientist` |
| Professional Salesperson | `chat-professional-salesperson` |
| Marketing Expert | `chat-marketing-expert` |
| Language Tutor | `chat-language-tutor` |
| Life Hacker | `chat-life-hacker` |
| Mindfulness Coach | `chat-mindfulness-coach` |
| General | `chat-general` |
| PDFs + reference docs | `reference-library` |

---

## Sub-agent 1: Data Pipeline

**Input:** Local files at `C:/Users/iyoungburke/Desktop/back up/.Json GPT Files/`  
**Output:** All datasets populated and indexed in the live platform

### Step 1 — Dexie JSON migration
Run `migrate_dexie.py` against `https://zaylegend.com/bh-ai/api/api/v1`.  
- Discovers all 48 Dexie JSON files automatically  
- Groups by persona, creates 8 datasets if they don't exist  
- Uploads each file via S3 presigned URL  
- Polls until each processing job completes  
- Logs failures to `migration_errors.log` without stopping

### Step 2 — PDF ingestion
Ingest all 13 PDFs from `Cloud PDF's/` into the `reference-library` dataset.  
These are technical reference books (AWS, CompTIA, cloud security, system design).  
All persona agents query this dataset alongside their own when answering.  
Use existing upload flow: sign → S3 PUT → complete notification.

### Step 3 — CSV ingestion
Inspect each CSV header in `Training Data/` to determine persona assignment.  
`Qualification_Questions_Sheet.csv` → `chat-professional-salesperson`.  
Any CSV with ambiguous content → `chat-general`.  
Log assignment decisions to `migration_errors.log` for review.

### Error handling
- File-level failures are logged and skipped; the pipeline continues
- Final summary table printed: completed count, failed count, total chunks indexed

---

## Sub-agent 2: Persona Chat UI

### New backend endpoint

**File:** `backend/routers/agents.py`  
**Registered in:** `backend/main.py`

```
POST /api/v1/agents/chat
```

Request:
```json
{
  "persona": "software-developer",
  "message": "How do I set up a FastAPI project?",
  "conversation_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

Response:
```json
{
  "answer": "...",
  "citations": [
    {
      "document_id": "...",
      "filename": "askIonos-export-7_12_2024.json",
      "chunk_text": "...",
      "score": 0.87
    }
  ],
  "processing_time": 1.2
}
```

Logic:
1. Map `persona` slug to dataset ID (e.g. `software-developer` → `chat-software-developer`)
2. Query persona dataset + `reference-library` in parallel using existing vector search
3. Build system prompt with persona context + retrieved chunks
4. Call IONOS LLaMA 3.1 with conversation history
5. Return answer + citations

### New frontend page

**Route:** `/agents`  
**Files:**
- `src/pages/AgentsPage.tsx` — top-level routing between grid and chat views
- `src/components/agents/PersonaGrid.tsx` — home screen with 8 persona cards
- `src/components/agents/PersonaChat.tsx` — chat window with citation display
- `src/components/agents/PersonaCard.tsx` — individual clickable card

**Home screen:** 3-column grid of persona cards. Each card shows an icon, persona name, and one-line description. Click → opens chat screen.

**Chat screen:** Header with back arrow + persona name. Message thread (user right-aligned, assistant left-aligned). Citations shown as collapsed chips under each assistant message. Text input + Send button fixed at bottom.

**Nav:** Single "Agents" link added to the existing sidebar. No other layout changes.

**State:** Conversation history held in React local state per session. No persistence required for v1.

---

## Integration Pass

After both sub-agents complete:

1. Add `/agents` route to `src/App.tsx` React Router config
2. Verify `POST /api/v1/agents/chat` returns citations from the correct persona dataset
3. Open `zaylegend.com/bh-ai/agents`, pick a persona, send a message, confirm answer
4. `git push` → CI/CD auto-deploys to production

---

## Files Changed Summary

| File | Owner | Change |
|---|---|---|
| `migrate_dexie.py` | Sub-agent 1 | Run as-is, minor fixes if needed |
| `backend/routers/agents.py` | Sub-agent 2 | New file |
| `backend/main.py` | Sub-agent 2 | Register agents router |
| `src/pages/AgentsPage.tsx` | Sub-agent 2 | New file |
| `src/components/agents/PersonaGrid.tsx` | Sub-agent 2 | New file |
| `src/components/agents/PersonaChat.tsx` | Sub-agent 2 | New file |
| `src/components/agents/PersonaCard.tsx` | Sub-agent 2 | New file |
| `src/App.tsx` | Integration | Add `/agents` route |
| `src/components/layout/Sidebar.tsx` (or equivalent) | Integration | Add Agents nav link |

---

## Out of Scope (Future Phases)

- Fine-tuning data export (Phase 3)
- Conversation persistence across sessions
- Per-user chat history
- Streaming responses (SSE)
- Rate limiting on the agents endpoint
