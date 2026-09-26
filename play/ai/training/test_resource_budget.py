import json
import os
from pathlib import Path
import subprocess
import sys
import unittest

from resource_budget import requested_cpu_limit, restrict_resources

AVAILABLE = sorted(os.sched_getaffinity(0))[:9]


class CpuBudgetTests(unittest.TestCase):
    def test_configured_affinity_is_inherited_and_never_widens_launch_affinity(self):
        script = """
import json,os,resource,subprocess,sys
from resource_budget import restrict_resources
cpus=restrict_resources(int(sys.argv[1]))
child=json.loads(subprocess.check_output([sys.executable,'-c','import json,os;print(json.dumps(sorted(os.sched_getaffinity(0))))']))
print(json.dumps({'cpus':cpus,'child':child,'fileLimit':resource.getrlimit(resource.RLIMIT_FSIZE),'threads':os.environ['OMP_NUM_THREADS']}))
"""
        for available, requested in ((AVAILABLE, 3), (AVAILABLE, 9), (AVAILABLE[:3], 9)):
            result = subprocess.run(["taskset", "-c", ",".join(map(str, available)), sys.executable,
                                     "-c", script, str(requested)],
                                    cwd=Path(__file__).resolve().parent, capture_output=True, text=True,
                                    check=True, timeout=10)
            data = json.loads(result.stdout)
            expected = available[:requested]
            self.assertEqual(data["cpus"], expected)
            self.assertEqual(data["child"], expected)
            self.assertEqual(data["fileLimit"], [64 * 1024 * 1024] * 2)
            self.assertEqual(data["threads"], "1")

    def test_invalid_limits_fail_before_mutating_affinity(self):
        before = os.sched_getaffinity(0)
        for invalid in (0, -1, 10, True, 1.5):
            with self.assertRaises(ValueError):
                restrict_resources(invalid)
        self.assertEqual(os.sched_getaffinity(0), before)
        self.assertEqual(requested_cpu_limit([]), 3)
        self.assertEqual(requested_cpu_limit(["--output", "example", "--cpus", "9"]), 9)


if __name__ == "__main__":
    unittest.main()
