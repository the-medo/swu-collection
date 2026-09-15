# Current development engine bundle

Crossfire's executable archive is a smoke artifact for the newest committed
runtime. Production replay/recovery uses the current compatible runtime with the
original installed card data; see [card releases](card-releases.md). Card-only
updates do not require rebuilding this artifact. Older minor recordings are a
compatibility obligation, and historical JSON bundles remain retained in the DB.
This command's pruning only affects generated executable artifacts.

From the worktree root, after committing engine changes:

```bash
bun run play:archive
bun run play:archive:verify
```

The archive command builds `HEAD` and rejects a historical commit argument. It
uses committed engine/card code and locked dependencies with lifecycle scripts
disabled. After verifying the resulting executable, it deletes older generated
manifests and their artifacts. A failed build leaves the previous build intact.
A directory lock prevents overlapping archive commands. After a killed build,
remove `.archive.lock` only once that build process has stopped.

The default directory is the ignored `.swubase/crossfire-bundles`. Keep generated
executables/manifests out of Git. The low-level bundle loader checks exact pins,
size and SHA-256 before executing server-owned code; it has no browser/upload
interface. Private checkpoints and recorded random inputs never go to browsers.

`play:archive:verify` requires exactly the current version. It completes a
practice game, verifies every recorded-input prefix and resumes the shared complex
continuation fixtures in fresh processes. Unit tests also exercise corrupted
artifacts, conflicting publication and pruning that preserves the current build.
These checks prove recovery of the current engine without retaining old engines.

Minor runtime updates preserve historical behavior and data contracts; the frozen
recordings in the conformance suite enforce that obligation. A future breaking
major release must explicitly decide whether to retain an executable adapter for
older majors. It must not silently reinterpret historical games.
The benchmark reports below are historical measurements, not installed builds.

## Initial performance baseline

The [machine-readable baseline](benchmarks/2026-09-09-engine-core.json) records
Bun 1.3.14 on Linux x64, AMD Custom CPU 1772, 12 logical CPUs and about 16 GB RAM.
The development app and PostgreSQL were running. The measured position contains
132 cards and a 30,044-byte checkpoint, suspended at an opponent's heal-base
choice before an older Ambush. The script warms operations before collecting
1,000 samples, with 12 fresh-process recovery samples. Memory records 100
retained independent states and both process and JavaScriptCore statistics.

Observed command latency is around 0.2 ms, encoding around 0.03 ms, decoding
around 0.3 ms, and fresh-process recovery around 40 ms. Recovery includes process
startup and serialization. Memory deltas are noisy; use the recorded heap and
object counts, not a claim of exact per-game allocation or server capacity.
These measurements exclude transport, database commits, viewer projections,
long histories and complex attachment/effect graphs. Repeat with those workloads
as they are implemented.

## Expanded resolution workload

The current benchmark uses named continuations from
[the shared fixture builder](../../play/testing/continuations.ts): nested triggers,
private search, search randomness, borrowed-trigger ordering, Shield replacement,
Piloting-only healing, delayed-player selection, delayed-effect ordering and a
round-40 history produced by actual passing/regroup inputs. The focused suite
checks exact decoded transitions and all three viewer projections for these
positions. The archive verifier resumes each fixture in a fresh process through the current
executable. A missing, stale or multi-version archive fails verification.

The benchmark warms each operation 30 times and records 300 command, encoding,
decoding and three-viewer projection samples per fixture. It verifies three
fresh-process resumes per fixture and retains 100 mixed game states for a GC-
bounded memory observation. It reports byte sizes for checkpoints and individual
player/spectator projections. The output includes hardware, engine pins, Git
revision, a dirty-play-tree flag and the fixture/harness content hash.

Run measurements from committed code for durable comparison. The original
baseline above remains historical; its simpler workload and sample counts are
different. These measurements still exclude database commits, transport,
backpressure and production concurrency.


The [2026-09-09 complex workload report](benchmarks/2026-09-09-complex-engine.json)
was recorded from clean play code at `be5fe525` using engine 0.10.0 on Bun 1.3.14,
Linux x64, AMD Custom CPU 1772 (12 logical CPUs, about 16 GB RAM). For the eight
shorter positions, command p95 was 0.27–0.60 ms and three-view projection p95 was
0.30–0.55 ms. The round-40 fixture measured 1.43 ms command p95, 2.29 ms checkpoint
decode p95 and 4.41 ms three-view projection p95. Its checkpoint was 105,852 bytes;
full player views were 100,759 and 74,860 bytes, with a 37,934-byte spectator view.
These full-history costs support measuring incremental projection/transport in
the service milestone rather than sending full views on every action.

Retaining 100 mixed states increased reported JSC heap size by 3,826,072 bytes.
This is a GC-bounded observation, not a per-live-actor budget. The fresh-process
samples ranged up to 67.35 ms including startup and serialization; three samples
per position are a recovery smoke measurement, not a stable tail estimate.
The [historical archive report](benchmarks/2026-09-09-complex-retained.json) recorded
ten builds before the development retention policy changed. Those older builds
are no longer kept; new verification runs check only the current build. The files preserve their full measurements and provenance.
