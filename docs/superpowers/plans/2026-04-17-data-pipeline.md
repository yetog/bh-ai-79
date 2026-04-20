# Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `migrate_dexie.py` field mismatches, run the full migration of 48 Dexie JSON files into 8 persona datasets, then ingest 13 PDFs and the CSVs into the live Black Hole AI platform at `https://zaylegend.com/bh-ai/api`.

**Architecture:** Three sequential steps — fix the script, run Dexie migration, run PDF/CSV ingest. All uploads use the existing presigned-URL S3 flow: sign → PUT to S3 → notify backend → poll job status.

**Tech Stack:** Python 3, `requests`, `hashlib`, live FastAPI backend at `https://zaylegend.com/bh-ai/api`

---

## Context

**Data location:** `C:/Users/iyoungburke/Desktop/back up/.Json GPT Files/`
- 48 Dexie JSON files (root of directory)
- `Cloud PDF's/` — 13 technical PDFs → dataset `reference-library`
- `Training Data/Qualification_Questions_Sheet.csv` → dataset `chat-professional-salesperson`

**API base:** `https://zaylegend.com/bh-ai/api`  
**API prefix:** `/api` (so endpoints are `/api/auth/login`, `/api/datasets`, `/api/uploads/sign`, etc.)

**Credentials needed:** You must have a registered account on the live platform. If not, register first:
```bash
curl -X POST https://zaylegend.com/bh-ai/api/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"isayah.young-burke@ionos.com","password":"<your-password>","tenant_name":"bh-ai"}'
```

---

## Task 1: Fix migrate_dexie.py — API schema mismatches

**Files:**
- Modify: `migrate_dexie.py`

The current script has 4 bugs that will cause 4xx errors from the live API:

1. Sign request sends `size_bytes` and `dataset_id` — API expects `size` only
2. Sign response reads `sign_data["url"]` — API returns `upload_url`
3. Complete request sends wrong field names — API expects `key`, `size`, `mimetype`, `checksum`
4. Dataset create payload is missing required `DatasetManifest` fields (`tenant_id`, `metadata_rules`, `security`, `prompt`)

- [ ] **Step 1: Replace the `login` function to also extract tenant_id from JWT**

Replace in `migrate_dexie.py`:
```python
def login(api_base: str, email: str, password: str) -> tuple[str, str]:
    resp = requests.post(f"{api_base}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        die(f"Login failed ({resp.status_code}): {resp.text}")
    token = resp.json().get("access_token")
    if not token:
        die(f"No access_token in login response: {resp.text}")
    # Decode JWT payload (no signature verification needed)
    import base64, json as _json
    part = token.split('.')[1]
    part += '=' * (4 - len(part) % 4)
    payload = _json.loads(base64.urlsafe_b64decode(part))
    tenant_id = payload.get("tenant_id", "")
    log(f"Authenticated OK (tenant: {tenant_id})")
    return token, tenant_id
```

- [ ] **Step 2: Fix `get_or_create_dataset` to send a complete DatasetManifest**

Replace the entire `get_or_create_dataset` function:
```python
def get_or_create_dataset(api_base: str, token: str, tenant_id: str, persona: str) -> str:
    """Return dataset id for a persona, creating it if needed."""
    dataset_id = f"chat-{persona.lower().replace(' ', '-')}"
    headers = auth_headers(token)

    resp = requests.get(f"{api_base}/datasets/{dataset_id}", headers=headers)
    if resp.status_code == 200:
        log(f"Dataset exists: {dataset_id}")
        return dataset_id

    payload = {
        "manifest": {
            "dataset_id": dataset_id,
            "tenant_id": tenant_id,
            "display_name": f"{persona} — Chat History",
            "sources": [{"type": "upload"}],
            "preprocess": {
                "chunk_size": 1200,
                "chunk_overlap": 100,
                "splitter": "recursive",
                "min_text_length": 30,
                "remove_code_blocks": False,
            },
            "metadata_rules": {
                "infer_title": True,
                "extract": ["h1", "h2", "filename", "page"],
            },
            "security": {
                "visibility": "private",
                "allow": [],
                "deny": [],
            },
            "prompt": {
                "system": f"You are a helpful {persona} assistant. Answer based on the provided context.",
                "style": "concise",
                "max_context_chunks": 8,
            },
            "version": 1,
        }
    }
    resp = requests.post(f"{api_base}/datasets", json=payload, headers=headers)
    if resp.status_code not in (200, 201):
        die(f"Failed to create dataset for persona '{persona}': {resp.status_code} {resp.text}")
    log(f"Created dataset: {dataset_id}")
    return dataset_id
```

