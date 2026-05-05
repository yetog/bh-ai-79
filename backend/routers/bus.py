from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import redis
import uuid
import json
import re
from datetime import datetime, timezone
from config import get_settings

router = APIRouter()
settings = get_settings()


def get_redis():
    return redis.from_url(settings.REDIS_URL)


def verify_secret(authorization: str = Header(...)):
    if authorization != f"Bearer {settings.BUS_SECRET}":
        raise HTTPException(status_code=401, detail="Invalid bus secret")


SAFE_PATTERNS = [
    r"^docker logs ",
    r"^docker-compose ps",
    r"^docker stats --no-stream",
    r"^git log ",
    r"^git status",
    r"^git diff",
    r"^curl http://localhost",
    r"^df -h",
    r"^free -m",
]

BLOCKED_PATTERNS = [
    r"rm\s+-rf",
    r"DROP\s+",
    r"\|\s*(bash|sh)\s*$",
    r">\s*/etc/",
    r"passwd",
    r"chmod\s+777",
    r"curl.*\|",
]


def classify(command: str) -> str:
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return "blocked"
    for pattern in SAFE_PATTERNS:
        if re.match(pattern, command.strip()):
            return "safe"
    return "destructive"


class PushRequest(BaseModel):
    command: str
    cwd: str = "/var/www/zaylegend/apps/testing/bh-ai-79"
    sender: str = "claude"


class RespondRequest(BaseModel):
    message_id: str
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: int


@router.post("/bus/push")
def push_command(body: PushRequest, authorization: str = Header(...)):
    verify_secret(authorization)

    tier = classify(body.command)
    if tier == "blocked":
        raise HTTPException(
            status_code=422,
            detail=f"Command blocked by safety rules: '{body.command[:60]}'"
        )

    msg_id = str(uuid.uuid4())[:8]
    r = get_redis()
    payload = json.dumps({
        "id": msg_id,
        "command": body.command,
        "cwd": body.cwd,
        "sender": body.sender,
        "tier": tier,
        "queued_at": datetime.now(timezone.utc).isoformat(),
    })

    if tier == "safe":
        r.rpush("agent_bus:queue", payload)
        return {"id": msg_id, "status": "queued", "tier": "safe"}
    else:
        r.setex(f"agent_bus:pending:{msg_id}", 300, payload)
        return {"id": msg_id, "status": "awaiting_confirmation", "tier": "destructive", "ttl_seconds": 300}


@router.post("/bus/confirm/{message_id}")
def confirm_command(message_id: str, authorization: str = Header(...)):
    verify_secret(authorization)

    r = get_redis()
    raw = r.get(f"agent_bus:pending:{message_id}")
    if not raw:
        raise HTTPException(status_code=404, detail="Message not found or expired")

    r.delete(f"agent_bus:pending:{message_id}")
    r.rpush("agent_bus:queue", raw)
    return {"id": message_id, "status": "queued"}


@router.get("/bus/pop")
def pop_command(authorization: str = Header(...)):
    verify_secret(authorization)

    r = get_redis()
    raw = r.lpop("agent_bus:queue")
    if not raw:
        return {"id": None}
    return json.loads(raw)


@router.post("/bus/respond")
def post_response(body: RespondRequest, authorization: str = Header(...)):
    verify_secret(authorization)

    r = get_redis()
    result = json.dumps({
        "id": body.message_id,
        "status": "complete",
        "stdout": body.stdout,
        "stderr": body.stderr,
        "exit_code": body.exit_code,
        "duration_ms": body.duration_ms,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    })
    r.setex(f"agent_bus:result:{body.message_id}", 3600, result)
    return {"ok": True}


@router.get("/bus/result/{message_id}")
def get_result(message_id: str, authorization: str = Header(...)):
    verify_secret(authorization)

    r = get_redis()
    raw = r.get(f"agent_bus:result:{message_id}")
    if not raw:
        return {"id": message_id, "status": "pending"}
    return json.loads(raw)


@router.get("/bus/status")
def bus_status(authorization: str = Header(...)):
    verify_secret(authorization)

    r = get_redis()
    return {
        "queue_depth": r.llen("agent_bus:queue"),
        "pending_confirmations": len(r.keys("agent_bus:pending:*")),
        "total_processed": len(r.keys("agent_bus:result:*")),
    }
