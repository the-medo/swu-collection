// OAuth state and signed authorization queries must not enter browser telemetry.
export function isSensitiveMcpUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    const path = new URL(value, 'https://swubase.invalid').pathname;
    return (
      /^\/mcp\/(?:login|consent)(?:\/|$)/.test(path) || /^\/api\/(?:auth|mcp)(?:\/|$)/.test(path)
    );
  } catch {
    return false;
  }
}