- [ ] **Step 3: Fix `upload_file` to use correct field names and add checksum**

Replace the entire `upload_file` function:
```python
def upload_file(api_base: str, token: str, dataset_id: str, file_path: Path, mime_type: str = "application/json") -> str:
    """Upload file via presigned URL. Returns job_id."""
    import hashlib
    headers = auth_headers(token)
    filename = file_path.name
    size = file_path.stat().st_size

    with open(file_path, "rb") as f:
        file_bytes = f.read()
    checksum = hashlib.md5(file_bytes).hexdigest()

    # Request presigned URL — API expects: filename, content_type, size
    sign_payload = {
        "filename": filename,
        "content_type": mime_type,
        "size": size,
    }
    resp = requests.post(f"{api_base}/uploads/sign", json=sign_payload, headers=headers)
    if resp.status_code != 200:
        die(f"Failed to get presigned URL for {filename}: {resp.status_code} {resp.text}")

    sign_data = resp.json()
    presigned_url = sign_data["upload_url"]   # was sign_data["url"] — BUG FIXED
    s3_key = sign_data["key"]

    # Upload directly to S3
    put_resp = requests.put(presigned_url, data=file_bytes, headers={"Content-Type": mime_type})
    if put_resp.status_code not in (200, 204):
        die(f"S3 upload failed for {filename}: {put_resp.status_code}")

    # Notify backend — API expects: key, filename, size, mimetype, checksum, dataset_id
    complete_payload = {
        "key": s3_key,
        "filename": filename,
        "size": size,
        "mimetype": mime_type,
        "checksum": checksum,
        "dataset_id": dataset_id,
    }
    resp = requests.post(f"{api_base}/uploads/complete", json=complete_payload, headers=headers)
    if resp.status_code != 200:
        die(f"Upload complete notification failed: {resp.status_code} {resp.text}")

    job_id = resp.json().get("job_id")
    log(f"  Uploaded {filename} → job {job_id}")
    return job_id
```

- [ ] **Step 4: Fix `main()` to use the updated `login` signature**

In `main()`, update the login call and pass `tenant_id` through to `get_or_create_dataset`:
```python
    # Auth — now returns (token, tenant_id)
    token, tenant_id = login(args.api, args.email, args.password)

    # Create datasets for each persona
    persona_dataset_ids = {}
    for persona in sorted(all_personas):
        persona_dataset_ids[persona] = get_or_create_dataset(args.api, token, tenant_id, persona)
```

- [ ] **Step 5: Commit the fixes**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add migrate_dexie.py
git commit -m "fix: correct migrate_dexie.py field names to match live API schemas"
```

---

## Task 2: Dry-run the migration to verify file discovery

**Files:**
- Run: `migrate_dexie.py --dry-run`

- [ ] **Step 1: Run dry-run and verify output**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
py -3 migrate_dexie.py \
  --source "C:/Users/iyoungburke/Desktop/back up/.Json GPT Files" \
  --api "https://zaylegend.com/bh-ai/api/api" \
  --email "isayah.young-burke@ionos.com" \
  --password "<your-password>" \
  --dry-run
```

