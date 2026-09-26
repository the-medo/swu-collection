"""CPU affinity and bounded writes for local training, including child workers."""
import argparse
import fcntl
import io
import json
import os
from pathlib import Path
import resource
import threading

DISK_LIMIT = 100_000_000_000  # Decimal GB, the stricter interpretation of 100 GB.
FILE_LIMIT = 64 * 1024 * 1024
HEADROOM = 256 * 1024 * 1024  # Includes bounded stdout/stderr and filesystem metadata.
MAX_CPUS = 9


def requested_cpu_limit(argv=None):
    # Parse before numerical libraries can create threads. The full command
    # parser later validates the remaining arguments. Default stays conservative.
    parser = argparse.ArgumentParser(add_help=False, allow_abbrev=False)
    parser.add_argument("--cpus", type=int, choices=range(1, MAX_CPUS + 1), default=3)
    return parser.parse_known_args(argv)[0].cpus


def restrict_resources(cpu_limit=3):
    if type(cpu_limit) is not int or not 1 <= cpu_limit <= MAX_CPUS:
        raise ValueError("CPU limit must be between one and nine logical CPUs")
    cpus = sorted(os.sched_getaffinity(0))[:cpu_limit]
    os.sched_setaffinity(0, cpus)
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_FSIZE, (FILE_LIMIT, FILE_LIMIT))
    for key in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS", "NUMEXPR_NUM_THREADS"):
        os.environ[key] = "1"
    os.environ["UV_THREADPOOL_SIZE"] = "1"
    os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
    os.environ["CUDA_VISIBLE_DEVICES"] = ""
    return cpus


class ArtifactBudget:
    def __init__(self, root, limit=DISK_LIMIT):
        self.root = Path(root).resolve()
        self.limit = min(limit, DISK_LIMIT)
        self.guard = threading.RLock()
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = (self.root / "training.lock").open("a+b")
        try:
            fcntl.flock(self.lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except Exception:
            self.lock.close()
            raise RuntimeError("Another training process owns the artifact budget") from None
        try:
            self.check(0)
        except Exception:
            self.lock.close()
            raise

    def usage(self):
        # Include the venv and earlier runs. Do not follow symlinks outside root.
        used = 0
        for path in [self.root, *self.root.rglob("*")]:
            try:
                used += path.lstat().st_blocks * 512
            except FileNotFoundError:
                pass  # An atomic replacement may remove a temporary file.
        return used

    def check(self, incoming):
        with self.guard:
            return self._check(incoming)

    def _check(self, incoming, reserve=HEADROOM):
        if incoming < 0 or incoming > FILE_LIMIT:
            raise RuntimeError("Artifact exceeds the 64 MiB per-file limit")
        used = self.usage()
        # Reserve the COMPLETE temporary replacement before writing. Existing
        # checkpoints are not subtracted until their replacement is committed.
        if used + ((incoming + 4095) // 4096) * 4096 + reserve > self.limit:
            raise RuntimeError("Training artifact disk budget exhausted; refusing write")
        return used

    def write(self, path, data):
        with self.guard:
            self._write(path, data)

    def _write(self, path, data, reserve=HEADROOM):
        path = Path(path).resolve()
        if not path.is_relative_to(self.root) or path == self.root:
            raise ValueError("Training artifacts must remain inside their budget root")
        self._check(len(data), reserve)
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_name(path.name + ".tmp")
        try:
            with temporary.open("wb") as file:
                file.write(data)
                file.flush()
                os.fsync(file.fileno())
            os.replace(temporary, path)
        finally:
            temporary.unlink(missing_ok=True)

    def json(self, path, value):
        self.write(path, (json.dumps(value, indent=2, allow_nan=False) + "\n").encode())

    def tensor(self, path, value):
        import torch
        buffer = io.BytesIO()
        torch.save(value, buffer)
        self.write(path, buffer.getvalue())

    def emergency_json(self, path, value):
        # Reserved space is only for a small final status after a disk refusal.
        # Even this write must remain below the absolute user disk limit.
        data = (json.dumps(value, indent=2, allow_nan=False) + '\n').encode()
        if len(data) > 65536:
            raise ValueError('Emergency status exceeds its reserved size')
        with self.guard:
            self._write(path, data, reserve=0)

    def close(self):
        self.lock.close()
