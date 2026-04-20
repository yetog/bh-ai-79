#!/usr/bin/env python
"""
migrate_dexie.py — Batch migrate Dexie JSON chat exports into Black Hole AI.

Usage:
    python migrate_dexie.py --source "C:/path/to/Json GPT Files" \
                            --api    "https://zaylegend.com/bh-ai/api" \
                            --email  you@example.com \
                            --password yourpassword

The script will:
  1. Login to the API and get a JWT token
  2. Discover all Dexie JSON files in --source
  3. For each unique persona found, create a dataset (if it doesn't exist)
  4. Upload each file to the matching persona dataset via presigned S3 URL
  5. Poll until each file finishes processing, then report results
"""

import argparse
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

import requests

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def die(msg: str):
    print(f"[ERROR] {msg}", file=sys.stderr)
    sys.exit(1)


def log(msg: str):
    print(f"[INFO]  {msg}")


def login(api_base: str, email: str, password: str) -> tuple:
    resp = requests.post(f"{api_base}/auth/login", json={"email": email, "password": password})
    if resp.status_code != 200:
        die(f"Login failed ({resp.status_code}): {resp.text}")
    token = resp.json().get("access_token")
    if not token:
        die(f"No access_token in login response: {resp.text}")
    import base64, json as _json
    part = token.split('.')[1]
    part += '=' * (4 - len(part) % 4)
    payload = _json.loads(base64.urlsafe_b64decode(part))
    tenant_id = payload.get("tenant_id", "")
    log(f"Authenticated OK (tenant: {tenant_id})")
    return token, tenant_id


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


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


def get_personas_in_file(path: Path) -> list:
    """Return list of unique personas found in a Dexie JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if data.get("formatName") != "dexie":
        return []
    tables = {t["tableName"]: t["rows"] for t in data["data"]["data"]}
    chats = tables.get("chats", [])
    return list({c.get("priming") or "General" for c in chats})


def upload_file(api_base: str, token: str, dataset_id: str, file_path: Path, mime_type: str = "application/json") -> str:
    """Upload file via presigned URL. Returns job_id."""
    import hashlib
    headers = auth_headers(token)
    filename = file_path.name

    with open(file_path, "rb") as f:
        file_bytes = f.read()
    size = len(file_bytes)
    checksum = hashlib.md5(file_bytes).hexdigest()

    sign_payload = {
        "filename": filename,
        "content_type": mime_type,
        "size": size,
    }
    resp = requests.post(f"{api_base}/uploads/sign", json=sign_payload, headers=headers)
    if resp.status_code != 200:
        die(f"Failed to get presigned URL for {filename}: {resp.status_code} {resp.text}")

    sign_data = resp.json()
    presigned_url = sign_data["upload_url"]
    s3_key = sign_data["key"]

    put_resp = requests.put(presigned_url, data=file_bytes, headers={"Content-Type": mime_type})
    if put_resp.status_code not in (200, 204):
        die(f"S3 upload failed for {filename}: {put_resp.status_code}")

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


def wait_for_job(api_base: str, token: str, job_id: str, timeout: int = 300) -> dict:
    """Poll job status until done or timeout."""
    headers = auth_headers(token)
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(f"{api_base}/processing/{job_id}/status", headers=headers)
        if resp.status_code == 200:
            status = resp.json()
            state = status.get("status", "")
            if state in ("completed", "failed"):
                return status
        time.sleep(5)
    return {"status": "timeout"}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Migrate Dexie JSON exports to Black Hole AI")
    parser.add_argument("--source", required=True, help="Directory containing Dexie JSON files")
    parser.add_argument("--api", default="https://zaylegend.com/bh-ai/api/api/v1", help="API base URL")
    parser.add_argument("--email", required=True, help="Account email")
    parser.add_argument("--password", required=True, help="Account password")
    parser.add_argument("--dry-run", action="store_true", help="Scan files only, don't upload")
    args = parser.parse_args()

    source_dir = Path(args.source)
    if not source_dir.is_dir():
        die(f"Source directory not found: {source_dir}")

    # Discover all Dexie JSON files
    dexie_files = []
    for f in source_dir.glob("*.json"):
        try:
            with open(f, "r", encoding="utf-8") as fh:
                peek = json.load(fh)
            if peek.get("formatName") == "dexie":
                dexie_files.append(f)
        except Exception:
            pass

    if not dexie_files:
        die("No Dexie JSON files found in source directory")

    log(f"Found {len(dexie_files)} Dexie files")

    # Collect all personas across all files
    all_personas: set = set()
    file_personas: dict = {}
    for f in dexie_files:
        personas = get_personas_in_file(f)
        file_personas[f] = personas
        all_personas.update(personas)

    log(f"Personas found: {sorted(all_personas)}")

    if args.dry_run:
        print("\n[DRY RUN] Files to migrate:")
        for f in dexie_files:
            print(f"  {f.name} → personas: {file_personas[f]}")
        return

    # Auth
    token, tenant_id = login(args.api, args.email, args.password)

    # Create datasets for each persona
    persona_dataset_ids = {}
    for persona in sorted(all_personas):
        persona_dataset_ids[persona] = get_or_create_dataset(args.api, token, tenant_id, persona)

    # Upload each file to each of its personas' datasets
    results = []
    for file_path in dexie_files:
        personas = file_personas[file_path]
        log(f"Processing {file_path.name} (personas: {personas})")

        for persona in personas:
            dataset_id = persona_dataset_ids[persona]
            try:
                job_id = upload_file(args.api, token, dataset_id, file_path)
                if job_id:
                    log(f"  Waiting for processing...")
                    status = wait_for_job(args.api, token, job_id)
                    chunks = status.get("chunks", "?")
                    log(f"  Done: {status['status']} | chunks={chunks}")
                    results.append({"file": file_path.name, "persona": persona, "status": status["status"], "chunks": chunks})
                else:
                    results.append({"file": file_path.name, "persona": persona, "status": "no_job_id"})
            except SystemExit:
                results.append({"file": file_path.name, "persona": persona, "status": "error"})

    # Summary
    print("\n" + "="*60)
    print("MIGRATION SUMMARY")
    print("="*60)
    ok = [r for r in results if r["status"] == "completed"]
    failed = [r for r in results if r["status"] != "completed"]
    print(f"Completed: {len(ok)} / {len(results)}")
    if failed:
        print("Failed:")
        for r in failed:
            print(f"  {r['file']} ({r['persona']}): {r['status']}")
    total_chunks = sum(r.get("chunks", 0) or 0 for r in ok)
    print(f"Total chunks indexed: {total_chunks}")
    print("="*60)


if __name__ == "__main__":
    main()