Expected output:
```
[INFO]  Found 48 Dexie files
[INFO]  Personas found: ['Data Scientist', 'General', 'Language Tutor', 'Life Hacker', 'Marketing Expert', 'Mindfulness Coach', 'Professional Salesperson', 'Software Developer']

[DRY RUN] Files to migrate:
  askIonos-export-1_11_2025, 11_35_21 AM.json → personas: [...]
  ...
```

If you see fewer than 48 files or missing personas, stop and investigate before proceeding.

---

## Task 3: Run the full Dexie JSON migration

**Files:**
- Run: `migrate_dexie.py` (live)

- [ ] **Step 1: Run migration (expect ~10-20 min for 48 files)**

```bash
py -3 migrate_dexie.py \
  --source "C:/Users/iyoungburke/Desktop/back up/.Json GPT Files" \
  --api "https://zaylegend.com/bh-ai/api/api" \
  --email "isayah.young-burke@ionos.com" \
  --password "<your-password>"
```

Expected: progress logs per file, then a summary table like:
```
============================================================
MIGRATION SUMMARY
============================================================
Completed: 48 / 48
Total chunks indexed: ~5000+
============================================================
```

- [ ] **Step 2: Spot-check via API**

```bash
curl -H "Authorization: Bearer <token>" \
  https://zaylegend.com/bh-ai/api/api/datasets/chat-software-developer
```

Expected: `200` with `document_count > 0`.

If any files failed, check the error messages. Common causes: S3 credentials expired, network timeout. Re-run just the failed files by temporarily filtering `dexie_files` list.

---

## Task 4: Build `scripts/ingest_files.py` for PDFs and CSVs

**Files:**
- Create: `scripts/ingest_files.py`

This script reuses the same upload flow as `migrate_dexie.py` but handles any file type and maps files to datasets by directory or explicit argument.

- [ ] **Step 1: Create `scripts/` directory and `ingest_files.py`**

```bash
mkdir -p C:/Users/iyoungburke/Desktop/yetog-bh-ai-79/scripts
```

