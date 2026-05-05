# Claude Agent Bus — Design Spec
**Date:** 2026-04-23  
**Status:** Approved  
**Author:** Claude + Isayah Young-Burke

---

## Problem

Two Claude Code instances — one on a local Windows machine, one on a remote Linux server — need to coordinate. The server Claude can run shell commands; the local Claude knows what needs to happen. Without a communication channel, a human must relay messages between them manually.

This spec describes a lightweight message bus that lets any Claude instance send commands to any other, with a tiered safety model that makes it safe to expose real shell execution.

---

## Architecture

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   Windows Claude        │         │   Server Claude          │
│   (orchestrator)        │         │   (executor)             │
│                         │         │                          │
│  MCP tool: run()        │         │  polls /api/bus/pop      │
│  MCP tool: confirm()    │         │  executes shell cmds     │
│  MCP tool: deploy()     │         │  posts results back      │
│  MCP tool: status()     │         │                          │
└────────────┬────────────┘         └────────────┬────────────┘
             │  HTTPS                             │  HTTPS
             ▼                                    ▼
     ┌──────────────────────────────────────────────┐
     │         FastAPI  (/api/bus/*)                 │
     │         Protected by BUS_SECRET               │
     ├──────────────────────────────────────────────┤
     │              Redis                            │
     │  agent_bus:queue          (List)              │
     │  agent_bus:pending:{id}   (Hash, TTL 5m)      │
     │  agent_bus:result:{id}    (Hash, TTL 1h)      │
     └──────────────────────────────────────────────┘
```

Both Claude instances connect to the same FastAPI server already running at `zaylegend.com/bh-ai/api`. Redis is already running on that server for the RQ job queue.

---

## Command Tiers

The safety model has three tiers. Tier is determined server-side by pattern matching the command string.

### SAFE — execute immediately
Read-only operations with no side effects.
```
docker logs *
docker-compose ps
docker stats --no-stream
git log --oneline *
git status
git diff *
curl http://localhost:*/health
df -h
free -m
cat * (non-sensitive paths only)
```

### DESTRUCTIVE — hold for explicit confirmation
Operations that change running state or pull external code.
```
docker-compose up *
docker-compose restart *
docker-compose down *
docker-compose build *
git pull *
pip install *
```
When a destructive command is received it is held in `agent_bus:pending:{id}` with a 5-minute TTL. The bus returns `{status: "awaiting_confirmation", id: "..."}`. The orchestrator Claude must call `confirm(id)` to release it.

### BLOCKED — rejected outright
Patterns that should never be executed via a remote bus.
```
rm -rf *
DROP *
passwd *
* | bash
* | sh
curl * | *     (pipe to shell)
> /etc/*        (writing system files)
chmod 777 *
```
Returns HTTP 422 with the reason. Never queued.

---

## API Endpoints

All endpoints require `Authorization: Bearer {BUS_SECRET}` header. `BUS_SECRET` is an environment variable set on the server and in the MCP server config.

### `POST /api/bus/push`
Queue a command from the orchestrator.

**Request:**
```json
{
  "command": "docker-compose up -d --build api worker",
  "cwd": "/var/www/zaylegend/apps/testing/bh-ai-79",
  "sender": "windows-claude"
}
```

**Response (safe):**
```json
{"id": "abc123", "status": "queued", "tier": "safe"}
```

**Response (destructive):**
```json
{"id": "abc123", "status": "awaiting_confirmation", "tier": "destructive", "ttl_seconds": 300}
```

**Response (blocked):**
```json
{"detail": "Command blocked: matches pattern 'rm -rf *'"}  // HTTP 422
```

---

### `POST /api/bus/confirm/{id}`
Release a pending destructive command into the execution queue.

**Response:**
```json
{"id": "abc123", "status": "queued"}
```

Returns 404 if the ID doesn't exist or has expired.

---

### `GET /api/bus/pop`
Server Claude polls this to get the next ready-to-execute command. Non-blocking — returns `null` if queue is empty.

**Response:**
```json
{
  "id": "abc123",
  "command": "docker-compose up -d --build api worker",
  "cwd": "/var/www/zaylegend/apps/testing/bh-ai-79",
  "sender": "windows-claude",
  "tier": "destructive",
  "queued_at": "2026-04-23T14:00:00Z"
}
```
or `{"id": null}` if empty.

---

### `POST /api/bus/respond`
Server Claude posts the result after execution.

**Request:**
```json
{
  "message_id": "abc123",
  "stdout": "Creating network...\nDone.",
  "stderr": "",
  "exit_code": 0,
  "duration_ms": 8420
}
```

---

### `GET /api/bus/result/{id}`
Orchestrator polls for the result of a command.

**Response:**
```json
{
  "id": "abc123",
  "status": "complete",
  "stdout": "Creating network...\nDone.",
  "stderr": "",
  "exit_code": 0,
  "duration_ms": 8420
}
```
Returns `{"status": "pending"}` while still waiting.

---

### `GET /api/bus/status`
Queue health — useful for debugging and the blog demo.

**Response:**
```json
{
  "queue_depth": 0,
  "pending_confirmations": 1,
  "total_processed": 47
}
```

---

## MCP Server (`mcp_bus_server.py`)

A standalone Python script using the `mcp` SDK. Runs locally on any machine that needs orchestrator access to the bus.

### Tools

**`run(command, cwd=None)`**  
General-purpose command dispatch. Automatically detects tier, requests confirmation if destructive, polls for result. Returns stdout/stderr/exit_code.

**`confirm(message_id)`**  
Approves a pending destructive command. Returns updated status.

**`deploy(branch="main")`**  
Shortcut: runs `git pull origin {branch} && docker-compose up -d --build api worker` in the repo directory. Destructive tier — requires confirmation.

**`logs(service="api", lines=50)`**  
Shortcut: `docker logs --tail={lines} {service}`. Safe tier — executes immediately.

**`status()`**  
Returns queue status + server health check result.

### Configuration

```json
{
  "mcpServers": {
    "agent-bus": {
      "command": "python",
      "args": ["mcp_bus_server.py"],
      "env": {
        "BUS_API_URL": "https://zaylegend.com/bh-ai/api/api",
        "BUS_SECRET": "<shared secret>"
      }
    }
  }
}
```

---

## Server-Side Claude Setup

A `CLAUDE.md` section in the repo root instructs the server's Claude Code instance:

```markdown
## Agent Bus

You are connected to an agent bus at /api/bus. Check for pending commands by
calling GET /api/bus/pop with Authorization: Bearer {BUS_SECRET}.

When a command is returned:
1. Execute it using your Bash tool in the specified cwd
2. Capture stdout, stderr, and exit code
3. POST the result to /api/bus/respond

Poll the bus when asked to "check for messages" or when idle.
```

---

## Security Considerations

1. **`BUS_SECRET` is the only authentication.** Treat it like a root password. Rotate it if compromised.
2. **The BLOCKED tier is defense-in-depth**, not the primary security layer. The secret is primary.
3. **TTL on pending commands** (5 min) means a stolen confirmation link expires quickly.
4. **No command output is logged** in the bus itself — results are ephemeral (TTL 1hr). Add logging at the executor layer if audit trails are needed.
5. **The bus trusts the executor's reported exit code.** A compromised server Claude could lie. For production, add a signed response.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/routers/bus.py` | Create — FastAPI router |
| `backend/main.py` | Modify — register bus router |
| `backend/config.py` | Modify — add BUS_SECRET setting |
| `mcp_bus_server.py` | Create — MCP server (repo root) |
| `CLAUDE.md` | Create — server Claude instructions |
| `docs/agent-bus/README.md` | Create — blog-ready documentation |
| `.claude/settings.json` | Create — MCP registration for this machine |

---

## Blog Post Outline

1. **The Problem** — two AI agents, one server, no direct line
2. **Why MCP?** — what the Model Context Protocol is and why it's the right primitive
3. **Redis as a message bus** — lightweight, already there, TTL built in
4. **The tiered safety model** — why "just execute everything" is wrong
5. **The confirmation flow** — how destructive commands become a human-in-the-loop moment
6. **Demo** — Windows Claude deploys to a live server without SSH
7. **What this unlocks** — multi-agent pipelines, scheduled tasks, cross-machine coordination
