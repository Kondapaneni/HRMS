#!/usr/bin/env python3
"""PERF-008: read-only Mumbai/Singapore Supabase Storage binary integrity verifier.

Run only from a trusted local/Work execution environment.
Two legacy service_role JWTs must live in separate PRIVATE local 0600 key files.
Never upload keys, file contents, or logs containing credentials.
Requires Python 3.11+ standard library only. No writes/deletes/uploads to either project.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request

SOURCES = {
    "mumbai": "https://jtgqkkhqyzfbupiqwkgf.supabase.co",
    "singapore": "https://qayankfbodyvrhemoauw.supabase.co",
}
MAX_ENTRIES = 10_000
PAGE_SIZE = 100


class VerificationError(Exception):
    pass


def read_private_key(path_string: str) -> str:
    path = Path(path_string).expanduser().resolve(strict=True)
    if not path.is_file():
        raise VerificationError("Key path is not a regular file")
    permissions = stat.S_IMODE(path.stat().st_mode)
    if os.name == "posix" and permissions != 0o600:
        raise VerificationError("Key file must have permissions 0600")
    key = path.read_text(encoding="utf-8").strip()
    if not key or "\n" in key or "\r" in key:
        raise VerificationError("Invalid private key file")
    return key


class Storage:
    def __init__(self, project: str, key: str):
        self.base = SOURCES[project]
        self.key = key

    def request(self, endpoint: str, *, body: dict | None = None):
        headers = {"apikey": self.key, "Authorization": "Bearer " + self.key}
        data = None
        method = "GET"
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")
            method = "POST"
        url = self.base + endpoint
        req = urllib.request.Request(url, headers=headers, data=data, method=method)
        try:
            return urllib.request.urlopen(req, timeout=60)
        except urllib.error.HTTPError as exc:
            # Avoid printing response bodies, user file names, full URLs or credentials.
            raise VerificationError("Storage HTTP status " + str(exc.code)) from None
        except urllib.error.URLError:
            raise VerificationError("Storage connection failed") from None

    def get_json(self, endpoint: str, *, body: dict | None = None):
        with self.request(endpoint, body=body) as response:
            payload = response.read(4_000_001)
        if len(payload) > 4_000_000:
            raise VerificationError("Unexpectedly large Storage metadata response")
        try:
            return json.loads(payload)
        except (ValueError, UnicodeError):
            raise VerificationError("Invalid Storage metadata response") from None

    def buckets(self) -> dict:
        payload = self.get_json("/storage/v1/bucket")
        if not isinstance(payload, list):
            raise VerificationError("Unexpected bucket response")
        result = {}
        for item in payload:
            name = item.get("id")
            if not isinstance(name, str) or not name:
                raise VerificationError("Invalid bucket ID")
            if name in result:
                raise VerificationError("Duplicate bucket")
            result[name] = {
                "public": item.get("public"),
                "file_size_limit": item.get("file_size_limit"),
                "allowed_mime_types": item.get("allowed_mime_types"),
            }
        return result

    def files(self, bucket: str) -> set[str]:
        files: set[str] = set()
        folders_seen: set[str] = set()
        folder_stack = [""]
        while folder_stack:
            prefix = folder_stack.pop()
            if prefix in folders_seen:
                raise VerificationError("Repeated folder entry")
            folders_seen.add(prefix)
            offset = 0
            while True:
                path = urllib.parse.quote(bucket, safe="")
                entries = self.get_json("/storage/v1/object/list/" + path, body={
                    "prefix": prefix,
                    "limit": PAGE_SIZE,
                    "offset": offset,
                    "sortBy": {"column": "name", "order": "asc"},
                })
                if not isinstance(entries, list):
                    raise VerificationError("Unexpected object-list response")
                for entry in entries:
                    name = entry.get("name")
                    if not isinstance(name, str) or not name or name in (".", ".."):
                        raise VerificationError("Invalid Storage entry")
                    object_name = prefix + name
                    if entry.get("id") is None:
                        folder_stack.append(object_name.rstrip("/") + "/")
                    else:
                        if object_name in files:
                            raise VerificationError("Duplicate Storage object")
                        files.add(object_name)
                if len(files) + len(folders_seen) + len(folder_stack) > MAX_ENTRIES:
                    raise VerificationError("Excessive number of Storage objects")
                if len(entries) < PAGE_SIZE:
                    break
                offset += PAGE_SIZE
        return files

    def digest(self, bucket: str, object_name: str) -> tuple[str, int]:
        endpoint = "/storage/v1/object/authenticated/" + (
            urllib.parse.quote(bucket, safe="") + "/" +
            urllib.parse.quote(object_name, safe="/")
        )
        digest = hashlib.sha256()
        size = 0
        with self.request(endpoint) as response:
            while True:
                chunk = response.read(1024 * 256)
                if not chunk:
                    break
                size += len(chunk)
                digest.update(chunk)
        return digest.hexdigest(), size



def verify_original_objects(
    mumbai: Storage,
    singapore: Storage,
    expected_objects: int,
) -> tuple[list[tuple[str, int]], int]:
    """Compare every source binary, while preserving new post-cutover target files.

    The Singapore HRMS is now live, so it can legitimately contain more files
    than the frozen Mumbai source. Any missing/altered original object FAILS.
    New target-only files are counted but never read, changed, or deleted.
    """
    if expected_objects <= 0:
        raise VerificationError("Expected source object count must be positive")
    src_buckets = mumbai.buckets()
    dst_buckets = singapore.buckets()
    if src_buckets != dst_buckets:
        raise VerificationError("Bucket list/security settings differ")

    compared = 0
    target_only = 0
    results: list[tuple[str, int]] = []
    for bucket in sorted(src_buckets):
        src_names = mumbai.files(bucket)
        dst_names = singapore.files(bucket)
        if not src_names.issubset(dst_names):
            raise VerificationError("Original Storage object missing in Singapore (path suppressed)")
        target_only += len(dst_names - src_names)
        for name in sorted(src_names):
            source_hash, source_bytes = mumbai.digest(bucket, name)
            target_hash, target_bytes = singapore.digest(bucket, name)
            if source_bytes != target_bytes or source_hash != target_hash:
                raise VerificationError("Binary integrity mismatch (object path suppressed)")
            compared += 1
        results.append((bucket, len(src_names)))
    if compared != expected_objects:
        raise VerificationError("Mumbai source object count differs from approved expected total")
    return results, target_only


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--mumbai-key-file", required=True)
    ap.add_argument("--singapore-key-file", required=True)
    ap.add_argument("--expected-objects", type=int, default=27, help="Required original Mumbai object count; default is audited count 27")
    args = ap.parse_args()

    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):
        raise VerificationError("Refusing to use real project credentials in CI")
    mumbai = Storage("mumbai", read_private_key(args.mumbai_key_file))
    singapore = Storage("singapore", read_private_key(args.singapore_key_file))

    results, new_singapore_files = verify_original_objects(
        mumbai, singapore, args.expected_objects
    )
    print("PASS — All original Mumbai Storage binaries match Singapore SHA-256.")
    print("Original objects verified:", args.expected_objects)
    print("Additional Singapore-only objects preserved:", new_singapore_files)
    print("Original objects per bucket (paths excluded):")
    for bucket, count in results:
        print("  ", bucket, count)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except VerificationError as error:
        print("FAIL:", error, file=sys.stderr)
        sys.exit(2)
