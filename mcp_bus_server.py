#!/usr/bin/env python3
"""
Claude Agent Bus — MCP Server

Exposes tools for the orchestrator Claude to send commands to the server Claude.

Setup — add to .claude/settings.json:
{
  "mcpServers": {
    "agent-bus": {
      "command": "python",
      "args": ["mcp_bus_server.py"],
      "env": {
        "BUS_API_URL": "https://zaylegend.com/bh-ai/api/api",
        "BUS_SECRET": "<your-secret>"
      }
    }
  }
}
"""

import os
import time
import httpx
from mcp.server.fastmcp import FastMCP

BUS_API_URL = os.environ.get("BUS_API_URL", "https://zaylegend.com/bh-ai/api/api")
BUS_SECRET = os.environ.get("BUS_SECRET", "change-me-in-production")
POLL_TIMEOUT = int(os.environ.get("BUS_POLL_TIMEOUT", "60"))
POLL_INTERVAL = float(os.environ.get("BUS_POLL_INTERVAL", "2.0"))

mcp = FastMCP("agent-bus")


def _headers():
    return {"Authorization": f"Bearer {BUS_SECRET}"}


def _push(command: str, cwd: str = "/var/www/zaylegend/apps/testing/bh-ai-79") -> dict:
    with httpx.Client(timeout=15) as client:
        res = client.post(
            f"{BUS_API_URL}/bus/push",
            headers=_headers(),
            json={"command": command, "cwd": cwd, "sender": "orchestrator-claude"},
        )
        res.raise_for_status()
        return res.json()


def _confirm(message_id: str) -> dict:
    with httpx.Client(timeout=15) as client:
        res = client.post(f"{BUS_API_URL}/bus/confirm/{message_id}", headers=_headers())
        res.raise_for_status()
        return res.json()


def _wait_for_result(message_id: str) -> dict:
    deadline = time.time() + POLL_TIMEOUT
    with httpx.Client(timeout=15) as client:
        while time.time() < deadline:
            res = client.get(f"{BUS_API_URL}/bus/result/{message_id}", headers=_headers())
            res.raise_for_status()
            data = res.json()
            if data.get("status") == "complete":
                return data
            time.sleep(POLL_INTERVAL)
    return {
        "id": message_id,
        "status": "timeout",
        "stdout": "",
        "stderr": "Timed out waiting for result",
        "exit_code": -1,
        "duration_ms": POLL_TIMEOUT * 1000,
    }


def _format_result(result: dict) -> str:
    if result["status"] == "timeout":
        return f"Timed out waiting for result (ID: {result['id']})"
    lines = [f"Exit code: {result['exit_code']}  |  {result.get('duration_ms', '?')}ms"]
    if result.get("stdout"):
        lines.append(f"\nSTDOUT:\n{result['stdout']}")
    if result.get("stderr"):
        lines.append(f"\nSTDERR:\n{result['stderr']}")
    return "\n".join(lines)


@mcp.tool()
def run(command: str, cwd: str = "/var/www/zaylegend/apps/testing/bh-ai-79") -> str:
    """
    Send a shell command to the server Claude for execution.
    Safe commands (logs, status checks) execute immediately and return output.
    Destructive commands (deploys, restarts) return a confirmation ID — call confirm() to proceed.
    Blocked commands (rm -rf, pipes to shell, etc.) are rejected immediately.
    """
    pushed = _push(command, cwd)

    if pushed["status"] == "awaiting_confirmation":
        return (
            f"DESTRUCTIVE command queued — requires confirmation.\n"
            f"ID: {pushed['id']}\n"
            f"Expires in {pushed['ttl_seconds']}s\n\n"
            f"Call confirm('{pushed['id']}') to execute, or let it expire to cancel."
        )

    result = _wait_for_result(pushed["id"])
    return _format_result(result)


@mcp.tool()
def confirm(message_id: str) -> str:
    """
    Approve a pending destructive command and wait for its result.
    Use the ID returned by run() when it said 'requires confirmation'.
    """
    _confirm(message_id)
    result = _wait_for_result(message_id)
    return _format_result(result)


@mcp.tool()
def deploy(branch: str = "main") -> str:
    """
    Deploy the latest code to the server.
    Runs: git pull origin {branch} && docker-compose up -d --no-deps --build api worker
    This is a DESTRUCTIVE command — you will need to call confirm() after this returns.
    """
    command = f"git pull origin {branch} && docker-compose up -d --no-deps --build api worker"
    return run(command)


@mcp.tool()
def logs(service: str = "api", lines: int = 50) -> str:
    """
    Fetch recent logs from a running Docker container on the server.
    Safe command — executes immediately without confirmation.
    Common services: api, worker, db, redis
    """
    return run(f"docker logs --tail={lines} {service}")


@mcp.tool()
def status() -> str:
    """
    Show agent bus queue status and server health.
    Useful for checking if the server Claude is online and processing commands.
    """
    with httpx.Client(timeout=10) as client:
        bus_res = client.get(f"{BUS_API_URL}/bus/status", headers=_headers())
        health_res = client.get(f"{BUS_API_URL.replace('/api', '')}/health")

    bus_data = bus_res.json() if bus_res.status_code == 200 else {"error": bus_res.text}
    health_data = health_res.json() if health_res.status_code == 200 else {"status": "unreachable"}

    return (
        f"Bus queue: {bus_data}\n"
        f"Server status: {health_data.get('status', 'unknown')}\n"
        f"Checks: {health_data.get('checks', {})}"
    )


if __name__ == "__main__":
    mcp.run()
