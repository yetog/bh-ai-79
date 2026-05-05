# Claude Agent Bus

> Two AI agents. One Redis queue. Zero SSH keys required.

A lightweight message bus that lets two Claude Code instances coordinate across
machines — one acts as the **orchestrator** (sends commands), the other as the
**executor** (runs them on the server and reports back).

---

## The Problem

You have a Claude Code instance on your laptop that knows what needs to happen —
deploy the app, check the logs, restart a container. You have another Claude Code
instance on your production server that can actually do it. But they can't talk
to each other.

The naive solution is SSH. But SSH requires key management, and keys break, and
managing them across machines is friction you don't need. The elegant solution is
a **message bus** — a shared channel both agents can read and write.

---

## Architecture

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   Orchestrator Claude   │         │   Executor Claude        │
│   (your laptop)         │         │   (production server)    │
│                         │         │                          │
│  mcp tool: run()        │         │  polls /api/bus/pop      │
│  mcp tool: confirm()    │         │  executes shell commands  │
│  mcp tool: deploy()     │         │  posts results back      │
│  mcp tool: logs()       │         │                          │
│  mcp tool: status()     │         │                          │
└────────────┬────────────┘         └────────────┬────────────┘
             │  HTTPS                             │  HTTPS
             ▼                                    ▼
     ┌──────────────────────────────────────────────┐
     │          FastAPI  /api/bus/*                  │
     │          Protected by shared BUS_SECRET       │
     ├──────────────────────────────────────────────┤
     │              Redis                            │
     │  agent_bus:queue          ← ready to run      │
     │  agent_bus:pending:{id}   ← awaiting confirm  │
     │  agent_bus:result:{id}    ← completed output  │
     └──────────────────────────────────────────────┘
```

Both Claude instances talk to the same FastAPI server over HTTPS. Redis (already
running for background job processing) stores the message queues.

---

## The Safety Model

Not all commands are equal. Every command is classified into one of three tiers
before it enters the queue:

| Tier | Examples | Behavior |
|------|----------|----------|
| **SAFE** | `docker logs`, `git status`, `curl /health`, `df -h` | Execute immediately |
| **DESTRUCTIVE** | `docker-compose up`, `git pull`, `pip install` | Hold for explicit confirmation |
| **BLOCKED** | `rm -rf`, `\| bash`, `> /etc/passwd` | Rejected outright, never queued |

### The Confirmation Flow

Destructive commands create a natural **human-in-the-loop** moment:

```
Orchestrator: run("docker-compose up -d --build api worker")

Bus returns:  DESTRUCTIVE command queued — requires confirmation.
              ID: f3a9b2c1
              Expires in 300s
              Call confirm('f3a9b2c1') to execute.

[You review the command and decide it's safe]

Orchestrator: confirm("f3a9b2c1")

Bus returns:  Exit code: 0  |  12340ms
              STDOUT:
              Pulling latest changes...
              Recreating bh-ai-79_api_1 ... done
              Recreating bh-ai-79_worker_1 ... done
```

If you don't confirm within 5 minutes, the command expires and is discarded.
No accidental deploys from a stale message.

---

## Why Redis?

Redis was already running on the server for RQ background job processing. Using
it as a message bus costs nothing extra and adds zero infrastructure.

Key design choices:

- **Lists** for the ready queue — `RPUSH` to add, `LPOP` to consume atomically.
  No double-execution, even under concurrent access.
- **Strings with TTL** for pending confirmations — 5-minute expiry means a delayed
  confirmation can't accidentally trigger later.
- **Strings with TTL** for results — 1-hour expiry keeps memory bounded without
  manual cleanup.

---

## Why MCP?

MCP (Model Context Protocol) is Anthropic's standard for extending Claude with tools.
By wrapping the bus as MCP tools, Claude can call `run()`, `confirm()`, `deploy()`
as naturally as reading a file or searching the web.

The orchestrator Claude doesn't know or care about Redis or HTTP. It just calls
`deploy("main")` and the infrastructure handles the rest.

---

## API Reference

All endpoints require `Authorization: Bearer {BUS_SECRET}`.

### `POST /api/bus/push`
Queue a command. Returns immediately with the message ID and tier.

```bash
curl -X POST https://your-api/api/bus/push \
  -H "Authorization: Bearer $BUS_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"command": "git status", "cwd": "/var/www/myapp"}'
```

### `POST /api/bus/confirm/{id}`
Release a pending destructive command into the execution queue.

### `GET /api/bus/pop`
Server Claude polls this. Returns the next ready command or `{"id": null}`.

### `POST /api/bus/respond`
Server Claude posts execution results back.

### `GET /api/bus/result/{id}`
Orchestrator polls for results. Returns `{"status": "pending"}` while waiting.

### `GET /api/bus/status`
Queue depths and counts. Good for debugging.

---

## Setup

### 1. Add BUS_SECRET to your server environment

Generate a secret:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Add to your server's `.env` file (never commit this):
```
BUS_SECRET=your-generated-secret
```

### 2. Register the MCP server on your laptop

Add to `.claude/settings.json` in your project:
```json
{
  "mcpServers": {
    "agent-bus": {
      "command": "python",
      "args": ["mcp_bus_server.py"],
      "env": {
        "BUS_API_URL": "https://your-api-url/api",
        "BUS_SECRET": "your-generated-secret"
      }
    }
  }
}
```

### 3. Install the MCP dependency

```bash
pip install mcp httpx
```

### 4. Restart Claude Code

Claude Code loads MCP servers at startup. Restart it to pick up the new config.

### 5. Set up the executor Claude

The server's Claude Code needs a `CLAUDE.md` with instructions to poll the bus.
See `CLAUDE.md` in this repo for a working template.

---

## MCP Tool Reference

| Tool | Description |
|------|-------------|
| `run(command, cwd?)` | Send any command. Auto-detects tier. Returns output or confirmation ID. |
| `confirm(message_id)` | Approve a pending destructive command. Waits for result. |
| `deploy(branch?)` | Shortcut: git pull + docker-compose up. Requires confirmation. |
| `logs(service?, lines?)` | Docker logs shortcut. Safe tier, executes immediately. |
| `status()` | Bus queue depths + server health check. |

---

## What This Unlocks

Once two Claude instances can communicate, interesting things become possible:

- **No-SSH deployment** — orchestrator Claude deploys via bus, no key management
- **Scheduled tasks** — push a command to the bus on a cron schedule
- **Multi-server coordination** — use different Redis channels per server
- **Audit logging** — write all executed commands to a database table
- **CI/CD integration** — push a deploy command when tests pass, confirm automatically
- **Cross-machine pipelines** — Claude on server A runs a job, sends results to Claude on server B

This is the foundation of multi-agent infrastructure built on standard, boring technology.
