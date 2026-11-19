#!/usr/bin/env python3
"""PERF-008: isolated, offline Storage checksum verifier regression tests.

No network requests, project credentials, or private files are used.
"""
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "perf008_verify_storage_binary.py"
spec = importlib.util.spec_from_file_location("perf008_storage_binary", SCRIPT)
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


class FakeStorage:
    def __init__(self, objects, *, is_public=False):
        self._objects = dict(objects)
        self._public = is_public
        self.reads = []

    def buckets(self):
        return {
            "attendance": {
                "public": self._public,
                "file_size_limit": None,
                "allowed_mime_types": None,
            }
        }

    def files(self, bucket):
        self._check_bucket(bucket)
        return set(self._objects)

    def digest(self, bucket, filename):
        self._check_bucket(bucket)
        self.reads.append(filename)
        return self._objects[filename]

    @staticmethod
    def _check_bucket(bucket):
        if bucket != "attendance":
            raise AssertionError("Unexpected bucket")


class VerificationTests(unittest.TestCase):
    def setUp(self):
        self.original = {
            "old-a.jpg": ("digest_a", 100),
            "old-b.jpg": ("digest_b", 200),
        }

    def test_new_singapore_attendance_upload_is_preserved(self):
        source = FakeStorage(self.original)
        dest = FakeStorage({**self.original, "new-after-cutover.jpg": ("new", 50)})
        counts, target_only = verifier.verify_original_objects(source, dest, 2)
        self.assertEqual(counts, [("attendance", 2)])
        self.assertEqual(target_only, 1)
        self.assertEqual(dest.reads, ["old-a.jpg", "old-b.jpg"])
        self.assertNotIn("new-after-cutover.jpg", dest.reads)

    def test_missing_original_fails(self):
        source = FakeStorage(self.original)
        dest = FakeStorage({"old-a.jpg": self.original["old-a.jpg"]})
        with self.assertRaisesRegex(verifier.VerificationError, "missing"):
            verifier.verify_original_objects(source, dest, 2)

    def test_modified_original_fails(self):
        source = FakeStorage(self.original)
        dest = FakeStorage({**self.original, "old-b.jpg": ("different", 200)})
        with self.assertRaisesRegex(verifier.VerificationError, "mismatch"):
            verifier.verify_original_objects(source, dest, 2)

    def test_truncated_original_fails(self):
        source = FakeStorage(self.original)
        dest = FakeStorage({**self.original, "old-b.jpg": ("digest_b", 199)})
        with self.assertRaisesRegex(verifier.VerificationError, "mismatch"):
            verifier.verify_original_objects(source, dest, 2)

    def test_unexpected_mumbai_source_count_fails(self):
        with self.assertRaisesRegex(verifier.VerificationError, "source object count"):
            verifier.verify_original_objects(FakeStorage(self.original), FakeStorage(self.original), 27)

    def test_bucket_privacy_difference_fails(self):
        with self.assertRaisesRegex(verifier.VerificationError, "security"):
            verifier.verify_original_objects(FakeStorage(self.original), FakeStorage(self.original, is_public=True), 2)

    def test_nonpositive_expected_count_fails(self):
        with self.assertRaisesRegex(verifier.VerificationError, "positive"):
            verifier.verify_original_objects(FakeStorage(self.original), FakeStorage(self.original), 0)


if __name__ == "__main__":
    unittest.main()