Create `scripts/ingest_files.py`:
```python
#!/usr/bin/env python
"""
ingest_files.py — Upload arbitrary files (PDFs, CSVs) into Black Hole AI datasets.

Usage:
    py -3 scripts/ingest_files.py \
        --source "C:/path/to/folder" \
        --dataset reference-library \
        --api https://zaylegend.com/bh-ai/api/api \
        --email you@example.com \
        --password yourpassword \
        --ext pdf

    # For CSVs to a specific persona dataset:
    py -3 scripts/ingest_files.py \
        --source "C:/path/to/folder" \
        --dataset chat-professional-salesperson \
        --api https://zaylegend.com/bh-ai/api/api \
        --email you@example.com \
        --password yourpassword \
        --ext csv
"""
import argparse
import base64
import hashlib
import json
import sys
import time
from pathlib import Path

import requests

MIME_MAP = {
    "pdf":  "application/pdf",
    "csv":  "text/csv",
    "txt":  "text/plain",
    "json": "application/json",
    "md":   "text/markdown",
}


def die(msg):
    print(f"[ERROR] {msg}", file=sys.stderr)
    sys.exit(1)


def log(msg):
    print(f"[INFO]  {msg}")


def login(api_base, email, password):
    resp = requests.post(f"{api_base}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        die(f"Login failed ({resp.status_code}): {resp.text}")
    token = resp.json()["access_token"]
    part = token.split('.')[1]
    part += '=' * (4 - len(part) % 4)
    payload = json.loads(base64.urlsafe_b64decode(part))
    tenant_id = payload.get("tenant_id", "")
    log(f"Authenticated OK (tenant: {tenant_id})")
    return token, tenant_id


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def ensure_dataset(api_base, token, tenant_id, dataset_id, display_name):
    headers = auth_headers(token)
    resp = requests.get(f"{api_base}/datasets/{dataset_id}", headers=headers)
    if resp.status_code == 200:
        log(f"Dataset exists: {dataset_id}")
        return
    payload = {
        "manifest": {
            "dataset_id": dataset_id,
            "tenant_id": tenant_id,
            "display_name": display_name,
            "sources": [{"type": "upload"}],
            "preprocess": {
                "chunk_size": 1200,
                "chunk_overlap": 100,
                "splitter": "recursive",
                "min_text_length": 30,
                "remove_code_blocks": False,
            },
            "metadata_rules": {"infer_title": True, "extract": ["h1", "h2", "filename", "page"]},
            "security": {"visibility": "private", "allow": [], "deny": []},
            "prompt": {
                "system": "You are a helpful AI assistant. Answer based on the provided context.",
                "style": "concise",
                "max_context_chunks": 8,
            },
            "version": 1,
        }
    }
    resp = requests.post(f"{api_base}/datasets", json=payload, headers=headers)
    if resp.status_code not in (200, 201):
        die(f"Failed to create dataset '{dataset_id}': {resp.status_code} {resp.text}")
    log(f"Created dataset: {dataset_id}")


def upload_file(api_base, token, dataset_id, file_path, mime_type):
    headers = auth_headers(token)
    filename = file_path.name
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    size = len(file_bytes)
    checksum = hashlib.md5(file_bytes).hexdigest()

    resp = requests.post(
        f"{api_base}/uploads/sign",
        json={"filename": filename, "content_type": mime_type, "size": size},
        headers=headers,
    )
    if resp.status_code != 200:
        die(f"Sign failed for {filename}: {resp.status_code} {resp.text}")

    sign_data = resp.json()
    put_resp = requests.put(
        sign_data["upload_url"],
        data=file_bytes,
        headers={"Content-Type": mime_type},
    )
    if put_resp.status_code not in (200, 204):
        die(f"S3 PUT failed for {filename}: {put_resp.status_code}")

    resp = requests.post(
        f"{api_base}/uploads/complete",
        json={
            "key": sign_data["key"],
            "filename": filename,
            "size": size,
            "mimetype": mime_type,
            "checksum": checksum,
            "dataset_id": dataset_id,
        },
        headers=headers,
    )
    if resp.status_code != 200:
        die(f"Complete failed for {filename}: {resp.status_code} {resp.text}")

    job_id = resp.json().get("job_id")
    log(f"  Uploaded {filename} → job {job_id}")
    return job_id


def wait_for_job(api_base, token, job_id, timeout=300):
    headers = auth_headers(token)
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(f"{api_base}/processing/{job_id}/status", headers=headers)
        if resp.status_code == 200:
            status = resp.json()
            if status.get("status") in ("completed", "failed"):
                return status
        time.sleep(5)
    return {"status": "timeout"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--dataset", required=True, help="Target dataset ID")
    parser.add_argument("--display-name", default=None, help="Dataset display name (for creation)")
    parser.add_argument("--api", default="https://zaylegend.com/bh-ai/api/api")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--ext", required=True, help="File extension to ingest (pdf, csv, txt)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    source_dir = Path(args.source)
    if not source_dir.is_dir():
        die(f"Source directory not found: {source_dir}")

    ext = args.ext.lower().lstrip(".")
    mime_type = MIME_MAP.get(ext)
    if not mime_type:
        die(f"Unsupported extension: {ext}. Supported: {list(MIME_MAP.keys())}")

    files = list(source_dir.glob(f"*.{ext}"))
    if not files:
        die(f"No .{ext} files found in {source_dir}")

    log(f"Found {len(files)} .{ext} files → dataset '{args.dataset}'")

    if args.dry_run:
        for f in files:
            print(f"  {f.name}")
        return

    token, tenant_id = login(args.api, args.email, args.password)
    display_name = args.display_name or args.dataset.replace("-", " ").title()
    ensure_dataset(args.api, token, tenant_id, args.dataset, display_name)

    results = []
    for file_path in files:
        log(f"Uploading {file_path.name}...")
        try:
            job_id = upload_file(args.api, token, args.dataset, file_path, mime_type)
            status = wait_for_job(args.api, token, job_id)
            log(f"  → {status['status']}")
            results.append({"file": file_path.name, "status": status["status"]})
        except SystemExit:
            results.append({"file": file_path.name, "status": "error"})

    ok = [r for r in results if r["status"] == "completed"]
    print(f"\nDone: {len(ok)}/{len(results)} completed")
    failed = [r for r in results if r["status"] != "completed"]
    if failed:
        print("Failed:")
        for r in failed:
            print(f"  {r['file']}: {r['status']}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add scripts/ingest_files.py
git commit -m "feat: add ingest_files.py for PDF and CSV ingestion"
```

