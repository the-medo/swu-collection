import { expect, test } from 'bun:test';
import { cpuPercent, readRuntimeCounters } from '../worker/metrics.ts';

const processValues = {
  processMemory: () => ({ rss: 40_000_000, heapUsed: 12_000_000 }),
  processCpu: () => ({ user: 7000, system: 3000 }),
};

test('reads cgroup v2 container memory, CPU and configured limits', async () => {
  const files = new Map([
    ['/sys/fs/cgroup/memory.current', '104857600\n'],
    ['/sys/fs/cgroup/memory.max', '536870912\n'],
    ['/sys/fs/cgroup/memory.stat', 'anon 50000000\ninactive_file 20971520\n'],
    ['/sys/fs/cgroup/cpu.stat', 'usage_usec 250000\nuser_usec 200000\nsystem_usec 50000\n'],
    ['/sys/fs/cgroup/cpu.max', '200000 100000\n'],
  ]);
  const result = await readRuntimeCounters({
    containerized: true,
    readText: async path => {
      const value = files.get(path);
      if (value === undefined) throw new Error('missing');
      return value;
    },
    ...processValues,
  });
  expect(result).toEqual({
    source: 'cgroup-v2',
    memoryUsedBytes: 83886080,
    memoryLimitBytes: 536870912,
    processRssBytes: 40_000_000,
    heapUsedBytes: 12_000_000,
    cpuUsageMicros: 250000,
    cpuLimitCores: 2,
  });
});

test('falls back to process counters outside a container', async () => {
  const result = await readRuntimeCounters({ containerized: false, ...processValues });
  expect(result).toEqual({
    source: 'process',
    memoryUsedBytes: 40_000_000,
    memoryLimitBytes: null,
    processRssBytes: 40_000_000,
    heapUsedBytes: 12_000_000,
    cpuUsageMicros: 10_000,
    cpuLimitCores: null,
  });
});

test('supports cgroup v1 counters and treats its unlimited memory sentinel as no limit', async () => {
  const files = new Map([
    ['/sys/fs/cgroup/memory/memory.usage_in_bytes', '67108864\n'],
    ['/sys/fs/cgroup/memory/memory.limit_in_bytes', '9223372036854771712\n'],
    ['/sys/fs/cgroup/memory/memory.stat', 'cache 10000000\ntotal_inactive_file 16777216\n'],
    ['/sys/fs/cgroup/cpuacct/cpuacct.usage', '500000000\n'],
    ['/sys/fs/cgroup/cpu/cpu.cfs_quota_us', '50000\n'],
    ['/sys/fs/cgroup/cpu/cpu.cfs_period_us', '100000\n'],
  ]);
  const result = await readRuntimeCounters({
    containerized: true,
    readText: async path => {
      const value = files.get(path);
      if (value === undefined) throw new Error('missing');
      return value;
    },
    ...processValues,
  });
  expect(result).toMatchObject({
    source: 'cgroup-v1',
    memoryUsedBytes: 50331648,
    memoryLimitBytes: null,
    cpuUsageMicros: 500000,
    cpuLimitCores: 0.5,
  });
});

test('reports CPU like container tools, where one fully used core is 100 percent', () => {
  expect(
    cpuPercent(
      { usageMicros: 1_000_000, observedAtMs: 1000 },
      { usageMicros: 1_750_000, observedAtMs: 1500 },
    ),
  ).toBe(150);
  expect(cpuPercent(undefined, { usageMicros: 100, observedAtMs: 1 })).toBe(0);
  expect(
    cpuPercent({ usageMicros: 200, observedAtMs: 2 }, { usageMicros: 100, observedAtMs: 3 }),
  ).toBe(0);
});
