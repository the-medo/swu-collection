// Reproducible experiment randomness only. Live hosts keep cryptographic RNG.
export function randomSource(seed: number): (upperExclusive: number) => number {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff)
    throw new Error('Expected a uint32 experiment seed');
  let state = seed;
  return upper => {
    if (!Number.isSafeInteger(upper) || upper < 1) throw new Error('Invalid random bound');
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return Math.floor((((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000) * upper);
  };
}

export function shuffle<T>(values: readonly T[], random: (upper: number) => number): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