---

## Task 5: Ingest PDFs into `reference-library`

- [ ] **Step 1: Dry-run PDF ingest**

```bash
py -3 C:/Users/iyoungburke/Desktop/yetog-bh-ai-79/scripts/ingest_files.py \
  --source "C:/Users/iyoungburke/Desktop/back up/.Json GPT Files/Cloud PDF's" \
  --dataset reference-library \
  --display-name "Reference Library" \
  --api https://zaylegend.com/bh-ai/api/api \
  --email isayah.young-burke@ionos.com \
  --password "<your-password>" \
  --ext pdf \
  --dry-run
```

Expected: list of 13 PDF filenames.

- [ ] **Step 2: Run PDF ingest (expect ~15-30 min for 13 PDFs)**

```bash
py -3 C:/Users/iyoungburke/Desktop/yetog-bh-ai-79/scripts/ingest_files.py \
  --source "C:/Users/iyoungburke/Desktop/back up/.Json GPT Files/Cloud PDF's" \
  --dataset reference-library \
  --display-name "Reference Library" \
  --api https://zaylegend.com/bh-ai/api/api \
  --email isayah.young-burke@ionos.com \
  --password "<your-password>" \
  --ext pdf
```

Expected: `Done: 13/13 completed`

---

## Task 6: Ingest CSVs

- [ ] **Step 1: Run CSV ingest for Qualification_Questions_Sheet.csv**

```bash
py -3 C:/Users/iyoungburke/Desktop/yetog-bh-ai-79/scripts/ingest_files.py \
  --source "C:/Users/iyoungburke/Desktop/back up/.Json GPT Files/Training Data" \
  --dataset chat-professional-salesperson \
  --display-name "Professional Salesperson — Chat History" \
  --api https://zaylegend.com/bh-ai/api/api \
  --email isayah.young-burke@ionos.com \
  --password "<your-password>" \
  --ext csv
```

Expected: `Done: 1/1 completed`

---

## Task 7: Verify data is searchable

- [ ] **Step 1: Get a JWT token**

```bash
curl -s -X POST https://zaylegend.com/bh-ai/api/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"isayah.young-burke@ionos.com","password":"<your-password>"}' \
  | py -3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"
```

Save the token as `TOKEN`.

- [ ] **Step 2: Check dataset document counts**

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  https://zaylegend.com/bh-ai/api/api/datasets/chat-software-developer \
  | py -3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id'), d.get('document_count'))"

curl -s -H "Authorization: Bearer $TOKEN" \
  https://zaylegend.com/bh-ai/api/api/datasets/reference-library \
  | py -3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id'), d.get('document_count'))"
```

Expected: `chat-software-developer <N>` and `reference-library 13`

- [ ] **Step 3: Run a test query**

```bash
curl -s -X POST https://zaylegend.com/bh-ai/api/api/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"How do I structure a FastAPI project?","dataset_ids":["chat-software-developer"],"top_k":3}' \
  | py -3 -c "import sys,json; d=json.load(sys.stdin); print(d['answer'][:200])"
```

Expected: a relevant answer with citations. If `answer` contains "couldn't find", the chunks may not have finished embedding — wait 2 minutes and retry.

- [ ] **Step 4: Commit final state**

```bash
cd C:/Users/iyoungburke/Desktop/yetog-bh-ai-79
git add -A
git commit -m "chore: data pipeline complete — 48 JSON + 13 PDF + CSVs ingested"
```
