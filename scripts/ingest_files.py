#!/usr/bin/env python
"""
ingest_files.py — Upload arbitrary files (PDFs, CSVs) into Black Hole AI datasets.

Usage:
    py -3 scripts/ingest_files.py --source "C:/path/to/folder" --dataset reference-library --ext pdf \
        --api https://zaylegend.com/bh-ai/api/api --email you@example.com --password yourpassword

    # CSVs to a specific persona dataset:
    py -3 scripts/ingest_files.py --source "C:/path/to/folder" --dataset chat-professional-salesperson \
        --ext csv --api https://zaylegend.com/bh-ai/api/api --email you@example.com --password yourpassword
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
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--display-name", default=None)
    parser.add_argument("--api", default="https://zaylegend.com/bh-ai/api/api")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--ext", required=True)
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
