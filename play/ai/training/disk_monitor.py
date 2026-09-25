"""Independent five-minute accounting, including while an engine request waits."""
import threading
import time
from league_schedule import utc


class DiskMonitor:
    def __init__(self, budget, path, interval=300):
        self.budget, self.path, self.interval = budget, path, interval
        self.closed = threading.Event()
        self.failed = threading.Event()
        self.report = {}
        self.thread = None

    def sample(self):
        report = {'checkedAtUtc': utc(), 'intervalSeconds': self.interval,
                  'limitBytes': self.budget.limit}
        try:
            report.update(allocatedBytes=self.budget.check(0), status='ok')
            self.budget.json(self.path, report)
        except Exception as error:
            report.update(status='stop-required', error=f'{type(error).__name__}: {error}')
            self.failed.set()
            try:
                self.budget.emergency_json(self.path, report)
            except Exception:
                pass  # The last valid checkpoints are left intact.
        self.report = report

    def start(self):
        self.sample()
        if self.failed.is_set():
            raise RuntimeError(self.report['error'])

        def watch():
            due = time.monotonic() + self.interval
            while not self.closed.wait(max(0, due - time.monotonic())):
                self.sample()
                if self.failed.is_set():
                    return
                due += self.interval

        self.thread = threading.Thread(target=watch, name='training-disk-monitor', daemon=True)
        self.thread.start()
        return self

    def close(self):
        self.closed.set()
        if self.thread:
            self.thread.join()
