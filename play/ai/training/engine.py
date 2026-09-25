"""Bounded local IPC to the original Bun engine; no Python rule implementation."""

import json
import os
from pathlib import Path
import selectors
import subprocess
import time

ROOT = Path(__file__).resolve().parents[3]


class Engine:
    def __init__(self, timeout=60, bridge="play/ai/bridge.ts", bridge_args=(), max_response=2_000_000):
        self.timeout = timeout
        self.max_response = max_response
        self.sequence = 0
        self.buffer = b""
        self.process = subprocess.Popen(
            ["bun", bridge, *bridge_args], cwd=ROOT,
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=None, bufsize=0,
        )
        self.selector = selectors.DefaultSelector()
        self.selector.register(self.process.stdout, selectors.EVENT_READ)
        try:
            self.contract = self.request("hello")
            if self.contract["protocol"] != 1:
                raise RuntimeError("Unsupported Crossfire AI protocol")
        except Exception:
            self.close()
            raise

    def request(self, op, **arguments):
        self.sequence += 1
        payload = json.dumps({"id": self.sequence, "op": op, **arguments}).encode() + b"\n"
        if len(payload) > 65536:
            raise ValueError("Engine request exceeds protocol limit")
        try:
            self.process.stdin.write(payload)
            deadline = time.monotonic() + self.timeout
            while b"\n" not in self.buffer:
                remaining = deadline - time.monotonic()
                if remaining <= 0 or not self.selector.select(remaining):
                    raise TimeoutError(f"Crossfire simulation request timed out ({len(self.buffer)} response bytes received)")
                chunk = os.read(self.process.stdout.fileno(), 65536)
                if not chunk:
                    raise RuntimeError("Crossfire simulation worker exited")
                self.buffer += chunk
                if len(self.buffer) > self.max_response:
                    raise RuntimeError("Crossfire response exceeds protocol limit")
            line, self.buffer = self.buffer.split(b"\n", 1)
            response = json.loads(line)
            if response["id"] != self.sequence:
                raise RuntimeError("Crossfire response ID mismatch")
            if not response["ok"]:
                raise RuntimeError(response["error"])
            return response["data"]
        except Exception:
            self.close()
            raise

    def close(self):
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=5)
        self.selector.close()
        self.process.stdin.close()
        self.process.stdout.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
